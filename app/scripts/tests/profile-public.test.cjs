// The public profile page (2026-11-10, profile audit round 2):
//  pp-12 each part shows "Loading…" while it loads (never "No products yet"),
//        a failed part shows "Try again" that loads it again, and the page opens
//        on the right tab straight away (no jump when the lists arrive)
//  pp-13 reviews 10 a page with Previous / Next, "No written review provided.",
//        a closed reviewer has no link; a failed page can be tried again
//  pp-9  "Earned" is one amount per currency, never added together
//  pp-10 a picture added with "Upload file" shows as a picture, not "Open link"
//  pp-29 pictures, video and avatars from other websites are never loaded
// The real UserProfile.tsx (with lib/api, lib/img, lib/money) runs in headless
// Chrome against a fake server (profile-public.harness.tsx); the page frame,
// dialogs and badges are stand-ins. Any request that isn't the local test page
// is blocked and counted, so nothing reaches the internet.
//   npm run test:profile-public
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
// Stand-ins for what the page imports around it (one small module each)
const STUBS = {
  '../components/Layout': "export default function Layout({ children }) { return <main>{children}</main> }",
  '../components/ItemCover': 'export default function ItemCover() { return null }',
  '../components/profile/InviteToCommunity': 'export default function X() { return null }',
  '../components/TransferModal': 'export default function X() { return null }',
  '../components/profile/ReportUser': 'export default function X() { return null }',
  '../components/profile/CreatorAudiences': 'export default function X() { return null }',
  '../components/InfoTip': 'export default function InfoTip() { return null }',
  '../components/Perks': 'export const PremiumMark = () => null; export const VerifiedBusinessMark = () => null',
  '../components/profile/XProfile': 'export const XProfileSummary = () => null',
  '../lib/adminClose': 'export const closeAccount = async () => false',
  '../context/AuthContext': 'export const useAuth = () => ({ user: null })',
  '../lib/signin': 'export const openSignIn = () => {}',
  '../lib/useMoney': "export const useMoney = () => (n, c = 'NGN') => `${n} ${c}`",
};
const stubPlugin = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /.*/ }, (a) => (a.importer.endsWith('UserProfile.tsx') && STUBS[a.path] ? { path: a.path, namespace: 'stub' } : undefined));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({ contents: STUBS[a.path], loader: 'jsx', resolveDir: SRC }));
  },
};

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-profile-'));
  await build({
    entryPoints: [path.join(__dirname, 'profile-public.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: { 'profile-under-test': path.join(SRC, 'pages/UserProfile.tsx') },
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://api.example.test/api/v1","VITE_SUPABASE_URL":"https://ourproj.supabase.co"}', 'process.env.NODE_ENV': '"development"' },
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
    await page.goto(pageUrl + '?' + query);
    return page;
  };
  const view = (page) => page.evaluate(() => {
    const txt = (sel) => [...document.querySelectorAll(sel)].map((e) => e.innerText.trim());
    const tab = document.querySelector('.up-tab[aria-selected="true"]');
    return {
      tab: tab ? tab.innerText.trim() : null,
      body: document.body.innerText,
      stats: txt('.up-stat'),
      writing: document.querySelector('.up-writing')?.innerText || '',
      imgs: [...document.querySelectorAll('img')].map((i) => i.getAttribute('src')),
      videos: document.querySelectorAll('video').length,
      links: [...document.querySelectorAll('.up-item .foot a')].map((a) => a.getAttribute('href')),
      items: txt('.up-item'),
      reviews: txt('.up-rev'),
      reviewLinks: [...document.querySelectorAll('.up-rev .who a')].map((a) => a.getAttribute('href')),
      pager: document.querySelector('.up-pager span')?.textContent || null,
      prevDisabled: document.querySelector('.up-pager button')?.disabled ?? null,
      calls: window.__calls.slice(),
    };
  });
  const until = async (page, fn, ms = 4000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await view(page); if (fn(v)) return v; await sleep(40); } return view(page); };
  const clickText = (page, scope, label) => page.evaluate((scope, label) => {
    const b = [...document.querySelectorAll(scope + ' button')].find((x) => x.innerText.trim().startsWith(label));
    if (!b) throw new Error('no button ' + label);
    b.click();
  }, scope, label);

  try {
    // ── pp-12 Loading, errors and the starting tab ──
    let p = await open('hold=portfolio,products,blogs');
    let v = await until(p, (x) => !!x.tab);
    ok('pp-12 opens on Portfolio straight away (the profile says 2 items, no products)', /^Portfolio/.test(v.tab || ''), v.tab);
    ok('pp-12 while the portfolio loads: "Loading portfolio…", not "No portfolio items yet"', /Loading portfolio/.test(v.body) && !/No portfolio items yet/.test(v.body), v.body);
    ok('pp-12 while blogs load: "Loading blogs…", not "No published blogs yet"', /Loading blogs/.test(v.writing) && !/No published blogs/.test(v.writing), v.writing);
    ok('pp-12 the Portfolio tab shows 2 before the list arrives', /Portfolio\s*2/.test(v.tab || ''), v.tab);
    await clickText(p, '.up-tabs', 'Store');
    v = await until(p, (x) => /^Store/.test(x.tab || ''));
    ok('pp-12 Store while products load: "Loading products…", not "No products yet"', /Loading products/.test(v.body) && !/No products yet/.test(v.body), v.body);
    await p.evaluate(() => window.__release('products'));
    v = await until(p, (x) => /No products yet/.test(x.body));
    ok('pp-12 ...then "No products yet" once it really has none', /No products yet/.test(v.body), v.body);
    await clickText(p, '.up-tabs', 'Portfolio');
    await p.evaluate(() => window.__release('portfolio'));
    v = await until(p, (x) => x.items.length === 2);

    // ── pp-10 / pp-29 Portfolio pictures ──
    ok('pp-10 the "Upload file" picture shows as a picture', v.imgs.some((s) => /ourproj\.supabase\.co\/storage\/v1\/render\/image\/public\/task-proofs\/portfolio\/u1\/1-logo\.png/.test(s || '')), v.imgs);
    ok('pp-10 ...with no "Open link" for it', !v.links.some((h) => /logo\.png/.test(h || '')), v.links);
    ok('pp-29 an outside picture and video are not loaded', !v.imgs.some((s) => /tracker\.example/.test(s || '')) && v.videos === 0, { imgs: v.imgs, videos: v.videos });
    ok('pp-29 ...the outside clip is a plain link instead', v.links.length === 1 && v.links[0] === 'https://tracker.example.com/clip.mp4', v.links);
    ok('pp-29 an avatar on another website is not loaded (initials instead)', !v.imgs.some((s) => /me\.png/.test(s || '')), v.imgs);
    ok('pp-12 the tab stayed on Portfolio after the lists loaded', /^Portfolio/.test(v.tab || ''), v.tab);

    // ── pp-9 Earned per currency ──
    const earned = v.stats.find((s) => /Earned/.test(s)) || '';
    ok('pp-9 Earned shows ₦5,000 and 12.50 USDC on their own', /₦5,000/.test(earned) && /\+ 12\.50 USDC/.test(earned) && !/5,012/.test(earned), earned);

    // A failed part: "Try again" loads it again
    await p.evaluate(() => { window.__failNext.add('blogs'); window.__release('blogs') });
    v = await until(p, (x) => /Couldn't load blogs/.test(x.writing));
    ok('pp-12 a failed blogs load says so, with Try again', /Couldn't load blogs/.test(v.writing) && /Try again/.test(v.writing), v.writing);
    await clickText(p, '.up-writing', 'Try again');
    v = await until(p, (x) => /My first post/.test(x.writing));
    ok('pp-12 Try again loads the blogs', /My first post/.test(v.writing), v.writing);
    ok('pp-12 ...asking for the blogs only (not the whole page again)', v.calls.filter((c) => c === '/users/ada').length === 1 && v.calls.filter((c) => /\/blogs$/.test(c)).length === 2, v.calls);
    await p.close();

    // ── pp-13 Reviews, 10 a page ──
    p = await open('fail=reviews:3');
    await until(p, (x) => !!x.tab);
    await clickText(p, '.up-tabs', 'Reviews');
    v = await until(p, (x) => x.reviews.length === 10);
    ok('pp-13 the first page shows 10 reviews', v.reviews.length === 10, v.reviews.length);
    ok('pp-13 it asked for page 1, 10 at a time', v.calls.includes('/users/public/ada/reviews?page=1&limit=10'), v.calls);
    ok('pp-13 "Page 1 of 3", Previous is off', v.pager === 'Page 1 of 3' && v.prevDisabled === true, { pager: v.pager, prev: v.prevDisabled });
    ok('pp-13 a review with no text says "No written review provided."', v.reviews.some((r) => /No written review provided\./.test(r)), v.reviews);
    ok('pp-30 a closed reviewer shows "Closed account" with no link', v.reviews.some((r) => /Closed account/.test(r)) && !v.reviewLinks.some((h) => /null/.test(h || '')) && v.reviewLinks.length === 9, v.reviewLinks);
    await clickText(p, '.up-pager', 'Next');
    v = await until(p, (x) => x.pager === 'Page 2 of 3' && x.reviews.some((r) => /Review 2-0/.test(r)));
    ok('pp-13 Next shows page 2', v.pager === 'Page 2 of 3' && v.reviews.some((r) => /Review 2-0/.test(r)) && !v.reviews.some((r) => /Review 1-0/.test(r)), { pager: v.pager, first: v.reviews[0] });
    ok('pp-13 ...the totals stay (23 reviews)', /^Reviews\s*23/.test(v.tab || ''), v.tab);
    await clickText(p, '.up-pager', 'Next');
    v = await until(p, (x) => /Couldn't load reviews/.test(x.body));
    ok('pp-13 a failed page says so, with Try again', /Couldn't load reviews/.test(v.body), v.body.slice(0, 400));
    await clickText(p, 'section', 'Try again');
    v = await until(p, (x) => x.pager === 'Page 3 of 3');
    ok('pp-13 Try again loads page 3 (the one that failed)', v.pager === 'Page 3 of 3' && v.reviews.length === 3 && v.calls.filter((c) => c === '/users/public/ada/reviews?page=3&limit=10').length === 2, { pager: v.pager, calls: v.calls });
    await clickText(p, '.up-pager', 'Previous');
    v = await until(p, (x) => x.pager === 'Page 2 of 3');
    ok('pp-13 Previous goes back to page 2', v.pager === 'Page 2 of 3', v.pager);
    await p.close();

    ok('pp-29 the outside server was never asked for anything', !outside.some((u) => /tracker\.example/.test(u)), outside);
    ok('nothing else went to the internet (only our storage pictures, blocked here)', outside.every((u) => u.startsWith('https://ourproj.supabase.co/storage/v1/')), outside);
  } catch (e) {
    ok('crashed: ' + e.stack, false);
  }
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
