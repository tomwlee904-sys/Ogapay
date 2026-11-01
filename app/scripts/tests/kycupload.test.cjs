// Level 2 "send your ID to our team" upload on slow mobile data (2026-11-01):
//  - lib/shrinkImage.ts: big photos are redrawn smaller as JPEG, the right way up;
//    small ones go as they are; unreadable ones go as they are if the server takes them
//  - lib/api.ts: an upload can ask for more time (timeoutMs); everything else keeps 15 s
//  - settings/Verification.tsx sendManualLevel2: up to 5 minutes for the upload; asks
//    first whether a request is already waiting (no second upload on paid data); a
//    timeout looks for the request twice (5 s apart) before saying "try again"; a
//    refusal from our server is never shown as "Sent" (review KYC-1..3, 2026-11-01)
//   node scripts/tests/kycupload.test.cjs
// Compiles the real files on the fly. The browser (createImageBitmap, canvas, <img>,
// fetch, localStorage) is faked; nothing goes to the network.
const fs = require('fs');
const path = require('path');
const { buildSync, transformSync } = require('esbuild');

const SRC = path.join(__dirname, '../../src');
const load = (code, req) => { const m = { exports: {} }; new Function('module', 'exports', 'require', code)(m, m.exports, req); return m.exports; };
const bundle = (file, extra = {}) => buildSync({ entryPoints: [path.join(SRC, file)], bundle: true, format: 'cjs', platform: 'node', write: false, ...extra }).outputFiles[0].text;

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const KB = 1024, MB = 1024 * 1024;
const file = (size, type = 'image/jpeg', name = 'IMG_2041.jpg') => new File([new Uint8Array(size)], name, { type });

// ── A fake browser for shrinkImage ──
const browser = { bitmapOpts: [], bitmapFails: false, bitmapSize: { width: 4000, height: 3000 }, imgFails: false, imgSize: { width: 3000, height: 4000 }, drawn: [], outSize: 300 * KB, revoked: 0, closed: 0 };
globalThis.createImageBitmap = async (blob, opts) => {
  browser.bitmapOpts.push(opts);
  if (browser.bitmapFails) throw new TypeError("The provided value 'from-image' is not a valid enum value");
  return { ...browser.bitmapSize, close: () => { browser.closed++; } };
};
globalThis.URL.createObjectURL = () => 'blob:fake';
globalThis.URL.revokeObjectURL = () => { browser.revoked++; };
globalThis.Image = class { set src(_) { setTimeout(() => { if (browser.imgFails) this.onerror(); else { this.naturalWidth = browser.imgSize.width; this.naturalHeight = browser.imgSize.height; this.onload(); } }, 0); } };
globalThis.document = {
  createElement: () => {
    const c = { width: 0, height: 0 };
    c.getContext = () => ({ fillRect() { browser.filled = true; }, drawImage: (src, x, y, w, h) => browser.drawn.push({ w, h, canvas: [c.width, c.height] }) });
    c.toBlob = (cb, type, q) => { browser.toBlob = { type, q }; setTimeout(() => cb(new Blob([new Uint8Array(browser.outSize)], { type })), 0); };
    return c;
  },
};
const reset = (o = {}) => Object.assign(browser, { bitmapOpts: [], bitmapFails: false, imgFails: false, drawn: [], outSize: 300 * KB, revoked: 0, closed: 0, toBlob: null, filled: false }, o);

const shrinkMod = load(bundle('lib/shrinkImage.ts'), require);
const { needsShrink, fitWithin, pickUpload, jpegName, cantSendText, shrinkImage, SHRINK } = shrinkMod;

// ── lib/api.ts with a fake fetch and localStorage ──
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), key: () => null, get length() { return 0; } };
globalThis.window = globalThis.window || { dispatchEvent() {} };
const apiMod = load(bundle('lib/api.ts', { define: { 'import.meta.env.VITE_API_BASE_URL': '"https://api.test/api/v1"' }, external: ['../lib/supabaseClient'] }), require);

const realSetTimeout = setTimeout;
let timers = [];
let fetches = [];
let replies = [];
globalThis.fetch = async (url, init) => {
  fetches.push({ url, init });
  const r = replies.length ? replies.shift() : { status: 200, body: { data: { ok: true } } };
  if (r === 'hang') return new Promise((_, reject) => init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); }));
  if (r instanceof Error) throw r;
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
};
// Records how long each request (or wait) is given (ms); anything of a second or
// more runs out at once, so 'hang' requests are aborted right away
const watchTimers = () => { timers = []; globalThis.setTimeout = (fn, ms, ...a) => { timers.push(ms); return realSetTimeout(fn, ms >= 1000 ? 1 : ms, ...a); }; };
const unwatchTimers = () => { globalThis.setTimeout = realSetTimeout; };

// ── settings/Verification.tsx (sendManualLevel2), apiRequest faked ──
const page = transformSync(fs.readFileSync(path.join(SRC, 'pages/settings/Verification.tsx'), 'utf8'), { loader: 'tsx', format: 'cjs', jsx: 'automatic', target: 'es2020' }).code;
const fakeApi = { apiRequest: null };
const pageMod = load(page, (name) => (name === '../../lib/api' ? fakeApi : name === '../../lib/shrinkImage' ? shrinkMod : {}));
const { sendManualLevel2, manualSendError, mayHaveArrived, MANUAL_UPLOAD_MS, ARRIVAL_RECHECK_MS, MANUAL_SENT, MANUAL_ALREADY } = pageMod;
const UP = MANUAL_UPLOAD_MS;
let calls = [];
const serve = (...rs) => { calls = []; fakeApi.apiRequest = async (url, opts = {}) => { calls.push({ url, opts }); const r = rs.length ? rs.shift() : new Error('no reply set'); if (r instanceof Error) throw r; return r; }; };
const TIMEOUT = () => new Error('Request timed out');

(async () => {
  let r, f;

  // ── The decisions ──
  ok('a 3 MB phone photo is shrunk', needsShrink({ size: 3 * MB, type: 'image/jpeg' }) === true);
  ok('a 200 KB JPEG goes as it is', needsShrink({ size: 200 * KB, type: 'image/jpeg' }) === false);
  ok('a 390 KB PNG goes as it is', needsShrink({ size: 390 * KB, type: 'image/png' }) === false);
  ok('a 401 KB JPEG is shrunk', needsShrink({ size: 401 * KB, type: 'image/jpeg' }) === true);
  ok('a small HEIC/GIF (type the server refuses) is redrawn as JPEG', needsShrink({ size: 100 * KB, type: 'image/heic' }) === true && needsShrink({ size: 100 * KB, type: 'image/gif' }) === true);
  ok('an empty file is not "small enough"', needsShrink({ size: 0, type: 'image/jpeg' }) === true);
  ok('defaults: 1600 px, quality 0.82, keep under 400 KB', SHRINK.maxSide === 1600 && SHRINK.quality === 0.82 && SHRINK.keepUnder === 400 * KB, SHRINK);
  r = fitWithin(4000, 3000); ok('4000x3000 → 1600x1200', r.width === 1600 && r.height === 1200, r);
  r = fitWithin(3024, 4032); ok('portrait 3024x4032 → 1200x1600', r.width === 1200 && r.height === 1600, r);
  r = fitWithin(800, 600); ok('never made bigger (800x600 stays)', r.width === 800 && r.height === 600, r);
  r = fitWithin(10000, 3); ok('a thin strip keeps at least 1 px', r.width === 1600 && r.height === 1, r);
  ok('the smaller of shrunk and original is sent', pickUpload({ size: 3 * MB, type: 'image/jpeg' }, { size: 300 * KB }) === 'shrunk' && pickUpload({ size: 450 * KB, type: 'image/jpeg' }, { size: 500 * KB }) === 'original');
  ok("can't redraw, original within 5 MB and a JPEG: send the original", pickUpload({ size: 4 * MB, type: 'image/jpeg' }, null, { maxBytes: 5 * MB }) === 'original');
  ok("can't redraw, original over 5 MB: none", pickUpload({ size: 7 * MB, type: 'image/jpeg' }, null, { maxBytes: 5 * MB }) === 'none');
  ok("can't redraw a HEIC: none (server refuses the type)", pickUpload({ size: 1 * MB, type: 'image/heic' }, null, { maxBytes: 5 * MB }) === 'none');
  ok('a HEIC redrawn as JPEG is sent even if bigger than the original', pickUpload({ size: 200 * KB, type: 'image/heic' }, { size: 300 * KB }, { maxBytes: 5 * MB }) === 'shrunk');
  ok('a shrunk copy over the limit is never sent', pickUpload({ size: 7 * MB, type: 'image/jpeg' }, { size: 6 * MB }, { maxBytes: 5 * MB }) === 'none');
  ok('names: IMG_2041.HEIC → IMG_2041.jpg, no name → photo.jpg', jpegName('IMG_2041.HEIC') === 'IMG_2041.jpg' && jpegName('') === 'photo.jpg' && jpegName('my.id.png') === 'my.id.jpg' && jpegName('selfie') === 'selfie.jpg');
  r = cantSendText({ size: 7 * MB, type: 'image/jpeg' }, { maxBytes: 5 * MB, label: 'your selfie' });
  ok('too big and unreadable: says so, in plain words', /^Your selfie is too large \(over 5 MB\)/.test(r) && /take a new photo/.test(r), r);
  r = cantSendText({ size: 1 * MB, type: 'image/heic' }, { maxBytes: 5 * MB, label: 'your ID photo' });
  ok('unknown format: asks for a JPG or PNG', /couldn't open your ID photo/.test(r) && /JPG or PNG/.test(r), r);

  // ── shrinkImage in a (fake) browser ──
  reset();
  f = file(6 * MB, 'image/jpeg', 'IMG_2041.jpg');
  r = await shrinkImage(f, { maxBytes: 5 * MB });
  ok('6 MB photo → JPEG of about 300 KB named .jpg', r !== f && r.type === 'image/jpeg' && r.size === 300 * KB && r.name === 'IMG_2041.jpg', { type: r.type, size: r.size, name: r.name });
  ok('decoded the right way up (imageOrientation from-image)', browser.bitmapOpts.length === 1 && browser.bitmapOpts[0] && browser.bitmapOpts[0].imageOrientation === 'from-image', browser.bitmapOpts);
  ok('drawn at 1600x1200 on a white background, JPEG quality 0.82', browser.drawn.length === 1 && browser.drawn[0].w === 1600 && browser.drawn[0].h === 1200 && browser.filled && browser.toBlob.type === 'image/jpeg' && browser.toBlob.q === 0.82, { drawn: browser.drawn, toBlob: browser.toBlob });
  ok('the decoded photo is let go (memory on phones)', browser.closed === 1, browser.closed);

  reset();
  f = file(200 * KB, 'image/png', 'shot.png');
  r = await shrinkImage(f);
  ok('a small PNG goes as it is, not even opened', r === f && browser.bitmapOpts.length === 0);

  reset({ bitmapFails: true });
  f = file(5 * MB, 'image/jpeg', 'IMG_9.jpg');
  r = await shrinkImage(f, { maxBytes: 5 * MB });
  ok('browser without from-image: an <img> is used (also upright), still shrunk', r.type === 'image/jpeg' && r.size === 300 * KB && browser.drawn[0].w === 1200 && browser.drawn[0].h === 1600 && browser.revoked === 1, { drawn: browser.drawn, revoked: browser.revoked });

  reset({ bitmapFails: true, imgFails: true });
  f = file(4 * MB, 'image/jpeg');
  r = await shrinkImage(f, { maxBytes: 5 * MB });
  ok("can't be opened, 4 MB JPEG: the original is sent", r === f && browser.revoked === 1);

  reset({ bitmapFails: true, imgFails: true });
  f = file(9 * MB, 'image/jpeg');
  r = await shrinkImage(f, { maxBytes: 5 * MB, label: 'your selfie' }).then(() => 'no error', (e) => e.message);
  ok("can't be opened, 9 MB: a plain message, nothing sent", /^Your selfie is too large/.test(r), r);

  reset({ outSize: 700 * KB });
  f = file(500 * KB, 'image/jpeg');
  r = await shrinkImage(f, { maxBytes: 5 * MB });
  ok('redrawn copy came out bigger: the original is kept', r === f);

  // ── apiRequest: timeouts and FormData ──
  watchTimers();
  replies = [{ status: 200, body: { data: { a: 1 } } }];
  fetches = [];
  r = await apiMod.apiRequest('/tasks?limit=100');
  ok('every existing call still gets 15 s', timers.includes(15000) && !timers.includes(UP) && r.a === 1, timers);
  ok('REQUEST_TIMEOUT_MS is 15000', apiMod.REQUEST_TIMEOUT_MS === 15000);

  timers = []; fetches = [];
  store.set('ogapay_access_token', 'tok1');
  const fd = new FormData(); fd.append('idType', 'NIN'); fd.append('id_front', file(300 * KB), 'IMG.jpg');
  replies = [{ status: 201, body: { data: { id: 'r1', status: 'PENDING' } } }];
  r = await apiMod.apiRequest('/kyc/level2/manual', { method: 'POST', body: fd, timeoutMs: UP });
  const sent = fetches[0];
  ok('an upload can ask for longer (5 minutes)', timers.includes(UP) && !timers.includes(15000) && r.status === 'PENDING', timers);
  ok('FormData goes through untouched, no Content-Type forced (browser sets the boundary)', sent.init.body === fd && !sent.init.headers.has('Content-Type') && sent.init.headers.get('Authorization') === 'Bearer tok1', [...sent.init.headers.entries()]);
  ok('timeoutMs is not passed on to fetch', !('timeoutMs' in sent.init), Object.keys(sent.init));

  timers = []; fetches = [];
  replies = [{ status: 200, body: { data: {} } }];
  await apiMod.apiRequest('/x', { method: 'POST', body: { a: 1 } });
  ok('JSON bodies still get Content-Type: application/json', fetches[0].init.headers.get('Content-Type') === 'application/json' && fetches[0].init.body === '{"a":1}');

  timers = [];
  replies = ['hang'];
  r = await apiMod.apiRequest('/kyc/level2/manual', { method: 'POST', body: fd, timeoutMs: UP }).then(() => 'resolved', (e) => e.message);
  ok("an upload that doesn't finish still ends with 'Request timed out'", r === 'Request timed out' && timers.includes(UP), { r, timers });

  timers = []; fetches = [];
  store.set('ogapay_refresh_token', 'ref1');
  replies = [{ status: 401, body: { message: 'Token expired' } }, { status: 200, body: { data: { accessToken: 'tok2', refreshToken: 'ref2' } } }, { status: 201, body: { data: { status: 'PENDING' } } }];
  r = await apiMod.apiRequest('/kyc/level2/manual', { method: 'POST', body: fd, timeoutMs: UP });
  ok('after renewing an expired session the upload is retried with the long time again', r.status === 'PENDING' && fetches.length === 3 && fetches[2].init.headers.get('Authorization') === 'Bearer tok2' && timers.filter((t) => t === UP).length === 2, { timers, n: fetches.length });

  timers = [];
  replies = [{ status: 200, body: { data: {} } }];
  await apiMod.apiRequest('/x', { timeoutMs: 0 });
  ok('timeoutMs 0 or missing falls back to 15 s', timers.includes(15000), timers);

  // ── sendManualLevel2 (timers still watched: the 5 s second look runs out at once) ──
  const steps = [];
  const big = () => ({ idType: 'NIN', idNumber: '123', front: file(4 * MB, 'image/jpeg', 'id.jpg'), selfie: file(5 * MB, 'image/jpeg', 'me.jpg') });
  const urls = () => calls.map((c) => `${c.opts.method || 'GET'} ${c.url}`);
  const posts = () => calls.filter((c) => c.opts.method === 'POST').length;
  const NONE = { request: null };
  const WAITING = (id) => ({ request: { id, status: 'PENDING', createdAt: '2026-11-01T10:00:00Z' } });
  const ALREADY_409 = () => new Error('Your Level 2 request is already with our team. We will let you know when it is checked.');
  reset();
  serve(NONE, { id: 'r1', status: 'PENDING', idType: 'NIN' });
  r = await sendManualLevel2(big(), (s) => steps.push(s));
  const post = calls[1];
  ok('sent: "Sent", and the new request handed to the page', r.result === 'sent' && r.text === MANUAL_SENT && r.request.id === 'r1', r);
  ok('asks first (a GET), then one POST to /kyc/level2/manual with 5 minutes', urls().join(',') === 'GET /kyc/level2/manual,POST /kyc/level2/manual' && post.opts.timeoutMs === 300000 && UP === 300000, urls());
  const b = post.opts.body;
  ok('both photos sent shrunk as JPEG, with the ID type and number', b.get('idType') === 'NIN' && b.get('idNumber') === '123' && b.get('id_front').size === 300 * KB && b.get('selfie').size === 300 * KB && b.get('selfie').type === 'image/jpeg', [b.get('id_front').size, b.get('selfie').size]);
  ok('the button shows each step (the first question costs no extra step)', steps.join(' | ') === 'Getting photos ready… | Sending photos…', steps);

  // KYC-1/KYC-2: a request already waiting (an earlier send that arrived late, or the
  // page's own check failed so the form showed): no second upload, never "Sent"
  serve(WAITING('yesterday'));
  r = await sendManualLevel2(big());
  ok('one already waiting: photos not uploaded again, told plainly', r.result === 'waiting' && r.text === MANUAL_ALREADY && r.request.id === 'yesterday' && posts() === 0, { r, calls: urls() });
  ok("...and the words say these photos weren't sent", /already with our team/.test(MANUAL_ALREADY) && /weren't sent/.test(MANUAL_ALREADY) && !/^Sent/.test(MANUAL_ALREADY));

  steps.length = 0; timers = [];
  serve(NONE, TIMEOUT(), WAITING('r2'));
  r = await sendManualLevel2(big(), (s) => steps.push(s));
  ok('timed out but the request reached us: shown as sent, not an error', r.result === 'sent' && r.request.id === 'r2' && calls.length === 3 && !calls[2].opts.method && steps.includes('Checking if they arrived…'), { r, calls: urls() });
  ok('...found at once, so no 5 s wait', !timers.includes(ARRIVAL_RECHECK_MS), timers);

  // KYC-1: the server was still saving the photos when we first looked
  timers = [];
  serve(NONE, TIMEOUT(), NONE, WAITING('r3'));
  r = await sendManualLevel2(big());
  ok('timed out, not there yet at first: looks again 5 s later and finds it (sent)', r.result === 'sent' && r.request.id === 'r3' && calls.length === 4 && timers.includes(5000) && ARRIVAL_RECHECK_MS === 5000, { r, calls: urls(), timers });

  serve({ request: { id: 'old', status: 'REJECTED', reason: 'blurry' } }, TIMEOUT(), { request: { id: 'old', status: 'REJECTED', reason: 'blurry' } }, WAITING('r4'));
  r = await sendManualLevel2(big());
  ok('...also when an old rejected request is all there is at first', r.result === 'sent' && r.request.id === 'r4', r);

  serve(NONE, TIMEOUT(), NONE, NONE);
  r = await sendManualLevel2(big());
  ok('timed out and nothing arrived after both looks: a plain "try again" message', r.result === 'failed' && /took too long to send/.test(r.text) && /try again/.test(r.text) && calls.length === 4, { r, calls: urls() });

  serve(NONE, TIMEOUT(), { request: { status: 'REJECTED', reason: 'blurry' } }, { request: { status: 'REJECTED', reason: 'blurry' } });
  r = await sendManualLevel2(big());
  ok('timed out, only an old rejected request there: still "try again"', r.result === 'failed' && /took too long/.test(r.text), r);

  serve(NONE, TIMEOUT(), TIMEOUT(), TIMEOUT());
  r = await sendManualLevel2(big());
  ok("timed out and the checks can't be made either: the timeout message", r.result === 'failed' && /took too long/.test(r.text), r);

  serve(NONE, new TypeError('Failed to fetch'), NONE, NONE);
  r = await sendManualLevel2(big());
  ok('connection dropped: says so (after looking twice)', r.result === 'failed' && /connection dropped/.test(r.text) && calls.length === 4, r);

  serve(NONE, new TypeError('Failed to fetch'), NONE, WAITING('r5'));
  r = await sendManualLevel2(big());
  ok('connection dropped but the photos got through: sent', r.result === 'sent' && r.request.id === 'r5', r);

  serve(NONE, new Error('An unexpected error occurred'), WAITING('r6'));
  r = await sendManualLevel2(big());
  ok('server broke after saving the request: it arrived, so sent', r.result === 'sent' && r.request.id === 'r6', r);

  serve(NONE, Object.assign(new Error('Unexpected token <'), { name: 'SyntaxError' }), NONE, NONE);
  r = await sendManualLevel2(big());
  ok('a proxy error page and nothing arrived: "try again" after looking twice', r.result === 'failed' && r.text === "Couldn't send your photos. Please try again." && calls.length === 4, r);

  // KYC-2: the server refused (409) and a request is waiting: never "Sent"
  timers = [];
  serve(TIMEOUT(), ALREADY_409(), WAITING('yesterday'));
  r = await sendManualLevel2(big());
  ok("first question failed, server says one is already waiting (409): not \"Sent\", these photos weren't kept", r.result === 'waiting' && r.text === MANUAL_ALREADY && r.text !== MANUAL_SENT && r.request.id === 'yesterday', r);
  ok('...a refusal is an answer: one look, no 5 s wait', calls.length === 3 && !timers.includes(ARRIVAL_RECHECK_MS), { calls: urls(), timers });

  serve(NONE, ALREADY_409(), WAITING('late'));
  r = await sendManualLevel2(big());
  ok('an earlier timed-out send landed while this one was going (409): "already with our team", not "Sent"', r.result === 'waiting' && r.text === MANUAL_ALREADY && r.request.id === 'late', r);

  serve(NONE, new Error('Choose the type of ID in your photo'), NONE);
  r = await sendManualLevel2(big());
  ok("the server's own reason is shown as it is (one look only)", r.result === 'failed' && r.text === 'Choose the type of ID in your photo' && calls.length === 3, { r, calls: urls() });

  serve(NONE, new Error('File too large'), NONE);
  r = await sendManualLevel2(big());
  ok('the server says a file is too large: plain words', r.result === 'failed' && /up to 5 MB/.test(r.text), r);

  reset({ bitmapFails: true, imgFails: true });
  serve(NONE);
  r = await sendManualLevel2({ idType: 'NIN', idNumber: '', front: file(1 * MB, 'image/heic', 'id.heic'), selfie: file(1 * MB) });
  ok("a photo that can't be opened or sent: a message, nothing uploaded", r.result === 'failed' && /couldn't open your ID photo/.test(r.text) && posts() === 0, { r, calls: urls() });
  unwatchTimers();

  ok('no answer (may have arrived): timeout, dropped connection, proxy page, server crash', mayHaveArrived(TIMEOUT()) && mayHaveArrived(new TypeError('Failed to fetch')) && mayHaveArrived(new Error('Load failed')) && mayHaveArrived(Object.assign(new Error('Unexpected token <'), { name: 'SyntaxError' })) && mayHaveArrived(new Error('An unexpected error occurred')) && mayHaveArrived(new Error('')));
  ok("our server's reasons (nothing kept): 409, 400, 413", !mayHaveArrived(ALREADY_409()) && !mayHaveArrived(new Error('Choose the type of ID in your photo')) && !mayHaveArrived(new Error('File too large')));
  ok('error words: SyntaxError (a proxy page) and 500s say "try again"', manualSendError(Object.assign(new Error('Unexpected token <'), { name: 'SyntaxError' })) === "Couldn't send your photos. Please try again." && manualSendError(new Error('An unexpected error occurred')) === "Couldn't send your photos. Please try again.");
  ok('error words: Safari/Firefox network errors', /connection dropped/.test(manualSendError(new Error('Load failed'))) && /connection dropped/.test(manualSendError(new Error('NetworkError when attempting to fetch resource.'))));

  // The page: what each result shows (pages/settings/Verification.tsx sendManual)
  const src = fs.readFileSync(path.join(SRC, 'pages/settings/Verification.tsx'), 'utf8');
  ok("the page never writes its own \"Sent\" toast (it shows the result's words)", !/toast\('Sent\./.test(src) && /toast\(r\.text, 'success'\)/.test(src) && /r\.result === 'failed'/.test(src));
  ok('the page keeps the request it was handed (with its id), not a bare PENDING', /setManualReq\(r\.request \|\| \{ status: 'PENDING' \}\)/.test(src));

  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
