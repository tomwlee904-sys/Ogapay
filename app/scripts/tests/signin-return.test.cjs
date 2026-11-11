// Where the sign-in sheet opens and where it goes back to (batch 2, 2026-11-11),
// in headless Chrome:
//  login-9   /login shows the sheet over a light page, not the whole homepage;
//            a job's "Sign in to apply" opens the sheet over the job
//  login-10  closing the sheet goes back to where you were (the job), not home
//  login-14  Google comes back to the page you started from, not the dashboard
//  login-21  "Did you mean …@gmail.com?" before a code goes to a mistyped email
//  login-23  a new Google account picks its country (and name) in "One last step";
//            a phone set to Ghana's time zone starts on Ghana
//  login-11  a code check whose answer was lost says what to do
//  login-25  the verify-email link opened signed out says "Email verified" with
//            Open OgaPay, instead of moving on to a sign-in wall
// The real LoginPage, SignInHost, SignInModal, AuthCallback, VerifyEmailPage,
// AuthProvider and lib/api run against a fake server (signin-return.harness.tsx)
// on a local test server; any request to another host is blocked and counted.
//   npm run test:signin-return
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-signin-return-'));
  await build({
    entryPoints: [path.join(__dirname, 'signin-return.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: {
      'login-under-test': path.join(SRC, 'pages/LoginPage.tsx'),
      'signin-host-under-test': path.join(SRC, 'components/auth/SignInHost.tsx'),
      'callback-under-test': path.join(SRC, 'pages/AuthCallback.tsx'),
      'verify-under-test': path.join(SRC, 'pages/VerifyEmailPage.tsx'),
      'auth-under-test': path.join(SRC, 'context/AuthContext.tsx'),
      'signin-lib-under-test': path.join(SRC, 'lib/signin.ts'),
    },
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
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
  const open = async ({ caseName = '', tz } = {}) => {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 375, height: 760 });
    if (tz) await page.emulateTimezone(tz);
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (r.url().startsWith(origin) || /^data:/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.evaluateOnNewDocument((c) => { if (c && !sessionStorage.getItem('case')) sessionStorage.setItem('case', c); }, caseName);
    page.ctx = ctx;
    return page;
  };
  const state = (page) => page.evaluate(() => ({
    loc: document.querySelector('#loc')?.textContent || '',
    who: document.querySelector('#who')?.textContent || '',
    title: document.querySelector('.si-title')?.textContent || null,
    modal: document.querySelector('.si-modal')?.innerText || '',
    job: !!document.querySelector('#job'),
    home: !!document.querySelector('#home'),
    loginPage: !!document.querySelector('#login-page'),
    body: document.body.innerText,
    name: document.querySelector('#si-name')?.value ?? null,
    country: document.querySelector('#si-country')?.value ?? null,
    email: document.querySelector('#si-email')?.value ?? null,
    token: localStorage.getItem('ogapay_access_token'),
    after: sessionStorage.getItem('ogapay_after_login'),
    oauth: JSON.parse(sessionStorage.getItem('oauth') || '[]'),
    calls: window.__calls || [],
  }));
  const until = async (page, fn, ms = 6000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { try { v = await state(page); if (fn(v)) return v; } catch { /* navigating */ } await sleep(50); } return state(page); };
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
  const calls = (v, path) => v.calls.filter((c) => c.path === path);
  const lastCall = (v, path) => [...v.calls].reverse().find((c) => c.path === path);
  const closeSheet = (page) => page.click('.si-close');
  let p, v;

  // 1. /login: the sheet over a light page, not the homepage (login-9)
  p = await open();
  await p.goto(origin + '/login');
  v = await until(p, (s) => s.title === 'Sign in to OgaPay');
  ok('1a /login opens the sheet over a light page', v.title === 'Sign in to OgaPay' && v.loginPage, { title: v.title, loginPage: v.loginPage });
  ok('1b ...the homepage is not loaded behind it', !v.home, v.home);
  // 1c Closing a /login opened directly goes home
  await closeSheet(p);
  v = await until(p, (s) => s.loc === '/');
  ok('1c closing a /login you landed on goes to the homepage', v.loc === '/' && !v.title, v.loc);
  await p.ctx.close();

  // 2. A job's "Sign in to apply": the sheet over the job, which stays (login-9, login-10)
  p = await open();
  await p.goto(origin + '/tasks/abc');
  await p.click('#apply');
  v = await until(p, (s) => s.title === 'Sign in to OgaPay');
  ok('2a the sheet opens over the job, which stays behind it', v.title && v.job && v.loc === '/tasks/abc', { loc: v.loc, job: v.job });
  await closeSheet(p);
  v = await until(p, (s) => !s.title);
  ok('2b closing it leaves you on the job', v.loc === '/tasks/abc' && v.job, v.loc);
  // Sign in from the job by email code: back on the job, signed in
  await p.click('#apply');
  await until(p, (s) => s.title === 'Sign in to OgaPay');
  await clickText(p, /^Email/);
  await until(p, (s) => s.title === 'Continue with email');
  await fill(p, '#si-email', 'old@mail.ng');
  await clickText(p, /^Send code$/);
  await until(p, (s) => /6-digit code/.test(s.modal) && !!s.modal);
  await p.waitForSelector('#si-mailcode');
  await fill(p, '#si-mailcode', '123456');
  await clickText(p, /^Continue$/);
  v = await until(p, (s) => s.who === 'u1');
  ok('2c signing in there keeps you on the job', v.who === 'u1' && v.loc === '/tasks/abc' && !v.title, { who: v.who, loc: v.loc });
  await p.ctx.close();

  // 3. /login reached from a job (a members-only link): closing goes back to the job (login-10)
  p = await open();
  await p.goto(origin + '/tasks/xyz');
  await p.click('#to-login');
  v = await until(p, (s) => s.title === 'Sign in to OgaPay');
  ok('3a a members-only link from a job opens /login', v.loc.startsWith('/login'), v.loc);
  await closeSheet(p);
  v = await until(p, (s) => s.loc === '/tasks/xyz');
  ok('3b closing it goes back to the job, not the homepage', v.loc === '/tasks/xyz' && v.job, v.loc);
  await p.ctx.close();

  // 4. A /login link from outside with a job to go to: closing opens the job
  p = await open();
  await p.goto(origin + '/login?redirect=' + encodeURIComponent('/tasks/abc'));
  await until(p, (s) => s.title === 'Sign in to OgaPay');
  await closeSheet(p);
  v = await until(p, (s) => s.loc === '/tasks/abc');
  ok('4a /login?redirect=/tasks/abc opened from a link: closing opens the job', v.loc === '/tasks/abc', v.loc);
  await p.goto(origin + '/login?redirect=' + encodeURIComponent('/wallet'));
  await until(p, (s) => s.title === 'Sign in to OgaPay');
  await closeSheet(p);
  v = await until(p, (s) => s.loc === '/');
  ok('4b ...but a members-only page (/wallet) goes home instead of back to /login', v.loc === '/', v.loc);
  await p.ctx.close();

  // 5. Google comes back to the page you started from (login-14)
  p = await open();
  await p.goto(origin + '/tasks/abc');
  await p.click('#navsignin');
  await until(p, (s) => s.title === 'Sign in to OgaPay');
  await clickText(p, /^Continue with Google/);
  v = await until(p, (s) => s.oauth.length > 0);
  ok('5a Google from the navbar on a job remembers the job', v.after === '/tasks/abc' && v.oauth[0] === 'google', { after: v.after, oauth: v.oauth });
  await p.ctx.close();
  p = await open();
  await p.goto(origin + '/login');
  await until(p, (s) => s.title === 'Sign in to OgaPay');
  await clickText(p, /^Continue with Google/);
  v = await until(p, (s) => s.oauth.length > 0);
  ok('5b ...on /login itself nothing is remembered (the dashboard opens)', v.after === null, v.after);
  await p.ctx.close();
  // Back from Google (existing account): lands on the job
  p = await open({ caseName: 'gold' });
  await p.goto(origin + '/tasks/abc');
  await p.evaluate(() => sessionStorage.setItem('ogapay_after_login', '/tasks/abc'));
  const t0 = Date.now();
  await p.goto(origin + '/auth/callback');
  v = await until(p, (s) => s.loc === '/tasks/abc' && s.who === 'u1', 8000);
  ok('5c back from Google, an existing member lands on the job, signed in', v.loc === '/tasks/abc' && v.token === 'app-access', { loc: v.loc, token: v.token });
  ok('5d ...without the old fixed 1.5 s wait first', Date.now() - t0 < 1500, Date.now() - t0);
  await p.ctx.close();

  // 6. A new Google account: "One last step" with its name and a country (login-23)
  p = await open({ caseName: 'gnew' });
  await p.goto(origin + '/tasks/abc');
  await p.evaluate(() => sessionStorage.setItem('ogapay_after_login', '/tasks/abc'));
  await p.goto(origin + '/auth/callback');
  v = await until(p, (s) => s.title === 'One last step');
  ok('6a a new Google account gets "One last step"', v.title === 'One last step', v.title);
  ok('6b ...with its Google name filled in and a country to pick', v.name === 'Kemi Adeyemi' && v.country === 'NG' && /Where do you live/.test(v.modal), { name: v.name, country: v.country });
  ok('6c ...and is not saved on this device until the step is done', v.token === null, v.token);
  await p.select('#si-country', 'GH');
  await clickText(p, /^Continue$/);
  v = await until(p, (s) => s.token === 'g-access');
  const patch = lastCall(v, '/users/me');
  ok('6d Continue saves Ghana with the new account\'s own token', patch?.method === 'PATCH' && patch.body?.country === 'GH' && patch.body?.firstName === 'Kemi' && patch.auth === 'Bearer g-access', patch);
  v = await until(p, (s) => s.loc === '/tasks/abc' && s.who === 'g9');
  ok('6e ...then signs in and opens the page it started from', v.loc === '/tasks/abc' && v.who === 'g9' && !v.title, { loc: v.loc, who: v.who });
  await p.ctx.close();

  // 6f-6h A phone set to Ghana's time: Ghana first; Skip keeps Ghana
  p = await open({ caseName: 'gnew', tz: 'Africa/Accra' });
  await p.goto(origin + '/auth/callback');
  v = await until(p, (s) => s.title === 'One last step');
  ok('6f a phone on Ghana time starts on Ghana', v.country === 'GH', v.country);
  await clickText(p, /^Skip for now$/);
  v = await until(p, (s) => s.token === 'g-access' && s.loc === '/dashboard');
  const skipPatch = lastCall(v, '/users/me');
  ok('6g Skip still saves Ghana (and nothing else)', skipPatch?.method === 'PATCH' && JSON.stringify(skipPatch.body) === '{"country":"GH"}', skipPatch);
  ok('6h ...and signs in (to the dashboard when no page was waiting)', v.loc === '/dashboard' && v.who === 'g9', { loc: v.loc, who: v.who });
  await p.ctx.close();
  // Skip on Nigeria saves nothing
  p = await open({ caseName: 'gnew', tz: 'Africa/Lagos' });
  await p.goto(origin + '/auth/callback');
  await until(p, (s) => s.title === 'One last step');
  await clickText(p, /^Skip for now$/);
  v = await until(p, (s) => s.token === 'g-access');
  ok('6i Skip on Nigeria saves nothing', !calls(v, '/users/me').some((c) => c.method === 'PATCH'), calls(v, '/users/me'));
  await p.ctx.close();

  // 7. Email typos (login-21)
  p = await open();
  await p.goto(origin + '/login');
  await until(p, (s) => s.title === 'Sign in to OgaPay');
  await clickText(p, /^Email/);
  await until(p, (s) => s.title === 'Continue with email');
  await fill(p, '#si-email', 'ada.obi@gmial.com');
  await clickText(p, /^Send code$/);
  v = await until(p, (s) => /Did you mean/.test(s.modal));
  ok('7a gmial.com: "Did you mean ada.obi@gmail.com?" and no code sent yet', /Did you mean ada\.obi@gmail\.com\?/.test(v.modal) && calls(v, '/auth/email-code/request').length === 0, v.modal);
  await clickText(p, /^Yes, use @gmail\.com$/);
  v = await until(p, (s) => s.email === 'ada.obi@gmail.com');
  ok('7b "Yes" puts the right address in the field', v.email === 'ada.obi@gmail.com' && !/Did you mean/.test(v.modal), v.email);
  await clickText(p, /^Send code$/);
  v = await until(p, (s) => calls(s, '/auth/email-code/request').length === 1);
  ok('7c ...and the code goes to it', lastCall(v, '/auth/email-code/request')?.body?.email === 'ada.obi@gmail.com', lastCall(v, '/auth/email-code/request'));
  await clickText(p, /^Use another email$/);
  await p.waitForSelector('#si-email');
  await fill(p, '#si-email', 'bisi@gmail.con');
  await clickText(p, /^Send code$/);
  v = await until(p, (s) => /Did you mean bisi@gmail\.com/.test(s.modal));
  ok('7d gmail.con is caught too', /Did you mean bisi@gmail\.com\?/.test(v.modal), v.modal);
  await clickText(p, /^No, send to what I typed$/);
  v = await until(p, (s) => calls(s, '/auth/email-code/request').length === 2);
  ok('7e "No" sends to the address as typed', lastCall(v, '/auth/email-code/request')?.body?.email === 'bisi@gmail.con', lastCall(v, '/auth/email-code/request'));
  await clickText(p, /^Use another email$/);
  await p.waitForSelector('#si-email');
  await fill(p, '#si-email', 'kofi@ogapay.app');
  await clickText(p, /^Send code$/);
  v = await until(p, (s) => calls(s, '/auth/email-code/request').length === 3);
  ok('7f a normal address is sent with no question', lastCall(v, '/auth/email-code/request')?.body?.email === 'kofi@ogapay.app' && !/Did you mean/.test(v.modal), v.modal);
  await p.ctx.close();

  // 8. A code check whose answer is lost on slow data (login-11)
  p = await open();
  await p.goto(origin + '/login');
  await until(p, (s) => s.title === 'Sign in to OgaPay');
  await clickText(p, /^Email/);
  await until(p, (s) => s.title === 'Continue with email');
  await fill(p, '#si-email', 'slow@mail.ng');
  await clickText(p, /^Send code$/);
  await p.waitForSelector('#si-mailcode');
  await fill(p, '#si-mailcode', '123456');
  await clickText(p, /^Continue$/);
  v = await until(p, (s) => /connection dropped/.test(s.modal));
  ok('8a a lost answer says to get a new code (it signs in even if the account was made)', /Tap Send a new code/.test(v.modal) && /even if your account was just made/.test(v.modal), v.modal);
  await clickText(p, /^Continue$/);
  v = await until(p, (s) => /probably used/.test(s.modal));
  ok('8b trying the same code again explains it was probably used, not just "wrong"', /probably used when your connection dropped/.test(v.modal), v.modal);
  await p.ctx.close();

  // 9. The verify-email link (login-25)
  p = await open();
  await p.goto(origin + '/verify-email?token=good&userId=u1');
  v = await until(p, (s) => /Email verified/.test(s.body));
  ok('9a signed out: "Email verified" with Open OgaPay', /Email verified/.test(v.body) && /Open OgaPay/.test(v.body), v.body);
  await sleep(3000);
  v = await state(p);
  ok('9b ...and it stays there (no move to a sign-in wall)', v.loc.startsWith('/verify-email') && !v.title, { loc: v.loc, title: v.title });
  await p.evaluate(() => [...document.querySelectorAll('a')].find((a) => /Open OgaPay/.test(a.textContent)).click());
  v = await until(p, (s) => s.loc === '/');
  ok('9c Open OgaPay opens the site', v.loc === '/', v.loc);
  await p.ctx.close();
  p = await open();
  await p.goto(origin + '/verify-email?token=bad&userId=u1');
  v = await until(p, (s) => /doesn't work any more/.test(s.body));
  ok('9d a bad link still says so and offers a new one', /doesn't work any more/.test(v.body) && /Send verification link/.test(v.body), v.body);
  await p.ctx.close();
  p = await open();
  await p.goto(origin + '/');
  await p.evaluate(() => { localStorage.setItem('ogapay_access_token', 'app-access'); localStorage.setItem('ogapay_refresh_token', 'app-refresh'); localStorage.setItem('ogapay_user', JSON.stringify({ id: 'u1' })); localStorage.setItem('ogapay-authenticated', 'true') });
  await p.goto(origin + '/verify-email?token=good&userId=u1');
  v = await until(p, (s) => s.loc === '/dashboard', 5000);
  ok('9e signed in: still goes on to the dashboard', v.loc === '/dashboard', v.loc);
  await p.ctx.close();

  ok('no request left the test server', outside.length === 0, outside);
  await browser.close();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
