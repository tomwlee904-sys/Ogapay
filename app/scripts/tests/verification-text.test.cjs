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
    selects: document.querySelectorAll('select').length,
    links: [...document.querySelectorAll('a')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim(), around: a.parentElement?.textContent.replace(/\s+/g, ' ').trim() })),
  }));
  const until = async (page, fn, ms = 4000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await view(page); if (fn(v)) return v; await sleep(40); } return view(page); };
  const clickText = (page, label) => page.evaluate((label) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === label);
    if (!b) throw new Error('no button ' + label);
    b.click();
  }, label);
  // Date of birth is three selects (day, month, year) since ver-16; value 'YYYY-MM-DD'
  const setDob = async (page, value) => {
    const [y, m, d] = value.split('-').map(Number);
    await page.select('select[aria-label=Day]', String(d));
    await page.select('select[aria-label=Month]', String(m));
    await page.select('select[aria-label=Year]', String(y));
  };
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

  p = await open('bank1Pending');
  v = await until(p, (s) => /Your ID is with our team/.test(s.text));
  ok('1i bank Level 1 with an ID photo waiting: told it is with our team', /Your ID is with our team/.test(v.text), v.text);
  ok('1j ...and not also asked to send a photo of their ID', !v.banners.some((b) => /send a photo of your ID/.test(b)), v.banners);
  await p.close();

  // ── ver-6: NIN sent to our team ──
  p = await open('nin0');
  await until(p, (s) => s.forms >= 1 && s.selects >= 3);
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

  p = await open('veryOther');
  v = await until(p, (s) => /different OgaPay account/.test(s.text));
  ok('3g a scan saved for another account: shown as information, not red', v.calm.some((t) => /different OgaPay account/.test(t)) && v.red.length === 0, v);
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

  p = await open('sendCachedL1');
  v = await until(p, (s) => /Send money/.test(s.text));
  ok('4f a cached Level 1 user with no kyc details (before /auth/me): fails closed, told sending needs a NIN or ID', /Sending money to other members needs your NIN or ID/.test(v.text) && !/Available:/.test(v.text), v.text);
  await p.close();

  p = await open('sendCachedL2');
  v = await until(p, (s) => /Available:/.test(s.text));
  ok('4g a cached Level 2 user: Level 2 is always an ID check, the form opens', /Available:/.test(v.text) && !/needs your NIN or ID/.test(v.text), v.text);
  await p.close();

  p = await open('tipWorkBank');
  v = await until(p, (s) => /Available:/.test(s.text));
  ok('4e a poster tipping approved work on their own job (bank Level 1 is enough on the server): the form opens', /Tip @tunde/.test(v.text) && /Available:/.test(v.text), v.text);
  await p.close();

  // ── ver-15: every name link goes to Edit profile, in the same words ──
  const nameLinks = (v) => v.links.filter((l) => /name/i.test(l.around || '') && /change it|add your name|Edit profile|account/i.test(l.around || ''));
  p = await open('bank0');
  await until(p, (s) => /Verify with your bank account/.test(s.text));
  await clickText(p, 'Use your NIN instead');
  v = await until(p, (s) => s.selects >= 3);
  let nl = nameLinks(v);
  ok('6a bank panel + NIN form: two name links, both to /edit-profile, both called "Edit profile"', nl.length === 2 && nl.every((l) => l.href === '/edit-profile' && l.text === 'Edit profile'), nl);
  ok('6b both say "Change it in Edit profile first" and that it can\'t change after verifying', nl.every((l) => /change it in Edit profile first\. You can't change it after you're verified\./i.test(l.around)), nl.map((l) => l.around));
  ok('6c no link to Settings, Account for the name', !v.links.some((l) => l.href === '/settings/account'), v.links);
  await p.close();
  p = await open('bank0NoName');
  v = await until(p, (s) => /Verify with your bank account/.test(s.text));
  nl = nameLinks(v);
  ok('6d no name yet: "First, add your name in Edit profile"', nl.length === 1 && nl[0].href === '/edit-profile' && nl[0].text === 'Edit profile' && /First, add your name in Edit profile, exactly as it is on your bank account\./.test(nl[0].around), nl);
  await p.close();
  p = await open('ninInstant0');
  v = await until(p, (s) => s.selects >= 3);
  nl = nameLinks(v);
  ok('6e NIN checked with NIMC: the name link is Edit profile too', nl.length === 1 && nl[0].href === '/edit-profile' && nl[0].text === 'Edit profile' && /must match your NIN\. If it doesn't, change it in Edit profile first\./.test(nl[0].around), nl);
  await p.close();
  p = await open('nin1');
  v = await until(p, (s) => /Get Level 2/.test(s.text));
  ok('6f already verified (name locked): no "change your name" link', nameLinks(v).length === 0, nameLinks(v));
  await p.close();

  // ── ver-16: date of birth opens near 2000, 18+ only ──
  p = await open('nin0');
  v = await until(p, (s) => s.selects >= 3);
  const years = await p.$$eval('select[aria-label=Year] option', (os) => os.map((o) => o.value).filter(Boolean).map(Number));
  const top = new Date().getFullYear() - 18;
  ok('7a no date picker that opens on today: day / month / year selects', v.selects === 3 && !(await p.$('input[type=date]')), v.selects);
  ok('7b the year list starts at 18 years ago, newest first, and 2000 is in the first 30', years[0] === top && years[1] === top - 1 && years.indexOf(2000) >= 0 && years.indexOf(2000) < 30, years.slice(0, 12));
  ok('7c no year that would make you younger than 18; goes back 100 years', Math.max(...years) === top && Math.min(...years) === top - 82, [Math.max(...years), Math.min(...years)]);
  ok('7d the form says you must be 18 or older', /You must be 18 or older\./.test(v.text), v.text);
  const sentBefore = v.calls.filter((x) => x.path === '/kyc/submit').length;
  await p.type('input[inputmode=numeric]', '20419385761');
  // Born later this year, 18 years ago: still 17 today
  const t = new Date(); const later = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
  if (later.getFullYear() === t.getFullYear()) {
    await setDob(p, `${top}-${String(later.getMonth() + 1).padStart(2, '0')}-${String(later.getDate()).padStart(2, '0')}`);
    await clickText(p, 'Verify NIN');
    v = await until(p, (s) => s.red.length > 0);
    ok('7e 17 years old (birthday tomorrow): refused before sending', v.red.some((x) => /You must be 18 or older to verify on OgaPay/.test(x)) && v.calls.filter((x) => x.path === '/kyc/submit').length === sentBefore, v.red);
  } else ok('7e (skipped on 31 December)', true, null);
  await setDob(p, '2000-02-31');
  await clickText(p, 'Verify NIN');
  v = await until(p, (s) => s.red.some((x) => /doesn't exist/.test(x)));
  ok('7f 31 February: "That date doesn\'t exist", not sent', v.red.some((x) => /That date doesn't exist/.test(x)) && v.calls.filter((x) => x.path === '/kyc/submit').length === sentBefore, v.red);
  await p.select('select[aria-label=Day]', '');
  await clickText(p, 'Verify NIN');
  v = await until(p, (s) => s.red.some((x) => /day, month and year/.test(x)));
  ok('7g a missing day: asked for day, month and year, not sent', v.red.some((x) => /Choose the day, month and year you were born/.test(x)) && v.calls.filter((x) => x.path === '/kyc/submit').length === sentBefore, v.red);
  await setDob(p, '2000-03-15');
  await clickText(p, 'Verify NIN');
  v = await until(p, (s) => s.calls.filter((x) => x.path === '/kyc/submit').length > sentBefore);
  const sent = v.calls.filter((x) => x.path === '/kyc/submit').pop();
  ok('7h a real adult date is sent as 2000-03-15 (midnight UTC, as before)', JSON.parse(sent.body).dateOfBirth === '2000-03-15T00:00:00.000Z', sent.body);
  await p.close();

  // ── ver-17: Level 2 takes any government ID; daily limit next to Thursday payouts ──
  p = await open('bank1');
  v = await until(p, (s) => /Get Level 2: send your ID to our team/.test(s.text));
  ok('8a the Level 2 row names any government ID', /Level 2: withdraw up to ₦10,000 a day\s*A photo of any government ID \(NIN slip or card, international passport, driver's licence or voter's card; Ghana Card in Ghana\), checked by our team/.test(v.text), v.text.match(/Level 2:[^\n]*\n?[^\n]*/)?.[0]);
  ok('8b the Level 2 form says the same', /Take a clear photo of any government ID \(NIN slip or card, international passport, driver's licence or voter's card; Ghana Card in Ghana\) and type its number\./.test(v.text), v.text);
  ok('8c the limit is explained next to the Thursday payout', /The daily limit is how much you can ask to withdraw in a day\. Bank withdrawals are then paid out together every Thursday\./.test(v.text), v.text);
  const idOpts = await p.$$eval('option', (os) => os.map((o) => o.textContent));
  ok('8d the ID list matches what the form (and the server) accept', ['National ID (NIN slip or card)', 'International passport', "Driver's licence", "Voter's card", 'Ghana Card'].every((o) => idOpts.includes(o)), idOpts);
  await p.close();
  const levelCard = fs.readFileSync(path.join(SRC, 'components/wallet/LevelCard.tsx'), 'utf8');
  ok('8e Wallet level card: "ask to withdraw up to … a day. Bank withdrawals are paid out every Thursday."', /You can ask to withdraw up to <b>.*<\/b> a day\. Bank withdrawals are paid out every Thursday\./.test(levelCard), null);
  const withdraw = fs.readFileSync(path.join(SRC, 'components/wallet/WithdrawModal.tsx'), 'utf8');
  ok('8f Withdraw: the bank note puts the daily limit next to Thursday', /You can ask for up to \$\{naira\(dayLimit, 0\)\} a day; bank withdrawals are paid out every Thursday/.test(withdraw) && /ask to withdraw up to \{naira\(withdrawLimit\(1\), 0\)\} a day, paid out every Thursday/.test(withdraw), null);

  // The Terms say the same as SEND_RULE / BONUS_RULE (lib/levels.ts)
  const terms = fs.readFileSync(path.join(SRC, 'pages/Terms.tsx'), 'utf8');
  ok('5a Terms: sending money and the bonus need a NIN or ID; bank Level 1 alone only withdraws',
    /Sending money to other members, and the ₦1,000 first job bonus, need your NIN or ID \(Level 1 by NIN, or Level 2\)\. Level 1 by bank account alone lets you withdraw, but not send money or get the bonus\./.test(terms), terms.match(/<section id="kyc">[\s\S]*?<\/section>/)?.[0]);

  ok('nothing left the page', outside.length === 0, outside);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
