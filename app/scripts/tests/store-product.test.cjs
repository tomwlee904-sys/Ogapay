// The store product page and cards (CATALOG-B, 2026-11-10), driven in headless
// Chrome: the real StoreProduct page, HomeProductCard, ShareButton, toasts and
// lib/api against a fake server (store-product.harness.tsx). Every request that
// isn't the local test page is blocked and counted, so nothing reaches the internet.
//   - F8 Share: the share sheet on touch devices (closing it does nothing), else
//     copy the link with a "Link copied" toast; old-style copy when the clipboard
//     is blocked; the link itself when nothing works; no Share on a hidden product
//   - F4 the verified badge and its ⓘ on the product page, the mark on cards
//   - F6 card facts (Sold out, Only N left, delivery time, rating or New, sales)
//     instead of "Active"; Only N left / Available and Sales on the product page
//   - F10 a YouTube line in the description plays from youtube-nocookie
//   - F11 "More from the seller" and "Similar products", loaded only when the
//     reader scrolls near them, and left out when empty
//   - B19 no made-up "3 days / 3 revisions": "Ask the seller", or no row
//   - B10 price on request never shows ₦0; the page description is plain text
//   npm run test:store-product
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
const stubs = path.join(__dirname, 'store-product.stubs.tsx');
const stubPlugin = { name: 'stubs', setup(b) { b.onResolve({ filter: /(components\/Layout|context\/AuthContext|context\/CurrencyContext|hooks\/useLivePrice)$/ }, () => ({ path: stubs })) } };

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LONG = Array.from({ length: 40 }, (_, i) => `Paragraph ${i + 1} about what you get.`).join('\n\n');
const card = (id, extra = {}) => ({ id, title: `Card ${id}`, excerpt: 'Short text', price: 5000, currency: 'NGN', seller: 'ada', sellerAvatar: null, rating: 0, reviewsCount: 0, image: '', category: 'Design', official: false, stock: null, priceOnRequest: false, metadata: {}, salesCount: 0, sellerVerified: null, ...extra });
const product = (id, extra = {}) => ({
  id, title: `Product ${id}`, name: `Product ${id}`, description: '## What you get\n\n**Three** logo ideas.', price: 15000, currency: 'NGN', seller: 'ada', sellerId: 's1', sellerAvatar: null,
  rating: 0, reviewsCount: 0, reviews: [], image: '', category: 'Design', stock: null, isActive: true, createdAt: new Date().toISOString(), metadata: {}, official: false, priceOnRequest: false,
  sampleFiles: [], sellerInfo: { lastActiveAt: null, challengesWon: 0, compliments: 0, reviews: 0, newCreator: true }, canReview: false, myReview: null, sellerVerified: null, salesCount: 0, ...extra,
});

const PRODUCTS = {
  p1: product('p1', { description: `## What you get\n\n**Three** logo ideas.\n\nhttps://youtu.be/dQw4w9WgXcQ\n\n${LONG}`, stock: 3, salesCount: 12, sellerVerified: 'id' }),
  p2: product('p2', { priceOnRequest: true, price: 0, metadata: { delivery: '2 days', revisions: 1 } }),
  p3: product('p3', { official: true, seller: 'OgaPay', sellerId: undefined, sellerInfo: null, metadata: {}, sellerVerified: null }),
  p4: product('p4', { isActive: false, hiddenBecause: 'draft' }),
  p5: product('p5', { sellerVerified: 'basic', metadata: { delivery: '1 week' } }),
};
const RELATED = {
  p1: { fromSeller: [card('a2', { title: 'Flyer design' })], similar: [card('b1', { title: 'Basic logo', seller: 'bola', sellerVerified: 'basic', priceOnRequest: true, price: 0 })] },
  p2: { fromSeller: [], similar: [] },
  p3: { fromSeller: [], similar: [] },
  p4: { fromSeller: [], similar: [] },
  p5: { fromSeller: [], similar: [] },
};

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-product-'));
  await build({
    entryPoints: [path.join(__dirname, 'store-product.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: {
      'product-under-test': path.join(SRC, 'pages/StoreProduct.tsx'),
      'share-under-test': path.join(SRC, 'components/ShareButton.tsx'),
      'cards-under-test': path.join(SRC, 'components/home/HomeCards.tsx'),
      'toast-under-test': path.join(SRC, 'components/Toast.tsx'),
      'creators-under-test': path.join(SRC, 'pages/StoreCreators.tsx'),
    },
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://api.example.test/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  const html = path.join(dir, 'page.html');
  fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><div id="root"></div><script src="bundle.js"></script>');
  const pageUrl = 'file:///' + html.replace(/\x5c/g, '/');

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  // setup runs in the page before the app: fake data and browser features
  const open = async (query, setup, data = {}) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 700 });
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.evaluateOnNewDocument((data) => {
      Object.assign(window, data);
      window.__copied = []; window.__shared = []; window.__execCopy = [];
    }, { __products: PRODUCTS, __related: RELATED, ...data });
    if (setup) await page.evaluateOnNewDocument(setup);
    await page.goto(pageUrl + query);
    return page;
  };
  const text = (page, sel) => page.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel);
  const until = async (fn, ms = 4000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await fn(); if (v) return v; await sleep(40); } return fn(); };
  const clickText = (page, label) => page.evaluate((label) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === label);
    if (!b) throw new Error('no button ' + label);
    b.click();
  }, label);
  const toasts = (page) => page.evaluate(() => [...document.querySelectorAll('[role="alert"]')].map((x) => x.innerText));
  const relatedCalls = (page) => page.evaluate(() => window.__calls.filter((c) => /\/related$/.test(c.path)).length);

  // Desktop clipboard that works; navigator.share missing
  const clip = () => { navigator.clipboard.writeText = async (t) => { window.__copied.push(t) } };
  let p, v;

  // ── Product p1: badge, terms, stock, video, share, related ──────────
  p = await open('?case=product&id=p1', clip);
  await page_ready(p);
  v = await text(p, '.sp-facts');
  ok('B19 no delivery set: "Ask the seller", not a made-up "3 days"', /Delivery\s*Ask the seller/.test(v) && !/3 days/.test(v), v);
  ok('B19 no revisions set: no Revisions row', !/Revisions/.test(v), v);
  ok('F6 product page shows finished sales', /Sales\s*12/.test(v), v);
  ok('F6 low stock: "Only 3 left" instead of "Active"', (await text(p, '.sp-price-head')).includes('Only 3 left') && !(await text(p, '.sp-price-head')).includes('Active'), await text(p, '.sp-price-head'));
  v = await p.evaluate(() => [...document.querySelectorAll('.sp-verified')].map((x) => x.innerText.trim()));
  ok('F4 the seller card shows "ID verified"', v.length >= 1 && v.every((x) => x.startsWith('ID verified')), v);
  await p.evaluate(() => document.querySelector('.sp-desktop-only .sp-verified button').click());
  v = await until(() => p.evaluate(() => document.body.innerText.includes("checked this seller's ID document (Level 2)") && document.body.innerText));
  ok('F4 its ⓘ explains it (Level 2, keep paying through OgaPay)', !!v && /keep paying through OgaPay/.test(v), (v || '').slice(-400));
  v = await p.evaluate(() => document.querySelector('.sp-desc iframe')?.getAttribute('src'));
  ok('F10 the YouTube line plays from youtube-nocookie', v === 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', v);
  v = await p.evaluate(() => document.querySelector('meta[name="description"]')?.getAttribute('content'));
  ok('B10 the page description is plain text', !!v && v.startsWith('What you get Three logo ideas.') && !/[#*]/.test(v), v);
  ok('F11 related rows wait until the reader scrolls near them', (await relatedCalls(p)) === 0, await relatedCalls(p));
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  v = await until(() => p.evaluate(() => document.querySelectorAll('.sp-related').length === 2 && [...document.querySelectorAll('.sp-related')].map((s) => s.innerText)));
  ok('F11 "More from ada" with the seller\'s other product', !!v && /More from ada/.test(v[0]) && /Flyer design/.test(v[0]) && /View profile/.test(v[0]), v);
  ok('F11 "Similar products" with a card that says On request, never ₦0', !!v && /Similar products/.test(v[1]) && /Basic logo/.test(v[1]) && /On request/.test(v[1]) && !/₦0\b/.test(v[1]), v);
  ok('F11 asked for the related rows once', (await relatedCalls(p)) === 1, await relatedCalls(p));
  v = await p.evaluate(() => document.querySelector('.sp-related:last-child .hc-verified')?.getAttribute('aria-label'));
  ok('F4 the similar card marks the Level 1 seller', v === 'Verified seller', v);
  // Share on a desktop: copies the link
  await clickText(p, 'Share');
  v = await until(async () => { const t = await toasts(p); return t.length ? t : null; });
  ok('F8 desktop: the link is copied', (await p.evaluate(() => window.__copied)).length === 1 && (await p.evaluate(() => window.__copied[0])).endsWith('/store/p1'), await p.evaluate(() => window.__copied));
  ok('F8 desktop: "Link copied" toast and button', !!v && /Link copied/.test(v[0]) && (await p.evaluate(() => !![...document.querySelectorAll('.sp-top button')].find((b) => b.innerText.trim() === 'Link copied'))), v);
  // Opening a related card goes to that product
  await p.evaluate(() => document.querySelector('.sp-related a[href="/store/a2"]').click());
  v = await until(async () => ((await text(p, '#loc')) === '/store/a2' ? 'yes' : null));
  ok('F11 a related card opens that product', v === 'yes', await text(p, '#loc'));
  await p.close();

  // ── Product p2: price on request with real terms ─────────────────────
  p = await open('?case=product&id=p2', clip);
  await page_ready(p);
  v = await p.evaluate(() => document.body.innerText);
  ok('B10 price on request: "Price on request", no ₦0 anywhere', v.includes('Price on request') && !/₦\s?0(?![\d,])/.test(v), v.slice(0, 600));
  v = await text(p, '.sp-facts');
  ok("B19 the seller's own terms show", /Delivery\s*2 days/.test(v) && /Revisions\s*1/.test(v) && !/Ask the seller/.test(v), v);
  ok('F6 no sales yet: no Sales row', !/Sales/.test(v), v);
  ok('F6 "Available" instead of "Active"', (await text(p, '.sp-price-head')).includes('Available'), await text(p, '.sp-price-head'));
  ok('F4 an unverified seller has no badge', (await p.evaluate(() => document.querySelectorAll('.sp-verified').length)) === 0);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await until(async () => ((await relatedCalls(p)) ? 'yes' : null));
  await sleep(150);
  ok('F11 no related products: no empty sections', (await relatedCalls(p)) === 1 && (await p.evaluate(() => document.querySelectorAll('.sp-related').length)) === 0);
  await p.close();

  // ── Product p3: OgaPay's own item ────────────────────────────────────
  p = await open('?case=product&id=p3', clip);
  await page_ready(p);
  v = await text(p, '.sp-facts');
  ok("B19 OgaPay's own item: Delivery Instant, no revisions, no Ask the seller", /Delivery\s*Instant/.test(v) && !/Revisions|Ask the seller/.test(v), v);
  ok("F4 OgaPay's own item has no seller badge", (await p.evaluate(() => document.querySelectorAll('.sp-verified').length)) === 0);
  await p.close();

  // ── Product p5: Level 1 seller ───────────────────────────────────────
  p = await open('?case=product&id=p5', clip);
  await page_ready(p);
  v = await p.evaluate(() => document.querySelector('.sp-verified')?.innerText.trim());
  ok('F4 Level 1 seller: "Verified seller"', !!v && v.startsWith('Verified seller'), v);
  await p.close();

  // ── Product p4: hidden, seen by its seller ───────────────────────────
  p = await open('?case=product&id=p4', clip, { __user: { id: 's1', username: 'ada' } });
  await page_ready(p);
  ok('F8 no Share button on a product buyers can\'t open', (await p.evaluate(() => [...document.querySelectorAll('.sp-top button')].map((b) => b.innerText.trim()))).every((t) => t !== 'Share'),
    await p.evaluate(() => [...document.querySelectorAll('.sp-top button')].map((b) => b.innerText.trim())));
  await p.close();

  // ── ShareButton on its own ───────────────────────────────────────────
  const touch = (mode) => `
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q) => (q === '(pointer: coarse)' ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : real(q));
    navigator.clipboard.writeText = async (t) => { window.__copied.push(t) };
    navigator.share = async (d) => {
      window.__shared.push(d);
      if (${JSON.stringify(mode)} === 'abort') throw new DOMException('Share canceled', 'AbortError');
      if (${JSON.stringify(mode)} === 'denied') throw new DOMException('Not allowed', 'NotAllowedError');
    };`;
  p = await open('?case=share', touch('ok'));
  await clickText(p, 'Share');
  await sleep(200);
  v = await p.evaluate(() => ({ shared: window.__shared, copied: window.__copied }));
  ok('F8 phone: the share sheet gets the link, title and text', v.shared.length === 1 && v.shared[0].url === 'https://ogapay.app/store/abc' && v.shared[0].title === 'Logo design' && v.shared[0].text === 'Logo design on OgaPay Store', v);
  ok('F8 phone: nothing copied, no toast', v.copied.length === 0 && (await toasts(p)).length === 0, [v.copied, await toasts(p)]);
  await p.close();

  p = await open('?case=share', touch('abort'));
  await clickText(p, 'Share');
  await sleep(200);
  ok('F8 phone: closing the share sheet does nothing', (await p.evaluate(() => window.__copied.length)) === 0 && (await toasts(p)).length === 0);
  await p.close();

  p = await open('?case=share', touch('denied'));
  await clickText(p, 'Share');
  v = await until(async () => { const t = await toasts(p); return t.length ? t : null; });
  ok('F8 phone: a share sheet that fails falls back to copying', (await p.evaluate(() => window.__copied[0])) === 'https://ogapay.app/store/abc' && !!v && /Link copied/.test(v[0]), v);
  await p.close();

  const blocked = (execWorks) => `
    navigator.clipboard.writeText = async () => { throw new DOMException('Blocked', 'NotAllowedError') };
    document.execCommand = (cmd) => { window.__execCopy.push(cmd); return ${execWorks} };`;
  p = await open('?case=share', blocked(true));
  await clickText(p, 'Share');
  v = await until(async () => { const t = await toasts(p); return t.length ? t : null; });
  ok('F8 clipboard blocked: the old way copies it', (await p.evaluate(() => window.__execCopy)).join() === 'copy' && !!v && /Link copied/.test(v[0]), v);
  await p.close();

  p = await open('?case=share', blocked(false));
  await clickText(p, 'Share');
  v = await until(async () => { const t = await toasts(p); return t.length ? t : null; });
  ok('F8 nothing can copy: the toast shows the link itself', !!v && /Couldn't copy the link/.test(v[0]) && v[0].includes('https://ogapay.app/store/abc'), v);
  ok('F8 the button never claims it was copied then', (await p.evaluate(() => document.querySelector('button').innerText.trim())) === 'Share');
  await p.close();

  // ── Store cards ──────────────────────────────────────────────────────
  const CARDS = [
    card('c1', { stock: 0, metadata: { delivery: '3 days' } }),
    card('c2', { stock: 2, metadata: { delivery: '3 days' } }),
    card('c3', { metadata: { delivery: '3 days' } }),
    card('c4', { metadata: { delivery: 'Instant (digital)' } }),
    card('c5', {}),
    card('c6', { official: true, seller: 'OgaPay', sellerVerified: 'id' }),
    card('c7', { sellerVerified: 'id', salesCount: 2 }),
    card('c8', { reviewsCount: 1, rating: 5, salesCount: 1 }),
    card('c9', { priceOnRequest: true, price: 0 }),
  ];
  p = await open('?case=cards', null, { __cards: CARDS });
  await p.waitForSelector('#cards [data-id="c9"]');
  const cardInfo = (id) => p.evaluate((id) => {
    const el = document.querySelector(`[data-id="${id}"]`);
    const f = el.querySelector('.hc-active');
    return { fact: f ? f.innerText.trim() : null, off: !!f && f.classList.contains('off'), verified: el.querySelector('.hc-verified')?.getAttribute('aria-label') || null, by: el.querySelector('.hc-by-txt > span')?.innerText.trim(), text: el.innerText };
  }, id);
  v = await cardInfo('c1'); ok('F6 card: Sold out (red)', v.fact === 'Sold out' && v.off, v);
  v = await cardInfo('c2'); ok('F6 card: Only 2 left', v.fact === 'Only 2 left' && !v.off, v);
  v = await cardInfo('c3'); ok('F6 card: Delivery in 3 days', v.fact === 'Delivery in 3 days', v);
  v = await cardInfo('c4'); ok('F6 card: Instant delivery', v.fact === 'Instant delivery', v);
  v = await cardInfo('c5'); ok('F6 card: no delivery set, no corner fact', v.fact === null, v);
  v = await cardInfo('c6'); ok("F6/F4 OgaPay's own item: Instant, From OgaPay, no seller badge", v.fact === 'Instant' && v.by === 'From OgaPay' && v.verified === null, v);
  v = await cardInfo('c7'); ok('F4/F6 card: ID verified mark, "New · 2 sales"', v.verified === 'ID verified' && v.by === 'New · 2 sales', v);
  v = await cardInfo('c8'); ok('F6 card: rating, "1 review · 1 sale"', /5\.0/.test(v.by) && /1 review · 1 sale$/.test(v.by), v);
  v = await cardInfo('c9'); ok('B10 card: price on request says On request, never ₦0', /On request/.test(v.text) && !/₦\s?0(?![\d,])/.test(v.text), v.text);
  v = await p.evaluate(() => document.body.innerText);
  ok('F6 no card says "Active"', !/\bActive\b/.test(v), v);
  await p.close();

  // ── F5: the creator directory ────────────────────────────────────────
  const SELLERS = [
    { username: 'ada', name: 'Ada Obi', avatarUrl: null, bio: 'I design logos.', verified: 'id', productCount: 7, salesCount: 3, reviewsCount: 2, rating: 4.5, categories: ['Design', 'Writing'] },
    { username: 'bola', name: 'Bola K', avatarUrl: null, bio: '', verified: null, productCount: 1, salesCount: 0, reviewsCount: 0, rating: 0, categories: ['Music'] },
  ];
  const sellerCalls = (page) => page.evaluate(() => window.__calls.filter((c) => c.path === '/store/sellers').map((c) => c.query));
  p = await open('?case=creators', null, { __sellers: SELLERS, __categories: [{ name: 'Design', subcategories: [] }, { name: 'Music', subcategories: [] }] });
  await p.waitForSelector('.wk2-card');
  v = await p.evaluate(() => [...document.querySelectorAll('.wk2-card')].map((c) => ({ text: c.innerText, verified: c.querySelector('[role="img"]')?.getAttribute('aria-label') || null, store: c.querySelector('.up-btn.primary')?.getAttribute('href') })));
  ok('F5 lists the sellers with products, sales and reviews', v.length === 2 && /7 products/.test(v[0].text) && /3 sales/.test(v[0].text) && /4\.5/.test(v[0].text) && /Design/.test(v[0].text), v);
  ok('F5 the verified mark, and none for an unverified seller', v[0].verified === 'ID verified' && v[1].verified === null, v.map((x) => x.verified));
  ok('F5 "View store" opens their profile', v[0].store === '/user/ada' && /View store/.test(v[0].text), v[0].store);
  ok('F5 1 product, no sales, no reviews, no bio read plainly', /1 product(?!s)/.test(v[1].text) && !/sale/.test(v[1].text) && /No reviews yet/.test(v[1].text) && /No bio yet/.test(v[1].text), v[1].text);
  v = await p.evaluate(() => [...document.querySelectorAll('.wk2-skill')].map((b) => b.innerText.trim()));
  ok('F5 category chips from the store categories', JSON.stringify(v) === '["All","Design","Music"]', v);
  await clickText(p, 'Music');
  await until(async () => ((await sellerCalls(p)).some((q) => /category=Music/.test(q)) ? 'yes' : null));
  ok('F5 a chip filters by that category', (await sellerCalls(p)).some((q) => /category=Music/.test(q)), await sellerCalls(p));
  await p.select('.wk2-sort', 'products');
  await until(async () => ((await sellerCalls(p)).some((q) => /sort=products/.test(q)) ? 'yes' : null));
  ok('F5 the sort asks for it', (await sellerCalls(p)).some((q) => /sort=products/.test(q) && /category=Music/.test(q)), await sellerCalls(p));
  await p.type('.wk2-search input', 'ada');
  await p.keyboard.press('Enter');
  await until(async () => ((await sellerCalls(p)).some((q) => /search=ada/.test(q)) ? 'yes' : null));
  ok('F5 search asks for it', (await sellerCalls(p)).some((q) => /search=ada/.test(q)), await sellerCalls(p));
  await p.close();

  p = await open('?case=creators', null, { __sellers: [], __categories: [{ name: 'Design', subcategories: ['Logos'] }] });
  await until(() => p.evaluate(() => !!document.querySelector('.up-empty') && !/Loading/.test(document.querySelector('.up-empty').innerText)));
  v = await p.evaluate(() => ({ empty: document.querySelector('.up-empty')?.innerText, chips: [...document.querySelectorAll('.wk2-skill')].map((b) => b.innerText.trim()) }));
  ok('F5 nobody yet: a plain empty message; categories as { name } work too', /No creators match/.test(v.empty) && JSON.stringify(v.chips) === '["All","Design"]', v);
  await p.close();

  p = await open('?case=creators', null, { __sellersDown: true, __categories: [] });
  await until(() => p.evaluate(() => /Couldn't load creators/.test(document.body.innerText)));
  ok("F5 the server is down: \"Couldn't load creators\"", await p.evaluate(() => /Couldn't load creators/.test(document.body.innerText)));
  await p.close();

  // The video frame asks YouTube for the player; it was blocked like everything else
  const other = outside.filter((u) => !u.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'));
  ok('nothing else left the test page (only the blocked video frame tried)', other.length === 0, outside);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);

  async function page_ready(page) {
    await page.waitForSelector('.sp-facts', { timeout: 8000 });
  }
})().catch((e) => { console.error(e); process.exit(2); });
