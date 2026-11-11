// "Remember me" and session renewal in the real lib/api.ts (2026-11-11):
// unticked = the session is dropped once the browser closes (a cookie without an
// expiry date marks the browser session); a renewal lost on bad data is tried
// once more before giving up, and a refused one still signs out.
//   npm run test:session-remember
// Runs in jsdom with a fake server (window.fetch), so nothing goes to the network.
const path = require('path');
const { build } = require('esbuild');
const { JSDOM } = require('jsdom');

const SRC = path.join(__dirname, '../../src');
const BASE = 'https://api.example.test/api/v1';
let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };

const harness = `export * as api from ${JSON.stringify(path.join(SRC, 'lib/api.ts'))}`;
let out = '';
const bundle = () => build({
  stdin: { contents: harness, loader: 'ts', resolveDir: SRC }, bundle: true, write: false, format: 'iife', globalName: 'T', platform: 'browser', logLevel: 'error',
  define: { 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: BASE }), 'process.env.NODE_ENV': '"production"' },
}).then((r) => { out = r.outputFiles[0].text; });

// A page load. store = localStorage before the page's code runs; cookie = the
// browser-session cookie still there (same browser session) or not (closed since)
function page({ store = {}, cookie = '' } = {}) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://ogapay.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  for (const [k, v] of Object.entries(store)) w.localStorage.setItem(k, v);
  if (cookie) w.document.cookie = cookie;
  const srv = { calls: [], routes: {}, expired: 0 };
  w.addEventListener('ogapay:session-expired', () => srv.expired++);
  w.fetch = async (url, init = {}) => {
    const u = String(url).replace(BASE, '');
    const h = init.headers || {};
    const auth = typeof h.get === 'function' ? h.get('Authorization') : h.Authorization;
    const call = { url: u, method: (init.method || 'GET').toUpperCase(), auth: auth || null, body: init.body ? JSON.parse(init.body) : null };
    srv.calls.push(call);
    const route = srv.routes[call.method + ' ' + u] || srv.routes[u];
    const res = route ? await route(call) : [404, { error: 'no route' }];
    if (res === 'network') throw new TypeError('Failed to fetch');
    const [status, body, type] = res;
    return new w.Response(type === 'html' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': type === 'html' ? 'text/html' : 'application/json' } });
  };
  w.structuredClone = structuredClone; w.Headers = Headers; w.Response = Response;
  w.eval(out + ';window.T=T');
  const count = (u, m = 'POST') => srv.calls.filter((c) => c.url === u && c.method === m).length;
  return { w, T: w.T, srv, count, ls: (k) => w.localStorage.getItem(k), hasCookie: () => /(^|;\s*)ogapay_sess=1/.test(w.document.cookie) };
}
const USER = { id: 'u1', email: 'ada@test.io' };
const SIGNED_IN = { ogapay_access_token: 'a1', ogapay_refresh_token: 'r1', ogapay_user: JSON.stringify(USER) };

(async () => {
  await bundle();

  // ── login-15: Remember me ──
  {
    const { T, ls, hasCookie } = page();
    T.api.persistAuthSession({ user: USER, tokens: { accessToken: 'a1', refreshToken: 'r1', rememberMe: false } });
    ok('unticked sign-in: marked short, with a browser-session cookie', ls('ogapay_short_session') === '1' && hasCookie());
    ok('...and not ended while the browser is open', T.api.shortSessionEnded() === false);
    T.api.persistAuthSession({ tokens: { accessToken: 'a2', refreshToken: 'r2', rememberMe: false } });
    ok('a renewal that says short keeps it short', ls('ogapay_short_session') === '1' && ls('ogapay_access_token') === 'a2');
    T.api.persistAuthSession({ tokens: { accessToken: 'a3', refreshToken: 'r3' } });
    ok('a renewal without the field (old server) changes nothing', ls('ogapay_short_session') === '1');
    T.api.persistAuthSession({ user: USER });
    ok('saving the profile changes nothing', ls('ogapay_short_session') === '1');
    T.api.clearAuthSession();
    ok('signing out removes the mark and the cookie', ls('ogapay_short_session') === null && !hasCookie());
  }
  {
    const { T, ls, hasCookie } = page({ store: { ogapay_short_session: '1' }, cookie: 'ogapay_sess=1; path=/' });
    T.api.persistAuthSession({ user: USER, tokens: { accessToken: 'g1', refreshToken: 'gr1' } });
    ok('a later sign-in without the box (Google, wallet) is a normal session', ls('ogapay_short_session') === null && !hasCookie());
    T.api.persistAuthSession({ user: USER, tokens: { accessToken: 'b1', refreshToken: 'br1', rememberMe: true } });
    ok('ticked sign-in: no short mark', ls('ogapay_short_session') === null);
  }
  {
    const { srv, ls } = page({ store: { ...SIGNED_IN, ogapay_short_session: '1' }, cookie: 'ogapay_sess=1; path=/' });
    ok('short session, another tab / reload in the same browser session: still signed in', ls('ogapay_access_token') === 'a1' && srv.calls.length === 0);
  }
  {
    const { srv, ls } = page({ store: { ...SIGNED_IN, ogapay_short_session: '1' } });
    ok('short session, browser closed and opened again: signed out before anything loads', ls('ogapay_access_token') === null && ls('ogapay_refresh_token') === null && ls('ogapay_user') === null && ls('ogapay_short_session') === null);
    const lo = srv.calls.find((c) => c.url === '/auth/logout');
    ok('...and the server is told (that refresh token, with its access token)', !!lo && lo.method === 'POST' && lo.auth === 'Bearer a1' && lo.body.refreshToken === 'r1', srv.calls);
  }
  {
    const { srv, ls } = page({ store: { ...SIGNED_IN } });
    ok('remembered session, browser closed and opened again: still signed in', ls('ogapay_access_token') === 'a1' && srv.calls.length === 0);
  }
  {
    const { T, ls } = page({ store: { ...SIGNED_IN, ogapay_short_session: '1', ogapay_remember_email: 'ada@test.io' }, cookie: 'ogapay_sess=1; path=/' });
    T.api.clearAuthSession();
    ok('the remembered email is kept on sign-out (only the session goes)', ls('ogapay_short_session') === null && ls('ogapay_remember_email') === 'ada@test.io');
  }

  // ── login-16: renewal retried once on network trouble ──
  {
    const { T, srv, count, ls } = page({ store: { ...SIGNED_IN } });
    let n = 0;
    srv.routes['POST /auth/refresh'] = async () => (++n === 1 ? 'network' : [200, { data: { tokens: { accessToken: 'a2', refreshToken: 'r2', rememberMe: true } } }]);
    const t0 = Date.now();
    const r = await T.api.refreshAuthSession();
    ok('lost reply: tried once more and renewed', r && r.accessToken === 'a2' && ls('ogapay_refresh_token') === 'r2' && count('/auth/refresh') === 2, srv.calls);
    ok('...after a short wait (well inside the server\'s 60 s)', Date.now() - t0 >= 1000 && Date.now() - t0 < 10000, Date.now() - t0);
    ok('...both tries sent the same old token (the server returns the same pair)', srv.calls.filter((c) => c.url === '/auth/refresh').every((c) => c.body.refreshToken === 'r1'));
  }
  {
    const { T, srv, count, ls } = page({ store: { ...SIGNED_IN } });
    let n = 0;
    srv.routes['POST /auth/refresh'] = async () => (++n === 1 ? [502, '<html>Bad gateway</html>', 'html'] : [200, { data: { tokens: { accessToken: 'a2', refreshToken: 'r2' } } }]);
    const r = await T.api.refreshAuthSession();
    ok('server restarting (502 page): tried once more and renewed', r && r.accessToken === 'a2' && count('/auth/refresh') === 2 && ls('ogapay_access_token') === 'a2');
  }
  {
    const { T, srv, count, ls } = page({ store: { ...SIGNED_IN } });
    srv.routes['POST /auth/refresh'] = async () => 'network';
    srv.routes['/scores/me'] = async () => [401, { error: 'expired' }];
    const r = await Promise.allSettled([T.api.apiRequest('/scores/me')]);
    ok('offline: exactly two tries, then the request fails', count('/auth/refresh') === 2 && r[0].status === 'rejected', srv.calls);
    ok('...but the member stays signed in (no sign-out)', ls('ogapay_access_token') === 'a1' && ls('ogapay_refresh_token') === 'r1' && srv.expired === 0);
  }
  {
    const { T, srv, count, ls } = page({ store: { ...SIGNED_IN } });
    srv.routes['POST /auth/refresh'] = async () => [401, { error: 'no' }];
    srv.routes['/scores/me'] = async () => [401, { error: 'expired' }];
    await Promise.allSettled([T.api.apiRequest('/scores/me')]);
    ok('refused by the server (stolen/expired): no retry, signed out once', count('/auth/refresh') === 1 && ls('ogapay_access_token') === null && srv.expired === 1, srv.calls);
  }
  {
    const { T, srv, ls } = page({ store: { ...SIGNED_IN, ogapay_short_session: '1' }, cookie: 'ogapay_sess=1; path=/' });
    srv.routes['POST /auth/refresh'] = async () => [200, { data: { tokens: { accessToken: 'a2', refreshToken: 'r2', rememberMe: false } } }];
    await T.api.refreshAuthSession();
    ok('a short session renewed stays short', ls('ogapay_short_session') === '1' && ls('ogapay_access_token') === 'a2');
  }

  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
