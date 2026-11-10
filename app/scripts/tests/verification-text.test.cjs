// What Settings → Verification and the Send money modal tell people (audit
// LOGIN-DASHBOARD-VERIFY, 2026-11-10): the real components in headless Chrome
// against a fake server (verification-text.harness.tsx). Every request that
// isn't the local test page is blocked and counted, so nothing reaches the internet.
//  - ver-1: the bank check says it turns on withdrawals, not the ₦1,000 bonus
//  - ver-3: sending money needs a NIN or ID; a bank-only Level 1 is told before the form
//  - ver-6: a NIN sent to our team is a calm waiting message, red only for real errors
//  - ver-13: VeryAI waiting text is calm, red only for real failures
//   npm run test:verification-text
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
const stubs = path.join(__dirname, 'verification-text.stubs.tsx');
const stubPlugin = { name: 'stubs', setup(b) { b.onResolve({ filter: /context\/AuthContext$/ }, () => ({ path: stubs })) } };

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-verif-'));
  await build({
    entryPoints: [path.join(__dirname, 'verification-text.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: {
      'verification-under-test': path.join(SRC, 'pages/settings/Verification.tsx'),
      'transfer-under-test': path.join(SRC, 'components/TransferModal.tsx'),
      'toast-under-test': path.join(SRC, 'components/Toast.tsx'),
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
    await page.waitForSelector('#ready');
    await sleep(150);
    return page;
  };
  const view = (page) => page.evaluate(() => ({
    text: document.body.innerText,
    red: [...document.querySelectorAll('.st2-err')].map((e) => e.textContent.trim()).filter(Boolean),
    calm: [...document.querySelectorAll('p.st2-muted[role=status]')].map((e) => e.textContent.trim()),
    banners: [...document.querySelectorAll('.st2-banner')].map((e) => e.textContent.trim()),
    calls: window.__calls,
    forms: document.querySelectorAll('input').length,
  }));
  const until = async (page, fn, ms = 4000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await view(page); if (fn(v)) return v; await sleep(40); } return view(page); };
  const clickText = (page, label) => page.evaluate((label) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === label);
    if (!b) throw new Error('no button ' + label);
    b.click();
  }, label);
  const setDob = (page, value) => page.$eval('input[type=date]', (el, value) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  let p, v;

  // ── ver-1 / ver-3: the levels card and the bank panel ──
  p = await open('bank0');
  v = await until(p, (s) => /Verify with your bank account/.test(s.text));
  ok('1a the bank panel says it turns on withdrawals and not the ₦1,000 bonus or sending',
    /This turns on withdrawals\. It doesn't count for the ₦1,000 first job bonus or for sending money: those need your NIN or ID\./.test(v.text), v.text);
  ok('1b "Any level lets you" no longer promises sending money', /Any level lets you withdraw to your bank and get your own account number\./.test(v.text) && !/Any level lets you[^.]*send money/.test(v.text), v.text);
  ok('1c ...and says what sending money really needs', /Sending money to other members needs your NIN or ID \(Level 1 by NIN, or Level 2\)\. The bank account check lets you withdraw, but not send\./.test(v.text), v.text);
  ok('1d the Level 1 row says the bank account lets you withdraw', /Your bank account \(free, lets you withdraw\) or your NIN/.test(v.text), v.text);
  ok('1e no "selfie" on the page (Didit off)', !/selfie/i.test(v.text), v.text.match(/.{40}selfie.{40}/gi));
  await p.close();

  p = await open('bank1');
  v = await until(p, (s) => s.banners.length > 0);
  ok('1f bank-verified Level 1: told plainly the bonus and sending need an ID photo (Level 2)',
    v.banners.some((b) => /Your bank account verified you, so you can withdraw\. For the ₦1,000 first job bonus and to send money, send a photo of your ID \(Level 2\)\./.test(b)), v.banners);
  v = await until(p, (s) => /Get Level 2: send your ID to our team/.test(s.text));
  ok('1g ...and the Level 2 ID form is right there', /Get Level 2: send your ID to our team/.test(v.text), v.text);
  await p.close();

  p = await open('nin1');
  v = await until(p, (s) => /Get Level 2/.test(s.text));
  ok('1h NIN-verified Level 1: no bank-only notice (bad case: not shown to the wrong person)', !v.banners.some((b) => /Your bank account verified you/.test(b)), v.banners);
  await p.close();

  // ── ver-6: NIN sent to our team ──
  p = await open('nin0');
  await until(p, (s) => s.forms >= 2);
  await p.type('input[inputmode=numeric]', '20419385761');
  await setDob(p, '1995-04-02');
  await clickText(p, 'Verify NIN');
  v = await until(p, (s) => s.calm.length > 0 || s.red.length > 0);
  ok('2a a NIN sent to our team: the calm "Sent" message', v.calm.some((t) => /Sent\. Our team checks your NIN, usually within a day/.test(t)), v);
  ok('2b ...not in red', v.red.length === 0, v.red);
  ok('2c ...and it really was sent', v.calls.filter((x) => x.path === '/kyc/submit').length === 1, v.calls);
  // Bad cases: a real error from the server, and a missing field, are red
  await p.evaluate(() => { window.__nin = 'bad' });
  await p.type('input[inputmode=numeric]', '11111111111');
  await setDob(p, '1995-04-02');
  await clickText(p, 'Verify NIN');
  v = await until(p, (s) => s.red.length > 0);
  ok('2d a NIN the server refuses is shown in red', v.red.some((t) => /isn't a real NIN/.test(t)) && v.calm.length === 0, v);
  await p.evaluate(() => { const el = document.querySelector('input[inputmode=numeric]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ''); el.dispatchEvent(new Event('input', { bubbles: true })); });
  await clickText(p, 'Verify NIN');
  v = await until(p, (s) => s.red.some((t) => /11 digits/.test(t)));
  ok('2e a missing NIN is shown in red and not sent', v.red.some((t) => /Enter all 11 digits/.test(t)) && v.calls.filter((x) => x.path === '/kyc/submit').length === 2, v);
  await p.close();

  // ── ver-13: VeryAI ──
  p = await open('veryWait');
  v = await until(p, (s) => s.calm.length > 0);
  ok('3a waiting for VeryAI (quiet look on opening): calm, not red', v.calm.some((t) => /hasn't confirmed your scan yet/.test(t)) && v.red.length === 0, v);
  await clickText(p, 'Check again');
  await sleep(250);
  v = await view(p);
  ok('3b Check again while still waiting: still calm, not red', v.calm.some((t) => /hasn't confirmed/.test(t)) && v.red.length === 0, v);
  await p.close();

  p = await open('veryFail');
  v = await until(p, (s) => s.calm.length > 0 || s.red.length > 0);
  ok('3c an old failed check seen on opening: shown as news, not a fresh red error', v.calm.some((t) => /didn't go through/.test(t)) && v.red.length === 0, v);
  await clickText(p, 'Check again');
  v = await until(p, (s) => s.red.length > 0);
  ok('3d Check again on a failed check: red (a real failure)', v.red.some((t) => /didn't go through/.test(t)), v);
  await p.close();

  p = await open('veryOld');
  v = await until(p, (s) => s.calm.length > 0 || s.red.length > 0);
  ok('3e an older server with no tone: calm, never red', v.calm.length > 0 && v.red.length === 0, v);
  await p.close();

  p = await open('veryDown');
  await sleep(250);
  await clickText(p, 'Check again');
  v = await until(p, (s) => s.red.length > 0);
  ok('3f the server unreachable on Check again: red', v.red.length === 1, v);
  await p.close();

  // ── ver-3: Send money ──
  p = await open('sendBank');
  v = await until(p, (s) => /Send money/.test(s.text));
  ok('4a bank-only Level 1: told before the form that sending needs a NIN or ID', /Sending money to other members needs your NIN or ID/.test(v.text) && /Send a photo of your ID to our team for Level 2/.test(v.text), v.text);
  ok('4b ...no form to fill in, no balance fetched', !/Available:/.test(v.text) && !v.calls.some((x) => x.path === '/wallet/balance'), v);
  await p.close();

  p = await open('sendNin');
  v = await until(p, (s) => /Available:/.test(s.text) && /2,500/.test(s.text));
  ok('4c NIN-verified Level 1: the Send form opens', /Available:/.test(v.text) && !/needs your NIN or ID/.test(v.text), v.text);
  await p.close();

  p = await open('sendNone');
  v = await until(p, (s) => /Send money/.test(s.text));
  ok('4d not verified at all: told to verify, with no Level 1 promise', /Sending money and tips needs your NIN or ID\. Verify your identity first\./.test(v.text) && !/Available:/.test(v.text), v.text);
  await p.close();

  p = await open('tipWorkBank');
  v = await until(p, (s) => /Available:/.test(s.text));
  ok('4e a poster tipping approved work on their own job (bank Level 1 is enough on the server): the form opens', /Tip @tunde/.test(v.text) && /Available:/.test(v.text), v.text);
  await p.close();

  ok('nothing left the page', outside.length === 0, outside);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
