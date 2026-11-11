// The email-code sign-in sheet (2026-11-11), in headless Chrome:
//  login-3/login-4  Email is one field + Send code; the code signs in an existing
//                   account (2FA still asked) or makes a new one, then one short
//                   step (name, country, Earn/Hire/Both) or Skip; the Ads sign-up
//                   is counted once; the /ref code goes with the code
//  login-17         a new wallet makes an account, then asks for an email by code
//                   (or Skip); its own token is used before it is saved here
//  login-19         "Ada N" and single names are fine; "Tobi" is not "Tobi Tobi"
//  login-26         each step puts the cursor in its first field
//  login-27         fields are 16px on phones
//  login-28         "We just sent a code" shows the server's reason and a countdown
//  Password sign-in is still there ("Use a password instead"), with Forgot password.
// The real LoginPage, SignInHost, SignInModal, AuthProvider and lib/api run
// against a fake server (signin-email-code.harness.tsx) on a local test server;
// any request to another host is blocked and counted.
//   npm run test:signin-email-code
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

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-mailsignin-'));
  await build({
    entryPoints: [path.join(__dirname, 'signin-email-code.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: {
      'login-under-test': path.join(SRC, 'pages/LoginPage.tsx'),
      'signin-host-under-test': path.join(SRC, 'components/auth/SignInHost.tsx'),
      'auth-under-test': path.join(SRC, 'context/AuthContext.tsx'),
      'signin-lib-under-test': path.join(SRC, 'lib/signin.ts'),
    },
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  // The real sheet styles, so the phone font size is the real one
  const pageHtml = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/signin.css"><div id="root"></div><script src="/bundle.js"></script>';
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/bundle.js')) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(fs.readFileSync(path.join(dir, 'bundle.js'))); }
    if (req.url.startsWith('/signin.css')) { res.writeHead(200, { 'Content-Type': 'text/css' }); return res.end(fs.readFileSync(path.join(SRC, 'styles/signin.css'))); }
    if (req.url.startsWith('/wallets/')) { res.writeHead(204); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(pageHtml);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  const open = async ({ phone = false, phantom = false } = {}) => {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    if (phone) await page.setViewport({ width: 375, height: 760 });
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (r.url().startsWith(origin) || /^data:/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    if (phantom) {
      await page.evaluateOnNewDocument(() => {
        window.phantom = { solana: { isPhantom: true, publicKey: null,
          connect: async () => ({ publicKey: { toString: () => '7Wa11etNew1111111111111111111111111111111' } }),
          signMessage: async () => ({ signature: new Uint8Array(64).fill(7) }) } };
      });
    }
    page.ctx = ctx;
    return page;
  };
  const state = (page) => page.evaluate(() => ({
    loc: document.querySelector('#loc')?.textContent || '',
    who: document.querySelector('#who')?.textContent || '',
    title: document.querySelector('.si-title')?.textContent || null,
    modal: document.querySelector('.si-modal')?.innerText || '',
    inputs: [...document.querySelectorAll('.si-body input, .si-body select')].filter((i) => !['radio', 'checkbox'].includes(i.type)).map((i) => i.id),
    focus: document.activeElement?.id || document.activeElement?.className || '',
    token: localStorage.getItem('ogapay_access_token'),
    calls: window.__calls || [],
    gtag: (window.__gtag || []).length,
    buttons: [...document.querySelectorAll('.si-modal button')].map((b) => ({ t: b.textContent.trim(), d: b.disabled })),
  }));
  const until = async (page, fn, ms = 5000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { try { v = await state(page); if (fn(v)) return v; } catch { /* navigating */ } await sleep(50); } return state(page); };
  const clickText = (page, re) => page.evaluate((src) => {
    const re = new RegExp(src);
    const b = [...document.querySelectorAll('.si-modal button, .si-modal a')].find((x) => re.test(x.textContent.trim()));
    if (!b) throw new Error('no button ' + src);
    b.click();
  }, re.source);
  const fill = async (page, sel, text) => {
    await page.$eval(sel, (i) => { i.focus(); i.select?.(); });
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type(sel, text);
  };
  const lastCall = (v, path) => [...v.calls].reverse().find((c) => c.path === path);
  const startEmail = async (page) => {
    await page.goto(origin + '/');
    await page.click('#open');
    await until(page, (s) => s.title === 'Sign in to OgaPay');
    await clickText(page, /^Email/);
    return until(page, (s) => s.title === 'Continue with email');
  };
  const sendCode = async (page, email) => {
    await fill(page, '#si-email', email);
    await clickText(page, /^Send code$/);
  };
  const typeCode = async (page, code, btn = /^Continue$/) => {
    await fill(page, '#si-mailcode', code);
    await clickText(page, btn);
  };
  let p, v;

  // 1. A new email: one field, a code, one last step, signed in
  p = await open({ phone: true });
  v = await startEmail(p);
  ok('1a Email is one field and Send code', JSON.stringify(v.inputs) === '["si-email"]' && v.buttons.some((b) => b.t === 'Send code') && !/Password/.test(v.modal.split('Use a password')[0]), v);
  ok('1b ...the cursor is in the email field, not on the title (login-26)', v.focus === 'si-email', v.focus);
  ok('1c ...16px text on a phone so iPhones don\'t zoom (login-27)', (await p.$eval('#si-email', (i) => getComputedStyle(i).fontSize)) === '16px');
  ok('1d ..."Use a password instead" is there', /Use a password instead/.test(v.modal), v.modal);
  await sendCode(p, 'new@mail.ng');
  v = await until(p, (s) => s.inputs.includes('si-mailcode'));
  ok('1e the code step names the email and puts the cursor in the code box', /We sent a 6-digit code to new@mail\.ng/.test(v.modal) && v.focus === 'si-mailcode', { modal: v.modal, focus: v.focus });
  const rs = v.buttons.find((b) => /Send a new code/.test(b.t));
  ok('1f "Send a new code" waits a minute, with a countdown (login-28)', !!rs && rs.d && /in (1:00|0:5\d)/.test(rs.t), v.buttons);
  ok('1g one code request with the email', lastCall(v, '/auth/email-code/request')?.body?.email === 'new@mail.ng');
  await typeCode(p, '111111');
  v = await until(p, (s) => /wrong or has expired/.test(s.modal));
  ok('1h a wrong code says why, nobody signed in', /wrong or has expired/.test(v.modal) && v.token === null, v.modal);
  await typeCode(p, '123456');
  v = await until(p, (s) => s.title === 'One last step');
  ok('1i a new account gets one last step (still open, not saved yet)', v.title === 'One last step' && v.token === null && v.who === '', v);
  ok('1j ...the cursor is in the name field', v.focus === 'si-name', v.focus);
  ok('1k ...the Google Ads sign-up is counted once', v.gtag === 1, v.gtag);
  await fill(p, '#si-name', 'A');
  await clickText(p, /^Continue$/);
  v = await until(p, (s) => /at least 2 letters/.test(s.modal));
  ok('1l one letter is not a name', /at least 2 letters/.test(v.modal) && !lastCall(v, '/users/me'), v.modal);
  await fill(p, '#si-name', '  Ada   N ');
  await p.evaluate(() => [...document.querySelectorAll('.si-intent-opt input')].find((i) => i.value === 'EARN').click());
  await clickText(p, /^Continue$/);
  v = await until(p, (s) => s.loc === '/tasks/abc' && !s.title);
  const patch = lastCall(v, '/users/me');
  ok('1m "Ada N" is saved as Ada + N with Earn and Nigeria (login-19)', patch?.method === 'PATCH' && patch.body?.firstName === 'Ada' && patch.body?.lastName === 'N' && patch.body?.signupIntent === 'EARN' && patch.body?.country === 'NG', patch);
  ok('1n ...using the new account\'s own token', patch?.auth === 'Bearer new-access', patch?.auth);
  ok('1o ...then signed in and back where you were going', v.token === 'new-access' && v.who === 'u9' && v.loc === '/tasks/abc', v);
  await p.ctx.close();

  // 2. Referral link: Google first, the invite, and the code goes with the email code
  p = await open();
  await p.goto(origin + '/ref/KEMI1');
  v = await until(p, (s) => s.title === 'Create your account');
  ok('2a a referral link opens sign-up with Google, the invite and one email field', /Continue with Google/.test(v.modal) && /A friend invited you/.test(v.modal) && /or use your email/.test(v.modal) && JSON.stringify(v.inputs) === '["si-email"]', v);
  ok('2b ...cursor in the email field', v.focus === 'si-email', v.focus);
  await sendCode(p, 'tobi@mail.ng');
  await until(p, (s) => s.inputs.includes('si-mailcode'));
  await typeCode(p, '123456');
  v = await until(p, (s) => s.title === 'One last step');
  ok('2c the referral code goes with the code', lastCall(v, '/auth/email-code/verify')?.body?.referralCode === 'KEMI1', lastCall(v, '/auth/email-code/verify'));
  await fill(p, '#si-name', 'Tobi');
  await clickText(p, /^Continue$/);
  v = await until(p, (s) => s.loc === '/dashboard');
  const tp = lastCall(v, '/users/me');
  ok('2d a single name stays single: "Tobi", not "Tobi Tobi"', tp?.body?.firstName === 'Tobi' && tp.body.lastName === '' && !tp.body.signupIntent, tp?.body);
  ok('2e ...signed in on the dashboard', v.token === 'new-access' && v.loc === '/dashboard', v);
  await p.ctx.close();

  // 3. Closing during the last step keeps the new account signed in
  p = await open();
  await startEmail(p);
  await sendCode(p, 'new@mail.ng');
  await until(p, (s) => s.inputs.includes('si-mailcode'));
  await typeCode(p, '123456');
  await until(p, (s) => s.title === 'One last step');
  await p.click('.si-close');
  v = await until(p, (s) => !s.title && s.token === 'new-access');
  ok('3 closing the last step still signs the new account in', !v.title && v.token === 'new-access' && v.who === 'u9' && !lastCall(v, '/users/me'), v);
  await p.ctx.close();

  // 4. An existing account: straight in, no extra step
  p = await open();
  await startEmail(p);
  await sendCode(p, 'old@mail.ng');
  await until(p, (s) => s.inputs.includes('si-mailcode'));
  await typeCode(p, '123456');
  v = await until(p, (s) => s.loc === '/tasks/abc' && !s.title);
  ok('4 an existing account signs straight in, no last step, no Ads sign-up', v.token === 'app-access' && v.who === 'u1' && v.gtag === 0, v);
  await p.ctx.close();

  // 5. 2FA is still asked
  p = await open();
  await startEmail(p);
  await sendCode(p, '2fa@mail.ng');
  await until(p, (s) => s.inputs.includes('si-mailcode'));
  await typeCode(p, '123456');
  v = await until(p, (s) => s.title === 'Two-factor authentication');
  ok('5 a 2FA account gets the 2FA step after the code, cursor in the code box', v.title === 'Two-factor authentication' && v.token === null && v.focus === 'si-otp', v);
  await p.ctx.close();

  // 6. "We just sent a code": the server's reason and its countdown
  p = await open();
  await startEmail(p);
  await sendCode(p, 'wait@mail.ng');
  v = await until(p, (s) => /We just sent a code/.test(s.modal));
  const w42 = v.buttons.find((b) => /Send a new code/.test(b.t));
  ok('6a the server\'s reason is shown', /We just sent a code\. Wait a minute/.test(v.modal), v.modal);
  ok('6b ...with the code box and a countdown from its 42 seconds', v.inputs.includes('si-mailcode') && !!w42 && w42.d && /in 0:4[0-2]/.test(w42.t), v.buttons);
  await p.ctx.close();

  // 7. Password sign-in is still there
  p = await open();
  await startEmail(p);
  await fill(p, '#si-email', 'old@mail.ng');
  await clickText(p, /^Use a password instead$/);
  v = await until(p, (s) => s.title === 'Sign in with a password');
  ok('7a "Use a password instead" opens the password form with the email kept and Forgot password', /Forgot password/.test(v.modal) && (await p.$eval('#si-email', (i) => i.value)) === 'old@mail.ng' && v.focus === 'si-email', v);
  await fill(p, '#si-pw', 'Pass1234');
  await clickText(p, /^Sign in$/);
  v = await until(p, (s) => s.token === 'app-access');
  ok('7b ...and the password still signs in', v.token === 'app-access' && lastCall(v, '/auth/login')?.body?.email === 'old@mail.ng', v);
  await p.ctx.close();

  // 8. A new wallet: account made, then an email by code, then the last step
  p = await open({ phantom: true });
  await p.goto(origin + '/');
  await p.evaluate(() => localStorage.setItem('ogapay_referral', 'KEMI1'));
  await p.click('#open');
  await until(p, (s) => s.title === 'Sign in to OgaPay');
  await clickText(p, /^Continue with wallet/);
  v = await until(p, (s) => s.title === 'Choose a Solana wallet');
  ok('8a the wallet list says a new wallet makes an account', /Signing makes your OgaPay account/.test(v.modal), v.modal);
  await clickText(p, /^Phantom/);
  v = await until(p, (s) => s.title === 'Add your email');
  const wl = lastCall(v, '/auth/wallet/login');
  ok('8b a new wallet makes an account (with the invite) and asks for an email', v.title === 'Add your email' && wl?.body?.referralCode === 'KEMI1' && v.token === null && v.gtag === 1, { title: v.title, wl, gtag: v.gtag });
  ok('8c ...cursor in the email field, Skip offered', v.focus === 'si-email' && /Skip for now/.test(v.modal), v);
  await sendCode(p, 'wally@mail.ng');
  v = await until(p, (s) => s.inputs.includes('si-mailcode'));
  const ar = lastCall(v, '/auth/email/add/request');
  ok('8d the code is asked with the new account\'s own token', ar?.auth === 'Bearer w-access' && ar.body?.email === 'wally@mail.ng', ar);
  await typeCode(p, '123456', /^Add email$/);
  v = await until(p, (s) => s.title === 'One last step');
  ok('8e the right code adds the email, then the last step', /Email added/.test(v.modal) && lastCall(v, '/auth/email/add/confirm')?.body?.code === '123456', v.modal);
  await clickText(p, /^Skip for now$/);
  v = await until(p, (s) => !s.title && s.token === 'w-access');
  ok('8f Skip signs in with the wallet account, back where you were going', v.token === 'w-access' && v.who === 'u7' && v.loc === '/tasks/abc', v);
  await p.ctx.close();

  // 9. Skipping the email for a wallet account
  p = await open({ phantom: true });
  await p.goto(origin + '/');
  await p.click('#open');
  await until(p, (s) => s.title === 'Sign in to OgaPay');
  await clickText(p, /^Continue with wallet/);
  await until(p, (s) => s.title === 'Choose a Solana wallet');
  await clickText(p, /^Phantom/);
  await until(p, (s) => s.title === 'Add your email');
  await clickText(p, /^Skip for now$/);
  v = await until(p, (s) => s.title === 'One last step');
  ok('9a skipping the email goes to the last step', v.title === 'One last step' && !lastCall(v, '/auth/email/add/request'), v.title);
  await clickText(p, /^Skip for now$/);
  v = await until(p, (s) => s.token === 'w-access');
  ok('9b ...and Skip again signs in', v.token === 'w-access' && !v.title, v);
  await p.ctx.close();

  ok('no request left the test server', outside.length === 0, outside);
  await browser.close();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
