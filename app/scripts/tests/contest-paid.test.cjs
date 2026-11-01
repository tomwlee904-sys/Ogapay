// Manage jobs on a contest (W3, 2026-11-01): "paid out" is the prize of each place
// won, not the 1st prize for every winner, and the contest's figure is labelled
// "1st place prize", not "per person". The real Manage jobs page (ManageJobs)
// driven in headless Chrome against a fake server (contest-paid.harness.tsx):
// a contest of 5 x ₦7,000 with 7 places added at ₦5,000, all 12 paid (₦70,000),
// next to a normal job of 4 x ₦500. Every request that isn't the local test page
// is blocked and counted, so nothing reaches the internet.
//   npm run test:contest-paid
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

// The page frame, the signed-in poster and the display currency are stand-ins
const stubs = path.join(__dirname, 'contest-paid.stubs.tsx');
const currency = path.join(__dirname, 'contest-raise.stubs.tsx');
const stubPlugin = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /components\/Layout$|context\/AuthContext$/ }, () => ({ path: stubs }));
    b.onResolve({ filter: /context\/CurrencyContext$/ }, () => ({ path: currency }));
  },
};

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-contest-paid-'));
  await build({
    entryPoints: [path.join(__dirname, 'contest-paid.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty', '.svg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl' }, plugins: [stubPlugin],
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://api.example.test/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  const html = path.join(dir, 'page.html');
  fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="bundle.js"></script>');
  const pageUrl = 'file:///' + html.replace(/\x5c/g, '/');

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  const open = async (query = '') => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.goto(pageUrl + query);
    await page.waitForSelector('.mj-job');
    return page;
  };
  const state = (page) => page.evaluate(() => {
    const sums = [...document.querySelectorAll('.mj-sum')].map((d) => ({ b: d.querySelector('b')?.textContent || '', span: d.querySelector('span')?.textContent || '' }));
    const card = (title) => [...document.querySelectorAll('.mj-job')].find((a) => a.querySelector('h3')?.textContent === title);
    const reward = (title) => { const r = card(title)?.querySelector('.mj-reward'); return r ? `${r.querySelector('b')?.textContent} ${r.querySelector('span')?.textContent}` : ''; };
    const drawer = document.querySelector('.mj-drawer');
    return {
      paidTotal: sums.find((s) => s.span === 'paid to workers')?.b || '',
      contestCard: reward('Blog contest'),
      jobCard: reward('Follow us on X'),
      drawer: !!drawer,
      meta: drawer ? [...drawer.querySelectorAll('.mj-dh .mj-meta span')].map((s) => s.textContent) : [],
      grid: drawer ? [...drawer.querySelectorAll('.mj-dgrid > div')].map((d) => `${d.querySelector('b')?.textContent} ${d.querySelector('span')?.textContent}`) : [],
    };
  });
  let p, s;

  // 1. The list: the totals line and each job's card
  p = await open('');
  await sleep(300);
  s = await state(p);
  ok('1a paid to workers: ₦72,000 (₦70,000 contest + ₦2,000 job), not ₦86,000', s.paidTotal === '₦72,000', s.paidTotal);
  ok('1b the contest card says "₦7,000 1st place prize"', s.contestCard === '₦7,000 1st place prize', s.contestCard);
  ok('1c a normal job still says "₦500 per person"', s.jobCard === '₦500 per person', s.jobCard);
  await p.close();

  // 2. The contest's drawer
  p = await open('?job=c1');
  await p.waitForSelector('.mj-dgrid');
  await sleep(400);
  s = await state(p);
  ok('2a the drawer opens on the contest', s.drawer, s);
  ok('2b "12/12 approved" and "₦70,000 paid out" (not ₦84,000)', s.grid.includes('12/12 approved') && s.grid.includes('₦70,000 paid out'), s.grid);
  ok('2c the drawer says "₦7,000 1st place prize", not "per person"', s.meta.includes('₦7,000 1st place prize') && !s.meta.some((m) => /per person/.test(m)), s.meta);
  await p.close();

  // 3. A normal job's drawer is unchanged
  p = await open('?job=j1');
  await p.waitForSelector('.mj-dgrid');
  await sleep(400);
  s = await state(p);
  ok('3a a normal job: "4/10 approved", "₦2,000 paid out", "₦500 per person"', s.grid.includes('4/10 approved') && s.grid.includes('₦2,000 paid out') && s.meta.includes('₦500 per person'), [s.grid, s.meta]);
  await p.close();

  await browser.close();
  ok('nothing left the page', outside.length === 0, outside);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
