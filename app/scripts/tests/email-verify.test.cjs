// Verify your email on the dashboard with a code (ver-11, dash-18, login-28,
// 2026-11-11), in headless Chrome. The real Dashboard and EmailCodeBox run
// against a fake server (dashboard.harness.tsx, cases mailcheck, mailwait,
// walletnew); the signed-in member is a stand-in whose refreshUser reads the
// account again. Every request that isn't the local test page is blocked.
//  - "Send me a code" mails a code; the box takes it; a wrong code says why;
//    the right one ticks the step without leaving the page
//  - the old link opened in another app: coming back to the tab ticks the step
//  - "We just sent a code": the server's reason and a countdown from its seconds
//  - a wallet account with no email adds one the same way
//   npm run test:email-verify
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
const stubs = path.join(__dirname, 'dashboard.stubs.tsx');
const stubPlugin = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /(components\/Layout|context\/AuthContext|context\/CurrencyContext|context\/WalletBalanceContext|context\/ThemeContext|\/Toast)$/ }, () => ({ path: stubs }));
  },
};

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-mailcode-'));
  await build({
    entryPoints: [path.join(__dirname, 'dashboard.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: {
      'dashboard-under-test': path.join(SRC, 'pages/Dashboard.tsx'),
      'navbar-under-test': path.join(SRC, 'components/Navbar.tsx'),
      'drawer-under-test': path.join(SRC, 'components/Drawer.tsx'),
    },
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://api.example.test/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  const html = path.join(dir, 'page.html');
  fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><title>t</title><div id="root"></div><script src="bundle.js"></script>');
  const pageUrl = 'file:///' + html.replace(/\x5c/g, '/');

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  const open = async (c) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { if (r.resourceType() !== 'image') outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.goto(pageUrl + '?case=' + c);
    await page.waitForSelector('#loc');
    return page;
  };
  // The "Verify your email" (or "Add your email") step of "Finish setting up"
  const step = (page) => page.evaluate(() => {
    const li = [...document.querySelectorAll('.db-steps li')].find((x) => /your email/.test(x.querySelector('strong')?.textContent || ''));
    return li ? {
      label: li.querySelector('strong').textContent,
      done: li.classList.contains('done'),
      text: li.textContent.replace(/\s+/g, ' ').trim(),
      buttons: [...li.querySelectorAll('button')].map((b) => ({ t: b.textContent.trim(), d: b.disabled })),
      inputs: [...li.querySelectorAll('input')].map((i) => ({ label: i.getAttribute('aria-label'), value: i.value, size: getComputedStyle(i).fontSize })),
      focused: document.activeElement?.getAttribute('aria-label') || '',
    } : null;
  });
  const calls = (page, p) => page.evaluate((x) => window.__calls.filter((c) => c.path === x), p);
  const click = (page, re) => page.evaluate((src) => {
    const b = [...document.querySelectorAll('.db-steps button')].find((x) => new RegExp(src).test(x.textContent.trim()));
    if (!b) throw new Error('no button ' + src);
    b.click();
  }, re.source);
  const until = async (page, fn, ms = 4000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await step(page); if (v && fn(v)) return v; await sleep(50); } return step(page); };
  const typeIn = async (page, label, text) => {
    const sel = `.db-steps input[aria-label="${label}"]`;
    await page.$eval(sel, (i) => { i.focus(); i.select(); });
    await page.keyboard.press('Backspace');
    await page.type(sel, text);
  };
  let p, v;

  // 1. Send a code, type it in, the step ticks
  p = await open('mailcheck');
  v = await until(p, (s) => s.buttons.length > 0);
  ok('1a the step asks to verify by code, not by link', v.label === 'Verify your email' && v.buttons.some((b) => b.t === 'Send me a code') && !/link again/i.test(v.text), v);
  await click(p, /^Send me a code$/);
  v = await until(p, (s) => s.inputs.length > 0);
  ok('1b a code box opens with the server\'s answer and focus in the box', /We sent a 6-digit code to tunde@mail\.ng/.test(v.text) && v.focused === '6-digit code from the email', v);
  ok('1c ...16px text so iPhones don\'t zoom', v.inputs[0].size === '16px', v.inputs);
  const resend = v.buttons.find((b) => /Send a new code/.test(b.t));
  ok('1d "Send a new code" waits, with a countdown', !!resend && resend.d === true && /Send a new code in (1:00|0:5\d)/.test(resend.t), v.buttons);
  ok('1e one request, signed in', (await calls(p, '/auth/verify-email/code/request')).length === 1 && (await calls(p, '/auth/verify-email/code/request'))[0].auth === 'Bearer tok-vet');
  await typeIn(p, '6-digit code from the email', '11a1111');
  v = await step(p);
  ok('1f the box keeps digits only, 6 at most', v.inputs[0].value === '111111', v.inputs);
  await click(p, /^Verify$/);
  v = await until(p, (s) => /wrong or has expired/.test(s.text));
  ok('1g a wrong code says why and the step stays open', /wrong or has expired/.test(v.text) && !v.done, v);
  await typeIn(p, '6-digit code from the email', '123456');
  await click(p, /^Verify$/);
  v = await until(p, (s) => s.done, 4000);
  ok('1h the right code ticks the step without leaving the page', !!v && v.done && (await p.evaluate(() => document.querySelector('#loc').textContent)) === '/dashboard', v);
  const confirm = await calls(p, '/auth/verify-email/code/confirm');
  ok('1i ...sending the code once per tap', confirm.length === 2 && confirm[1].body?.code === '123456', confirm);
  await p.close();

  // 2. The old link opened in the mail app: back to this tab, the step ticks (dash-18)
  p = await open('mailcheck');
  v = await until(p, (s) => s.buttons.length > 0);
  ok('2a (setup) not verified yet', !v.done, v);
  await p.evaluate(() => { window.__verified = true; Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  v = await until(p, (s) => s.done);
  ok('2b coming back to the tab reads the account again and ticks the step', !!v && v.done && (await p.evaluate(() => window.__refreshes)) >= 1, v);
  await p.close();

  // 3. The server says wait: its reason and a countdown from its seconds (login-28)
  p = await open('mailwait');
  v = await until(p, (s) => s.buttons.length > 0);
  await click(p, /^Send me a code$/);
  v = await until(p, (s) => /We just sent a code/.test(s.text));
  const wait = v.buttons.find((b) => /Send a new code/.test(b.t));
  ok('3a "We just sent a code" shows the server\'s reason', /We just sent a code\. Wait a minute/.test(v.text), v);
  ok('3b ...and counts down from the 42 seconds it gave', !!wait && wait.d && /Send a new code in 0:(42|41|40)/.test(wait.t), v.buttons);
  ok('3c ...with the code box open for the code already sent', v.inputs.length === 1, v.inputs);
  await sleep(2100);
  v = await step(p);
  const later = v.buttons.find((b) => /Send a new code/.test(b.t));
  ok('3d ...and the countdown goes down', !!later && /Send a new code in 0:(40|39|38)/.test(later.t), v.buttons);
  await p.close();

  // 4. A wallet account with no email adds one by code
  p = await open('walletnew');
  v = await until(p, (s) => s.inputs.length > 0);
  ok('4a the step says Add your email, with an email box', v.label === 'Add your email' && v.inputs[0].label === 'Your email address', v);
  await typeIn(p, 'Your email address', 'not-an-email');
  await click(p, /^Send code$/);
  v = await until(p, (s) => /name@example\.com/.test(s.text));
  ok('4b a mistyped email is caught before sending', /name@example\.com/.test(v.text) && (await calls(p, '/auth/email/add/request')).length === 0, v);
  await typeIn(p, 'Your email address', 'wally@mail.ng');
  await click(p, /^Send code$/);
  v = await until(p, (s) => s.inputs.some((i) => i.label === '6-digit code from the email'));
  ok('4c the code goes to the new email', (await calls(p, '/auth/email/add/request'))[0]?.body?.email === 'wally@mail.ng', await calls(p, '/auth/email/add/request'));
  await typeIn(p, '6-digit code from the email', '123456');
  await click(p, /^Add email$/);
  v = await until(p, (s) => s.done);
  ok('4d the right code adds the email and ticks the step', !!v && v.done && (await calls(p, '/auth/email/add/confirm'))[0]?.body?.email === 'wally@mail.ng', v);
  await p.close();

  ok('no request left the test page', outside.length === 0, outside);
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
