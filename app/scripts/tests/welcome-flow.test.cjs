// The welcome flow on the website (2026-11-01): the real WelcomeHost and its
// sheet, driven in headless Chrome against a fake server (welcome-flow.harness.tsx).
// Every request that isn't the local test page is blocked and counted, so
// nothing reaches the internet.
//   npm run test:welcome-flow
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
const stubs = path.join(__dirname, 'welcome-flow.stubs.tsx');
// The signed-in person and the device's push alerts are stand-ins; everything else is real
const stubPlugin = { name: 'stubs', setup(b) { b.onResolve({ filter: /(context\/AuthContext|context\/CurrencyContext|lib\/push)$/ }, () => ({ path: stubs })) } };

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-welcome-'));
  await build({
    entryPoints: [path.join(__dirname, 'welcome-flow.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: {
      'welcome-under-test': path.join(SRC, 'components/WelcomeHost.tsx'),
      'toast-under-test': path.join(SRC, 'components/Toast.tsx'),
      'api-under-test': path.join(SRC, 'lib/api.ts'),
      'welcome-lib-under-test': path.join(SRC, 'lib/welcome.ts'),
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
    const sheet = document.querySelector('.wl-sheet');
    const calls = window.__calls;
    return {
      open: !!sheet,
      title: sheet?.querySelector('h2')?.textContent || '',
      count: sheet?.querySelector('.wf-count')?.textContent || '',
      alert: sheet?.querySelector('[role=alert] span')?.textContent || '',
      code: document.querySelector('#wf-code')?.value ?? null,
      buttons: [...(sheet?.querySelectorAll('.wf-body button, .wf-body a') || [])].map((b) => b.textContent.trim()),
      text: sheet?.innerText || '',
      body: document.body.innerText,
      loc: document.querySelector('#loc')?.textContent || '',
      welcomeGets: calls.filter((x) => x.path === '/users/me/welcome').length,
      claims: calls.filter((x) => x.path === '/users/referral/claim').map((x) => JSON.parse(x.body)),
      accepts: calls.filter((x) => x.path === '/users/me/accept-rules').length,
      dones: calls.filter((x) => x.path === '/users/me/onboarding-done').length,
      applies: calls.filter((x) => x.path === '/tasks/t1/apply').length,
      turnOn: window.__turnOn || 0, took: window.__took || 0,
    };
  });
  // Wait until the page shows what we expect (or time out and report what it shows)
  const until = async (page, fn, ms = 4000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await view(page); if (fn(v)) return v; await sleep(40); } return view(page); };
  const click = (page, label) => page.evaluate((label) => {
    const b = [...document.querySelectorAll('.wl-sheet button, .wl-sheet a')].find((x) => x.textContent.trim() === label || x.getAttribute('aria-label') === label);
    if (!b) throw new Error('no button ' + label);
    b.click();
  }, label);
  const type = async (page, text) => {
    await page.focus('#wf-code');
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#wf-code', text);
  };
  let p, v;

  // 1. A new account: all four steps, each counted
  p = await open('new');
  v = await until(p, (s) => s.open);
  ok('1a new account: the sheet opens at "Who invited you?"', v.title === 'Who invited you?', v.title);
  ok('1b "Step 1 of 4"', v.count === 'Step 1 of 4', v.count);
  ok('1c the code from the referral link is filled in', v.code === 'ZZZZ9999', v.code);
  ok('1d Skip and Apply', JSON.stringify(v.buttons) === '["Skip","Apply"]', v.buttons);
  await click(p, 'Apply');
  v = await until(p, (s) => s.alert);
  ok('1e an unknown code: the server\'s reason shows, still on step 1', /couldn't find that code/.test(v.alert) && v.count === 'Step 1 of 4', v);
  await type(p, 'mine1234');
  await click(p, 'Apply');
  v = await until(p, (s) => /own code/.test(s.alert));
  ok('1f their own code: refused here, never sent', /That's your own code/.test(v.alert) && v.claims.length === 1, v);
  await type(p, 'Join me on OgaPay: https://ogapay.app/ref/ABCD2345 thanks');
  await click(p, 'Apply');
  v = await until(p, (s) => s.title === 'Before you start');
  ok('1g a pasted message with the link: the code alone is sent', JSON.stringify(v.claims[1]) === '{"code":"ABCD2345"}', v.claims);
  ok('1h "Saved. @ada invited you." and on to step 2 of 4', /Saved\. @ada invited you\./.test(v.body) && v.count === 'Step 2 of 4', v);
  ok('1i the four rules', /Read the brief and send real proof/.test(v.text) && /One account per person/.test(v.text) && /No fake screenshots, copied work, bots or farming/.test(v.text) && /rejected and your account is banned/.test(v.text), v.text);
  ok('1j one button: "Accept and continue"', JSON.stringify(v.buttons) === '["Accept and continue"]', v.buttons);
  await p.mouse.click(5, 5); // the dimmed page behind it
  v = await view(p);
  ok('1k a tap outside the sheet does not close it', v.open && v.dones === 0, v);
  await click(p, 'Accept and continue');
  v = await until(p, (s) => s.title === 'Get job alerts');
  ok('1l accepting saves it and goes to step 3 of 4', v.accepts === 1 && v.count === 'Step 3 of 4', v);
  ok('1m "Not now" and "Turn on alerts"', JSON.stringify(v.buttons) === '["Not now","Turn on alerts"]', v.buttons);
  await click(p, 'Turn on alerts');
  v = await until(p, (s) => s.title === 'Verify Level 1');
  ok('1n alerts are turned on with the push code (lib/push turnOnPush)', v.turnOn === 1 && /Alerts are on for this device/.test(v.body), v);
  ok('1o step 4 of 4: Later and Verify now', v.count === 'Step 4 of 4' && JSON.stringify(v.buttons) === '["Later","Verify now"]', v);
  ok('1p the text: withdrawals, bank or NIN, and the bonus needs the NIN', /withdraw/.test(v.text) && /bank account in your own name, or your NIN/.test(v.text) && /₦1,000 first job bonus, verify with your NIN/.test(v.text), v.text);
  ok('1q not finished yet', v.dones === 0, v.dones);
  await click(p, 'Later');
  v = await until(p, (s) => !s.open);
  ok('1r "Later" closes it and marks it done once', !v.open && v.dones === 1, v);
  await p.evaluate(() => window.__nav('/wallet'));
  await sleep(300);
  v = await view(p);
  ok('1s it does not come back on the next page', !v.open && v.welcomeGets === 1 && v.loc === '/wallet', v);
  await p.close();

  // 2. Not on the sign-in pages: it waits until sign-up is done and they move on
  p = await open('quiet');
  await sleep(500);
  v = await view(p);
  ok('2a on /login: no sheet', !v.open && v.dones === 0, v);
  await p.evaluate(() => window.__nav('/dashboard'));
  v = await until(p, (s) => s.open);
  ok('2b then on the dashboard it opens', v.open && v.title === 'Who invited you?', v);
  await p.keyboard.press('Escape');
  v = await until(p, (s) => !s.open);
  ok('2c Escape closes it, and closing counts as finished', !v.open && v.dones === 1 && v.accepts === 0 && v.claims.length === 0, v);
  await p.close();

  // 3. Only the steps they can use (no claim, push unsupported, Level 1)
  p = await open('some');
  v = await until(p, (s) => s.open);
  ok('3a only "Before you start", with no step count', v.title === 'Before you start' && v.count === '', v);
  await click(p, 'Close');
  v = await until(p, (s) => !s.open);
  ok('3b the X closes it: done, rules not accepted', v.dones === 1 && v.accepts === 0, v);
  await p.close();

  // 4. Nothing left to show: marked done without a sheet
  p = await open('none');
  v = await until(p, (s) => s.dones === 1);
  ok('4 everything done already: no sheet, marked done', !v.open && v.dones === 1, v);
  await p.close();

  // 5. Only the verify step: "Verify now" goes to Settings > Verification
  p = await open('verify');
  v = await until(p, (s) => s.open);
  ok('5a blocked alerts are skipped: only "Verify Level 1"', v.title === 'Verify Level 1' && v.count === '', v);
  await click(p, 'Verify now');
  v = await until(p, (s) => !s.open);
  ok('5b "Verify now" opens /settings/verification and marks it done', v.loc === '/settings/verification' && v.dones === 1, v);
  await p.close();

  // 8. ver-18: "Connect X" is the last step, skippable, and links to Connections
  p = await open('verifyX');
  v = await until(p, (s) => s.open);
  ok('8a verify then X: "Verify Level 1" is step 1 of 2', v.title === 'Verify Level 1' && v.count === 'Step 1 of 2', v);
  await click(p, 'Later');
  v = await until(p, (s) => s.title === 'Connect X');
  ok('8b "Later" moves on to "Connect X", step 2 of 2 (not finished yet)', v.title === 'Connect X' && v.count === 'Step 2 of 2' && v.dones === 0, v);
  ok('8c it says X jobs need it and that it can be skipped', /Many OgaPay jobs are on X/.test(v.text) && /To take them, connect your X account/.test(v.text) && /No X account\? Skip this/.test(v.text), v.text);
  ok('8d Skip and Connect X', JSON.stringify(v.buttons) === '["Skip","Connect X"]', v.buttons);
  await click(p, 'Skip');
  v = await until(p, (s) => !s.open);
  ok('8e Skip on the last step closes it and marks it done once', !v.open && v.dones === 1, v);
  await p.close();
  p = await open('xOnly');
  v = await until(p, (s) => s.open);
  ok('8f only X left: just "Connect X", no step count', v.title === 'Connect X' && v.count === '', v);
  await click(p, 'Connect X');
  v = await until(p, (s) => !s.open);
  ok('8g "Connect X" opens /settings/connections and marks it done', v.loc === '/settings/connections' && v.dones === 1, v);
  await p.close();
  p = await open('xDone');
  v = await until(p, (s) => s.dones === 1);
  ok('8h X already connected (bad case): no X step, nothing to show', !v.open && v.dones === 1, v);
  await p.close();

  // 6. No sheet for admins, signed-out visitors, or an older server
  for (const [c, name] of [['admin', 'an admin'], ['out', 'a signed-out visitor'], ['old', 'an older server without the welcome page']]) {
    p = await open(c);
    await sleep(500);
    v = await view(p);
    ok(`6 ${name}: no sheet, nothing saved`, !v.open && v.dones === 0, v);
    if (c === 'out') ok('6 a signed-out visitor: not even asked', v.welcomeGets === 0, v.welcomeGets);
    await p.close();
  }

  // 7. Finished already, then taking a place is refused: the rules open, then it carries on
  p = await open('done');
  await sleep(300);
  v = await view(p);
  ok('7a finished: no sheet', !v.open, v);
  await p.click('#take');
  v = await until(p, (s) => s.open);
  ok('7b the refusal opens "Before you start" (no step count)', v.title === 'Before you start' && v.count === '' && v.applies === 1, v);
  await click(p, 'Accept and continue');
  v = await until(p, (s) => s.took === 1 && !s.open);
  ok('7c accepted: the sheet closes and the place is taken', !v.open && v.accepts === 1 && v.applies === 2 && v.took === 1, v);
  ok('7d the welcome flow is not marked done again', v.dones === 0, v.dones);
  await p.close();

  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  ok('no request left the page', outside.length === 0, outside);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
