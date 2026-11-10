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
//  dash-7  the logo goes to the dashboard when signed in; Dashboard is first in the menu
//  dash-9  the Balance card shows every currency held (cedis, USDC), not naira only
//  dash-20 "Jobs for you" is jobs you can take, your kind of work first, then the best paid
//  fix pass: a failed work list hides "Your first job" and starter jobs (they could
//          offer a job you took); a failed profile or earnings load says so with
//          Try again; starter jobs unlocked in Settings (X, wallet, gender) stay, tagged
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
  let p, v;

  // 1. dash-1: their work and jobs fail to load
  p = await open('fail');
  v = await view(p);
  ok('1a while loading: no new-account screen, a loading shape', v.starts.length === 0 && v.loadErr.length === 0 && v.sk > 0, v);
  v = await until(p, (s) => s.loadErr.length > 0, 9000);
  ok('1b after the second try: "couldn\'t load" with Try again', /couldn't load your work/i.test(v.loadErr[0] || '') && /Try again/.test(v.loadErr[0] || ''), v.loadErr);
  ok('1c never "Find your first job" or "not working on anything"', v.starts.length === 0 && !/not working on anything/.test(v.main), { starts: v.starts, main: v.main.slice(0, 300) });
  ok('1d no "Your first job" card for a worker with 40 jobs done', !v.first, v.first);
  ok('1e each failed list was tried exactly twice (the quiet second try)', count(v, '/tasks/my/submissions') === 2 && count(v, '/tasks/my/created') === 2, { subs: count(v, '/tasks/my/submissions'), created: count(v, '/tasks/my/created') });
  ok('1f lists that loaded were not asked again', count(v, '/tasks') === 1 && count(v, '/users/me') === 1, { tasks: count(v, '/tasks'), me: count(v, '/users/me') });
  // The connection comes back: Try again shows the work
  await p.evaluate(() => { window.__heal = true; });
  await p.evaluate(() => [...document.querySelectorAll('.db-load-err button')][0].click());
  v = await until(p, (s) => s.work.length > 0);
  ok('1g Try again loads their work', v.loadErr.length === 0 && v.work.includes('Write a review') && v.work.includes('Logo idea'), { err: v.loadErr, work: v.work });
  ok('1h Try again asked only the lists that had failed', count(v, '/tasks/my/submissions') === 3 && count(v, '/tasks/my/created') === 3 && count(v, '/users/me') === 1 && count(v, '/tasks') === 1, v.calls.map((x) => x.path));
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
  const created = v.calls.find((x) => x.path === '/tasks/my/created');
  const jobsCall = v.calls.find((x) => x.path === '/tasks');
  ok('5a dash-2: the dashboard asks for the light list of your jobs', /lite=1/.test(created?.query || ''), created);
  ok('5b dash-5: the job list is asked for with eligible=1, signed in', /eligible=1/.test(jobsCall?.query || '') && jobsCall?.auth === 'Bearer tok-vet', jobsCall);
  ok('5c dash-20: only jobs they can take, writing (their kind) first, then the best paid', JSON.stringify(v.forYou) === JSON.stringify(['Big writing job', 'Small writing job', 'Mid social job', 'Newest social job']), v.forYou);
  ok('5d dash-20: not a job they can\'t take, a full job or one they took', !v.forYou.some((t) => /rank|Women|Full|Write a review/.test(t)), v.forYou);
  ok('5e dash-9: naira and USDC added up in naira (₦3,000 + 2 USDC at ₦1,500 = ₦6,000)', v.balance === '₦6,000', v.balance);
  ok('5f dash-9: each currency listed under it; an empty cedi wallet left out', /₦3,000/.test(v.balanceSmall) && /USDC/.test(v.balanceSmall) && !/GH/.test(v.balanceSmall), v.balanceSmall);
  ok('5g NIN-verified Level 1 can send money (no "verify to send" line)', v.stats.some((s) => /Level 1/.test(s)) && !v.stats.some((s) => /To send money/.test(s)), v.stats);
  ok('5h dash-7: signed in, both logos go to the dashboard', v.logo === '/dashboard' && v.logoMobile === '/dashboard', { logo: v.logo, mobile: v.logoMobile });
  ok('5i dash-7: Dashboard is the first item in the menu, not folded away', v.drawerFirst?.href === '/dashboard' && /Dashboard/.test(v.drawerFirst?.text || ''), v.drawerFirst);
  await p.close();

  // 6. Kofi: a new man in Ghana, bank Level 1, money in cedis
  p = await open('kofi');
  v = await until(p, (s) => !!s.firstTitle && !!s.starterHead);
  ok('6a dash-5: "Your first job" is a job he can take (not the better-paid Nigeria-only or women-only)', v.firstTitle === 'Open starter', v.firstTitle);
  await p.evaluate(() => document.querySelector('.db-fold').click());
  v = await until(p, (s) => s.starter.length > 0);
  const titles = v.starter.map((s) => s.title);
  ok('6b dash-5: starter list hides jobs he can never take (country, gender)', !titles.includes('Nigeria only starter') && !titles.includes('Women only starter'), titles);
  ok('6c dash-5: jobs he can unlock stay, tagged (Level 2: Verify ID; after one job: Later)', v.starter.find((s) => s.title === 'Level 2 starter')?.tag === 'Verify ID' && v.starter.find((s) => s.title === 'After one job starter')?.tag === 'Later' && v.starter.find((s) => s.title === 'Open starter')?.tag === null, v.starter);
  ok('6j jobs unlocked in Settings stay, tagged "Set up" (connect X, connect a wallet)', v.starter.find((s) => s.title === 'Connect X starter')?.tag === 'Set up' && /Connect your X account in Settings/.test(v.starter.find((s) => s.title === 'Connect X starter')?.sub || '') && v.starter.find((s) => s.title === 'Wallet starter')?.tag === 'Set up', v.starter);
  ok('6k not a quick fix (blue tick, higher OgaScore, more followers): hidden', !titles.some((t) => /Blue tick|High score|Big audience/.test(t)), titles);
  ok('6l "Your first job" never picks a job that needs setting up first', v.firstTitle !== 'Connect X starter', v.firstTitle);
  ok('6d a new member sees the two starter cards, not "Jobs for you"', v.starts.includes('Find your first job') && v.forYou.length === 0, v.starts);
  ok('6e dash-6: bank Level 1 is NOT shown as "ID verified"', !/Your ID is verified/.test(v.first) && !v.firstStep1Done && /Bank check done/.test(v.firstStep1) && /NIN or a photo of your ID/.test(v.firstStep1), v.firstStep1);
  ok('6f dash-6: the step offers Verify', /Verify$/.test(v.firstStep1), v.firstStep1);
  ok('6g dash-6: the bonus note says NIN or ID, and that the bank check alone doesn\'t count', /verified with your NIN or ID/.test(v.firstNote) && /bank account check alone doesn't count/.test(v.firstNote), v.firstNote);
  ok('6h dash-6: the level card says sending needs NIN or ID', v.stats.some((s) => /Level 1/.test(s) && /To send money, verify with NIN or ID/.test(s)), v.stats);
  ok('6i dash-9: the Balance card shows his GH₵40, not GH₵0', v.balance === 'GH₵40.00', v.balance);
  await p.close();

  // 7. Verified by NIN, no job yet
  p = await open('nin');
  v = await until(p, (s) => !!s.firstTitle);
  ok('7a NIN Level 1: step 1 is done, "Verified with your NIN or ID"', v.firstStep1Done && /Verified with your NIN or ID/.test(v.firstStep1) && !/Verify$/.test(v.firstStep1), v.firstStep1);
  await p.close();

  // 8. Not verified, money in cedis only
  p = await open('unverified');
  v = await until(p, (s) => s.attn.length > 0 && s.work.length > 0);
  ok('8a dash-9: the verify row names the cedis he has, not ₦0', v.attn.some((a) => /Verify your identity to withdraw your GH₵25\.00/.test(a)), v.attn);
  ok('8b the setup step says bank Level 1 = withdraw; bonus and sending need NIN or ID', /bank account check \(Level 1\) lets you withdraw/.test(v.steps) && /first job bonus and to send money, verify with your NIN or a photo of your ID/.test(v.steps) && !/takes a minute/.test(v.steps), v.steps);
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
  ok('11b after the second try: "couldn\'t load your work"', /couldn't load your work/i.test(v.loadErr[0] || ''), v.loadErr);
  ok('11c no "Your first job" card offering "Take this job"', !v.first && !/Take this job/.test(v.main), v.first);
  ok('11d no starter jobs card', !v.starterHead, v.starterHead);
  await p.evaluate(() => { window.__heal = true; });
  await p.evaluate(() => document.querySelector('.db-load-err button').click());
  v = await until(p, (s) => !!s.firstTitle);
  ok('11e once their work loads: "Finish" the job they took, not "Take this job"', /Finish "Open starter"/.test(v.firstTitle) && !/Take this job/.test(v.first), v.firstTitle);
  await p.evaluate(() => document.querySelector('.db-fold')?.click());
  v = await until(p, (s) => s.starter.length > 0);
  ok('11f the starter list leaves out the job they took', v.starter.length > 0 && !v.starter.some((s) => s.title === 'Open starter'), v.starter);
  await p.close();

  // 12. Only the profile fails: says so, Try again brings the OgaScore back
  p = await open('mefail');
  v = await until(p, (s) => s.loadErr.length > 0, 9000);
  ok('12a "Couldn\'t load your OgaScore" with Try again', v.loadErr.length === 1 && /Couldn't load your OgaScore and first job tips/.test(v.loadErr[0]) && /Try again/.test(v.loadErr[0]), v.loadErr);
  ok('12b the OgaScore tile stops showing "…"', v.stats.some((s) => /OgaScore–/.test(s)) && !v.stats.some((s) => /OgaScore…/.test(s)), v.stats);
  ok('12c their work still shows', v.work.includes('Write a review'), v.work);
  ok('12d /users/me was tried exactly twice', count(v, '/users/me') === 2, count(v, '/users/me'));
  await p.evaluate(() => { window.__heal = true; });
  await p.evaluate(() => document.querySelector('.db-load-err button').click());
  v = await until(p, (s) => s.loadErr.length === 0);
  ok('12e Try again loads the OgaScore (61) and asks only /users/me again', v.loadErr.length === 0 && v.stats.some((s) => /OgaScore61/.test(s)) && count(v, '/users/me') === 3 && count(v, '/tasks/my/submissions') === 1, { stats: v.stats, calls: v.calls.map((x) => x.path) });
  await p.close();

  // 13. Only the earnings fail
  p = await open('earnfail');
  v = await until(p, (s) => s.loadErr.length > 0, 9000);
  ok('13a "Couldn\'t load your earnings" with Try again', v.loadErr.length === 1 && /Couldn't load your earnings/.test(v.loadErr[0]) && /Try again/.test(v.loadErr[0]), v.loadErr);
  await p.evaluate(() => { window.__heal = true; });
  await p.evaluate(() => document.querySelector('.db-load-err button').click());
  v = await until(p, (s) => s.loadErr.length === 0 && /₦5,000 earned/.test(s.main));
  ok('13b Try again shows "₦5,000 earned"', v.loadErr.length === 0 && /₦5,000 earned/.test(v.main), v.loadErr);
  await p.close();

  // 14. Gender not said yet: the women-only starter stays, tagged "Set up" (a man who said so doesn't see it, 6b)
  p = await open('nogender');
  v = await until(p, (s) => !!s.starterHead);
  await p.evaluate(() => document.querySelector('.db-fold').click());
  v = await until(p, (s) => s.starter.length > 0);
  const wo = v.starter.find((s) => s.title === 'Women only starter');
  ok('14a women-only starter: "Say your gender in Settings", tagged Set up; Nigeria-only still hidden', wo?.tag === 'Set up' && /Say your gender in Settings/.test(wo?.sub || '') && !v.starter.some((s) => s.title === 'Nigeria only starter'), v.starter);
  await p.close();

  ok('no request left the test page', outside.length === 0, outside);
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
