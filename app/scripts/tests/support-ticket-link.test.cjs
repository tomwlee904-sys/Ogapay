// The ticket link in a support email, opened signed out (2026-11-02). The page
// said "Sign in to see this ticket", and after signing in it kept saying so: it
// read the token only when it drew itself, and nothing redrew it. The real
// Support page, AuthProvider and SignInHost run in headless Chrome against a
// fake server (support-ticket-link.harness.tsx); only the sign-in dialog and
// the page frame are stand-ins. Every request that isn't the local test page is
// blocked and counted, so nothing reaches the internet.
//   npm run test:support-ticket-link
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
const stubs = path.join(__dirname, 'support-ticket-link.stubs.tsx');
const signinStub = path.join(__dirname, 'support-ticket-link.signin.tsx');
const stubPlugin = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /(components\/Layout|lib\/push)$/ }, () => ({ path: stubs }));
    b.onResolve({ filter: /^\.\/SignInModal$/ }, () => ({ path: signinStub }));
  },
};

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-support-'));
  await build({
    entryPoints: [path.join(__dirname, 'support-ticket-link.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: {
      'support-under-test': path.join(SRC, 'pages/Support.tsx'),
      'signin-host-under-test': path.join(SRC, 'components/auth/SignInHost.tsx'),
      'auth-under-test': path.join(SRC, 'context/AuthContext.tsx'),
      'toast-under-test': path.join(SRC, 'components/Toast.tsx'),
      'signin-lib-under-test': path.join(SRC, 'lib/signin.ts'),
    },
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://api.example.test/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  const html = path.join(dir, 'page.html');
  fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="bundle.js"></script>');
  const pageUrl = 'file:///' + html.replace(/\x5c/g, '/');

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  const open = async (c) => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.goto(pageUrl + '?case=' + c);
    await page.waitForSelector('#loc');
    return page;
  };
  const view = (page) => page.evaluate(() => {
    const modal = document.querySelector('.sp2-thread');
    const calls = window.__calls;
    return {
      loc: document.querySelector('#loc')?.textContent || '',
      navType: document.querySelector('#loc')?.getAttribute('data-type') || '',
      modal: modal ? modal.innerText : null,
      list: document.querySelector('.sp2-list')?.innerText || '',
      signin: document.querySelector('#fake-signin') ? document.querySelector('#fake-signin').getAttribute('data-redirect') : null,
      signins: window.__signins.map((d) => d.redirect ?? null),
      ticketGets: calls.filter((x) => x.path === '/reports/mine/T1').map((x) => x.auth),
    };
  });
  const until = async (page, fn, ms = 4000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await view(page); if (fn(v)) return v; await sleep(40); } return view(page); };
  const click = (page, sel) => page.evaluate((sel) => { const b = document.querySelector(sel); if (!b) throw new Error('no ' + sel); b.click(); }, sel);
  const clickText = (page, scope, label) => page.evaluate((scope, label) => {
    const b = [...document.querySelectorAll(scope + ' button')].find((x) => x.textContent.trim() === label || x.getAttribute('aria-label') === label);
    if (!b) throw new Error('no button ' + label);
    b.click();
  }, scope, label);
  let p, v;

  // 1. Signed out, from the email link
  p = await open('link');
  v = await until(p, (s) => !!s.modal);
  ok('1a signed out: the ticket asks you to sign in', /Sign in to see this ticket/.test(v.modal || ''), v);
  ok('1b ...and nothing is asked of the server yet', v.ticketGets.length === 0, v.ticketGets);
  await clickText(p, '.sp2-thread', 'Sign in');
  v = await until(p, (s) => s.signin !== null);
  ok('1c Sign in opens the sign-in dialog, set to come back to this ticket (Google sign-in too)',
    v.signin === '/support?ticket=T1' && v.signins[0] === '/support?ticket=T1', v);
  await click(p, '#fake-signin-go');
  v = await until(p, (s) => /Your bank rejected the transfer/.test(s.modal || ''));
  ok('1d after signing in the ticket loads by itself, with the team\'s reply', /Your bank rejected the transfer/.test(v.modal || '') && !/Sign in to see this ticket/.test(v.modal || ''), v);
  ok('1e ...asked for once, signed in', v.ticketGets.length === 1 && v.ticketGets[0] === 'Bearer tok-1', v.ticketGets);
  ok('1f ...the dialog is gone and the page is still the ticket', v.signin === null && v.loc === '/support?ticket=T1', v);
  v = await until(p, (s) => /Withdrawal pending/.test(s.list));
  ok('1g My tickets fills in too', /Withdrawal pending/.test(v.list) && /1 reply/.test(v.list), v.list);
  ok('1h signing in did not add a second copy of the page to the history', v.navType !== 'PUSH', v.navType);
  await clickText(p, '.sp2-thread', 'Close');
  v = await until(p, (s) => s.modal === null);
  ok('1i closing the ticket leaves My tickets', v.modal === null && v.loc === '/support', v);
  await p.evaluate(() => window.__nav(-1));
  v = await until(p, (s) => s.loc === '/mail');
  ok('1j ...and Back leaves the page, not back into the ticket', v.loc === '/mail', v);
  await p.close();

  // 2. "New ticket" while signed out comes back to Support after signing in
  p = await open('page');
  await p.waitForSelector('.sp2-tickets-h button');
  await clickText(p, '.sp2-tickets-h', 'New ticket');
  v = await until(p, (s) => s.signin !== null);
  ok('2a New ticket signed out: sign in, then back to Support', v.signin === '/support', v);
  await click(p, '#fake-signin-go');
  v = await until(p, (s) => /Withdrawal pending/.test(s.list));
  ok('2b ...and My tickets loads once signed in', /Withdrawal pending/.test(v.list), v.list);
  await p.close();

  ok('no request left the test page', outside.length === 0, outside);
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
