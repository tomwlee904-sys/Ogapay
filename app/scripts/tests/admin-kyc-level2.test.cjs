// Admin > Identity checks, Level 2 requests (2026-11-13): with 200+ requests a
// day the list showed only the newest 100, so older ones were buried. The real
// AdminKyc page in headless Chrome against a fake server that pages like
// kycManual.service listRequests (admin-kyc-level2.harness.tsx). Every request
// that isn't the local test page is blocked and counted.
//  - waiting requests oldest first, with the count and Previous/Next
//  - Oldest/Newest toggle goes back to page 1
//  - after approving, the current page is loaded again (count drops, next oldest leads)
//  - deciding the last request on the last page steps back a page
//   npm run test:admin-kyc-level2
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const stubs = path.join(__dirname, 'admin-kyc-level2.stubs.tsx');
const stubPlugin = { name: 'stubs', setup(b) { b.onResolve({ filter: /components\/Layout$/ }, () => ({ path: stubs })) } };

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-admin-kyc-'));
  await build({
    entryPoints: [path.join(__dirname, 'admin-kyc-level2.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://api.example.test/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  const html = path.join(dir, 'page.html');
  fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="bundle.js"></script>');
  const pageUrl = 'file:///' + html.replace(/\x5c/g, '/');

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  const open = async (query) => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.goto(pageUrl + query);
    await page.waitForSelector('#ready');
    return page;
  };
  const view = (page) => page.evaluate(() => {
    const sec = document.querySelector('.ak-l2');
    const pagerBtns = sec ? [...sec.querySelectorAll('.aw-pager button')] : [];
    return {
      head: sec?.querySelector('h2')?.textContent || '',
      who: [...(sec?.querySelectorAll('.aw-row .ak-handle') || [])].map((a) => a.textContent),
      pager: sec?.querySelector('.aw-pager span')?.textContent || null,
      prevOff: pagerBtns[0] ? pagerBtns[0].disabled : null,
      nextOff: pagerBtns[1] ? pagerBtns[1].disabled : null,
      pressed: [...(sec?.querySelectorAll('.ak-order button') || [])].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent),
      notice: sec?.querySelector('.aw-msg')?.textContent || '',
      calls: window.__calls.filter((c) => c.path.startsWith('/kyc/admin/level2')),
    };
  });
  const until = async (page, fn, ms = 4000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await view(page); if (fn(v)) return v; await sleep(40); } return view(page); };
  const click = (page, label) => page.evaluate((label) => {
    const b = [...document.querySelector('.ak-l2').querySelectorAll('button')].find((x) => x.textContent.trim() === label);
    if (!b) throw new Error('no button ' + label);
    b.click();
  }, label);
  const clickInFirstRow = (page, re) => page.evaluate((src) => {
    const b = [...document.querySelector('.ak-l2 .aw-row').querySelectorAll('button')].find((x) => new RegExp(src).test(x.textContent));
    if (!b) throw new Error('no button ' + src);
    b.click();
  }, re);
  const lastGet = (v) => v.calls.filter((c) => c.method === 'GET').at(-1)?.query;

  try {
    let p = await open('?n=123');
    let v = await until(p, (s) => s.who.length > 0);
    ok('1a the count: "123 waiting"', /\(123 waiting\)/.test(v.head), v.head);
    ok('1b oldest first: @m1 leads, 50 on the page', v.who[0] === '@m1' && v.who[49] === '@m50' && v.who.length === 50, v.who.slice(0, 3));
    ok('1c asked the server for pending, oldest, page 1, 50', JSON.stringify(lastGet(v)) === JSON.stringify({ status: 'PENDING', order: 'oldest', page: '1', limit: '50' }), lastGet(v));
    ok('1d "Page 1 of 3", Previous off, Next on, Oldest pressed', v.pager === 'Page 1 of 3' && v.prevOff === true && v.nextOff === false && v.pressed.join() === 'Oldest', v);

    await click(p, 'Next');
    v = await until(p, (s) => s.who[0] === '@m51');
    ok('2a Next: page 2 starts at @m51', v.who[0] === '@m51' && v.pager === 'Page 2 of 3' && v.prevOff === false && lastGet(v).page === '2', { who: v.who[0], pager: v.pager });
    await click(p, 'Next');
    v = await until(p, (s) => s.who[0] === '@m101');
    ok('2b page 3: the last 23, Next off', v.who.length === 23 && v.who.at(-1) === '@m123' && v.nextOff === true, { n: v.who.length, pager: v.pager });
    await click(p, 'Previous');
    v = await until(p, (s) => s.who[0] === '@m51');
    ok('2c Previous goes back to page 2', v.pager === 'Page 2 of 3', v.pager);

    await click(p, 'Newest');
    v = await until(p, (s) => s.who[0] === '@m123');
    ok('3a Newest: back to page 1, newest first', v.pager === 'Page 1 of 3' && v.pressed.join() === 'Newest' && lastGet(v).order === 'newest' && lastGet(v).page === '1', { pager: v.pager, q: lastGet(v) });
    await click(p, 'Oldest');
    v = await until(p, (s) => s.who[0] === '@m1');
    ok('3b Oldest again: @m1 leads', v.pressed.join() === 'Oldest', v.pressed);

    const before = v.calls.length;
    await clickInFirstRow(p, 'Approve Level 2');
    await sleep(50);
    await clickInFirstRow(p, 'Confirm: Level 2');
    v = await until(p, (s) => s.who[0] === '@m2' && s.who.length === 50 && s.calls.slice(before).some((c) => c.method === 'GET'));
    const after = v.calls.slice(before);
    ok('4a approving saves, then loads the same page again', after[0]?.method === 'PATCH' && after[0].path === '/kyc/admin/level2/r1' && after.some((c) => c.method === 'GET' && c.query.page === '1' && c.query.order === 'oldest'), after);
    ok('4b ...the count drops to 122 and @m2 leads, a full 50 again', /\(122 waiting\)/.test(v.head) && v.who[0] === '@m2' && v.who.length === 50 && v.who.at(-1) === '@m51', { head: v.head, n: v.who.length, last: v.who.at(-1) });
    ok('4c ...with the done message', /Member 1 is now Level 2/.test(v.notice), v.notice);
    await p.close();

    // Deciding the only request on the last page steps back a page
    p = await open('?n=51');
    v = await until(p, (s) => s.who.length > 0);
    await click(p, 'Next');
    v = await until(p, (s) => s.who[0] === '@m51');
    ok('5a page 2 of 2 holds one request', v.who.length === 1 && v.pager === 'Page 2 of 2', v);
    await clickInFirstRow(p, '^\\s*Reject$');
    await sleep(50);
    await p.type('.ak-l2 .aw-row input', 'The photo is too blurry to read');
    await clickInFirstRow(p, 'Confirm reject');
    v = await until(p, (s) => s.who[0] === '@m1' && s.pager === null);
    ok('5b ...after rejecting it, page 1 shows (no empty page), pager gone, 50 waiting', v.who[0] === '@m1' && v.who.length === 50 && v.pager === null && /\(50 waiting\)/.test(v.head), { who: v.who[0], pager: v.pager, head: v.head });
    await p.close();

    // A short queue: no pager at all
    p = await open('?n=3');
    v = await until(p, (s) => s.who.length > 0);
    ok('6a three waiting: "3 waiting", no pager', /\(3 waiting\)/.test(v.head) && v.who.join() === '@m1,@m2,@m3' && v.pager === null, v);
    await p.close();
  } catch (e) {
    ok('crashed: ' + e.stack, false);
  }

  ok('nothing left the page', outside.length === 0, outside);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
