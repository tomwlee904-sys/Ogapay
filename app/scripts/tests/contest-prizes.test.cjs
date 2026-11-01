// Contest prizes (src/lib/contestPrizes.ts): adding places and raising prizes on
// a live contest, checked the way the server checks them (escrow.service
// raisePrizes), the referral board's prize line, what Manage jobs counts as
// paid out on a contest, and the Terms' contest rules.
//   npm run test:contest-prizes
const path = require('path');
const fs = require('fs');
const { buildSync } = require('esbuild');
// Compile the real file on the fly, like wallet-labels.test.cjs
const out = buildSync({ entryPoints: [path.join(__dirname, '../../src/lib/contestPrizes.ts')], bundle: true, format: 'cjs', platform: 'node', write: false });
const m = { exports: {} };
new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
const { MAX_PLACES, ordinal, exactMoney, parseAmount, resizePlaces, checkRaise, prizeRuns, runLabel, contestPaidOut } = m.exports;

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let r, c;

ok('20 places at most (create and raise)', MAX_PLACES === 20, MAX_PLACES);

// The owner's blog contest: 5 places of ₦7,000, 1st already awarded, made 12 places
const blog = [7000, 7000, 7000, 7000, 7000];
r = resizePlaces(blog.map(String), 12, blog.length);
ok('5 -> 12 places: new places start at the prize above', same(r, Array(12).fill('7000')), r);
c = checkRaise(blog, r, 'NGN', [1]);
ok('...ready to send, nothing broken', c.ready && c.error === '', c);
ok('...sends 12 prizes of ₦7,000', same(c.prizes, Array(12).fill(7000)), c.prizes);
ok('...₦35,000 now, ₦84,000 after', c.oldTotal === 35000 && c.newTotal === 84000, [c.oldTotal, c.newTotal]);
ok('...₦49,000 more held + ₦4,900 fee = ₦53,900', c.extra === 49000 && c.fee === 4900 && c.pay === 53900, [c.extra, c.fee, c.pay]);
ok('...7 places added, no prize raised', c.added === 7 && c.raised === 0, [c.added, c.raised]);
ok('...held money stays the sum of the prizes', c.oldTotal + c.extra === c.prizes.reduce((s, p) => s + p, 0), c);
c = checkRaise(blog, r, 'NGN', [1], 12);
ok("with the server's fee at 12%: ₦49,000 + ₦5,880 = ₦54,880", c.ready && c.extra === 49000 && c.fee === 5880 && c.pay === 54880, [c.extra, c.fee, c.pay]);

// Changing the number of places
r = resizePlaces(['7000', '7000', '7000', '7000', '7000'], 3, 5);
ok('places the contest has are never taken away', r.length === 5, r);
r = resizePlaces(['7000', '6000'], 50, 2);
ok('never more than 20 places', r.length === 20 && r[19] === '6000', r);
r = resizePlaces(['9000', '8000', '5000', '5000', '5000'], 3, 2);
ok('only places added here can be taken away again', same(r, ['9000', '8000', '5000']), r);
r = resizePlaces(['9000', '8000'], 3, 2);
ok('a new place copies the prize typed above it', same(r, ['9000', '8000', '8000']), r);
r = resizePlaces(['9000', '8000'], NaN, 2);
ok('a broken count keeps the places as they are', same(r, ['9000', '8000']), r);

// The server's rules
c = checkRaise([7000, 7000], ['7000', '7000'], 'NGN');
ok('nothing changed: not ready, but no error either', !c.ready && c.error === '', c);
c = checkRaise([7000, 7000], ['8000', '7000'], 'NGN', [1]);
ok('an awarded place keeps its prize', !c.ready && /already awarded/.test(c.error), c.error);
c = checkRaise([7000, 7000], ['7000', '6000'], 'NGN');
ok("a prize can't go down", !c.ready && /can't pay less than now/.test(c.error), c.error);
c = checkRaise([7000, 5000], ['7000', '8000'], 'NGN');
ok("a lower place can't pay more than the one above", !c.ready && /2nd place can't pay more than the 1st/.test(c.error), c.error);
c = checkRaise([7000, 5000], ['7000', '5000', '6000'], 'NGN');
ok("a new place can't pay more than the last one", !c.ready && /3rd place can't pay more than the 2nd/.test(c.error), c.error);
c = checkRaise([7000, 5000, 3000], ['7000', '5000'], 'NGN');
ok('fewer places than now is refused', !c.ready && /can be added, not taken away/.test(c.error), c.error);
c = checkRaise([7000], Array(21).fill('7000'), 'NGN');
ok('21 places is refused', !c.ready && /up to 20 places/.test(c.error), c.error);
c = checkRaise([7000], Array(20).fill('7000'), 'NGN');
ok('20 places is fine', c.ready && c.added === 19, c);
c = checkRaise([7000], ['7000', ''], 'NGN');
ok('a blank new place needs a prize', !c.ready && /2nd place a prize above 0/.test(c.error), c.error);
c = checkRaise([7000], ['7000', '0'], 'NGN');
ok('a new place of 0 is refused', !c.ready && /above 0/.test(c.error), c.error);
c = checkRaise([7000], ['7000', '20'], 'NGN');
ok('a new naira place pays at least ₦50', !c.ready && c.error === 'Give the 2nd place a prize of at least ₦50.', c.error);
c = checkRaise([2], ['2', '0.000001'], 'USDC');
ok('a new USDC place pays at least 0.03 USDC (as the server, 2026-11-01)', !c.ready && c.error === 'Give the 2nd place a prize of at least 0.03 USDC.', c.error);
c = checkRaise([1], ['1', '0.0001'], 'SOL');
ok('a new SOL place pays at least 0.0002 SOL', !c.ready && c.error === 'Give the 2nd place a prize of at least 0.0002 SOL.', c.error);
c = checkRaise([2, 1], ['2', '1.01'], 'USDC');
ok('a USDC raise of 0.01 in all is refused', !c.ready && c.error === 'Raise the prizes by at least 0.03 USDC in total.', c.error);
c = checkRaise([1000, 500], ['1000', '520'], 'NGN');
ok('a naira raise of ₦20 in all is refused', !c.ready && c.error === 'Raise the prizes by at least ₦50 in total.', c.error);
c = checkRaise([1000, 500, 500], ['1000', '525', '525'], 'NGN');
ok('...₦50 in all is fine', c.ready && c.extra === 50 && c.fee === 5, c);
c = checkRaise([2, 1], ['2', '1', '0.03'], 'USDC');
ok('...and a 0.03 USDC place is fine, with a 0.003 fee', c.ready && c.fee === 0.003 && c.pay === 0.033, c);
c = checkRaise([5000000], ['5000000', '5000000', '1'], 'USDC');
ok('more than 10,000,000 in all is refused', !c.ready && /too much/.test(c.error), c.error);

// Raising and adding together, amounts as typed
c = checkRaise([10000, 5000], ['12,000', '5,000', '5000'], 'NGN');
ok('commas are read: 1st raised and a place added', c.ready && same(c.prizes, [12000, 5000, 5000]) && c.added === 1 && c.raised === 1, c);
ok('...₦7,000 more + ₦700 fee', c.extra === 7000 && c.fee === 700 && c.pay === 7700, [c.extra, c.fee, c.pay]);
c = checkRaise([1000], ['1000', '505'], 'NGN');
ok('the fee is kept to the kobo (₦50.50)', c.fee === 50.5 && c.pay === 555.5 && exactMoney(c.pay, 'NGN') === '₦555.50', [c.fee, c.pay, exactMoney(c.pay, 'NGN')]);
c = checkRaise([2], ['2', '1.3333333'], 'USDC');
ok('USDC to 6 places, like the server', same(c.prizes, [2, 1.333333]) && c.fee === 0.133333 && c.pay === 1.466666, [c.prizes, c.fee, c.pay]);
ok('parseAmount refuses words', Number.isNaN(parseAmount('7k')) && Number.isNaN(parseAmount('.')) && parseAmount('7,000.50') === 7000.5, [parseAmount('7k'), parseAmount('.')]);

// The referral contest board: places that pay the same share a chip
const runs = (p) => prizeRuns(p).map((x) => `${runLabel(x)} ${x.prize}`).join(', ');
r = runs([80000, 40000, 24000, 8000, 8000, 8000, 8000, 8000, 8000, 8000]);
ok('referral contest today: 1st, 2nd, 3rd, 4th–10th', r === '1st 80000, 2nd 40000, 3rd 24000, 4th–10th 8000', r);
r = runs([80000, 40000, 24000, ...Array(9).fill(8000)]);
ok('with 12 places: 4th–12th', r === '1st 80000, 2nd 40000, 3rd 24000, 4th–12th 8000', r);
r = runs([10000, 5000, 3000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]);
ok('the weekly board is unchanged: 4th–10th ₦1,000', r === '1st 10000, 2nd 5000, 3rd 3000, 4th–10th 1000', r);
r = runs([]);
ok('no prizes, no chips', r === '', r);
ok('ordinals past 10', same([11, 12, 13, 20, 21, 22].map(ordinal), ['11th', '12th', '13th', '20th', '21st', '22nd']), [11, 12, 13, 20, 21, 22].map(ordinal));

// Amounts as they move, written like the rest of the page (lib/money formatMoney:
// "2.50 USDC"), with every kobo and crypto place kept
const amounts = [[7000, 'NGN'], [700.5, 'NGN'], [2.5, 'USDC'], [2, 'USDC'], [1.333333, 'USDC'], [0.03, 'USDC'], [0.0002, 'SOL'], [1.5, 'SOL']].map(([n, cur]) => exactMoney(n, cur));
ok('exactMoney: ₦7,000, ₦700.50, 2.50 USDC, 2.00 USDC, 1.333333 USDC, 0.03 USDC, 0.0002 SOL, 1.50 SOL',
  same(amounts, ['₦7,000', '₦700.50', '2.50 USDC', '2.00 USDC', '1.333333 USDC', '0.03 USDC', '0.0002 SOL', '1.50 SOL']), amounts);

// Manage jobs "paid out" on a contest: the prize of each place won, not the 1st prize for everyone
const placed = (n, from = 1) => Array.from({ length: n }, (_, i) => ({ status: 'APPROVED', place: from + i }));
const twelve = [...Array(5).fill(7000), ...Array(7).fill(5000)];
r = contestPaidOut(twelve, placed(12), 7000, 'NGN');
ok('5 x ₦7,000 + 7 x ₦5,000, all 12 paid: ₦70,000 (not 12 x ₦7,000 = ₦84,000)', r === 70000, r);
r = contestPaidOut(twelve, [...placed(2), { status: 'SUBMITTED', place: null }, { status: 'REJECTED' }, { status: 'PENDING' }], 7000, 'NGN');
ok('only winners count: 2 places paid is ₦14,000', r === 14000, r);
r = contestPaidOut(twelve, [{ status: 'APPROVED', place: 12 }, { status: 'APPROVED', place: 6 }], 7000, 'NGN');
ok('places awarded in any order: 12th + 6th = ₦10,000', r === 10000, r);
r = contestPaidOut(['2.5', '1.333333'], placed(2), 2.5, 'USDC');
ok('prizes sent as text, USDC to 6 places: 3.833333', r === 3.833333, r);
r = contestPaidOut(null, [{ status: 'APPROVED', place: 1 }, { status: 'APPROVED' }], 7000, 'NGN');
ok('no prizes on record: each winner counts the reward', r === 14000, r);
r = contestPaidOut([7000], [], 7000, 'NGN');
ok('nobody paid yet: 0', r === 0, r);

// The Terms say prizes can be raised and places added (up to MAX_PLACES), and how it is paid for
const terms = fs.readFileSync(path.join(__dirname, '../../src/pages/Terms.tsx'), 'utf8');
const contests = (terms.match(/<section id="contests">[\s\S]*?<\/section>/) || [''])[0];
ok('Terms: up to 20 places, and places can be added while entries are open',
  contests.includes(`(up to ${MAX_PLACES} places)`) && contests.includes(`While entries are open you can raise prizes or add places at the end, up to ${MAX_PLACES} in all.`), contests);
ok("Terms: the extra plus the fee is held then; prizes can't be lowered or places taken away; awarded places keep their prize",
  /extra prize money plus the platform fee on it is held from your wallet at that time/.test(contests) && /Prizes can't be lowered, places can't be taken away/.test(contests) && /a place already awarded keeps the prize it was paid/.test(contests), contests);

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
