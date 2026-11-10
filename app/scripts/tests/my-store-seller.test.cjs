// My Store seller round 2 (2026-11-10): the real My Store page and product page
// driven in headless Chrome against a fake server (my-store-seller.harness.tsx):
//   F23 description toolbar (bold, list, heading on the selection), 10,000 limit and counter
//   F24 tag chips (Enter or comma, no duplicates, remove), "Generate with AI" adds
//       to the typed tags and sends them as existing
//   Product type: Digital / Service / Physical, saved as productKind
//   F25 Reviews tab: summary, star filter, reply / edit / remove; the reply shows
//       under the review on the product page
//   F26 Earnings tab: totals, bars, months, sales, range switch
//   F27 Share my store copies /user/<name>?tab=store
//   F29 the Agent badge in My Store and on the product page
// Every request that isn't the local test page is blocked and counted.
//   npm run test:my-store-seller
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const stubs = path.join(__dirname, 'my-store-seller.stubs.tsx');
const stubPlugin = {
  name: 'stubs',
  setup(b) { b.onResolve({ filter: /(components\/Layout|context\/AuthContext|context\/CurrencyContext|context\/ToastContext|components\/Toast)$/ }, () => ({ path: stubs })) },
};

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-my-store-'));
  await build({
    entryPoints: [path.join(__dirname, 'my-store-seller.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty', '.svg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl' }, plugins: [stubPlugin],
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://api.example.test/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  const html = path.join(dir, 'page.html');
  fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="bundle.js"></script>');
  const pageUrl = 'file:///' + html.replace(/\x5c/g, '/');

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  const open = async (query, waitFor) => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.goto(pageUrl + query);
    await page.waitForSelector(waitFor);
    return page;
  };
  const calls = (page, p, method) => page.evaluate((p, m) => window.__calls.filter((c) => c.path === p && (!m || c.method === m)), p, method);
  // Clicks the first element matching sel whose text includes text
  const click = (page, sel, text) => page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find((e) => !t || e.textContent.includes(t) || e.getAttribute('aria-label') === t);
    if (!el) throw new Error(`no ${s} "${t}"`);
    el.click();
  }, sel, text);
  const chips = (page) => page.$$eval('.ms2-chip > span', (els) => els.map((e) => e.textContent));
  const desc = (page) => page.$eval('textarea[aria-label="What the buyer gets"]', (el) => el.value);
  let p, c;

  // ════ Products tab: Agent badge, product type, share ════
  p = await open('?page=mystore', '.ms2-prod');
  const meta = await p.$eval('.ms2-prod .meta', (el) => el.textContent);
  ok('F29-1 an API-listed product has the Agent badge; its type shows', /Agent/.test(meta) && /Physical/.test(meta), meta);
  await p.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t; } } }));
  await click(p, 'button', 'Share my store'); await sleep(200);
  const shared = await p.evaluate(() => ({ copied: window.__copied, toasts: window.__toasts }));
  ok('F27-1 Share my store copies the profile link opened on the Store tab, and says so', /\/user\/ada\?tab=store$/.test(shared.copied || '') && shared.toasts.some((t) => /Store link copied/.test(t.message) && t.type === 'success'), shared);
  const view = await p.$eval('a.up-btn', (a) => a.getAttribute('href'));
  ok('F27-2 View public store opens the Store tab', view === '/user/ada?tab=store', view);

  // ════ The product form ════
  await click(p, 'button', 'Add product');
  await p.waitForSelector('.ms2-form');
  const kinds = await p.$$eval('[aria-label="Product type"] button', (bs) => bs.map((b) => `${b.textContent}:${b.getAttribute('aria-checked')}`));
  ok('PK-1 Product type offers Digital, Service, Physical; Service is picked', kinds.join(',') === 'Digital:false,Service:true,Physical:false', kinds);
  await click(p, '[aria-label="Product type"] button', 'Physical'); await sleep(50);
  const kindHint = await p.evaluate(() => [...document.querySelectorAll('.ms2-form .ep-field')].find((f) => f.textContent.startsWith('Product type')).querySelector('small').textContent);
  ok('PK-2 picking Physical explains the 7-day payout', /7 days after you mark it delivered/.test(kindHint), kindHint);

  await p.type('input[placeholder="e.g. Logo design: 3 concepts"]', 'Logo pack');
  await p.type('input[aria-label="Price in naira"]', '5000');
  await p.type('textarea[aria-label="What the buyer gets"]', 'Logo pack for brands');
  const maxLen = await p.$eval('textarea[aria-label="What the buyer gets"]', (el) => el.maxLength);
  ok('F23-1 the description takes up to 10,000 characters', maxLen === 10000, maxLen);
  let counter = await p.$eval('.ms2-count b', (el) => el.textContent);
  ok('F23-2 the counter shows the length', counter === '20 / 10,000', counter);
  await p.$eval('textarea[aria-label="What the buyer gets"]', (el) => { el.focus(); el.setSelectionRange(5, 9); });
  await click(p, '.ms2-tools button', 'Bold'); await sleep(80);
  ok('F23-3 Bold wraps the selected word', (await desc(p)) === 'Logo **pack** for brands', await desc(p));
  const sel = await p.$eval('textarea[aria-label="What the buyer gets"]', (el) => el.value.slice(el.selectionStart, el.selectionEnd));
  ok('F23-4 ...and keeps it selected', sel === 'pack', sel);
  await click(p, '.ms2-tools button', 'Italic'); await sleep(80);
  ok('F23-5 Italic on the same selection', (await desc(p)) === 'Logo ***pack*** for brands', await desc(p));
  await click(p, '.ms2-tools button', 'List'); await sleep(80);
  ok('F23-6 List starts the line with "- "', (await desc(p)) === '- Logo ***pack*** for brands', await desc(p));
  await click(p, '.ms2-tools button', 'Heading'); await sleep(80);
  ok('F23-7 Heading turns the line into a heading (replacing the list mark)', (await desc(p)) === '## Logo ***pack*** for brands', await desc(p));
  await p.$eval('textarea[aria-label="What the buyer gets"]', (el) => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); });
  await p.keyboard.press('Enter');
  await p.type('textarea[aria-label="What the buyer gets"]', 'PNG\nSVG');
  await p.$eval('textarea[aria-label="What the buyer gets"]', (el) => { const s = el.value.indexOf('PNG'); el.focus(); el.setSelectionRange(s, el.value.length); });
  await click(p, '.ms2-tools button', 'List'); await sleep(80);
  ok('F23-8 List on two selected lines marks both', (await desc(p)) === '## Logo ***pack*** for brands\n- PNG\n- SVG', await desc(p));
  counter = await p.$eval('.ms2-count b', (el) => el.textContent);
  ok('F23-9 the counter follows', counter === `${(await desc(p)).length} / 10,000`, counter);
  await click(p, '.ms2-seg button', 'Preview'); await sleep(80);
  const preview = await p.$eval('.ms2-preview', (el) => el.innerHTML);
  ok('F23-10 Preview shows the heading, bold and list', /<h2/.test(preview) && /<strong>|<b>/.test(preview) && /<li>PNG<\/li>/.test(preview), preview.slice(0, 300));
  await click(p, '.ms2-seg button', 'Write'); await sleep(50);

  const tagBox = 'input[aria-label="Add a search tag"]';
  await p.type(tagBox, 'logo,');
  ok('F24-1 a comma turns the typed word into a chip', (await chips(p)).join('|') === 'logo', await chips(p));
  await p.type(tagBox, 'LOGO'); await p.keyboard.press('Enter');
  ok('F24-2 the same tag in other capitals is not added twice', (await chips(p)).join('|') === 'logo', await chips(p));
  await p.type(tagBox, 'brand'); await p.keyboard.press('Enter');
  await p.type(tagBox, 'temp'); await p.keyboard.press('Enter');
  ok('F24-3 Enter adds a chip', (await chips(p)).join('|') === 'logo|brand|temp', await chips(p));
  await click(p, '.ms2-chip button', 'Remove tag temp'); await sleep(50);
  ok('F24-4 × removes it', (await chips(p)).join('|') === 'logo|brand', await chips(p));
  await click(p, 'button', 'Generate with AI'); await sleep(400);
  c = await calls(p, '/ai/search-tags', 'POST');
  ok('F24-5 Generate sends the typed tags as existing', c.length === 1 && JSON.stringify(c[0].body.existing) === '["logo","brand"]' && c[0].body.name === 'Logo pack', c);
  ok('F24-6 ...and adds the new ones to them (logo not doubled)', (await chips(p)).join('|') === 'logo|brand|flyer|poster', await chips(p));
  const tagHint = await p.evaluate(() => [...document.querySelectorAll('.ms2-form .ep-field')].find((f) => f.textContent.startsWith('Search tags')).querySelector('small').textContent);
  ok('F24-7 it says how many were added', /2 tags added/.test(tagHint), tagHint);

  await click(p, '.ms2-form button', 'Publish'); await sleep(400);
  c = await calls(p, '/store/products', 'POST');
  const body = c[0]?.body || {};
  ok('PK-3 Publish saves productKind PHYSICAL', c.length === 1 && body.productKind === 'PHYSICAL', body);
  ok('F24-8 ...the tags as one comma list and the card words', body.searchTags === 'logo, brand, flyer, poster' && JSON.stringify(body.tags) === '["logo","brand","flyer","poster"]', body);
  ok('F23-11 ...and the formatted description', body.description === '## Logo ***pack*** for brands\n- PNG\n- SVG', body.description);
  await p.close();

  // ════ Reviews tab ════
  p = await open('?page=mystore&tab=reviews', '.ms2-review');
  const head = await p.$eval('.ms2-stats-3', (el) => el.textContent);
  ok('F25-1 the summary shows the average, total and last 7 days', /Average3\.5/.test(head) && /Reviews2/.test(head) && /Last 7 days2/.test(head), head);
  let rows = await p.$$eval('.ms2-review', (els) => els.map((e) => e.textContent));
  ok('F25-2 both reviews show with the product name; the replied one shows the reply', rows.length === 2 && /Agent logo pack/.test(rows[0]) && /Your reply/.test(rows[1]) && /Thank you!/.test(rows[1]) && !/Your reply/.test(rows[0]), rows);

  await p.evaluate(() => { const b = [...document.querySelectorAll('.ms2-review')][0].querySelector('button'); b.click(); });
  await p.waitForSelector('#rep-r1');
  await click(p, '.ms2-review button', 'Post reply'); await sleep(150);
  ok('F25-3 an empty reply is not sent', (await calls(p, '/store/reviews/r1/reply')).length === 0 && /Write your reply first/.test(await p.$eval('.ms2-review', (e) => e.textContent)));
  await p.type('#rep-r1', 'Sorry! I sent a fixed file.');
  await click(p, '.ms2-review button', 'Post reply'); await sleep(300);
  c = await calls(p, '/store/reviews/r1/reply', 'POST');
  rows = await p.$$eval('.ms2-review', (els) => els.map((e) => e.textContent));
  ok('F25-4 Post reply sends it and shows it as your reply', c.length === 1 && c[0].body.reply === 'Sorry! I sent a fixed file.' && /Your reply/.test(rows[0]) && /Sorry! I sent a fixed file\./.test(rows[0]), { c, row: rows[0] });
  await p.evaluate(() => [...[...document.querySelectorAll('.ms2-review')][0].querySelectorAll('button')].find((b) => b.textContent.includes('Edit')).click());
  await p.waitForSelector('#rep-r1');
  const pre = await p.$eval('#rep-r1', (el) => el.value);
  ok('F25-5 Edit opens the saved reply', pre === 'Sorry! I sent a fixed file.', pre);
  await p.type('#rep-r1', ' Check your messages.');
  await click(p, '.ms2-review button', 'Save reply'); await sleep(300);
  c = await calls(p, '/store/reviews/r1/reply', 'POST');
  ok('F25-6 Save reply sends the edit (the same one reply)', c.length === 2 && c[1].body.reply === 'Sorry! I sent a fixed file. Check your messages.' && /Check your messages\./.test(await p.$eval('.ms2-review', (e) => e.textContent)), c);
  await p.evaluate(() => { window.confirm = () => true; [...[...document.querySelectorAll('.ms2-review')][0].querySelectorAll('button')].find((b) => b.textContent === 'Remove').click(); });
  await sleep(300);
  c = await calls(p, '/store/reviews/r1/reply', 'DELETE');
  rows = await p.$$eval('.ms2-review', (els) => els.map((e) => e.textContent));
  ok('F25-7 Remove deletes it; Reply is offered again', c.length === 1 && !/Your reply/.test(rows[0]) && /Reply/.test(rows[0]), rows[0]);
  await click(p, '[aria-label="Filter by stars"] button', '1-2 stars'); await sleep(300);
  c = await calls(p, '/store/my-reviews');
  rows = await p.$$eval('.ms2-review', (els) => els.length);
  ok('F25-8 the 1-2 star filter asks the server and shows those', /stars=1-2/.test(c[c.length - 1].query) && rows === 1, { q: c[c.length - 1].query, rows });

  await p.close();

  // ════ Earnings tab ════
  p = await open('?page=mystore&tab=earnings', '.ms2-earn');
  const top = await p.$eval('.ms2-earn-h', (el) => el.textContent);
  ok('F26-1 the total and number of sales for the range', /₦4,000/.test(top) && /2 sales paid to you in the last 30 days/.test(top), top);
  let bars = await p.$$eval('.ms2-bar', (els) => els.map((e) => e.getAttribute('title')));
  ok('F26-2 30 bars, the last two are yesterday and today', bars.length === 30 && bars[28] === '₦3,000' && bars[29] === '₦1,000' && bars.slice(0, 28).every((t) => t === '₦0'), bars.slice(-3));
  const lists = await p.$$eval('.ms2-months', (els) => els.map((e) => e.textContent));
  ok('F26-3 month totals and the sales list (part refund marked)', /2 sales₦4,000/.test(lists[0]) && /Agent logo pack/.test(lists[1]) && /@tolu/.test(lists[1]) && /part refunded to the buyer/.test(lists[1]), lists);
  await click(p, '[aria-label="Range"] button', '7 days'); await sleep(300);
  c = await calls(p, '/store/my-earnings');
  bars = await p.$$eval('.ms2-bar', (els) => els.length);
  ok('F26-4 7 days asks for range=7d and draws 7 bars', /range=7d/.test(c[c.length - 1].query) && bars === 7, { q: c[c.length - 1].query, bars });
  await p.close();

  // ════ Product page ════
  p = await open('?page=product', '.sp-reviews');
  await p.waitForSelector('.sp-reply');
  const replies = await p.$$eval('.sp-reply', (els) => els.map((e) => e.textContent));
  ok('F25-9 the product page shows the seller reply under its review only', replies.length === 1 && /Reply from ada/.test(replies[0]) && /Thank you!/.test(replies[0]), replies);
  const agent = await p.$eval('.sp-agent', (el) => el.textContent).catch(() => '');
  ok('F29-2 the product page says it was listed by an agent', /Listed by an agent/.test(agent), agent);
  await p.close();

  ok('nothing left the test page', outside.length === 0, outside);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
