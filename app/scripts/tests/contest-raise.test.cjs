// Raise prizes or add places on a live contest: the real contest box from the
// job page (ContestPanel) driven in headless Chrome against a fake server
// (contest-raise.harness.tsx). The owner's case: a blog contest with 5 places of
// ₦7,000, 1st already awarded, made 12 places. Every request that isn't the
// local test page is blocked and counted, so nothing reaches the internet.
//   npm run test:contest-raise
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const stubs = path.join(__dirname, 'contest-raise.stubs.tsx');
// The display currency is a stand-in; everything else is real
const stubPlugin = { name: 'stubs', setup(b) { b.onResolve({ filter: /context\/CurrencyContext$/ }, () => ({ path: stubs })) } };

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UNSURE = "We couldn't confirm this. The prizes may have been raised: check the prizes above before you try again.";
const CHANGED = 'The contest changed while you were editing. Check the prizes above and try again.';
const WENT = 'It went through: the prizes above are the new ones.';

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-contest-raise-'));
  await build({
    entryPoints: [path.join(__dirname, 'contest-raise.harness.tsx')], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(dir, 'bundle.js'),
    jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [stubPlugin],
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
    await page.waitForSelector('.cp-prizes');
    return page;
  };
  const state = (page) => page.evaluate(() => {
    const box = [...document.querySelectorAll('.cp-pick')].find((d) => d.querySelector('h3')?.textContent === 'Raise prizes or add places');
    const btns = [...document.querySelectorAll('button')];
    const sel = box?.querySelector('select');
    const acts = box ? [...box.querySelectorAll('.cp-acts button')] : [];
    return {
      openBtn: btns.some((b) => /Raise prizes or add places/.test(b.textContent)),
      editor: !!box,
      intro: box?.querySelector('.cp-note')?.textContent || '',
      places: sel ? sel.value : null,
      options: sel ? [...sel.options].map((o) => o.textContent) : [],
      rows: box ? [...box.querySelectorAll('.cp-row')].map((r) => ({
        place: r.querySelector('.cp-place')?.textContent,
        value: r.querySelector('input') ? r.querySelector('input').value : null,
        side: r.querySelector('.cp-amt')?.textContent || '',
        awarded: [...r.querySelectorAll('.cp-none')].map((x) => x.textContent).find((t) => /^Awarded/.test(t)) || '',
      })) : [],
      addBtn: box ? [...box.querySelectorAll('button')].some((b) => /Add a place/.test(b.textContent)) : false,
      sum: box?.querySelector('.cp-sum')?.textContent || '',
      // The quiet ≈ line under what leaves the wallet (display currency "Both", or dollars)
      alt: box?.querySelector('.cp-sum .o-money-alt')?.textContent || '',
      err: box ? [...box.querySelectorAll('.cp-err')].map((e) => e.textContent) : [],
      notes: box ? [...box.querySelectorAll('.cp-note')].map((e) => e.textContent) : [],
      save: acts[1] ? acts[1].textContent : '', saveDisabled: acts[1] ? acts[1].disabled : null,
      prizesShown: document.querySelectorAll('.cp-prize').length,
      awardNow: !!document.querySelector('.cp-pick h3') && [...document.querySelectorAll('.cp-pick h3')].some((h) => /^Award/.test(h.textContent)),
      toasts: [...document.querySelectorAll('[role=alert]')].filter((e) => !e.closest('.cp')).map((e) => e.textContent),
      posts: window.__calls.filter((c) => c.path === '/tasks/t1/raise-prizes').map((c) => c.body),
      server: window.__prizes,
      asked: window.__asked || '',
      search: window.__search,
    };
  });
  const set = (page, k, v) => page.evaluate((k, v) => { window[k] = v; }, k, v);
  const clickText = (page, re) => page.evaluate((src) => { const b = [...document.querySelectorAll('button')].find((x) => new RegExp(src).test(x.textContent)); b.click(); }, re);
  const clickSave = (page) => page.evaluate(() => { const b = [...document.querySelectorAll('.cp-acts button')]; b[1].click(); });
  // Type over the prize of a place (1 = 1st), like a person would
  const retype = async (page, place, text) => {
    const sel = `input[aria-label="${place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : place + 'th'} place prize"]`;
    await page.$eval(sel, (el) => { el.focus(); el.select(); });
    await page.keyboard.press('Backspace');
    await page.type(sel, text);
  };
  let p, s;

  // 1. The poster's blog contest: 5 places of ₦7,000, 1st awarded to @ada
  p = await open('?view=poster&preset=blog');
  s = await state(p);
  ok('1a the poster sees "Raise prizes or add places", closed', s.openBtn && !s.editor && s.prizesShown === 5, s);
  await clickText(p, 'Raise prizes or add places'); await sleep(200);
  s = await state(p);
  ok('1b it opens with 5 places now, and 5 to 20 to pick from', s.editor && s.places === '5' && s.options.length === 16 && s.options[0] === '5 (now)' && s.options[15] === '20', s.options);
  ok('1c the awarded 1st place is locked and says who has it', s.rows[0].value === null && s.rows[0].awarded === 'Awarded to @ada: ₦7,000 paid', s.rows[0]);
  ok('1d the other places can be raised from ₦7,000', s.rows.slice(1).every((r) => r.value === '7000' && r.side === 'Now ₦7,000'), s.rows);
  ok('1e nothing changed yet: Save is off, no error', s.saveDisabled && s.save === 'Save' && !s.err.length && s.notes.includes('Add a place or raise a prize to see what it costs.'), s);
  ok('1f it says places already awarded keep their prize, and whose wallet pays', /Places already awarded keep their prize\./.test(s.intro) && /held from your wallet at once/.test(s.intro), s.intro);

  await p.select('#cp-places-t1', '12'); await sleep(150);
  s = await state(p);
  ok('1g 12 places: 7 new places at ₦7,000 each', s.rows.length === 12 && s.rows.slice(5).every((r) => r.value === '7000' && r.side === 'New place'), s.rows);
  ok('1h the cost: ₦35,000 now, ₦84,000 after', /Prizes: ₦35,000 now, ₦84,000 after, for 12 places/.test(s.sum), s.sum);
  ok('1i ₦49,000 + ₦4,900 fee (10%) = ₦53,900 from your wallet', /Held now: ₦49,000 \+ ₦4,900 fee \(10%\) = ₦53,900 from your wallet/.test(s.sum), s.sum);
  ok('1j the button says what is held', s.save === 'Hold ₦53,900 and save' && !s.saveDisabled, s);
  ok('1j2 shown in naira: no ≈ line', s.alt === '', s.alt);

  await retype(p, 3, '8000'); await sleep(100);
  s = await state(p);
  ok("1k a lower place can't pay more than the one above", s.err[0] === "The 3rd place can't pay more than the 2nd place." && s.saveDisabled, s.err);
  await retype(p, 2, '8000'); await sleep(100);
  s = await state(p);
  ok("1l nothing can pay more than the awarded 1st place", s.err[0] === "The 2nd place can't pay more than the 1st place." && s.saveDisabled, s.err);
  await retype(p, 2, '7000'); await retype(p, 3, '7000'); await retype(p, 6, '20'); await sleep(100);
  s = await state(p);
  ok('1m a new place pays at least ₦50', s.err[0] === 'Give the 6th place a prize of at least ₦50.' && s.saveDisabled, s.err);
  await retype(p, 6, '7000'); await sleep(100);
  await clickText(p, '^ Add a place$|Add a place'); await sleep(100);
  s = await state(p);
  ok('1n Add a place adds a 13th at ₦7,000', s.rows.length === 13 && s.places === '13' && s.rows[12].value === '7000', s.rows.length);
  await p.select('#cp-places-t1', '12'); await sleep(100);
  s = await state(p);
  ok('1o back to 12 places, ready again', s.rows.length === 12 && !s.err.length && s.save === 'Hold ₦53,900 and save', s);

  // Not enough in the wallet: the server's reason shows and nothing changes
  await set(p, '__mode', 'broke'); await clickSave(p); await sleep(500);
  s = await state(p);
  ok('1p it asks first, with the amounts', /^Add 7 places\? ₦53,900 is held from your wallet now: ₦49,000 more in prizes plus the ₦4,900 fee\./.test(s.asked)
    && /The prizes will add up to ₦84,000 for 12 places\./.test(s.asked) && /Everyone who entered is told\./.test(s.asked), s.asked);
  ok('1q it sends the 12 prizes, 1st first', s.posts.length === 1 && JSON.stringify(s.posts[0]) === JSON.stringify({ prizes: Array(12).fill(7000) }), s.posts);
  ok("1r the server's reason shows; the form stays open as it was", s.err.some((e) => /^Insufficient balance/.test(e)) && s.editor && s.rows.length === 12 && s.prizesShown === 5, s);

  // Saying no to the question sends nothing
  await set(p, '__confirm', false); await clickSave(p); await sleep(300);
  s = await state(p);
  ok('1s Cancel on the question sends nothing', s.posts.length === 1, s.posts.length);

  await set(p, '__confirm', true); await set(p, '__mode', 'ok'); await clickSave(p); await sleep(700);
  s = await state(p);
  ok('1t it goes through: 12 places show on the page', s.posts.length === 2 && s.prizesShown === 12 && s.server.length === 12, s);
  ok('1u the form closes', !s.editor && s.openBtn, s);
  ok("1v a message says so, what the server held, and that 3 people were told", s.toasts.includes('Prizes updated: 12 places, ₦84,000 in total. ₦53,900 was held from your wallet. 3 people who entered were told.'), s.toasts);
  await clickText(p, 'Raise prizes or add places'); await sleep(150);
  s = await state(p);
  ok('1w opened again it starts from the 12 places (12 to 20)', s.places === '12' && s.options.length === 9 && s.rows.length === 12 && s.rows[11].side === 'Now ₦7,000', s);
  await p.select('#cp-places-t1', '20'); await sleep(100);
  s = await state(p);
  ok('1x at 20 places Add a place is gone', s.rows.length === 20 && !s.addBtn && /₦140,000 after, for 20 places/.test(s.sum), s);
  await clickText(p, '^Cancel$'); await sleep(100);
  s = await state(p);
  ok('1y Cancel closes it and keeps the 12 places', !s.editor && s.prizesShown === 12, s);
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  s = await state(p);
  ok('1z ...and opened again, nothing typed is left', s.rows.length === 12 && s.save === 'Save', s);
  await p.close();

  // 2. No answer in time, but it went through: the page finds out and says so
  p = await open('?view=poster&preset=blog');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '12'); await sleep(100);
  await set(p, '__mode', 'timeoutApplied'); await clickSave(p); await sleep(800);
  s = await state(p);
  ok('2a it reloads, finds the 12 places and closes the form', s.prizesShown === 12 && !s.editor, s);
  ok('2b ...and says it went through', s.toasts.includes('It went through: the prizes above are the new ones.'), s.toasts);
  await p.close();

  // 3. No answer in time and it didn't go through: the warning stays, try again works
  p = await open('?view=poster&preset=blog');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '12'); await sleep(100);
  await set(p, '__mode', 'timeout'); await clickSave(p); await sleep(800);
  s = await state(p);
  ok('3a the warning shows, the form stays with the 12 places', s.err.includes(UNSURE) && s.editor && s.rows.length === 12 && s.prizesShown === 5, s);
  await set(p, '__mode', 'ok'); await clickSave(p); await sleep(700);
  s = await state(p);
  ok('3b trying again goes through', s.prizesShown === 12 && !s.editor && s.posts.length === 2, s);
  await p.close();

  // 4. An admin raises it for the poster: the poster's wallet pays, no award box
  p = await open('?view=admin&preset=blog');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '12'); await sleep(100);
  s = await state(p);
  ok("4a an admin sees it, paid from the poster's wallet", /held from the poster's wallet at once/.test(s.intro) && /= ₦53,900 from the poster's wallet/.test(s.sum), s);
  ok('4b ...and no award box (that is the poster\'s)', !s.awardNow, s);
  await set(p, '__mode', 'ok'); await clickSave(p); await sleep(700);
  s = await state(p);
  ok("4c the question names the poster's wallet, and it goes through", /held from the poster's wallet now/.test(s.asked) && s.prizesShown === 12, s.asked);
  await p.close();

  // 4d. The server says its fee is 12%: the form, the question and the button use it
  p = await open('?view=poster&preset=blog&fee=12');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '12'); await sleep(100);
  s = await state(p);
  ok("4d the server's 12% fee is used: ₦49,000 + ₦5,880 fee (12%) = ₦54,880", /the 12% fee on it/.test(s.intro) && /Held now: ₦49,000 \+ ₦5,880 fee \(12%\) = ₦54,880 from your wallet/.test(s.sum) && s.save === 'Hold ₦54,880 and save', s);
  await clickSave(p); await sleep(700);
  s = await state(p);
  ok('4e ...the question says ₦54,880 and the message says what the server held', /^Add 7 places\? ₦54,880 is held from your wallet now: ₦49,000 more in prizes plus the ₦5,880 fee\./.test(s.asked)
    && s.toasts.includes('Prizes updated: 12 places, ₦84,000 in total. ₦54,880 was held from your wallet. 3 people who entered were told.'), [s.asked, s.toasts]);
  await p.close();

  // 5. Who doesn't see it
  p = await open('?view=entrant&preset=blog');
  s = await state(p);
  ok('5a someone who entered never sees it', !s.openBtn && !s.editor, s);
  await p.close();
  p = await open('?view=poster&preset=blog&ended=1');
  s = await state(p);
  ok('5b once entries close, the poster no longer sees it', !s.openBtn && !s.editor, s);
  await p.close();

  // 6. Opened from Manage jobs (?raise=1). Once done with the form, ?raise=1 is
  // dropped so a refresh or a shared link doesn't open it again (W4)
  p = await open('?view=poster&preset=blog&raise=1');
  s = await state(p);
  ok('6a ?raise=1 opens the form straight away', s.editor && s.rows.length === 5 && s.search === '?raise=1', s);
  await clickText(p, '^Cancel$'); await sleep(150);
  s = await state(p);
  ok('6b Cancel closes it and drops ?raise=1', !s.editor && s.search === '', s.search);
  await p.close();
  p = await open('?view=poster&preset=blog&raise=1');
  await p.select('#cp-places-t1', '12'); await sleep(100);
  await clickSave(p); await sleep(700);
  s = await state(p);
  ok('6c a raise that goes through drops ?raise=1', s.prizesShown === 12 && !s.editor && s.search === '', s);
  await p.close();
  p = await open('?view=poster&preset=blog&raise=1');
  await p.select('#cp-places-t1', '12'); await sleep(100);
  await set(p, '__mode', 'broke'); await clickSave(p); await sleep(500);
  s = await state(p);
  ok('6d a refused raise keeps ?raise=1 (the form is still open)', s.editor && s.search === '?raise=1', s.search);
  await set(p, '__mode', 'timeoutApplied'); await clickSave(p); await sleep(800);
  s = await state(p);
  ok('6e a raise found to have gone through after no answer drops it too', s.toasts.includes(WENT) && !s.editor && s.search === '', s);
  await p.close();

  // 7. Equal prizes, none awarded: raising 1st stops early awards, and it says so
  p = await open('?view=poster&preset=equal');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  s = await state(p);
  ok('7a no place is awarded: both can be raised, no "awarded" line', s.rows.every((r) => r.value === '5000') && !/already awarded/.test(s.intro), s);
  await retype(p, 1, '6000'); await sleep(100);
  s = await state(p);
  ok('7b ₦1,000 more + ₦100 fee = ₦1,100', /Held now: ₦1,000 \+ ₦100 fee \(10%\) = ₦1,100 from your wallet/.test(s.sum), s.sum);
  ok("7c it warns that places can't be awarded early any more", s.notes.some((n) => /won't all pay the same, so places can't be awarded before entries close any more: you rank the winners/.test(n)), s.notes);
  await clickSave(p); await sleep(700);
  s = await state(p);
  ok('7d the question says "Raise 1 prize"', /^Raise 1 prize\? ₦1,100 is held from your wallet now/.test(s.asked), s.asked);
  ok('7e it sends [6000, 5000]', JSON.stringify(s.posts[0]) === JSON.stringify({ prizes: [6000, 5000] }), s.posts);
  await p.close();

  // 8. The owner's case (W1): no answer in time and the raise never happened, then
  // the owner awards place 2 with Award now. That award is not the raise going through.
  p = await open('?view=poster&preset=blog&entry=1');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '12'); await sleep(100);
  await set(p, '__mode', 'timeout'); await clickSave(p); await sleep(800);
  s = await state(p);
  ok('8a the warning shows and the contest still has 5 places', s.err.includes(UNSURE) && s.prizesShown === 5 && s.awardNow, s);
  await clickText(p, '^Award now$'); await sleep(800);
  s = await state(p);
  ok('8b place 2 is awarded to @bola', /^Award @bola 2nd place now\?/.test(s.asked) && s.rows[1] && s.rows[1].awarded === 'Awarded to @bola: ₦7,000 paid' && s.rows[1].value === null, [s.asked, s.rows[1]]);
  ok('8c no "It went through" message: the contest still has 5 places', !s.toasts.includes(WENT) && s.prizesShown === 5 && s.server.length === 5, s.toasts);
  ok('8d the form stays open with the 12 places typed and the warning', s.editor && s.rows.length === 12 && s.err.includes(UNSURE), s);
  await set(p, '__mode', 'ok'); await clickSave(p); await sleep(700);
  s = await state(p);
  ok('8e trying again adds the 7 places (1st and 2nd keep their ₦7,000)', s.prizesShown === 12 && !s.editor && s.toasts.some((t) => /^Prizes updated: 12 places, ₦84,000 in total\./.test(t)) && !s.toasts.includes(WENT), s);
  await p.close();

  // 9. No answer in time, a place awarded meanwhile, and the raise lands late: the
  // reload 5 seconds on finds exactly what was sent, and only that says it went through
  p = await open('?view=poster&preset=blog&entry=1');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '12'); await sleep(100);
  await set(p, '__mode', 'timeoutLate'); await clickSave(p); await sleep(700);
  await clickText(p, '^Award now$'); await sleep(700);
  s = await state(p);
  ok('9a after the award, still no "went through" (the raise has not landed)', !s.toasts.includes(WENT) && s.prizesShown === 5 && s.editor && s.err.includes(UNSURE), s);
  await sleep(4800);
  s = await state(p);
  ok('9b the later reload finds the 12 places: now it says it went through and closes', s.prizesShown === 12 && s.toasts.includes(WENT) && !s.editor, s);
  await p.close();

  // 10. No answer in time, then an admin changes the prizes to something else: not
  // the raise sent here, so no "went through"; the form starts again from them
  p = await open('?view=poster&preset=blog');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '12'); await sleep(100);
  await set(p, '__mode', 'timeout'); await clickSave(p); await sleep(800);
  await set(p, '__prizes', [7000, 7000, 7000, 7000, 7000, 7000]);
  await p.evaluate(() => window.__reload()); await sleep(300);
  s = await state(p);
  ok('10a an admin\'s different change is not "went through"', !s.toasts.includes(WENT) && s.prizesShown === 6, s.toasts);
  ok('10b the form shows the 6 places now and says the contest changed', s.editor && s.rows.length === 6 && s.places === '6' && s.err.length === 1 && s.err[0] === CHANGED, s);
  await p.close();

  // 11. W2: an admin added places from another device while this form was open.
  // The server refuses; the page reloads and says why instead of just closing.
  p = await open('?view=poster&preset=blog');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '8'); await sleep(100);
  await set(p, '__prizes', Array(12).fill(7000));
  await clickSave(p); await sleep(700);
  s = await state(p);
  ok('11a it sent 8 places and the server refused (the contest has 12)', s.posts.length === 1 && s.posts[0].prizes.length === 8 && s.server.length === 12, s.posts);
  ok('11b the form stays open with the 12 places now and says the contest changed', s.editor && s.prizesShown === 12 && s.rows.length === 12 && s.places === '12' && s.err.length === 1 && s.err[0] === CHANGED, s);
  ok('11c ...and no "went through"', !s.toasts.includes(WENT), s.toasts);
  await p.close();

  // 12. W2: a place was awarded in another tab. The server's reason stays and the
  // awarded place is now locked at its prize.
  p = await open('?view=poster&preset=equal');
  await set(p, '__winners', [{ place: 1, prize: 5000, username: 'cara' }]);
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await retype(p, 1, '6000'); await sleep(100);
  await clickSave(p); await sleep(700);
  s = await state(p);
  ok("12a the server's reason stays: place 1 was already awarded", s.editor && s.err.includes('Place 1 was already awarded and paid ₦5,000.00, so its prize stays the same'), s.err);
  ok('12b the 1st place is now locked as awarded to @cara', s.rows[0].awarded === 'Awarded to @cara: ₦5,000 paid' && s.rows[0].value === null, s.rows[0]);
  await p.close();

  // 13. S1: entries close while the form is open. Nothing is sent; it says why.
  p = await open('?view=poster&preset=blog&endsIn=1500');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '12'); await sleep(1600);
  await set(p, '__asked', ''); await clickSave(p); await sleep(300);
  s = await state(p);
  ok('13a after entries close, Save sends nothing and asks nothing', s.posts.length === 0 && s.asked === '', [s.posts, s.asked]);
  ok("13b ...and says entries have closed", s.err.includes("Entries have closed, so the prizes can't be raised or places added now."), s.err);
  await p.close();

  // 14. W5: a USDC contest writes amounts as the rest of the page does (2.50 USDC),
  // and someone who shows amounts as "Both" sees the ≈ line under what is held
  p = await open('?view=poster&preset=usdc&currency=USDC&pref=BOTH');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  s = await state(p);
  ok('14a "Now 2.50 USDC", not "Now 2.5 USDC"', s.rows[0].side === 'Now 2.50 USDC' && s.rows[1].side === 'Now 2.50 USDC', s.rows);
  await p.select('#cp-places-t1', '3'); await sleep(100);
  s = await state(p);
  ok('14b 5.00 USDC now, 7.50 USDC after', /Prizes: 5\.00 USDC now, 7\.50 USDC after, for 3 places/.test(s.sum), s.sum);
  ok('14c 2.50 USDC + 0.25 USDC fee = 2.75 USDC', /Held now: 2\.50 USDC \+ 0\.25 USDC fee \(10%\) = 2\.75 USDC from your wallet/.test(s.sum) && s.save === 'Hold 2.75 USDC and save', s);
  ok('14d "Both": ≈ ₦4,125 under it', s.alt === '≈ ₦4,125', s.alt);
  await p.close();
  p = await open('?view=poster&preset=blog&pref=BOTH');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '12'); await sleep(100);
  s = await state(p);
  ok('14e a naira contest shown as "Both": ≈ $36 under ₦53,900', /= ₦53,900 from your wallet/.test(s.sum) && s.alt === '≈ $36', s.alt);
  await p.close();
  p = await open('?view=poster&preset=blog&pref=USDC');
  await clickText(p, 'Raise prizes or add places'); await sleep(100);
  await p.select('#cp-places-t1', '12'); await sleep(100);
  s = await state(p);
  ok('14f shown in dollars: the naira stays first, ≈ $35.93 under it', /= ₦53,900 from your wallet/.test(s.sum) && s.alt === '≈ $35.93', s.alt);
  await p.close();

  await browser.close();
  ok('nothing left the page', outside.length === 0, outside);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
