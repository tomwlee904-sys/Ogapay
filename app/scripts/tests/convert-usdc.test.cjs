// Convert USDC to naira on the website: the real Wallet page and its Convert
// sheet, driven in headless Chrome against a fake server (convert-usdc.harness.tsx),
// plus the FAQ answer and the admin conversions note. Every request that isn't
// the local test page is blocked and counted, so nothing reaches the internet.
//   npm run test:convert-usdc
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
const stubs = path.join(__dirname, 'convert-usdc.stubs.tsx');
// The page frame and the signed-in person are stand-ins; everything else is real
const stubPlugin = { name: 'stubs', setup(b) { b.onResolve({ filter: /(components\/Layout|context\/AuthContext|context\/WalletBalanceContext)$/ }, () => ({ path: stubs })) } };

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAUSED = "Converting is paused for a few minutes because we can't get a fresh naira price. Your USDC is safe. Please try again shortly.";
const TIMED_OUT = "We didn't get an answer in time, so it may have gone through. Check the USDC available above, and your history, before you try again.";

(async () => {
  // ── The FAQ answer (built for Node, read from the real TOPICS list) ──
  const out = await build({ entryPoints: [path.join(SRC, 'pages/FAQ.tsx')], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', write: false, plugins: [stubPlugin], logLevel: 'error', external: ['react', 'react-dom', 'react-router-dom'] });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
  const qa = m.exports.TOPICS.flatMap((t) => t.items || t.qs || t.questions || []).find((x) => /turn my USDC into naira/i.test(x.q));
  const a = qa ? qa.a : '';
  ok('FAQ: no fee, and the rate and exact naira first', /no fee/i.test(a) && /rate and the exact naira amount before you confirm/i.test(a), a);
  ok('FAQ: held USDC cannot be converted', /held for a job or a withdrawal cannot be converted/i.test(a), a);
  ok('FAQ: no fresh price pauses converting', /can't get a fresh naira price, converting pauses for a few minutes/i.test(a), a);
  ok('FAQ: automatic conversion converts new USDC as it arrives', /automatic conversion in Settings/i.test(a) && /as it arrives/i.test(a), a);
  ok('FAQ: if there is no fresh price then, it stays USDC to convert by hand', /If we can't get a fresh price when it arrives, it stays USDC and you can convert it by hand\./.test(a), a);

  // ── The pages, in headless Chrome ──
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-convert-'));
  await build({
    entryPoints: [path.join(__dirname, 'convert-usdc.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: { 'wallet-under-test': path.join(SRC, 'pages/Wallet.tsx'), 'admin-under-test': path.join(SRC, 'pages/Admin.tsx') },
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://api.example.test/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  const html = path.join(dir, 'page.html');
  fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="bundle.js"></script>');
  const pageUrl = 'file:///' + html.replace(/\x5c/g, '/');

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  const newPage = async (query) => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.goto(pageUrl + query);
    return page;
  };
  // The Wallet page with the Convert sheet open (150 USDC available unless set)
  const openSheet = async (setup = {}) => {
    const page = await newPage('?page=wallet');
    await page.evaluate((s) => Object.assign(window, s), setup);
    await page.waitForSelector('.wl-coin-btn');
    await page.evaluate(() => document.querySelector('.wl-coin-btn').click());
    await page.waitForSelector('#cv-amt');
    return page;
  };
  const state = (page) => page.evaluate(() => {
    const cv = document.querySelector('.wl-cv');
    const btns = [...(cv ? cv.querySelectorAll('.ui-actions button') : [])];
    const main = btns[btns.length - 1];
    const calls = window.__calls;
    return {
      open: !!document.querySelector('.wl-sheet'),
      amount: document.querySelector('#cv-amt')?.value ?? null,
      alert: cv?.querySelector('[role=alert] span')?.textContent || '',
      btn: main?.textContent || '', disabled: !!main?.disabled,
      rate: cv?.querySelector('.wl-cv-sum div b')?.textContent || '',
      note: cv?.querySelector('.wl-note')?.textContent || '',
      done: document.querySelector('.wl-cv-done')?.textContent || '',
      balance: document.querySelector('.wl-bal-num')?.textContent || '',
      usdcChip: !!document.querySelector('.wl-coin-btn'),
      quotes: calls.filter((c) => c.path === '/wallet/convert/quote').length,
      converts: calls.filter((c) => c.path === '/wallet/convert' && c.method === 'POST').map((c) => JSON.parse(c.body)),
      balanceCalls: calls.filter((c) => c.path === '/wallet/balance').length,
    };
  });
  const set = (page, k, v) => page.evaluate((k, v) => { window[k] = v; }, k, v);
  const clickMain = (page) => page.evaluate(() => { const b = [...document.querySelectorAll('.wl-cv .ui-actions button')]; b[b.length - 1].click(); });
  const chip = (page, label) => page.evaluate((l) => [...document.querySelectorAll('.wl-cv .ui-chip')].find((b) => b.textContent === l).click(), label);
  // Select what's in the box and type over it, like a person would
  const retype = async (page, text) => { await page.$eval('#cv-amt', (el) => { el.focus(); el.select(); }); await page.keyboard.press('Backspace'); await page.type('#cv-amt', text); };
  let p, s;

  // 1. The rate is paused, then Max is tapped again (the same 150): the reason
  // stays and the button still offers to try again, not a stuck "Getting the rate…"
  p = await openSheet({ __quoteMode: 'paused' }); await chip(p, 'Max'); await sleep(900);
  s = await state(p);
  ok('1a paused rate: the message shows and the button offers to try again', s.alert === PAUSED && s.btn === 'Try again' && !s.disabled, s);
  await set(p, '__quoteMode', 'ok'); await chip(p, 'Max'); await sleep(1000);
  s = await state(p);
  ok('1b Max again (same amount): the message stays', s.amount === '150' && s.alert === PAUSED, s);
  ok('1c ...and the button is not stuck', s.btn === 'Try again' && !s.disabled, s);
  await clickMain(p); await sleep(700);
  s = await state(p);
  ok('1d Try again gets the rate', s.quotes === 2 && s.btn === 'Convert to ₦201,642.00' && !s.alert, s);
  await p.close();

  // 2. The rate is paused, then "." and "0" are typed after "100" (still 100)
  p = await openSheet({ __quoteMode: 'paused' }); await p.type('#cv-amt', '100'); await sleep(900);
  await set(p, '__quoteMode', 'ok'); await p.type('#cv-amt', '.'); await sleep(1000);
  s = await state(p);
  ok('2a typing "." keeps the message and the Try again button', s.amount === '100.' && s.alert === PAUSED && s.btn === 'Try again' && !s.disabled, s);
  await p.type('#cv-amt', '0'); await sleep(1000);
  s = await state(p);
  ok('2b typing a trailing 0 too', s.amount === '100.0' && s.alert === PAUSED && s.btn === 'Try again' && !s.disabled, s);
  await clickMain(p); await sleep(700);
  s = await state(p);
  ok('2c Try again gets the rate for 100', s.btn === 'Convert to ₦134,428.00' && !s.alert, s);
  await p.close();

  // 3. Converting is paused (503) on confirm, then Max is tapped again
  p = await openSheet(); await chip(p, 'Max'); await sleep(900);
  const before = (await state(p)).balanceCalls;
  await set(p, '__convertMode', 'paused'); await clickMain(p); await sleep(1200);
  s = await state(p);
  ok('3a the paused message stays, the old rate is gone', s.alert === PAUSED && s.rate === '—' && s.btn === 'Try again' && !s.disabled, s);
  ok('3b no quote behind the error, the balance was refreshed, the sheet is open', s.quotes === 1 && s.balanceCalls > before && s.open, s);
  await chip(p, 'Max'); await sleep(1000);
  s = await state(p);
  ok('3c Max again: the message and Try again stay', s.alert === PAUSED && s.btn === 'Try again' && !s.disabled && s.quotes === 1, s);
  await set(p, '__convertMode', 'ok'); await clickMain(p); await sleep(700);
  s = await state(p);
  ok('3d Try again asks for a rate and does not convert', s.quotes === 2 && s.converts.length === 1 && s.btn === 'Convert to ₦201,642.00', s);
  await clickMain(p); await sleep(900);
  s = await state(p);
  ok('3e then converting works', /150 USDC converted/.test(s.done) && /₦201,642\.00 is now in your naira balance/.test(s.done), s.done);
  await p.close();

  // 4. A different number does clear the old message and gets its own rate
  p = await openSheet({ __quoteMode: 'paused' }); await p.type('#cv-amt', '100'); await sleep(900);
  await set(p, '__quoteMode', 'ok'); await p.keyboard.press('Backspace'); await sleep(1000);
  s = await state(p);
  ok('4a 100 -> 10: message cleared, new rate shown', s.amount === '10' && !s.alert && s.btn === 'Convert to ₦13,442.80', s);
  await p.close();

  // 5. Timed out, and the balance refresh fails too (patchy data)
  p = await openSheet(); await p.type('#cv-amt', '100'); await sleep(900);
  const callsBefore = (await state(p)).balanceCalls;
  await p.evaluate(() => { window.__convertMode = 'timeout'; window.__balanceMode = 'fail'; });
  await clickMain(p); await sleep(1200);
  s = await state(p);
  ok('5a the "may have gone through" message shows', s.alert === TIMED_OUT, s.alert);
  ok('5b it points at the USDC available above, not below', /above/.test(s.alert) && !/below/.test(s.alert), s.alert);
  ok('5c a refresh was tried', s.balanceCalls > callsBefore, s);
  ok('5d the failed refresh keeps the last known USDC (not 0)', /^150 USDC available/.test(s.note), s.note);
  ok('5e the button offers to try again (not "Enter an amount")', s.btn === 'Try again' && !s.disabled, s);
  ok('5f the wallet behind still shows the last balance, not ₦0.00', s.balance === '₦2,500.00' && s.usdcChip, s);
  await p.close();

  // 6. Timed out but it went through: the refresh shows less USDC than the
  // amount typed. The "may have gone through" message stays ahead of "You have…"
  p = await openSheet(); await p.type('#cv-amt', '100'); await sleep(900);
  await p.evaluate(() => { window.__convertMode = 'timeout'; window.__usdc = 50; });
  await clickMain(p); await sleep(1200);
  s = await state(p);
  ok('6a the timeout message stays when the new balance is below the amount', s.alert === TIMED_OUT, s.alert);
  ok('6b the USDC available above is the new one', /^50 USDC available/.test(s.note), s.note);
  await set(p, '__convertMode', 'ok'); await retype(p, '40'); await sleep(1000);
  s = await state(p);
  ok('6c a new amount clears it and gets a rate', s.amount === '40' && !s.alert && s.btn === 'Convert to ₦53,771.20', s);
  await retype(p, '60'); await sleep(600);
  s = await state(p);
  ok('6d more than available still says so', s.alert === 'You have 50 USDC available.' && s.disabled, s);
  await p.close();

  // 7. Not enough USDC: the reason stays, the balance refreshes, Try again re-quotes
  p = await openSheet(); await p.type('#cv-amt', '100'); await sleep(900);
  await set(p, '__convertMode', 'notEnough'); await clickMain(p); await sleep(1200);
  s = await state(p);
  ok('7a "Not enough USDC" stays on screen', s.alert === 'Not enough USDC available. Some may be held for a job or a withdrawal.', s.alert);
  ok('7b no second quote behind the error; sheet open; Try again', s.quotes === 1 && s.open && !s.done && s.btn === 'Try again', s);
  await set(p, '__convertMode', 'ok'); await clickMain(p); await sleep(700);
  s = await state(p);
  ok('7c Try again gets a fresh quote and does not convert', s.quotes === 2 && s.converts.length === 1 && s.btn === 'Convert to ₦134,428.00' && !s.alert, s);
  await p.close();

  // 8. The rate changed (409): the new amount comes with the reply
  p = await openSheet(); await p.type('#cv-amt', '100'); await sleep(900);
  await set(p, '__convertMode', 'rateChanged'); await clickMain(p); await sleep(1200);
  s = await state(p);
  ok('8a the rate-changed message stays', s.alert === "The rate changed. You'd now get ₦134,000.00. Check and confirm again.", s.alert);
  ok('8b the new amount is from the 409 reply (no extra quote)', s.btn === 'Convert to ₦134,000.00' && s.quotes === 1 && s.rate === '₦1,340 per USDC', s);
  await set(p, '__convertMode', 'ok'); await clickMain(p); await sleep(900);
  s = await state(p);
  ok('8c confirming again sends the new naira and converts', s.converts[1] && s.converts[1].expectedNgn === 134000 && /₦134,000\.00 is now in your naira balance/.test(s.done), s);
  await p.close();

  // 9. A late quote for an old amount is ignored
  p = await openSheet({ __quoteMode: 'slowFirst' }); await p.type('#cv-amt', '1'); await sleep(100);
  s = await state(p);
  ok('9a during the short pause the button waits for the rate (not "Try again")', s.btn === 'Getting the rate…' && s.disabled && s.rate === '…', s);
  await sleep(500);
  s = await state(p);
  ok('9b while the rate is on its way too', s.btn === 'Getting the rate…' && s.disabled && s.quotes === 1, s);
  await p.type('#cv-amt', '0'); await sleep(2500);
  s = await state(p);
  ok('9c the quote matches the amount typed (10 USDC)', s.btn === 'Convert to ₦13,442.80', s.btn);
  await p.close();

  // 10. Success
  p = await openSheet(); await p.type('#cv-amt', '100'); await sleep(900);
  await clickMain(p); await sleep(900);
  s = await state(p);
  ok('10a converted screen', /100 USDC converted/.test(s.done) && /₦134,428\.00/.test(s.done), s.done);
  await p.close();

  // 11. Admin: the note says which figure to go by
  p = await newPage('?page=admin');
  await p.waitForFunction(() => document.querySelector('[aria-labelledby=admin-conv-h] dl'), { timeout: 5000 }).catch(() => {});
  const text = await p.evaluate(() => document.querySelector('[aria-labelledby=admin-conv-h]')?.innerText || '');
  ok('11a admin: the note (contract wording)', text.includes("Members' converted USDC now belongs to OgaPay in the platform Solana wallet. Sell about this much to cover the naira they can withdraw"), text);
  ok('11b admin: it says to count only what was converted since you last sold', /counting only the USDC converted since you last sold \(all time includes what you've already sold\)\./.test(text), text);
  ok('11c admin: the totals are still shown', text.includes('210.25 USDC → ₦282,634.67 (6 conversions)') && text.includes('1,250.50 USDC → ₦1,679,040.12 (41 conversions)'), text);
  await p.close();

  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  ok('no request left the page', outside.length === 0, outside);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
