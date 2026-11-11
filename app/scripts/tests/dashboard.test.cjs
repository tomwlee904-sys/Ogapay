// The Dashboard (2026-11-10, sign-in/dashboard/verification audit). The real
// Dashboard, top bar and menu run in headless Chrome against a fake server
// (dashboard.harness.tsx); only the page frame, the signed-in member, the
// currency, the wallet balances, the theme and toasts are stand-ins. Every
// request that isn't the local test page is blocked and counted.
//  dash-1  a failed or slow load never shows a busy worker the new-account
//          screen; it waits, tries once more, then says so with Try again
//  dash-2  review counts come from /tasks/my/created?lite=1 (no entries sent)
//  dash-5  "Your first job" and starter jobs only offer jobs you can take (or
//          could, after verifying or a first job); never Nigeria-only to a Ghanaian
//  dash-6  bank Level 1 is not "ID verified"; the bonus text says NIN or ID
//  dash-7  the logo goes to the homepage for everyone (owner, 2026-11-11); Dashboard is first in the menu
//  dash-9  the Balance card shows every currency held (cedis, USDC), not naira only
//  dash-20 "Jobs for you" is jobs you can take, your kind of work first, then the best paid
//  fix pass: a failed work list hides "Your first job" and starter jobs (they could
//          offer a job you took); a failed profile or earnings load says so with
//          Try again; starter jobs unlocked in Settings (X, wallet, gender) stay, tagged
//  batch 2 (2026-11-11): one request (GET /dashboard/home) instead of ~9 (login-24,
//          dash-3, dash-4), kept so coming back is instant (dash-14), hirers first
//          (dash-8), starter jobs open (dash-11), a taken job once (dash-12), no
//          ₦0 flash or jumps (dash-13), reviews on old jobs (dash-15), Verification
//          vs rank (dash-16), rank progress (dash-17), Ghana words (dash-19), the
//          admin queue (dash-21), compact numbers on phones (dash-22)
//   npm run test:dashboard
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
const stubs = path.join(__dirname, 'dashboard.stubs.tsx');
const stubPlugin = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /(components\/Layout|context\/AuthContext|context\/CurrencyContext|context\/WalletBalanceContext|context\/ThemeContext|\/Toast)$/ }, () => ({ path: stubs }));
  },
};

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-dash-'));
  await build({
    entryPoints: [path.join(__dirname, 'dashboard.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    alias: {
      'dashboard-under-test': path.join(SRC, 'pages/Dashboard.tsx'),
      'navbar-under-test': path.join(SRC, 'components/Navbar.tsx'),
      'drawer-under-test': path.join(SRC, 'components/Drawer.tsx'),
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
    await page.setViewport({ width: 390, height: 844 });
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { if (r.resourceType() !== 'image') outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message, String(e.stack || '').split(String.fromCharCode(10)).slice(0, 4).join(' | ')); fails++; });
    await page.goto(pageUrl + '?case=' + c);
    await page.waitForSelector('#loc');
    return page;
  };
  const view = (page) => page.evaluate(() => {
    const t = (s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const all = (s) => [...document.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    return {
      main: t('main'),
      loadErr: all('.db-load-err'),
      starts: all('.db-start strong'),
      empty: all('.db-empty'),
      sk: document.querySelectorAll('main .ui-sk').length,
      first: t('.db-first'),
      firstTitle: t('#db-first'),
      firstStep1: t('.db-first-steps li:first-child'),
      firstStep1Done: !!document.querySelector('.db-first-steps li:first-child.done'),
      firstNote: t('.db-first-note'),
      starterHead: t('.db-starter .db-sec-head'),
      starterSub: t('.db-starter-sub'),
      starterOpen: !!document.querySelector('#db-starter-list'),
      roles: all('.db-role-label'),
      admin: all('.db-admin li'),
      adminLinks: [...document.querySelectorAll('.db-admin li a')].map((a) => a.getAttribute('href')),
      statLinks: [...document.querySelectorAll('.db-stat')].map((a) => a.getAttribute('href')),
      statValues: all('.db-stat b'),
      balanceSk: !!document.querySelector('.db-stat:first-child b .db-sk-num'),
      setupHead: t('.db-steps') ? 'yes' : '',
      starter: [...document.querySelectorAll('#db-starter-list li')].map((li) => ({ title: li.querySelector('strong')?.textContent, tag: li.querySelector('em')?.textContent || null, sub: li.querySelector('span')?.textContent })),
      forYou: all('.db-jobs .db-job strong'),
      work: all('.db-role .db-list li strong'),
      stats: all('.db-stat'),
      balance: t('.db-stat:first-child b'),
      balanceSmall: t('.db-stat:first-child small'),
      attn: all('.db-attn li .db-attn-text'),
      steps: t('.db-steps'),
      logo: document.querySelector('.nav-desktop .brand')?.getAttribute('href') || null,
      logoMobile: document.querySelector('.nav-mobile a')?.getAttribute('href') || null,
      drawerFirst: (() => { const a = document.querySelector('.oga-drawer-nav a.oga-drawer-item'); return a ? { href: a.getAttribute('href'), text: a.textContent.trim() } : null })(),
      calls: window.__calls.map((x) => ({ path: x.path, query: x.query, auth: x.auth })),
    };
  });
  const until = async (page, fn, ms = 8000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await view(page); if (fn(v)) return v; await sleep(50); } return view(page); };
  const count = (v, p) => v.calls.filter((x) => x.path === p).length;
  const OLD = ['/users/me', '/users/me/earnings', '/tasks/my/submissions', '/tasks/my/created', '/tasks', '/scores/me', '/wallet/banks'];
  const oldCalls = (v) => v.calls.filter((x) => OLD.includes(x.path)).map((x) => x.path + x.query);
  let p, v;

  // 1. dash-1: their work and jobs fail to load
  p = await open('fail');
  v = await view(p);
  ok('1a while loading: no new-account screen, a loading shape', v.starts.length === 0 && v.loadErr.length === 0 && v.sk > 0, v);
  v = await until(p, (s) => s.loadErr.length > 0, 9000);
  ok('1b after the second try: "couldn\'t load" with Try again', /couldn't load your dashboard/i.test(v.loadErr[0] || '') && /Try again/.test(v.loadErr[0] || ''), v.loadErr);
  ok('1c never "Find your first job" or "not working on anything"', v.starts.length === 0 && !/not working on anything/.test(v.main), { starts: v.starts, main: v.main.slice(0, 300) });
  ok('1d no "Your first job" card for a worker with 40 jobs done', !v.first, v.first);
  ok('1e the dashboard was tried exactly twice (the quiet second try)', count(v, '/dashboard/home') === 2, count(v, '/dashboard/home'));
  ok('1f none of the old lists were asked for', oldCalls(v).length === 0, oldCalls(v));
  // The connection comes back: Try again shows the work
  await p.evaluate(() => { window.__heal = true; });
  await p.evaluate(() => [...document.querySelectorAll('.db-load-err button')][0].click());
  v = await until(p, (s) => s.work.length > 0);
  ok('1g Try again loads their work', v.loadErr.length === 0 && v.work.includes('Write a review') && v.work.includes('Logo idea'), { err: v.loadErr, work: v.work });
  ok('1h Try again asked once more', count(v, '/dashboard/home') === 3 && oldCalls(v).length === 0, v.calls.map((x) => x.path));
  await p.close();

  // 2. dash-1: a slow answer
  p = await open('slow');
  await sleep(1200);
  v = await view(p);
  ok('2a slow work list: still loading, no "Find your first job", no error', v.starts.length === 0 && v.loadErr.length === 0 && v.sk > 0 && !/not working on anything/.test(v.main), { starts: v.starts, err: v.loadErr, sk: v.sk });
  v = await until(p, (s) => s.work.length > 0);
  ok('2b then their work shows', v.work.includes('Write a review') && v.starts.length === 0, v.work);
  await p.close();

  // 3. Fails once, the quiet second try works: no error ever shown
  p = await open('flaky');
  let sawErr = false;
  const end = Date.now() + 7000;
  while (Date.now() < end) { v = await view(p); if (v.loadErr.length) sawErr = true; if (v.work.length) break; await sleep(100); }
  ok('3a one failure is fixed by the second try without an error', !sawErr && v.work.includes('Write a review'), { sawErr, work: v.work });
  await p.close();

  // 4. Only the job list fails
  p = await open('jobsfail');
  v = await until(p, (s) => s.loadErr.length > 0, 9000);
  ok('4a "Jobs for you" says it couldn\'t load, with Try again; their work still shows', /Couldn't load jobs/.test(v.loadErr[0] || '') && /Try again/.test(v.loadErr[0] || '') && v.work.includes('Write a review'), { err: v.loadErr, work: v.work });
  ok('4b not "No jobs you can take"', !v.empty.some((e) => /No jobs you can take/.test(e)), v.empty);
  await p.evaluate(() => { window.__heal = true; });
  await p.evaluate(() => document.querySelector('.db-load-err button').click());
  v = await until(p, (s) => s.forYou.length > 0);
  ok('4c Try again loads the jobs', v.forYou.length === 4 && v.loadErr.length === 0, v.forYou);
  await p.close();

  // 5. A busy worker: requests, Jobs for you, balance
  p = await open('vet');
  v = await until(p, (s) => s.forYou.length > 0 && s.work.length > 0);
  const homeCall = v.calls.find((x) => x.path === '/dashboard/home');
  ok('5a login-24/dash-3/dash-4: one request for the whole dashboard, signed in', count(v, '/dashboard/home') === 1 && homeCall?.auth === 'Bearer tok-vet', v.calls);
  ok('5b no profile, earnings, submissions, posted jobs, 100 jobs, rank or banks requests', oldCalls(v).length === 0, oldCalls(v));
  ok('5c dash-20: only jobs they can take, writing (their kind) first, then the best paid', JSON.stringify(v.forYou) === JSON.stringify(['Big writing job', 'Small writing job', 'Mid social job', 'Newest social job']), v.forYou);
  ok('5d dash-20: not a job they can\'t take, a full job or one they took', !v.forYou.some((t) => /rank|Women|Full|Write a review/.test(t)), v.forYou);
  ok('5e dash-9: naira and USDC added up in naira (₦3,000 + 2 USDC at ₦1,500 = ₦6,000)', v.balance === '₦6,000', v.balance);
  ok('5f dash-9: each currency listed under it; an empty cedi wallet left out', /₦3,000/.test(v.balanceSmall) && /USDC/.test(v.balanceSmall) && !/GH/.test(v.balanceSmall), v.balanceSmall);
  ok('5g NIN-verified Level 1 can send money (no "verify to send" line)', v.stats.some((s) => /Level 1/.test(s)) && !v.stats.some((s) => /To send money/.test(s)), v.stats);
  ok('5h signed in, both logos go to the homepage', v.logo === '/' && v.logoMobile === '/', { logo: v.logo, mobile: v.logoMobile });
  ok('5i dash-7: Dashboard is the first item in the menu, not folded away', v.drawerFirst?.href === '/dashboard' && /Dashboard/.test(v.drawerFirst?.text || ''), v.drawerFirst);
  await p.close();

  // 6. Kofi: a new man in Ghana, bank Level 1, money in cedis
  p = await open('kofi');
  v = await until(p, (s) => !!s.firstTitle && !!s.starterHead);
  ok('6a dash-5: "Your first job" is a job he can take (not the better-paid Nigeria-only or women-only)', v.firstTitle === 'Open starter', v.firstTitle);
  v = await until(p, (s) => s.starter.length > 0);
  ok('6m dash-11: starter jobs are open without a tap, with a readable line saying what they are', v.starterOpen && /quick jobs? to earn your first naira\. Each pays once\./.test(v.starterSub), [v.starterOpen, v.starterSub]);
  ok('6n dash-11: the fold button says Hide', /Hide/.test(v.starterHead), v.starterHead);
  await p.evaluate(() => document.querySelector('.db-fold').click());
  v = await until(p, (s) => !s.starterOpen);
  ok('6o folding it away works and is remembered', !v.starterOpen && /Show \d+/.test(v.starterHead) && (await p.evaluate(() => localStorage.getItem('ogapay-starter-open'))) === '0', v.starterHead);
  await p.evaluate(() => document.querySelector('.db-fold').click());
  v = await until(p, (s) => s.starter.length > 0);
  const titles = v.starter.map((s) => s.title);
  ok('6b dash-5: starter list hides jobs he can never take (country, gender)', !titles.includes('Nigeria only starter') && !titles.includes('Women only starter'), titles);
  ok('6c dash-5: jobs he can unlock stay, tagged (Level 2: Verify ID; after one job: Later)', v.starter.find((s) => s.title === 'Level 2 starter')?.tag === 'Verify ID' && v.starter.find((s) => s.title === 'After one job starter')?.tag === 'Later' && v.starter.find((s) => s.title === 'Open starter')?.tag === null, v.starter);
  ok('6j jobs unlocked in Settings stay, tagged "Set up" (connect X, connect a wallet)', v.starter.find((s) => s.title === 'Connect X starter')?.tag === 'Set up' && /Connect your X account in Settings/.test(v.starter.find((s) => s.title === 'Connect X starter')?.sub || '') && v.starter.find((s) => s.title === 'Wallet starter')?.tag === 'Set up', v.starter);
  ok('6k not a quick fix (blue tick, higher OgaScore, more followers): hidden', !titles.some((t) => /Blue tick|High score|Big audience/.test(t)), titles);
  ok('6l "Your first job" never picks a job that needs setting up first', v.firstTitle !== 'Connect X starter', v.firstTitle);
  ok('6d a new member sees the two starter cards, not "Jobs for you"', v.starts.includes('Find your first job') && v.forYou.length === 0, v.starts);
  ok('6e dash-6: bank Level 1 is NOT shown as "ID verified"', !/Your ID is verified/.test(v.first) && !v.firstStep1Done && /Bank check done/.test(v.firstStep1) && /send a photo of your ID \(Level 2\)/.test(v.firstStep1) && !/NIN/.test(v.firstStep1), v.firstStep1);
  ok('6f dash-6: the step offers Verify', /Verify$/.test(v.firstStep1), v.firstStep1);
  ok('6g dash-6: the bonus note says NIN or ID, and that the bank check alone doesn\'t count', /verified with your NIN or ID/.test(v.firstNote) && /bank account check alone doesn't count/.test(v.firstNote), v.firstNote);
  // A bank Level 1 member can't add a NIN afterwards (kyc.service refuses it), so
  // the way on is the ID photo, the same as Verification's BANK_ONLY_NEXT
  ok('6h dash-6: the verification card says sending needs a photo of the ID', v.stats.some((s) => /Level 1/.test(s) && /To send money, send a photo of your ID \(Level 2\)/.test(s)), v.stats);
  ok('6i dash-9: the Balance card shows his GH₵40, not GH₵0', v.balance === 'GH₵40.00', v.balance);
  await p.close();

  // 7. Verified by NIN, no job yet
  p = await open('nin');
  v = await until(p, (s) => !!s.firstTitle);
  ok('7a NIN Level 1: step 1 is done, "Verified with your NIN or ID"', v.firstStep1Done && /Verified with your NIN or ID/.test(v.firstStep1) && !/Verify$/.test(v.firstStep1), v.firstStep1);
  await p.close();

  // 7b. Bank Level 1 later verified at Level 2 (idType still 'BANK'): counts as ID
  // verified, like the server's verifiedById
  p = await open('bank2');
  v = await until(p, (s) => !!s.firstTitle && s.stats.some((x) => /Level 2/.test(x)));
  ok('7b bank member at Level 2: "Verified with your NIN or ID", no Verify button', v.firstStep1Done && /Verified with your NIN or ID/.test(v.firstStep1) && !/Verify$/.test(v.firstStep1), v.firstStep1);
  ok('7c bank member at Level 2: no "to send money" line on the level card', !v.stats.some((s) => /To send money/.test(s)), v.stats);
  await p.close();

  // 8. Not verified, money in cedis only
  p = await open('unverified');
  v = await until(p, (s) => s.attn.length > 0 && s.work.length > 0);
  ok('8a dash-9: the verify row names the cedis he has, not ₦0', v.attn.some((a) => /Verify your identity to withdraw your GH₵25\.00/.test(a)), v.attn);
  ok('8b dash-19: the setup step is short: NIN or ID photo, withdraw, first job bonus', /Free with your NIN or ID photo\. Unlocks withdrawals and your .+ first job bonus\./.test(v.steps) && !/Thursday|fee 1\.5%|takes a minute/.test(v.steps), v.steps);
  const words = (await p.evaluate(() => [...document.querySelectorAll('.db-steps li > div > span')].map((x) => x.textContent.trim().split(/\s+/).length)));
  ok('8c dash-19: each setup line is 16 words or fewer (the ID one was about 50)', words.length > 0 && words.every((n) => n <= 16), words);
  await p.close();

  // 9. A poster: review counts from the light list
  p = await open('poster');
  v = await until(p, (s) => s.attn.length > 0);
  ok('9a dash-2: review counts come from toReview (no entries in the answer)', v.attn.includes('3 submissions to review on “Follow us on X”') && v.attn.includes('1 submission to review on “Old finished job”') && !v.attn.some((a) => /Quiet job/.test(a)), v.attn);
  ok('9b the hiring list shows "3 to review"', /3 to review/.test(v.main), v.main.slice(0, 400));
  await p.close();

  // 10. Signed out: the logo goes home
  p = await open('visitor');
  v = await until(p, (s) => !!s.logo);
  ok('10a dash-7: signed out, the logo goes to the homepage', v.logo === '/' && v.logoMobile === '/', { logo: v.logo, mobile: v.logoMobile });
  await p.close();

  // 11. A new worker's work list fails: no first job or starter jobs (they could be the job they took)
  p = await open('failnew');
  v = await view(p);
  ok('11a while loading: no "Your first job", no starter jobs', !v.first && !v.starterHead, { first: v.first, starter: v.starterHead });
  v = await until(p, (s) => s.loadErr.length > 0, 9000);
  ok('11b after the second try: "couldn\'t load your dashboard"', /couldn't load your dashboard/i.test(v.loadErr[0] || ''), v.loadErr);
  ok('11c no "Your first job" card offering "Take this job"', !v.first && !/Take this job/.test(v.main), v.first);
  ok('11d no starter jobs card', !v.starterHead, v.starterHead);
  await p.evaluate(() => { window.__heal = true; });
  await p.evaluate(() => document.querySelector('.db-load-err button').click());
  v = await until(p, (s) => !!s.firstTitle);
  ok('11e once their work loads: "Finish" the job they took, not "Take this job"', /Finish "Open starter"/.test(v.firstTitle) && !/Take this job/.test(v.first), v.firstTitle);
  v = await until(p, (s) => s.starter.length > 0);
  ok('11f the starter list leaves out the job they took', v.starter.length > 0 && !v.starter.some((s) => s.title === 'Open starter'), v.starter);
  await p.close();

  // 12. The job lists fail on the server: the rest shows, "Jobs for you" says so
  p = await open('jobsfail');
  v = await until(p, (s) => s.work.length > 0);
  ok('12a only the job list says it couldn\'t load; balance, OgaScore and work show', v.loadErr.length === 1 && /Couldn't load jobs/.test(v.loadErr[0]) && v.stats.some((x) => /OgaScore61/.test(x)), { err: v.loadErr, stats: v.stats });
  await p.close();

  // 14. Gender not said yet: the women-only starter stays, tagged "Set up" (a man who said so doesn't see it, 6b)
  p = await open('nogender');
  v = await until(p, (s) => s.starter.length > 0);
  const wo = v.starter.find((s) => s.title === 'Women only starter');
  ok('14a women-only starter: "Say your gender in Settings", tagged Set up; Nigeria-only still hidden', wo?.tag === 'Set up' && /Say your gender in Settings/.test(wo?.sub || '') && !v.starter.some((s) => s.title === 'Nigeria only starter'), v.starter);
  await p.close();

  // 15. dash-10: more than 100 open jobs, starter jobs asked for apart
  p = await open('busy');
  v = await until(p, (s) => !!s.starterHead && !!s.firstTitle);
  ok('15a starter jobs come in the same answer (no job list request)', oldCalls(v).length === 0 && count(v, '/dashboard/home') === 1, oldCalls(v));
  ok('15b "Your first job" is still the starter job he can take', v.firstTitle === 'Open starter', v.firstTitle);
  v = await until(p, (s) => s.starter.length > 0);
  const busyTitles = v.starter.map((s) => s.title);
  ok('15c the starter list shows although 100 newer jobs fill the main list', busyTitles.includes('Open starter') && busyTitles.includes('Level 2 starter') && busyTitles.includes('Connect X starter'), busyTitles);
  ok('15d the same filters apply (no Nigeria-only or women-only for Kofi)', !busyTitles.includes('Nigeria only starter') && !busyTitles.includes('Women only starter'), busyTitles);
  await p.close();

  // 16. A worker with 40 jobs done never sees starter jobs: no extra request
  p = await open('vet');
  v = await until(p, (s) => s.forYou.length > 0);
  await sleep(300);
  v = await view(p);
  ok('16a no starter jobs card for someone past them', !v.starterHead && !v.calls.some((x) => /featured=1/.test(x.query)), v.starterHead);
  await p.close();

  // 17. ?featured=1 fails: the starter jobs in the main list still show, no error
  p = await open('starterfail');
  v = await until(p, (s) => s.starter.length > 0);
  ok('17a starter list falls back to the main job list', v.starter.some((s) => s.title === 'Open starter') && v.loadErr.length === 0, { starter: v.starter, err: v.loadErr });
  await p.close();

  // 18. dash-23: step buttons are at least 44px tall on phones (36px on desktop)
  const css = ':root{--ctl-h-sm:36px;--r-ctl:10px;--ctl-h:44px}' + fs.readFileSync(path.join(SRC, 'styles/dashboard.css'), 'utf8');
  const heights = async (pg) => pg.evaluate(() => [...document.querySelectorAll('.db-step-btn')].map((b) => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) })));
  for (const c of ['unverified', 'kofi']) {
    p = await open(c);
    await p.addStyleTag({ content: css });
    v = await until(p, (s) => (c === 'kofi' ? !!s.firstTitle : s.attn.length > 0));
    const hs = await heights(p);
    ok(`18 ${c}: every step button on a phone is at least 44px tall`, hs.length > 0 && hs.every((x) => x.h >= 44), hs);
    if (c === 'unverified') {
      await p.setViewport({ width: 1280, height: 900 });
      await sleep(100);
      const hd = await heights(p);
      ok('18 desktop keeps the compact 36px buttons', hd.length > 0 && hd.every((x) => x.h === 36), hd);
    }
    await p.close();
  }

  // 19. dash-8: a hirer
  p = await open('hirer');
  v = await until(p, (s) => s.roles.length > 0);
  ok('19a hirer: their jobs come first ("Hiring"), no earning card', JSON.stringify(v.roles) === '["Hiring"]', v.roles);
  ok('19b hirer: no "Your first job" or starter jobs cards', !v.first && !v.starterHead, { first: v.first, starter: v.starterHead });
  ok('19c hirer setup: "Add money to post a job", not "Add a way to get paid"', /Add money to post a job/.test(v.steps) && !/Add a way to get paid/.test(v.steps) && !/first job bonus/.test(v.steps), v.steps);
  ok('19d the review prompts show', v.attn.includes('3 submissions to review on “Follow us on X”'), v.attn);
  await p.close();
  p = await open('hirenew');
  v = await until(p, (s) => s.roles.length > 0);
  ok('19e said "Hire", no job posted yet: the Hiring card first, then Earning', JSON.stringify(v.roles) === '["Hiring","Earning"]' && /You haven't posted a job yet/.test(v.main), v.roles);
  await p.close();

  // 20. dash-19: Ghana words
  p = await open('ama');
  v = await until(p, (s) => !!s.firstTitle && !!s.steps);
  ok('20a Ghana setup: Ghana Card and mobile money, no NIN, bank or naira', /Ghana Card/.test(v.steps) && /mobile money/.test(v.steps) && !/NIN|bank account|₦/.test(v.steps), v.steps);
  ok('20b Ghana: the bonus in cedis', /GH₵/.test(v.steps) && /GH₵/.test(v.first) && !/₦/.test(v.first), [v.steps, v.first]);
  ok('20c Ghana first job step: "Send your Ghana Card", no NIN', /Send your Ghana Card/.test(v.firstStep1) && !/NIN/.test(v.first), v.first);
  ok('20d Ghana starter line says cedis', /first cedis/.test(v.starterSub), v.starterSub);
  await p.close();

  // 21. dash-12: one taken job shows once
  p = await open('firstdup');
  v = await until(p, (s) => !!s.firstTitle);
  const times = (await p.evaluate(() => document.querySelector('main').textContent.split('Open starter').length - 1));
  ok('21a the job they took shows once (in "Your first job"), not in attention or Your work too', times === 1 && v.attn.length === 0 && !v.work.includes('Open starter'), { times, attn: v.attn, work: v.work });
  ok('21b and "Your work" doesn\'t say "not working on anything"', !/not working on anything/.test(v.main), v.main.slice(0, 200));
  await p.close();
  p = await open('vet');
  v = await until(p, (s) => s.work.length > 0);
  ok('21c a busy worker: their places are in "Your work" only, not repeated in attention', v.attn.length === 0 && v.work.includes('Write a review'), v.attn);
  await p.close();

  // 22. dash-15: reviews waiting on many jobs, old ones too
  p = await open('bigposter');
  v = await until(p, (s) => s.attn.length > 0);
  ok('22a three review prompts and "4 more jobs to review" (from the server\'s total)', v.attn.length === 3 && /4 more jobs to review/.test(v.main), { attn: v.attn });
  await p.close();

  // 23. dash-21: the admin queue
  p = await open('admin');
  v = await until(p, (s) => s.admin.length > 0);
  ok('23a admin: the queue with counts', v.admin.some((x) => /4 withdrawals to pay/.test(x)) && v.admin.some((x) => /3 ID checks to review/.test(x)) && v.admin.some((x) => /3 flagged entries/.test(x)) && v.admin.some((x) => /No reported store products/.test(x)) && v.admin.some((x) => /1 rank claims? to check/.test(x)), v.admin);
  ok('23b each row links to its admin page', JSON.stringify(v.adminLinks) === JSON.stringify(['/admin/withdrawals', '/admin/kyc', '/admin/moderation', '/admin/store', '/admin/ranks']), v.adminLinks);
  ok('23c admin: no worker setup, first job or starter cards', !v.setupHead && !v.first && !v.starterHead, { setup: v.setupHead, first: v.first, starter: v.starterHead });
  await p.close();
  p = await open('admin2fa');
  v = await until(p, (s) => s.attn.length > 0);
  ok('23d admin without two-factor: a "turn it on" row, no queue', v.admin.length === 0 && v.attn.some((x) => /Turn on two-factor/.test(x)), { admin: v.admin, attn: v.attn });
  await p.close();

  // 24. dash-16 / dash-17: Verification apart from the rank, and rank progress
  p = await open('vet');
  v = await until(p, (s) => s.stats.some((x) => /OgaScore61/.test(x)));
  ok('24a the Verification card opens Verification, not the wallet', v.statLinks[1] === '/settings/verification', v.statLinks);
  ok('24b big values: "Verified" and the OgaScore (no "Level 1" beside "Beginner")', v.statValues[1] === 'Verified' && v.statValues[2] === '61' && !v.statValues.some((x) => /Level|Beginner|Intermediate/.test(x)), v.statValues);
  ok('24c dash-17: "Intermediate rank · 10 more jobs to Advanced"', v.stats.some((x) => /Intermediate rank · 10 more jobs to Advanced/.test(x)), v.stats);
  await p.close();
  p = await open('unverified');
  v = await until(p, (s) => s.work.length > 0);
  ok('24d "Not verified" opens Verification', v.statValues[1] === 'Not verified' && v.statLinks[1] === '/settings/verification', [v.statValues, v.statLinks]);
  await p.close();

  // 25. dash-13: no ₦0 before the wallet answers; nothing jumps when the dashboard arrives
  p = await open('nobalance');
  v = await until(p, (s) => s.work.length > 0);
  ok('25a balance not loaded: a placeholder, never ₦0', v.balanceSk && !/₦0/.test(v.balance), [v.balance, v.balanceSk]);
  await p.close();
  p = await open('slow');
  await sleep(300);
  const before = await p.evaluate(() => ({ snap: Math.round(document.querySelector('.db-snap')?.getBoundingClientRect().top ?? -1), sk: document.querySelectorAll('.db-loading .ui-sk').length, stats: document.querySelectorAll('.db-stat').length }));
  v = await until(p, (s) => s.work.length > 0);
  const after = await p.evaluate(() => Math.round(document.querySelector('.db-snap').getBoundingClientRect().top));
  ok('25b while loading: the three numbers and two card shapes are already there', before.stats === 3 && before.sk === 2, before);
  ok('25c the numbers don\'t move when the dashboard arrives', before.snap === after, { before: before.snap, after });
  await p.close();

  // 26. dash-14: leaving and coming back shows at once, without asking again
  p = await open('vet');
  v = await until(p, (s) => s.work.length > 0);
  await p.evaluate(() => window.__nav('/elsewhere'));
  await p.waitForSelector('#elsewhere');
  await p.evaluate(() => window.__nav('/dashboard'));
  v = await view(p);
  ok('26a back on the dashboard: their work shows straight away, no loading shapes', v.work.includes('Write a review') && v.sk === 0, { work: v.work, sk: v.sk });
  ok('26b ...and it wasn\'t asked for again (kept for a short while)', count(v, '/dashboard/home') === 1, count(v, '/dashboard/home'));
  await p.close();

  // 27. dash-22: on a phone the numbers are one compact row and the work shows on the first screen
  p = await open('vet');
  await p.addStyleTag({ content: ':root{--ctl-h-sm:36px;--r-ctl:10px;--ctl-h:44px}' + fs.readFileSync(path.join(SRC, 'styles/dashboard.css'), 'utf8') });
  v = await until(p, (s) => s.work.length > 0);
  const geo = await p.evaluate(() => {
    const tops = [...document.querySelectorAll('.db-stat')].map((e) => Math.round(e.getBoundingClientRect().top));
    const snap = document.querySelector('.db-snap').getBoundingClientRect();
    return { tops, h: Math.round(snap.height), gap: Math.round(document.querySelector('.db-role').getBoundingClientRect().top - snap.bottom) };
  });
  ok('27a phone: the three numbers sit side by side, at most 110px tall', new Set(geo.tops).size === 1 && geo.h <= 110, geo);
  ok('27b phone: "Your work" follows straight after the numbers (they used to be 3 stacked cards, about 300px)', geo.gap >= 0 && geo.gap <= 24, geo);
  await p.close();

  ok('no request left the test page', outside.length === 0, outside);
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
