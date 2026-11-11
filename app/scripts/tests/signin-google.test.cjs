// Google sign-in and the sign-in dialog (2026-11-10), in headless Chrome:
// - a Google sign-in to a 2FA account opens the 2FA step (no tokens before the
//   code), takes the app's code or a backup code, and lands where you were going
// - a failed Google sign-in says why on /login (closed account, too many
//   sign-ins, OgaPay busy, no connection) instead of a "session ended" loop
// - inside Instagram/Facebook built-in browsers a note comes before Google, with
//   Copy link (and Open in Chrome on Android)
// - referral links offer Continue with Google, and the invite code goes with it
// - an HTML 502 page reads "OgaPay is busy", not "Unexpected token <"
// The real AuthCallback, LoginPage, SignInHost, SignInModal, AuthProvider and
// lib/api run against a fake server (signin-google.harness.tsx) on a local test
// server; Supabase is a stand-in. Any request to another host is blocked and counted.
//   npm run test:signin-google
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
const stubs = path.join(__dirname, 'signin-google.stubs.tsx');
const stubPlugin = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /(lib\/supabaseClient|lib\/push|^\.\/HomePage)$/ }, () => ({ path: stubs }));
  },
};

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const UA_IG_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0 (iPhone14,5; iOS 17_5; en_US; en; scale=3.00; 1170x2532)';
const UA_FB_ANDROID = 'Mozilla/5.0 (Linux; Android 13; SM-A135F Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/447.0.0.40.108;]';
const UA_CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36';

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-signin-'));
  await build({
    entryPoints: [path.join(__dirname, 'signin-google.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: {
      'callback-under-test': path.join(SRC, 'pages/AuthCallback.tsx'),
      'login-under-test': path.join(SRC, 'pages/LoginPage.tsx'),
      'signin-host-under-test': path.join(SRC, 'components/auth/SignInHost.tsx'),
      'auth-under-test': path.join(SRC, 'context/AuthContext.tsx'),
      'signin-lib-under-test': path.join(SRC, 'lib/signin.ts'),
      'api-under-test': path.join(SRC, 'lib/api.ts'),
      'security-under-test': path.join(SRC, 'pages/settings/Security.tsx'),
      'toast-under-test': path.join(SRC, 'components/Toast.tsx'),
    },
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  const pageHtml = '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script>';
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/bundle.js')) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(fs.readFileSync(path.join(dir, 'bundle.js'))); }
    if (req.url.startsWith('/wallets/')) { res.writeHead(204); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(pageHtml);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  const open = async (caseName, { ua } = {}) => {
    const ctx = await browser.createBrowserContext();
    await ctx.overridePermissions(origin, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
    const page = await ctx.newPage();
    if (ua) await page.setUserAgent(ua);
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (r.url().startsWith(origin) || /^data:/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.evaluateOnNewDocument((c) => { window.__case = sessionStorage.getItem('case') || c; }, caseName);
    page.ctx = ctx;
    return page;
  };
  const state = (page) => page.evaluate(() => ({
    loc: document.querySelector('#loc')?.textContent || '',
    title: document.querySelector('.si-title')?.textContent || null,
    modal: document.querySelector('.si-modal')?.innerText || '',
    token: localStorage.getItem('ogapay_access_token'),
    calls: window.__calls || [],
    oauth: JSON.parse(sessionStorage.getItem('oauth') || '[]'),
    sbOut: sessionStorage.getItem('sb_signed_out') === '1',
    otp: document.querySelector('#si-otp')?.value ?? null,
    otpLabel: document.querySelector('label[for="si-otp"]')?.textContent || '',
    verifyDisabled: [...document.querySelectorAll('.si-modal button')].find((b) => /Verify and sign in/.test(b.textContent))?.disabled ?? null,
  }));
  const until = async (page, fn, ms = 6000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { try { v = await state(page); if (fn(v)) return v; } catch { /* navigating */ } await sleep(50); } return state(page); };
  const clickText = (page, re) => page.evaluate((src) => {
    const re = new RegExp(src);
    const b = [...document.querySelectorAll('.si-modal button, .si-modal a')].find((x) => re.test(x.textContent.trim()));
    if (!b) throw new Error('no button ' + src);
    b.click();
  }, re.source);
  const typeOtp = async (page, text) => {
    await page.evaluate(() => { const i = document.querySelector('#si-otp'); i.focus(); i.select(); });
    await page.keyboard.press('Backspace');
    await page.type('#si-otp', text);
  };
  const submit = (page) => clickText(page, /^Verify and sign in$/);
  let p, v;

  // 1. Google sign-in to an account with 2FA: the code is asked for
  p = await open('twofa');
  await p.goto(origin + '/');
  await p.evaluate(() => sessionStorage.setItem('ogapay_after_login', '/tasks/abc'));
  await p.goto(origin + '/auth/callback');
  v = await until(p, (s) => s.title === 'Two-factor authentication');
  ok('1a Google + 2FA account: the 2FA step opens', v.title === 'Two-factor authentication', v);
  ok('1b ...with no tokens saved before the code', v.token === null, v.token);
  ok('1c ...the server was asked once with the Google session', v.calls.filter((c) => c.path === '/auth/google/exchange').length === 1 && v.calls[0].body?.access_token === 'google-session', v.calls);
  ok('1d ...and the bare Google session is cleared', v.sbOut, v.sbOut);
  await typeOtp(p, '000000');
  await submit(p);
  v = await until(p, (s) => /Invalid 2FA code/.test(s.modal));
  ok('1e a wrong code says so and signs nobody in', /Invalid 2FA code/.test(v.modal) && v.token === null, v);
  // Backup code
  await clickText(p, /Lost your phone\? Use a backup code/);
  v = await until(p, (s) => s.otpLabel === 'Backup code');
  ok('1f "Lost your phone?" switches to a backup code box', v.otpLabel === 'Backup code' && v.otp === '' && /support@ogapay\.app/.test(v.modal), v);
  await typeOtp(p, 'a3f9');
  v = await state(p);
  ok('1g ...a short backup code can\'t be sent', v.otp === 'A3F9' && v.verifyDisabled === true, v);
  await typeOtp(p, 'a3f9-c01b7e');
  v = await state(p);
  ok('1h ...letters are kept and made capitals (the old box kept digits only)', v.otp === 'A3F9-C01B7E' && v.verifyDisabled === false, v.otp);
  await submit(p);
  v = await until(p, (s) => s.loc === '/tasks/abc' && !s.title);
  const sent = v.calls.filter((c) => c.path === '/auth/2fa/challenge').map((c) => c.body);
  ok('1i the backup code finishes the sign-in and goes back where you were heading', v.loc === '/tasks/abc' && v.token === 'app-access' && !v.title, v);
  ok('1j ...sending the challenge from the Google step', sent.length === 2 && sent[1].token === 'A3F9-C01B7E' && sent[1].challengeToken === 'chal-1' && sent[1].userId === 'u1', sent);
  await p.ctx.close();

  // 1k. The app's 6-digit code works too, and lands on the dashboard by default
  p = await open('twofa');
  await p.goto(origin + '/auth/callback');
  v = await until(p, (s) => s.title === 'Two-factor authentication');
  await typeOtp(p, '12ab3456');
  v = await state(p);
  ok('1k the app-code box keeps digits only', v.otp === '123456', v.otp);
  await submit(p);
  v = await until(p, (s) => s.loc === '/dashboard');
  ok('1l ...and the right code signs in to the dashboard', v.loc === '/dashboard' && v.token === 'app-access', v);
  await p.ctx.close();

  // 2. Failed Google sign-ins say why on /login
  for (const [c, re, label] of [
    ['banned', /Account has been banned\. Contact support\./, 'a closed account sees the reason'],
    ['limit', /Too many sign-ins from your network/, 'too many sign-ins says wait a few minutes'],
    ['busy', /OgaPay is busy right now\. Please try again in a minute\./, 'a 502 page says OgaPay is busy'],
    ['offline', /Couldn't reach OgaPay/, 'no connection says so'],
  ]) {
    p = await open(c);
    await p.goto(origin + '/auth/callback');
    v = await until(p, (s) => s.loc.startsWith('/login') && !!s.title, 9000);
    ok(`2 ${label}`, v.loc === '/login?error=google_failed' && re.test(v.modal), { loc: v.loc, modal: v.modal });
    ok(`2 ...(${c}) nothing is saved as a session and Google's session is cleared`, v.token === null && v.sbOut && !/session ended/i.test(v.modal), { token: v.token, sbOut: v.sbOut });
    if (c === 'offline') ok('2 ...(offline) the exchange was tried twice', v.calls.filter((x) => x.path === '/auth/google/exchange').length === 2, v.calls.length);
    await p.goto(origin + '/login');
    v = await until(p, (s) => !!s.title);
    ok(`2 ...(${c}) the reason is shown once only`, !re.test(v.modal), v.modal);
    await p.ctx.close();
  }

  // 2s. React StrictMode (dev) runs the dialog effect twice when /login opens
  // inside the app (auth already loaded): the reason must survive. It used to
  // be taken on the first run, so the second showed the generic text
  p = await open('ok');
  await p.goto(origin + '/');
  await p.evaluate(() => sessionStorage.setItem('strict', '1'));
  await p.goto(origin + '/');
  await until(p, (s) => s.loc === '/');
  await sleep(300);
  await p.evaluate(() => {
    sessionStorage.setItem('ogapay_signin_error', 'Account has been banned. Contact support.');
    history.pushState({}, '', '/login?error=google_failed');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  v = await until(p, (s) => s.loc.startsWith('/login') && !!s.title, 9000);
  await sleep(300);
  v = await state(p);
  ok('2s StrictMode: a closed account still sees the reason, not the generic text', v.loc === '/login?error=google_failed' && /Account has been banned/.test(v.modal) && !/didn't finish/.test(v.modal), { loc: v.loc, modal: v.modal });
  ok("2s ...and it's still shown once only", (await p.evaluate(() => sessionStorage.getItem('ogapay_signin_error'))) === null);
  await p.ctx.close();

  // 3. A normal Google sign-in still works
  p = await open('ok');
  await p.goto(origin + '/auth/callback');
  v = await until(p, (s) => s.loc === '/dashboard' && s.token === 'app-access', 9000);
  ok('3 a Google sign-in without 2FA lands on the dashboard, signed in', v.loc === '/dashboard' && v.token === 'app-access', v);
  await p.ctx.close();

  // 4. Inside Instagram (iPhone): a note before Google
  p = await open('ok', { ua: UA_IG_IPHONE });
  await p.goto(origin + '/');
  await p.click('#open-options');
  v = await until(p, (s) => s.title === 'Sign in to OgaPay');
  ok("4a Instagram's browser: a note says Google won't work here", /Google sign-in doesn't work inside Instagram's browser/.test(v.modal) && /Copy link/.test(v.modal), v.modal);
  ok('4b ...no Open in Chrome on an iPhone', !/Open in Chrome/.test(v.modal), v.modal);
  const order = await p.evaluate(() => [...document.querySelectorAll('.si-opt-name')].map((x) => x.textContent));
  ok('4c ...Email comes before Google', order.indexOf('Email') > -1 && order.indexOf('Email') < order.indexOf('Continue with Google'), order);
  await clickText(p, /^Continue with Google/);
  v = await until(p, (s) => /Try Google here anyway/.test(s.modal));
  ok('4d tapping Google there shows the help instead of Google\'s error page', v.oauth.length === 0 && /Try Google here anyway/.test(v.modal), v);
  await clickText(p, /^Copy link$/);
  await sleep(200);
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch((e) => 'ERR ' + e.message));
  v = await state(p);
  ok('4e Copy link copies this page\'s address', clip === origin + '/' && /Link copied/.test(v.modal), { clip, modal: v.modal });
  await clickText(p, /^Try Google here anyway$/);
  v = await until(p, (s) => s.oauth.length === 1);
  ok('4f ..."Try Google here anyway" still starts Google', v.oauth.length === 1 && v.oauth[0] === 'google', v.oauth);
  await p.ctx.close();

  // Facebook on Android: Open in Chrome
  p = await open('ok', { ua: UA_FB_ANDROID });
  await p.goto(origin + '/join?ref=KEMI1');
  v = await until(p, (s) => s.title === 'Create your account');
  await clickText(p, /Continue with Google/);
  v = await until(p, (s) => /Open in Chrome/.test(s.modal));
  const intent = await p.evaluate(() => [...document.querySelectorAll('.si-modal a')].find((a) => /Open in Chrome/.test(a.textContent))?.getAttribute('href'));
  ok("4g Facebook on Android (sign-up page): the note offers Open in Chrome for this page", /Google sign-in doesn't work inside Facebook's browser/.test(v.modal) && /^intent:\/\/127\.0\.0\.1:\d+\/join\?ref=KEMI1#Intent;scheme=http;package=com\.android\.chrome;/.test(intent || '') && v.oauth.length === 0, { intent, modal: v.modal });
  await p.ctx.close();

  // Plain Chrome on Android: no note, Google straight away
  p = await open('ok', { ua: UA_CHROME_ANDROID });
  await p.goto(origin + '/');
  await p.click('#open-options');
  v = await until(p, (s) => s.title === 'Sign in to OgaPay');
  ok('4h normal Chrome: no in-app note', !/doesn't work inside/.test(v.modal), v.modal);
  await clickText(p, /^Continue with Google/);
  v = await until(p, (s) => s.oauth.length === 1);
  ok('4i ...and Google starts on the first tap', v.oauth.length === 1, v.oauth);
  await p.ctx.close();

  // 5. Referral link: Google offered, and the code goes with it
  p = await open('ok');
  await p.goto(origin + '/ref/ABCD2345');
  v = await until(p, (s) => s.title === 'Create your account');
  ok('5a a referral link opens sign-up with Continue with Google and the invite', /Continue with Google/.test(v.modal) && /A friend invited you/.test(v.modal) && /or use your email/.test(v.modal), v.modal);
  await clickText(p, /Continue with Google/);
  v = await until(p, (s) => s.oauth.length === 1);
  ok('5b ...Google starts from there', v.oauth.length === 1, v.oauth);
  await p.goto(origin + '/auth/callback');
  v = await until(p, (s) => s.loc === '/dashboard', 9000);
  const ex = v.calls.find((c) => c.path === '/auth/google/exchange');
  ok('5c ...and the referral code is sent with the Google sign-in', ex?.body?.referralCode === 'ABCD2345', ex);
  await p.ctx.close();
  p = await open('ok');
  await p.goto(origin + '/');
  await p.click('#open-signup');
  v = await until(p, (s) => s.title === 'Create your account');
  ok('5d sign-up without an invite: Google is there, no invite line', /Continue with Google/.test(v.modal) && !/A friend invited you/.test(v.modal), v.modal);
  await p.ctx.close();

  // 6. An HTML 502 page through apiRequest
  p = await open('ok');
  await p.goto(origin + '/');
  await p.click('#raw-busy');
  await sleep(300);
  const raw = await p.evaluate(() => window.__raw);
  ok('6 an HTML 502 page reads "OgaPay is busy", not "Unexpected token <"', raw === 'OgaPay is busy right now. Please try again in a minute.|502', raw);
  await p.ctx.close();

  // 7. Changing the password keeps this device signed in with the fresh session
  // the server sends back (every old token stops working on the server)
  p = await open('ok');
  await p.goto(origin + '/');
  await p.evaluate(() => { localStorage.setItem('ogapay_access_token', 'app-access'); localStorage.setItem('ogapay_refresh_token', 'app-refresh'); });
  await p.goto(origin + '/settings');
  await p.waitForSelector('.up-btn');
  const fill = async (el, val) => { await el.evaluate((i) => { i.focus(); i.select(); }); await p.keyboard.press('Backspace'); await el.type(val); };
  const pwForm = async (cur, next) => {
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Change'); if (b) b.click(); });
    await p.waitForSelector('input[autocomplete="current-password"]');
    await fill(await p.$('input[autocomplete="current-password"]'), cur);
    for (const el of await p.$$('input[autocomplete="new-password"]')) await fill(el, next);
    await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Change password$/.test(x.textContent.trim())).click());
  };
  const toks = () => p.evaluate(() => [localStorage.getItem('ogapay_access_token'), localStorage.getItem('ogapay_refresh_token'), document.querySelector('.st2-err')?.textContent || ''].join('|'));
  await pwForm('Wrong1234', 'New12345');
  await sleep(400);
  let t = await toks();
  ok('7a a wrong current password shows the error and keeps the old session', t === 'app-access|app-refresh|Current password is incorrect', t);
  await pwForm('Old12345', 'New12345');
  await sleep(400);
  t = await toks();
  ok('7b the right one saves the fresh session the server sends back', t.startsWith('fresh-access|fresh-refresh|'), { t, sent: (await state(p)).calls.filter((c) => c.path === '/auth/change-password').map((c) => c.body) });
  await p.ctx.close();

  ok('no request left the test server', outside.length === 0, outside);
  await browser.close();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
