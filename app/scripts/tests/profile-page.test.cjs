// The public profile page (2026-11-10, profile audit round 2). The real
// UserProfile runs in headless Chrome against a fake server
// (profile-page.harness.tsx); only the page frame, the signed-in member, the
// currency and toasts are stand-ins. Every request that isn't the local test
// page is blocked and counted, so nothing reaches the internet.
//  pp-14 the sections are asked for at the same time as the profile; your own
//        page is asked for signed in (past the 30-second cache)
//  pp-11 cover photo and links; pp-23 Verified creator / Member profile;
//  pp-24 "Active today"; pp-25 contests and wins; pp-16 Edit profile goes to
//  /edit-profile; pp-28 Message; pp-27 ?tab= and arrow keys; pp-18 posts 5 at a
//  time with covers; pp-21 + B10 "Price on request", more products; pp-31
//  Available / Sold out, "No written review provided.", the copy box when
//  copying is blocked; pp-26 private and missing profiles are noindex
//   npm run test:profile-page
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
const stubs = path.join(__dirname, 'profile-page.stubs.tsx');
const stubPlugin = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /(components\/Layout|context\/AuthContext|context\/CurrencyContext|\/Toast)$/ }, () => ({ path: stubs }));
  },
};

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-profile-'));
  await build({
    entryPoints: [path.join(__dirname, 'profile-page.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: {
      'profile-under-test': path.join(SRC, 'pages/UserProfile.tsx'),
      'signin-lib-under-test': path.join(SRC, 'lib/signin.ts'),
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
    await page.setRequestInterception(true);
    // Pictures on the fake addresses are simply not loaded; anything else would be counted
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { if (r.resourceType() !== 'image') outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.goto(pageUrl + '?case=' + c);
    await page.waitForSelector('#loc');
    return page;
  };
  const view = (page) => page.evaluate(() => {
    const t = (s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() || '';
    return {
      loc: t('#loc'),
      title: document.title,
      robots: [...document.querySelectorAll('meta[name="robots"]')].map((m) => m.content),
      head: t('.up-head'),
      eyebrow: t('.up-eyebrow'),
      state: t('.up-state h2'),
      cover: document.querySelector('.up-cover img')?.getAttribute('src') || null,
      links: [...document.querySelectorAll('.up-link')].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href'), rel: a.getAttribute('rel') })),
      stats: [...document.querySelectorAll('.up-stat')].map((s) => s.textContent.replace(/\s+/g, ' ').trim()),
      actions: [...document.querySelectorAll('.up-actions > *')].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') })),
      tab: document.querySelector('[role="tab"][aria-selected="true"]')?.id || null,
      tabIdx: [...document.querySelectorAll('[role="tab"]')].map((b) => b.tabIndex),
      focused: document.activeElement?.id || document.activeElement?.tagName,
      panel: t('[role="tabpanel"]'),
      panelId: document.querySelector('[role="tabpanel"]')?.id || null,
      products: [...document.querySelectorAll('.up-item')].length,
      writing: t('.up-writing'),
      posts: document.querySelectorAll('.up-post').length,
      postCovers: document.querySelectorAll('.up-post-cover').length,
      shareBox: document.querySelector('.up-sharebox input')?.value || null,
      audiences: t('.ca-row'),
      calls: window.__calls.map((x) => ({ path: x.path, query: x.query, auth: x.auth, at: x.at })),
      profileAt: window.__profileAnsweredAt,
      signins: window.__signins.map((d) => d.redirect ?? null),
    };
  });
  const until = async (page, fn, ms = 5000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await view(page); if (fn(v)) return v; await sleep(40); } return view(page); };
  const clickText = (page, scope, label) => page.evaluate((scope, label) => {
    const b = [...document.querySelectorAll(scope + ' button, ' + scope + ' a')].find((x) => x.textContent.trim().startsWith(label));
    if (!b) throw new Error('no button ' + label);
    b.click();
  }, scope, label);
  let p, v;

  // 1. A signed-out visitor
  p = await open('visitor');
  v = await until(p, (s) => s.profileAt > 0 && s.posts > 0 && s.products > 0);
  const sections = v.calls.filter((x) => x.path.startsWith('/users/public/ada/'));
  ok('1a pp-14: all 5 sections are asked for before the profile answers', sections.length === 5 && sections.every((x) => x.at < v.profileAt), { sections: sections.map((x) => [x.path, Math.round(x.at)]), profileAt: Math.round(v.profileAt) });
  ok('1b pp-14: a visitor asks signed out (the shared cache can answer)', v.calls.every((x) => !x.auth), v.calls.map((x) => x.auth));
  ok('1c pp-11: the cover photo shows', v.cover === 'https://cdn.example.test/cover.jpg', v.cover);
  ok('1d pp-11: website, X, Telegram and Discord show; links are nofollow', JSON.stringify(v.links.map((l) => [l.text, l.href])) === JSON.stringify([
    ['ada.example.test/work', 'https://ada.example.test/work'], ['@ada_dev', 'https://x.com/ada_dev'], ['@ada_tg', 'https://t.me/ada_tg'], ['ada.dev', null],
  ]) && v.links.filter((l) => l.href).every((l) => /nofollow/.test(l.rel) && /noopener/.test(l.rel)), v.links);
  ok('1e pp-23: Verified creator badge and "Creator profile"', /Verified creator/.test(v.head) && v.eyebrow === 'Creator profile', { head: v.head, eyebrow: v.eyebrow });
  ok('1f pp-24: "Active today"', /Active today/.test(v.head), v.head);
  ok('1g pp-25: Contests 4 with a 25% win rate, and Wins 1', v.stats.some((s) => /Contests.*4.*25% win rate/.test(s)) && v.stats.some((s) => /Wins.*1/.test(s)), v.stats);
  ok('1h pp-21: Products shows the count from the profile (25)', v.stats.some((s) => /Products\s*25/.test(s)), v.stats);
  ok('1i the creator audience comes with the profile (no extra request)', /ada_ig/.test(v.audiences) && !v.calls.some((x) => x.path.includes('/creators/')), { aud: v.audiences, calls: v.calls.map((x) => x.path) });
  ok('1j store tab first, with "Price on request", "Sold out" and "Available"', v.tab === 'up-tab-store' && /Price on request/.test(v.panel) && /Sold out/.test(v.panel) && /Available/.test(v.panel) && !/₦0/.test(v.panel), v.panel);
  ok('1k pp-28: a Message button', v.actions.some((a) => a.text === 'Message'), v.actions);
  await clickText(p, '[role="tabpanel"]', 'Show more products');
  v = await until(p, (s) => s.products === 25);
  ok('1l pp-21: "Show more products" adds the next page', v.products === 25 && v.calls.some((x) => x.path.endsWith('/products') && /page=2/.test(x.query)) && !/Show more products/.test(v.panel), v.products);
  ok('1m pp-18: 5 posts first, with cover pictures', v.posts === 5 && v.postCovers === 3 && /Show more posts \(2 more\)/.test(v.writing), { posts: v.posts, covers: v.postCovers });
  await clickText(p, '.up-writing', 'Show more posts');
  v = await until(p, (s) => s.posts === 7);
  ok('1n pp-18: "Show more posts" adds the other 2', v.posts === 7 && !/Show more posts/.test(v.writing), v.posts);
  // Keyboard on the tabs
  await p.evaluate(() => document.getElementById('up-tab-store').focus());
  await p.keyboard.press('ArrowRight');
  v = await until(p, (s) => s.tab === 'up-tab-portfolio');
  ok('1o pp-27: ArrowRight moves to Portfolio, focus follows, the address has ?tab=portfolio', v.tab === 'up-tab-portfolio' && v.focused === 'up-tab-portfolio' && v.loc === '/user/ada?tab=portfolio', v);
  ok('1p pp-27: only the chosen tab is in the Tab order, and its panel is linked', JSON.stringify(v.tabIdx) === '[-1,0,-1,-1]' && v.panelId === 'up-panel-portfolio', { idx: v.tabIdx, panel: v.panelId });
  await p.keyboard.press('End');
  v = await until(p, (s) => s.tab === 'up-tab-communities');
  ok('1q pp-27: End goes to the last tab', v.tab === 'up-tab-communities' && v.loc === '/user/ada?tab=communities', v.loc);
  await p.keyboard.press('ArrowRight');
  v = await until(p, (s) => s.tab === 'up-tab-store');
  ok('1r pp-27: ArrowRight on the last tab wraps to the first', v.tab === 'up-tab-store', v.tab);
  await p.keyboard.press('ArrowLeft');
  await p.keyboard.press('Home');
  v = await until(p, (s) => s.tab === 'up-tab-store');
  ok('1s pp-27: Home goes to the first tab', v.tab === 'up-tab-store', v.tab);
  await clickText(p, '[role="tablist"]', 'Reviews');
  v = await until(p, (s) => s.tab === 'up-tab-reviews');
  ok('1t pp-31: a rating with no words says "No written review provided."', /No written review provided\./.test(v.panel), v.panel);
  await clickText(p, '.up-actions', 'Message');
  v = await until(p, (s) => s.signins.length > 0);
  ok('1u pp-28: Message signed out opens sign-in, back to this profile', v.signins[0] === '/user/ada' && v.loc.startsWith('/user/ada'), v.signins);
  await clickText(p, '.up-actions', 'Share');
  v = await until(p, (s) => /Link copied/.test(s.head));
  ok('1v Share copies the link', /Link copied/.test(v.head) && v.shareBox === null, v.head);
  ok('1w no noindex on a public profile', v.robots.length === 0 && v.title === 'Ada Obi (@ada) | OgaPay', v);
  await p.close();

  // 2. A link to a tab
  p = await open('linked');
  v = await until(p, (s) => s.profileAt > 0 && /No written review/.test(s.panel));
  ok('2a pp-27/F27: ?tab=reviews opens Reviews even though there are products', v.tab === 'up-tab-reviews', v.tab);
  await p.close();

  // 3. Signed in, someone else's profile
  p = await open('member');
  v = await until(p, (s) => s.profileAt > 0);
  ok('3a a visitor who is signed in still asks for the shared copy', v.calls.filter((x) => x.path.startsWith('/users/public/') || x.path === '/users/ada').every((x) => !x.auth), v.calls.map((x) => [x.path, x.auth]));
  await clickText(p, '.up-actions', 'Message');
  v = await until(p, (s) => s.loc.startsWith('/messages'));
  ok('3b pp-28: Message opens the chat with them', v.loc === '/messages?user=ada', v.loc);
  await p.close();

  // 4. Your own profile
  p = await open('own');
  v = await until(p, (s) => s.profileAt > 0 && s.actions.length > 0);
  ok('4a pp-14: your own page is asked for signed in (your edits show at once)', v.calls.filter((x) => x.path.startsWith('/users/public/') || x.path === '/users/ada').every((x) => x.auth === 'Bearer tok-Ada'), v.calls.map((x) => [x.path, x.auth]));
  ok('4b pp-16: Edit profile goes straight to /edit-profile; no Message on your own page', v.actions[0]?.href === '/edit-profile' && !v.actions.some((a) => a.text === 'Message'), v.actions);
  await p.close();

  // 5. Private and missing profiles
  p = await open('private');
  v = await until(p, (s) => !!s.state);
  ok('5a pp-26: a private profile says so and is noindex', v.state === 'This profile is private' && v.robots.includes('noindex,nofollow') && v.title === '@shy | OgaPay', v);
  await p.close();
  p = await open('missing');
  v = await until(p, (s) => !!s.state);
  ok('5b pp-26: a missing profile is noindex too', v.state === 'User not found' && v.robots.includes('noindex,nofollow') && v.title === 'User not found | OgaPay', v);
  await p.close();

  // 6. Someone with nothing to sell or write
  p = await open('plain');
  v = await until(p, (s) => !!s.eyebrow && s.panel.includes('No products yet'));
  ok('6a pp-23: "Member profile", no badge, no links, no cover, no contest tiles, no last active', v.eyebrow === 'Member profile' && !/Verified creator/.test(v.head) && v.links.length === 0 && v.cover === null
    && !v.stats.some((s) => /Contests|Wins/.test(s)) && !/Active/.test(v.head), v);
  await p.close();

  // 7. Copying blocked: the link to copy by hand
  p = await open('copyfail');
  v = await until(p, (s) => s.actions.length > 0);
  await clickText(p, '.up-actions', 'Share');
  v = await until(p, (s) => !!s.shareBox);
  ok('7a pp-31: when copying is blocked, the link shows in a box to copy', v.shareBox === 'file:///user/ada' || /\/user\/ada$/.test(v.shareBox || ''), v.shareBox);
  await p.close();

  ok('no request left the test page', outside.length === 0, outside);
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
