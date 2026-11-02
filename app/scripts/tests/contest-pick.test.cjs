// Picking contest winners for every place (2026-11-02): the real contest box
// from the job page (ContestPanel) driven in headless Chrome against a fake
// server that follows contest.service award / awardNow (contest-pick.harness.tsx).
// The owner's case: the blog contest, 12 places of ₦7,000, 1st already awarded.
// Every request that isn't the local test page is blocked and counted, so
// nothing reaches the internet.
// Review fixes (2026-11-02): a dropped connection keeps the picks (7), long
// names on a phone with the app's real styles (8), closed accounts (9).
//   npm run test:contest-pick
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

// The display currency stand-in from the raise test (naira, fixed rate)
const stubs = path.join(__dirname, 'contest-raise.stubs.tsx');
const stubPlugin = { name: 'stubs', setup(b) { b.onResolve({ filter: /context\/CurrencyContext$/ }, () => ({ path: stubs })) } };

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ord = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-contest-pick-'));
  await build({
    entryPoints: [path.join(__dirname, 'contest-pick.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://api.example.test/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  const html = path.join(dir, 'page.html');
  fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="bundle.js"></script>');
  const pageUrl = 'file:///' + html.replace(/\x5c/g, '/');

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  const open = async (query, url = pageUrl, width) => {
    const page = await browser.newPage();
    if (width) await page.setViewport({ width, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.goto(url + query);
    await page.waitForSelector('.cp-prizes');
    await sleep(300);
    return page;
  };
  const state = (page) => page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.cp-pick')];
    const pick = boxes.find((d) => d.querySelector('h3')?.textContent === 'Pick the winners');
    const award = boxes.find((d) => /^Award/.test(d.querySelector('h3')?.textContent || ''));
    const payBtn = pick ? [...pick.querySelectorAll('button')].find((b) => /^(Pay|Paying)/.test(b.textContent)) : null;
    return {
      head: document.querySelector('.cp-head b')?.textContent.trim(),
      prizes: [...document.querySelectorAll('.cp-prize')].map((r) => ({
        place: r.querySelector('.cp-place')?.textContent, who: r.querySelector('.cp-who')?.textContent || '', paid: !!r.querySelector('.cp-paid'),
        none: r.querySelector('.cp-none')?.textContent || '',
      })),
      pickText: [...boxes].map((d) => d.textContent).join(' '),
      body: document.querySelector('.cp')?.textContent || '',
      gets: window.__calls.filter((c) => c.method === 'GET').map((c) => c.path),
      pick: !!pick,
      pickNote: pick?.querySelector('.cp-note')?.textContent || '',
      rows: pick ? [...pick.querySelectorAll('.cp-row')].map((r) => {
        const sel = r.querySelector('select');
        return {
          place: r.querySelector('.cp-place')?.textContent,
          locked: sel ? '' : r.querySelector('.cp-none')?.textContent || '',
          value: sel ? sel.value : null,
          options: sel ? [...sel.options].filter((o) => o.value).map((o) => ({ v: o.value, off: o.disabled })) : null,
        };
      }) : [],
      pay: payBtn ? payBtn.textContent : '', payOff: payBtn ? payBtn.disabled : null,
      award: award ? award.querySelector('h3').textContent : '',
      awardNote: award?.querySelector('.cp-note')?.textContent || '',
      awardEntries: award ? [...award.querySelectorAll('.cp-entry b')].map((b) => b.textContent) : [],
      err: [...document.querySelectorAll('.cp-err')].map((e) => e.textContent),
      posts: window.__calls.filter((c) => c.method === 'POST').map((c) => ({ path: c.path, body: c.body })),
      asked: window.__asked || '',
    };
  });
  const choose = (page, place, id) => page.select(`select[aria-label="${ord(place)} place"]`, id);
  const clickPay = (page) => page.evaluate(() => { [...document.querySelectorAll('.cp-pick button')].find((b) => /^Pay/.test(b.textContent)).click(); });
  const awardFirst = (page) => page.evaluate(() => { const b = document.querySelector('.cp-entry button'); b.click(); });
  let p, s;

  // 1. The owner's case after entries close: 12 places, 1st awarded early to @ada, 14 entries waiting
  p = await open('?places=12&awarded=1&entries=14&ended=1');
  s = await state(p);
  ok('1a the prize list shows all 12 places', s.prizes.length === 12 && s.prizes[11].place === '12th place', s.prizes.length);
  ok('1b 1st place shows @ada and Paid; no other place says paid', s.prizes[0].who === '@ada' && s.prizes[0].paid && s.prizes.slice(1).every((x) => !x.paid && !x.who), s.prizes.slice(0, 2));
  ok('1c the pick shows 1st as paid to @ada, not as a choice', s.pick && s.rows[0].place === '1st' && s.rows[0].locked === 'Paid to @ada' && s.rows[0].options === null, s.rows[0]);
  ok('1d one choice for each place left: 2nd to 12th', s.rows.length === 12 && s.rows.slice(1).map((r) => r.place).join(',') === Array.from({ length: 11 }, (_, i) => ord(i + 2)).join(','), s.rows.map((r) => r.place));
  ok('1e only waiting entries can be chosen: not @ada (won) and not the rejected one', s.rows[1].options.length === 14 && !s.rows[1].options.some((o) => o.v === 'w1' || o.v === 'r1'), s.rows[1].options);
  ok('1f it says 1 place was awarded early', /1 place was awarded early; these fill the rest\./.test(s.pickNote), s.pickNote);
  ok('1g nothing chosen yet: Pay 11 winners is off', s.pay === 'Pay 11 winners' && s.payOff === true, [s.pay, s.payOff]);

  await choose(p, 2, 's3'); await sleep(80);
  s = await state(p);
  ok("1h an entry chosen for 2nd can't be chosen for another place", s.rows.slice(2).every((r) => r.options.find((o) => o.v === 's3').off) && !s.rows[1].options.find((o) => o.v === 's3').off, s.rows[2].options.slice(0, 4));
  // The rest: 3rd gets s1, 4th s2, then s4..s12 (the 2nd place's pick isn't the oldest entry)
  const order = ['s3', 's1', 's2', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11'];
  for (let i = 1; i < order.length; i++) await choose(p, i + 2, order[i]);
  await sleep(100);
  s = await state(p);
  ok('1i all 11 places chosen: Pay 11 winners is on', s.pay === 'Pay 11 winners' && s.payOff === false && s.rows.slice(1).every((r, i) => r.value === order[i]), s.rows.map((r) => r.value));
  await clickPay(p); await sleep(600);
  s = await state(p);
  ok('1j it sends the 11 picks in one go, 2nd place first', s.posts.length === 1 && s.posts[0].path === '/tasks/t1/winners' && JSON.stringify(s.posts[0].body) === JSON.stringify({ winners: order }), s.posts);
  ok('1k the contest is finished: all 12 places show their winner', s.head === 'Winners' && !s.pick && s.prizes.map((x) => x.who).join(',') === ['@ada', '@e3', '@e1', '@e2', '@e4', '@e5', '@e6', '@e7', '@e8', '@e9', '@e10', '@e11'].join(','), s.prizes.map((x) => x.who));
  ok('1l no error', !s.err.length, s.err);
  await p.close();

  // 2. A refusal from the server shows, and the picks stay so the poster can fix them
  p = await open('?places=12&awarded=1&entries=14&ended=1');
  for (let i = 0; i < 11; i++) await choose(p, i + 2, `s${i + 1}`);
  // The poster rejected @e4 in another tab meanwhile, so the server refuses the pick
  await p.evaluate(() => {
    window.__refuse = 'One of the picked entries was just reviewed. Refresh the page and pick again.';
    window.__subs.find((x) => x.id === 's4').status = 'REJECTED';
  });
  await clickPay(p); await sleep(600);
  s = await state(p);
  ok("2a the server's reason shows and nothing is marked paid", s.err[0] === 'One of the picked entries was just reviewed. Refresh the page and pick again.' && s.prizes.filter((x) => x.paid).length === 1 && s.pick, [s.err, s.pick]);
  ok('2b the entries are read again: @e4 is gone, the other 10 picks stay, 5th is to choose again',
    s.rows[1].options.length === 13 && !s.rows[1].options.some((o) => o.v === 's4') && s.rows[4].value === ''
      && s.rows.slice(1).filter((r) => r.value).length === 10 && s.payOff === true, s.rows.map((r) => r.value));
  await choose(p, 5, 's12'); await sleep(80);
  await clickPay(p); await sleep(600);
  s = await state(p);
  ok('2c with 5th chosen again, all 11 are paid', s.posts.length === 2 && s.posts[1].body.winners.length === 11 && s.head === 'Winners' && !s.err.length, [s.posts.length, s.head, s.err]);
  await p.close();

  // 3. Fewer entries than places: 12 places, 1st awarded, 3 entries
  p = await open('?places=12&awarded=1&entries=3&ended=1');
  s = await state(p);
  ok('3a 3 entries: choices for 2nd, 3rd and 4th only', s.rows.filter((r) => r.options).map((r) => r.place).join(',') === '2nd,3rd,4th' && s.pay === 'Pay 3 winners', s.rows.map((r) => r.place));
  ok('3b it says the places nobody fills come back', /fewer entries than prizes/.test(s.pickNote), s.pickNote);
  await p.close();

  // 4. Up to 20 places: all 20 can be picked in one go
  p = await open('?places=20&awarded=0&entries=25&ended=1');
  s = await state(p);
  ok('4a 20 places, 20 choices: 1st to 20th', s.prizes.length === 20 && s.rows.length === 20 && s.rows[19].place === '20th' && s.pay === 'Pay 20 winners', [s.prizes.length, s.rows.length]);
  for (let i = 0; i < 20; i++) await choose(p, i + 1, `s${25 - i}`);
  await clickPay(p); await sleep(600);
  s = await state(p);
  ok('4b all 20 are paid in one go', s.posts.length === 1 && s.posts[0].body.winners.length === 20 && s.head === 'Winners' && s.prizes.every((x) => x.who), [s.posts.length, s.head]);
  await p.close();

  // 5. While entries are open: award the 11 places left one by one (Award now)
  p = await open('?places=12&awarded=1&entries=12');
  s = await state(p);
  ok('5a Award now: 11 places left, 2nd to 12th; the next gets 2nd place', s.award === 'Award a place now' && /11 places left \(2nd to 12th\); the next award gets 2nd place\./.test(s.awardNote), s.awardNote);
  ok('5b only waiting entries are listed (not @ada)', s.awardEntries.length === 12 && !s.awardEntries.includes('@ada'), s.awardEntries);
  await awardFirst(p); await sleep(500);
  s = await state(p);
  ok('5c it asks first, naming the place', /^Award @e1 2nd place now\? ₦7,000 is paid to them at once/.test(s.asked), s.asked);
  ok('5d 2nd place now shows @e1 and Paid; 3rd is next', s.prizes[1].who === '@e1' && s.prizes[1].paid && /10 places left \(3rd to 12th\)/.test(s.awardNote), [s.prizes[1], s.awardNote]);
  for (let k = 3; k <= 11; k++) { await awardFirst(p); await sleep(450); }
  s = await state(p);
  ok('5e after 10 awards: the last place is next', s.award === 'Award the last place now' && s.prizes.filter((x) => x.paid).length === 11, [s.award, s.prizes.filter((x) => x.paid).length]);
  await awardFirst(p); await sleep(500);
  s = await state(p);
  ok('5f the 12th award finishes the contest: every place has its winner', /This is the last place/.test(s.asked) && s.head === 'Winners' && !s.award && s.prizes.every((x) => x.who), [s.head, s.award]);
  ok('5g each award sent one entry: 11 in all, oldest first', s.posts.length === 11 && s.posts.every((c, i) => c.path === '/tasks/t1/winners/now' && c.body.submissionId === `s${i + 1}`), s.posts.slice(0, 3));
  await p.close();

  // 6. Saying no to the question sends nothing
  p = await open('?places=12&awarded=1&entries=2');
  await p.evaluate(() => { window.__confirm = false; });
  await awardFirst(p); await sleep(300);
  s = await state(p);
  ok('6a Cancel on the question sends nothing', s.posts.length === 0 && s.prizes.filter((x) => x.paid).length === 1, s.posts);
  await p.close();

  // 7. The connection drops as the poster presses Pay: the pick and the re-read
  // of the entries both fail. The picks and the warning stay (no "no entries"
  // money message), and the list is read again when the connection is back.
  p = await open('?places=12&awarded=1&entries=14&ended=1');
  for (let i = 0; i < 11; i++) await choose(p, i + 2, `s${i + 1}`);
  await p.evaluate(() => { window.__offline = true; });
  await clickPay(p); await sleep(800);
  s = await state(p);
  ok('7a offline: all 11 picks stay and the "may have been paid" warning shows',
    s.rows.length === 12 && s.rows.slice(1).every((r, i) => r.value === `s${i + 1}`) && /^We couldn't confirm this\. The winners may have been paid/.test(s.err[0] || ''), [s.rows.map((r) => r.value), s.err]);
  ok('7b no false "no entries / money comes back" message', !/no entries to pick from|come back to your wallet/.test(s.pickText), s.pickText.slice(0, 200));
  await p.evaluate(() => { window.__offline = false; window.__calls = []; });
  await sleep(5600);
  s = await state(p);
  ok('7c back online: the 5 s reload reads the contest and the entries again; the picks are still there',
    s.gets.includes('/tasks/t1') && s.gets.includes('/tasks/t1/submissions') && s.rows.slice(1).every((r, i) => r.value === `s${i + 1}`) && s.payOff === false, [s.gets, s.payOff]);
  await clickPay(p); await sleep(600);
  s = await state(p);
  ok('7d Pay again goes through', s.head === 'Winners' && s.posts.length === 1 && s.posts[0].body.winners.length === 11, [s.head, s.posts.length]);
  await p.close();

  // The first read of the entries fails: it says so with Try again, not "no entries"
  p = await open('?places=12&awarded=1&entries=14&ended=1&offline=1');
  s = await state(p);
  ok('7e first read fails: "We couldn\'t load the entries", no money message',
    /We couldn't load the entries\. Check your connection and try again\./.test(s.body) && !/no entries to pick from|come back to your wallet/.test(s.body), s.body.slice(-200));
  await p.evaluate(() => { window.__offline = false; [...document.querySelectorAll('.cp-pick button')].find((b) => b.textContent === 'Try again').click(); });
  await sleep(400);
  s = await state(p);
  ok('7f Try again loads the 11 places to pick', s.pick && s.rows.length === 12 && s.pay === 'Pay 11 winners', [s.pick, s.rows.length]);
  await p.close();

  // Award now (entries open): an award with no answer keeps the list and the warning
  p = await open('?places=12&awarded=1&entries=5');
  await p.evaluate(() => { window.__offline = true; });
  await awardFirst(p); await sleep(800);
  s = await state(p);
  ok('7g Award now offline: the 5 entries stay listed with the warning', s.awardEntries.length === 5 && /^We couldn't confirm this\. It may have gone through/.test(s.err[0] || ''), [s.awardEntries, s.err]);
  await p.close();

  // 8. Phone layout with the app's real styles and fonts, a 16px gutter like the
  // job page: a long name (up to 30 characters) is cut short instead of running
  // over the prize or pushing the row out of the card
  const styles = path.join(__dirname, '../../src/styles');
  const fonts = 'file:///' + path.join(__dirname, '../../public/fonts/').replace(/\x5c/g, '/');
  const appCss = ['fonts.css', 'icons/tabler-icons.css', 'tokens.css', 'system.css', 'variables.css', 'global.css', 'ui.css']
    .map((f) => fs.readFileSync(path.join(styles, f), 'utf8')).join('\n')
    .replace(/@import[^;]+;/g, '').replace(/url\((['"]?)\/fonts\//g, `url($1${fonts}`);
  fs.writeFileSync(path.join(dir, 'app.css'), appCss);
  const phoneHtml = path.join(dir, 'phone.html');
  fs.writeFileSync(phoneHtml, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css">'
    + '<style>body{margin:0!important;padding:0!important;min-width:0!important}#root{margin:0 16px}.wjd-panel{background:var(--card);border:1px solid var(--border);border-radius:18px}</style>'
    + '<div id="root"></div><script src="bundle.js"></script>');
  const phoneUrl = 'file:///' + phoneHtml.replace(/\x5c/g, '/');
  const long = (k) => `abdulsalamofficialwriterng_x${String(k).padStart(2, '0')}`; // 30 characters
  const rename = (page, names) => page.evaluate(async (names) => {
    Object.entries(names).forEach(([id, n]) => { window.__subs.find((x) => x.id === id).worker.username = n; });
    window.__reload();
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 250));
  }, names);
  const measure = (page) => page.evaluate(() => {
    const cp = document.querySelector('.cp');
    const inner = cp.getBoundingClientRect().right - parseFloat(getComputedStyle(cp).paddingRight);
    const bad = [];
    document.querySelectorAll('.cp-prize').forEach((row, i) => {
      const r = row.getBoundingClientRect();
      const m = row.querySelector(':scope > .o-money').getBoundingClientRect();
      const who = row.querySelector('.cp-who');
      const tag = row.querySelector('.cp-paid');
      const end = tag ? tag.getBoundingClientRect().right : who ? who.getBoundingClientRect().right : null;
      if (end != null && end > m.left - 8) bad.push({ place: i + 1, overlap: Math.round(end - m.left) });
      if (r.right > inner + 0.5 || m.right > r.right) bad.push({ place: i + 1, sticksOut: Math.round(r.right - inner) });
    });
    document.querySelectorAll('.cp-pick .cp-row > *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > inner + 0.5) bad.push({ pickRow: el.textContent.slice(0, 40), sticksOut: Math.round(r.right - inner) });
    });
    return {
      bad, pageScroll: document.documentElement.scrollWidth - window.innerWidth,
      cut: [...document.querySelectorAll('.cp-who')].filter((a) => a.scrollWidth > a.clientWidth).map((a) => a.title),
    };
  });
  for (const vw of [360, 375, 390]) {
    // Entries open: 1st and 2nd awarded early (the Paid tag shows)
    p = await open('?places=12&awarded=2&entries=3', phoneUrl, vw);
    await rename(p, { w1: long(1), w2: 'abdulsalam_official' });
    let m = await measure(p);
    ok(`8a ${vw}px, entries open: a 30-character name and the Paid tag stay clear of the prize, inside the card`,
      !m.bad.length && m.pageScroll <= 0 && m.cut.includes(`@${long(1)}`), m);
    s = await state(p);
    ok(`8b ${vw}px the full name is kept (shown on hover) and both awarded places still say Paid`, s.prizes[0].who === `@${long(1)}` && s.prizes[0].paid && s.prizes[1].paid, s.prizes.slice(0, 2));
    await p.close();
    // Entries closed: the pick, with the places awarded early shown as paid
    p = await open('?places=12&awarded=2&entries=14&ended=1', phoneUrl, vw);
    await rename(p, { w1: long(1), w2: long(2), s1: long(3) });
    m = await measure(p);
    ok(`8c ${vw}px the pick: "Paid to @<30 characters>" rows stay inside the card`, !m.bad.length && m.pageScroll <= 0, m);
    await p.close();
    // Finished: all 12 places won by 30-character names
    p = await open('?places=12&awarded=12&entries=0&ended=1', phoneUrl, vw);
    await p.evaluate(() => { window.__paidAt = new Date().toISOString(); });
    await rename(p, Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`w${i + 1}`, long(i + 1)])));
    m = await measure(p);
    s = await state(p);
    ok(`8d ${vw}px finished, 12 long names: every row and prize stays inside the card`, s.head === 'Winners' && !m.bad.length && m.pageScroll <= 0 && m.cut.length === 12, m);
    await p.close();
  }
  // The look is kept on a wider screen: the name sits between the place and the
  // prize as before (equal space on each side), nothing cut
  p = await open('?places=12&awarded=2&entries=3', phoneUrl, 760);
  await rename(p, {});
  const gaps = await p.evaluate(() => [...document.querySelectorAll('.cp-prize')].slice(0, 2).map((row) => {
    const pl = row.querySelector('.cp-place').getBoundingClientRect(); const won = row.querySelector('.cp-won').getBoundingClientRect();
    const m = row.querySelector(':scope > .o-money').getBoundingClientRect();
    return { left: Math.round(won.left - pl.right), right: Math.round(m.left - won.right) };
  }));
  const wide = await measure(p);
  ok('8e 760px: same look, the name and Paid sit midway between the place and the prize', gaps.every((g) => Math.abs(g.left - g.right) <= 1 && g.left > 40) && !wide.cut.length && !wide.bad.length, [gaps, wide]);
  await p.close();

  // 9. Entries from closed accounts can't win (the server leaves them out)
  // a) The server's list doesn't say which accounts are closed (as it is now):
  // 12 places, 1st awarded, 12 entries waiting, @e3 and @e7 closed
  p = await open('?places=12&awarded=1&entries=12&ended=1&closed=3,7');
  for (let i = 0; i < 11; i++) await choose(p, i + 2, `s${i + 1}`);
  await clickPay(p); await sleep(700);
  s = await state(p);
  ok('9a the server needs 10 picks, not 11: the website now asks for 10 (2nd to 11th) and says why',
    s.err[0] === "There are 10 entries you haven't rejected, so pick all 10 of them" && s.rows.length === 11 && s.rows[10].place === '11th'
      && s.pay === 'Pay 10 winners' && /2 of these entries are from a closed account and can't win, so 10 places can be filled\./.test(s.pickNote), [s.err, s.rows.length, s.pay, s.pickNote]);
  ok('9b the first 10 picks stay and Pay is on', s.rows.slice(1).map((r) => r.value).join(',') === Array.from({ length: 10 }, (_, i) => `s${i + 1}`).join(',') && s.payOff === false, s.rows.map((r) => r.value));
  await clickPay(p); await sleep(700);
  s = await state(p);
  ok('9c a closed account among the picks: the refusal says what to do, the picks stay',
    /^One of the picked entries can't win \(rejected, or not part of this contest\)\. Picks you rejected are cleared below\. If you didn't reject any, one of your picks is from a closed account: choose a different entry for it\.$/.test(s.err[0] || '')
      && s.rows.slice(1).every((r) => r.value), [s.err, s.rows.map((r) => r.value)]);
  await choose(p, 4, 's11'); await choose(p, 8, 's12'); await sleep(80);
  await clickPay(p); await sleep(700);
  s = await state(p);
  ok('9d with those two swapped, the 10 winners are paid and 12th place goes back to the poster',
    s.head === 'Winners' && s.posts.length === 3 && s.posts[2].body.winners.length === 10 && !s.posts[2].body.winners.some((id) => id === 's3' || id === 's7')
      && s.prizes[11].none === 'Not filled: returned to the poster' && !s.err.length, [s.head, s.posts.length, s.prizes[11]]);
  await p.close();

  // b) Once the server says which accounts are closed (worker.isBanned), they
  // aren't listed at all and the first Pay goes through
  p = await open('?places=12&awarded=1&entries=12&ended=1&closed=3,7&sendBanned=1');
  s = await state(p);
  ok("9e isBanned sent: @e3 and @e7 aren't choices, 10 places to pick, and it says why",
    s.rows.length === 11 && s.rows[1].options.length === 10 && !s.rows[1].options.some((o) => o.v === 's3' || o.v === 's7') && s.pay === 'Pay 10 winners'
      && /2 entries are from a closed account and can't win, so they aren't listed\./.test(s.pickNote), [s.rows.length, s.rows[1].options, s.pickNote]);
  const okIds = ['s1', 's2', 's4', 's5', 's6', 's8', 's9', 's10', 's11', 's12'];
  for (let i = 0; i < 10; i++) await choose(p, i + 2, okIds[i]);
  await clickPay(p); await sleep(600);
  s = await state(p);
  ok('9f the first Pay goes through: 10 paid, 12th returned', s.head === 'Winners' && s.posts.length === 1 && s.prizes[11].none === 'Not filled: returned to the poster', [s.head, s.posts.length]);
  await p.close();

  // Award now with isBanned sent: closed accounts aren't listed
  p = await open('?places=12&awarded=1&entries=12&closed=3,7&sendBanned=1');
  s = await state(p);
  ok("9g Award now: @e3 and @e7 aren't listed, and it says why", s.awardEntries.length === 10 && !s.awardEntries.some((n) => n === '@e3' || n === '@e7')
    && /2 entries are from a closed account and can't win, so they aren't listed\./.test(s.awardNote), [s.awardEntries, s.awardNote]);
  await p.close();
  // Award now as the server is now: awarding a closed account is refused with a clear reason
  p = await open('?places=12&awarded=1&entries=4&closed=1');
  await awardFirst(p); await sleep(600);
  s = await state(p);
  ok("9h Award now on a closed account: the server's reason shows, nothing is paid", s.err[0] === "This entry's account is closed, so it can't win" && s.prizes.filter((x) => x.paid).length === 1, [s.err, s.prizes.filter((x) => x.paid).length]);
  await p.close();

  ok('nothing left the page', outside.length === 0, outside);
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
