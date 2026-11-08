// Jobs page list loading (src/pages/Tasks.tsx): a failed load must never look like
// "No jobs match", a failed refresh keeps the list on screen, and signed in the
// public list is tried when the full one fails or shown meanwhile when it's slow; an
// answer that stops halfway still ends; "Available for me" hides your own jobs
// (2026-11-01).
//   node scripts/tests/tasksload.test.cjs
// Compiles the real page file on the fly; its imports are stubbed, and apiRequest is
// a fake that answers (or fails) the way each test says. Nothing goes to the network.
// Timers run 20x faster, so "8 s" below takes 0.4 s. index.html's early data with
// the real api.ts/early.ts is tested in Chrome: tasksload.early.test.cjs.
const fs = require('fs');
const path = require('path');
const { transformSync } = require('esbuild');

const SPEED = 20;
const realSetTimeout = setTimeout;
global.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, Math.round((ms || 0) / SPEED), ...a);

const src = fs.readFileSync(path.join(__dirname, '../../src/pages/Tasks.tsx'), 'utf8');
const { code } = transformSync(src, { loader: 'tsx', format: 'cjs', jsx: 'automatic', target: 'es2020' });
const api = { apiRequest: null, getAccessToken: () => null };
const m = { exports: {} };
new Function('module', 'exports', 'require', code)(m, m.exports, (name) => (name === '../lib/api' ? api : {}));
const { fetchTasks, invalidateTasksCache, afterJobsLoad, jobsView, JOBS_START, availableToMe, beforeReload } = m.exports;

let fails = 0;
// A load that never ends would let Node quit quietly before the end: count that as a fail
process.on('beforeExit', () => { console.log('FAIL a load never ended (the tests stopped early)'); process.exit(1); });
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };

// The fake server: answers each request with the next reply (an Error is thrown)
let calls = [];
function serve(...replies) {
  calls = [];
  api.apiRequest = async (url, opts) => {
    calls.push({ url, auth: opts && opts.auth });
    const r = replies.length ? replies.shift() : new Error('no reply set');
    if (r instanceof Error) throw r;
    return r;
  };
}
const TIMEOUT = () => new Error('Request timed out');
const jobs = (n, extra = {}) => Array.from({ length: n }, (_, i) => ({ id: 'j' + i, title: 'Job ' + i, ...extra }));

// The fake server, by list: full (signed in, &eligible=1) and public. Each is
// { after: ms, reply } (reply an Error to fail) or HANG (an answer that never ends).
const HANG = { hang: true };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function serveLists(full, pub) {
  calls = [];
  const t0 = Date.now();
  api.apiRequest = (url, opts) => {
    const isFull = url.includes('&eligible=1');
    calls.push({ url, auth: opts && opts.auth, at: (Date.now() - t0) * SPEED });
    const how = isFull ? full : pub;
    if (!how) return Promise.reject(new Error('no reply set'));
    if (how.hang) return new Promise(() => {});
    return wait(how.after || 0).then(() => { if (how.reply instanceof Error) throw how.reply; return how.reply; });
  };
}
const publicAsks = () => calls.filter((c) => !c.url.includes('&eligible=1')).length;

(async () => {
  let r;
  // ── fetchTasks ──
  invalidateTasksCache();
  serve(jobs(3));
  r = await fetchTasks('all');
  ok('signed out: public list, no sign-in, no eligible flag', calls.length === 1 && calls[0].url === '/tasks?limit=100' && calls[0].auth === false && r.list.length === 3 && r.eligibility === false, { calls, r });
  serve();
  r = await fetchTasks('all');
  ok('signed out: a good list is cached', calls.length === 0 && r.list.length === 3, { calls, r });

  invalidateTasksCache();
  serve(TIMEOUT());
  r = await fetchTasks('all');
  ok('signed out: a timed-out load gives null, not an empty list', r === null, r);
  serve(jobs(2));
  r = await fetchTasks('all');
  ok('a failed load is never cached (next load asks again)', calls.length === 1 && r.list.length === 2, { calls, r });

  serve(TIMEOUT());
  r = await fetchTasks('all', undefined, 0);
  ok('refresh fails but a list loaded before: that list comes back, marked stale', r && r.stale === true && r.list.length === 2, r);

  invalidateTasksCache();
  serve(jobs(21, { eligible: true }));
  r = await fetchTasks('all', 'u1');
  ok('signed in: full list asked with sign-in and eligible=1', calls.length === 1 && calls[0].url === '/tasks?limit=100&eligible=1' && calls[0].auth === true && r.eligibility === true && r.list.length === 21, { calls, r });
  serve();
  r = await fetchTasks('all', 'u1');
  ok('signed in: the full list is cached per person', calls.length === 0 && r.eligibility === true, { calls, r });

  invalidateTasksCache();
  serve(TIMEOUT(), jobs(21));
  r = await fetchTasks('all', 'u1');
  ok('signed in: full list times out, the public list is tried once (21 jobs show)', calls.length === 2 && calls[1].url === '/tasks?limit=100' && calls[1].auth === false && r.list.length === 21 && r.eligibility === false, { calls, r });
  serve(jobs(21, { eligible: true }));
  r = await fetchTasks('all', 'u1');
  ok('signed in: the public stand-in is not cached, so the next load asks for the full list', calls.length === 1 && calls[0].url.endsWith('&eligible=1') && r.eligibility === true, { calls, r });

  invalidateTasksCache();
  serve(new Error('Request failed'), TIMEOUT());
  r = await fetchTasks('all', 'u1');
  ok('signed in: both fail and nothing loaded before: null', r === null && calls.length === 2, { calls, r });

  invalidateTasksCache();
  serve({ tasks: jobs(4) });
  r = await fetchTasks('all');
  ok('a { tasks: [...] } answer still reads as a list', r.list.length === 4, r);
  serve([]);
  invalidateTasksCache();
  r = await fetchTasks('all');
  ok('a real empty answer is an empty list (not a failure)', r && Array.isArray(r.list) && r.list.length === 0, r);

  // ── Signed in and the full list is slow: the public list shows meanwhile ──
  let standIns = [];
  const onStandIn = (res) => standIns.push(res);

  invalidateTasksCache(); standIns = [];
  serveLists({ after: 15000, reply: jobs(21, { eligible: true }) }, { after: 1000, reply: jobs(21) });
  r = await fetchTasks('all', 'u1', undefined, onStandIn);
  ok('full list slow: the public list is asked for after 6 s and shown meanwhile', standIns.length === 1 && standIns[0].eligibility === false && standIns[0].list.length === 21 && calls.length === 2 && calls[1].auth === false && calls[1].at >= 5000, { standIns, calls });
  ok('...then the full list comes and is the answer', r && r.eligibility === true && r.list.length === 21, r);
  serveLists(null, null);
  r = await fetchTasks('all', 'u1');
  ok('...and it is the one kept for next time', calls.length === 0 && r.eligibility === true, { calls, r });

  invalidateTasksCache(); standIns = [];
  serveLists({ after: 1000, reply: jobs(21, { eligible: true }) }, { after: 0, reply: jobs(21) });
  r = await fetchTasks('all', 'u1', undefined, onStandIn);
  await wait(8000);
  ok('full list quick: no public request, no stand-in', calls.length === 1 && standIns.length === 0 && r.eligibility === true, { calls, standIns });

  invalidateTasksCache(); standIns = [];
  serveLists({ after: 12000, reply: TIMEOUT() }, { after: 1000, reply: jobs(21) });
  r = await fetchTasks('all', 'u1', undefined, onStandIn);
  ok('full list fails after the stand-in showed: the public list is the answer, asked for once', r && r.eligibility === false && r.list.length === 21 && publicAsks() === 1 && standIns.length === 1, { calls, standIns, r });

  invalidateTasksCache(); standIns = [];
  serveLists({ after: 500, reply: new Error('Request failed') }, { after: 1000, reply: jobs(21) });
  r = await fetchTasks('all', 'u1', undefined, onStandIn);
  await wait(8000);
  ok('full list fails fast: the public list is asked for at once, once, and not also sent as a stand-in', r && r.list.length === 21 && publicAsks() === 1 && standIns.length === 0 && calls[1].at < 3000, { calls, standIns, r });

  invalidateTasksCache(); standIns = [];
  serveLists({ after: 8000, reply: jobs(21, { eligible: true }) }, { after: 5000, reply: jobs(20) });
  r = await fetchTasks('all', 'u1', undefined, onStandIn);
  await wait(8000);
  ok('full list comes while the public one is on the way: the late public list is not shown', r.eligibility === true && standIns.length === 0 && publicAsks() === 1, { calls, standIns });

  invalidateTasksCache();
  serveLists({ after: 10000, reply: jobs(21, { eligible: true }) }, { after: 0, reply: jobs(21) });
  r = await fetchTasks('all', 'u1', 0);
  ok('a focus refresh (no stand-in wanted) never asks for the public list while the full one is slow', publicAsks() === 0 && r.eligibility === true, calls);

  invalidateTasksCache(); standIns = [];
  serveLists(null, { after: 8000, reply: jobs(3) });
  r = await fetchTasks('all', undefined, undefined, onStandIn);
  ok('signed out: one request and no stand-in, however slow', calls.length === 1 && standIns.length === 0 && r.list.length === 3, { calls, standIns });

  // ── An answer that stops halfway (patchy data) still ends ──
  invalidateTasksCache();
  serveLists(null, HANG);
  let t0 = Date.now();
  r = await fetchTasks('all');
  ok('signed out: an answer that never ends fails after 25 s (error + Try again, not a skeleton for ever)', r === null && (Date.now() - t0) * SPEED >= 23000, { r, ms: (Date.now() - t0) * SPEED });

  invalidateTasksCache(); standIns = [];
  serveLists(HANG, { after: 1000, reply: jobs(21) });
  r = await fetchTasks('all', 'u1', undefined, onStandIn);
  ok('signed in, the full list never ends: stand-in at 6 s, then the public list is the answer', standIns.length === 1 && r && r.eligibility === false && r.list.length === 21 && publicAsks() === 1, { calls, standIns, r });

  invalidateTasksCache();
  serveLists(HANG, HANG);
  t0 = Date.now();
  r = await fetchTasks('all', 'u1', undefined, onStandIn);
  ok('signed in, neither ever ends: null (error + Try again), in about half a minute', r === null && (Date.now() - t0) * SPEED < 40000, { r, ms: (Date.now() - t0) * SPEED });

  serveLists(null, { after: 0, reply: jobs(5) });
  r = await fetchTasks('all');
  serveLists(null, HANG);
  r = await fetchTasks('all', undefined, 0);
  ok('a refresh that never ends hands back the list loaded before (marked stale)', r && r.stale === true && r.list.length === 5, r);

  // ── afterJobsLoad + jobsView ──
  let s = JOBS_START;
  ok('before anything loads: skeleton', jobsView(s, 0) === 'loading', s);
  s = afterJobsLoad(JOBS_START, null);
  ok('first load fails: error block, not "No jobs match"', jobsView(s, 0) === 'error', s);
  ok('background refresh while the first load runs and fails: still loading', jobsView(afterJobsLoad(JOBS_START, null, true), 0) === 'loading');
  ok('error on screen, background refresh fails: error stays', jobsView(afterJobsLoad(s, null, true), 0) === 'error');
  const back = afterJobsLoad(s, { list: jobs(5), eligibility: false }, true);
  ok('error on screen, background refresh works: the list shows', jobsView(back, 5) === 'list' && back.jobs.length === 5, back);

  const shown = afterJobsLoad(JOBS_START, { list: jobs(21, { eligible: true }), eligibility: true });
  ok('list loaded: list view', jobsView(shown, 21) === 'list' && shown.eligibility === true, shown);
  ok('list loaded but filters match none: the real "No jobs match"', jobsView(shown, 0) === 'empty');
  ok('a real empty list: "No jobs match" (not the error)', jobsView(afterJobsLoad(JOBS_START, { list: [], eligibility: false }), 0) === 'empty');
  ok('list on screen, background refresh fails: same list kept', afterJobsLoad(shown, null, true) === shown);
  ok('list on screen, a load fails: same list kept, no error', afterJobsLoad(shown, null) === shown);
  ok('list on screen, refresh gives an older stale list: screen kept', afterJobsLoad(shown, { list: jobs(2), eligibility: true, stale: true }, true) === shown);
  const fromStale = afterJobsLoad(JOBS_START, { list: jobs(2), eligibility: true, stale: true });
  ok('nothing on screen, an older list is all there is: it shows', jobsView(fromStale, 2) === 'list', fromStale);
  ok('full list on screen, refresh only got the public list: full list kept', afterJobsLoad(shown, { list: jobs(22), eligibility: false }, true) === shown);
  const pub = afterJobsLoad(JOBS_START, { list: jobs(21), eligibility: false });
  const pub2 = afterJobsLoad(pub, { list: jobs(22), eligibility: false }, true);
  ok('public list on screen, refresh gets a newer public list: replaced', pub2.jobs.length === 22 && pub2.eligibility === false, pub2);
  const full = afterJobsLoad(pub, { list: jobs(22, { eligible: true }), eligibility: true }, true);
  ok('public list on screen, refresh gets the full list: switches to it', full.eligibility === true && full.jobs.length === 22, full);
  const retried = afterJobsLoad(JOBS_START, { list: jobs(3), eligibility: false });
  ok('"Try again" starts from scratch and shows the list when it loads', jobsView(retried, 3) === 'list' && retried.failed === false, retried);

  // The page shows a stand-in like a refresh (background = true)
  const standInShown = afterJobsLoad(JOBS_START, { list: jobs(21), eligibility: false }, true);
  ok('stand-in on an empty screen: the public list shows at once', jobsView(standInShown, 21) === 'list' && standInShown.eligibility === false, standInShown);
  const fullAfter = afterJobsLoad(standInShown, { list: jobs(21, { eligible: true }), eligibility: true });
  ok('then the full list replaces it', fullAfter.eligibility === true && fullAfter.jobs[0].eligible === true, fullAfter);
  ok('a stand-in never replaces a full list already on screen', afterJobsLoad(fullAfter, { list: jobs(20), eligibility: false }, true) === fullAfter);

  // ── Sign-in finishes after the public list showed (2026-11-08): no blank second ──
  const guest = afterJobsLoad(JOBS_START, { list: jobs(21), eligibility: false });
  const signingIn = beforeReload(guest, true);
  ok('signing in: the list on screen stays (no loading placeholders)', jobsView(signingIn, 21) === 'list' && signingIn.jobs === guest.jobs, signingIn);
  ok('signing in: it no longer says which jobs you can take, and says it is checking', signingIn.eligibility === false && signingIn.checking === true, signingIn);
  const slowStandIn = afterJobsLoad(signingIn, { list: jobs(22), eligibility: false }, true);
  ok('a stand-in while checking: still checking', slowStandIn.checking === true && slowStandIn.jobs.length === 22, slowStandIn);
  const signedInFull = afterJobsLoad(signingIn, { list: jobs(21, { eligible: true }), eligibility: true });
  ok('then the full list replaces it and checking ends', signedInFull.eligibility === true && !signedInFull.checking && signedInFull.jobs[0].eligible === true, signedInFull);
  const fullFailed = afterJobsLoad(signingIn, null);
  ok("full list fails while checking: list kept, checking ends (the couldn't-check note can show)", fullFailed.jobs === guest.jobs && !fullFailed.checking && fullFailed.failed === false, fullFailed);
  const staleWhileChecking = afterJobsLoad(signingIn, { list: jobs(2), eligibility: true, stale: true });
  ok('an older list while checking: screen kept, checking ends', staleWhileChecking.jobs === guest.jobs && !staleWhileChecking.checking, staleWhileChecking);
  ok('signing out: starts over (the list may have members-only jobs)', beforeReload(signedInFull, false) === JOBS_START);
  ok('nothing on screen yet: starts over with the loading placeholders', beforeReload(JOBS_START, true) === JOBS_START);
  const afterError = { jobs: null, failed: true, eligibility: false };
  ok('"Try again" after an error: loading placeholders, error cleared', jobsView(beforeReload(afterError, true), 0) === 'loading');

  // ── "Available for me" ──
  const job = (extra) => ({ id: 'x', maxWorkers: 10, submissionsCount: 0, posterId: 'p9', poster: { id: 'p9' }, ...extra });
  ok('someone else\'s open job, public list only: shown', availableToMe(job(), undefined, 'u1', false) === true);
  ok('your own job, public list only: hidden', availableToMe(job({ posterId: 'u1', poster: { id: 'u1' } }), undefined, 'u1', false) === false);
  ok('your own job named only by poster.id: hidden', availableToMe(job({ posterId: undefined, poster: { id: 'u1' } }), undefined, 'u1', false) === false);
  ok('your own job, full list: hidden', availableToMe(job({ posterId: 'u1', eligible: false }), undefined, 'u1', true) === false);
  ok('signed out: a job with no poster is not hidden', availableToMe(job({ posterId: undefined, poster: undefined }), undefined, undefined, false) === true);
  ok('full list says you can\'t take it: hidden', availableToMe(job({ eligible: false }), undefined, 'u1', true) === false);
  ok('full list says you can: shown', availableToMe(job({ eligible: true }), undefined, 'u1', true) === true);
  ok('a job you already took: hidden', availableToMe(job(), 'SUBMITTED', 'u1', false) === false);
  ok('a place that expired can be taken again: shown', availableToMe(job(), 'EXPIRED', 'u1', false) === true);
  ok('no place free: hidden', availableToMe(job({ maxWorkers: 2, submissionsCount: 2 }), undefined, 'u1', false) === false);

  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
