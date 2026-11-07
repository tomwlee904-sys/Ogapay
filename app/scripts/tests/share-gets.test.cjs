// Identical signed-in GETs asked for at the same moment share one request
// (2026-11-07): the real lib/api.ts against a fake server.
//   npm run test:share-gets
// Runs in jsdom with a fake server (window.fetch), so nothing goes to the network.
const path = require('path');
const { build } = require('esbuild');
const { JSDOM } = require('jsdom');

const SRC = path.join(__dirname, '../../src');
const BASE = 'https://api.example.test/api/v1';
let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

// The harness: the real AuthProvider and api.ts; push alerts and the sign-in
// dialog are stand-ins (they aren't what's tested)
const harness = `
import { createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider, useAuth } from ${JSON.stringify(path.join(SRC, 'context/AuthContext.tsx'))}
export * as api from ${JSON.stringify(path.join(SRC, 'lib/api.ts'))}
function Probe() {
  const a = useAuth()
  window.__seen.push({ isLoading: a.isLoading, id: a.user && a.user.id, role: a.user && a.user.role, checked: a.sessionChecked, avatar: a.user && a.user.avatar, kycTier: a.user && a.user.kycTier, country: a.user && a.user.country, wallet: a.user && a.user.wallet, count: a.user && a.user._count })
  window.__auth = a
  return null
}
export function mount() { window.__seen = []; createRoot(document.getElementById('root')).render(h(AuthProvider, null, h(Probe))) }
`;
const stubs = { name: 'stubs', setup(b) {
  b.onResolve({ filter: /^(\.\.\/lib\/push|\.\.\/lib\/signin)$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({ contents: a.path.endsWith('push') ? 'export const dropPushOnSignOut = async () => {}' : 'export const openSignIn = (o) => { window.__signIn = o }', loader: 'js' }));
} };
let out = '';
const bundle = () => build({
  stdin: { contents: harness, loader: 'tsx', resolveDir: SRC }, bundle: true, write: false, format: 'iife', globalName: 'T', platform: 'browser',
  jsx: 'automatic', plugins: [stubs], logLevel: 'error',
  define: { 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: BASE }), 'process.env.NODE_ENV': '"production"' },
}).then((r) => { out = r.outputFiles[0].text; });

// A fresh page each time, with its own fake server
function page({ token, refresh = 'r1', user } = {}) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://ogapay.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  if (token) w.localStorage.setItem('ogapay_access_token', token);
  if (refresh) w.localStorage.setItem('ogapay_refresh_token', refresh);
  if (user) w.localStorage.setItem('ogapay_user', JSON.stringify(user));
  const srv = { calls: [], routes: {}, expired: 0 };
  w.addEventListener('ogapay:session-expired', () => srv.expired++);
  // A route: (call) => [status, body] or a promise of it
  w.fetch = async (url, init = {}) => {
    const u = String(url).replace(BASE, '');
    const auth = init.headers && typeof init.headers.get === 'function' ? init.headers.get('Authorization') : (init.headers || {}).Authorization;
    const call = { url: u, method: (init.method || 'GET').toUpperCase(), auth: auth || null };
    srv.calls.push(call);
    const route = srv.routes[call.method + ' ' + u] || srv.routes[u];
    const [status, body] = route ? await route(call) : [404, { error: 'no route' }];
    return new w.Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  // jsdom has no fetch types: Node's stand in
  w.structuredClone = structuredClone; w.Headers = Headers; w.Response = Response;
  w.eval(out + ';window.T=T');
  return { w, T: w.T, srv, count: (u, m = 'GET') => srv.calls.filter((c) => c.url === u && c.method === m).length };
}
// A reply that waits until let go
function gate() { let open; const p = new Promise((r) => { open = r; }); return { p, open }; }

(async () => {
  await bundle();
  // ── 1. apiRequest: identical GETs at once share one request ──
  {
    const { T, srv, count } = page({ token: 't1' });
    const g = gate();
    srv.routes['/users/me'] = async () => { await g.p; return [200, { success: true, data: { id: 'u1', preferences: { defaultCurrency: 'NGN' } } }]; };
    const a = T.api.apiRequest('/users/me');
    const b = T.api.apiRequest('/users/me');
    g.open();
    const [ra, rb] = await Promise.all([a, b]);
    ok('two GETs of /users/me at once: one request', count('/users/me') === 1, srv.calls);
    ok('each caller gets the answer', ra.id === 'u1' && rb.id === 'u1', [ra, rb]);
    ra.preferences.defaultCurrency = 'USDC';
    ok('each caller gets its own copy (changing one leaves the other alone)', ra !== rb && rb.preferences.defaultCurrency === 'NGN', rb);
    await T.api.apiRequest('/users/me');
    ok('once answered, the next GET asks again (nothing kept)', count('/users/me') === 2, srv.calls.length);
  }
  // ── 2. different accounts never share ──
  {
    const { w, T, srv } = page({ token: 't1' });
    const g = gate();
    srv.routes['/wallet/balance'] = async (c) => { await g.p; return [200, { data: { who: c.auth } }]; };
    const a = T.api.apiRequest('/wallet/balance');
    w.localStorage.setItem('ogapay_access_token', 't2');
    const b = T.api.apiRequest('/wallet/balance');
    g.open();
    const [ra, rb] = await Promise.all([a, b]);
    ok('a different token: its own request and its own answer', srv.calls.length === 2 && ra.who === 'Bearer t1' && rb.who === 'Bearer t2', [srv.calls, ra, rb]);
  }
  // ── 3. not shared: signed out, other options, saves ──
  {
    const { T, srv, count } = page({ token: 't1' });
    srv.routes['/blog'] = async () => [200, { data: [] }];
    await Promise.all([T.api.apiRequest('/blog', { auth: false }), T.api.apiRequest('/blog', { auth: false })]);
    ok('signed-out GETs are not joined (index.html early answers cover them)', count('/blog') === 2, srv.calls);
    await Promise.all([T.api.apiRequest('/blog'), T.api.apiRequest('/blog', { headers: { 'X-Test': '1' } })]);
    ok('a GET with its own headers is not joined', count('/blog') === 4, srv.calls);
    srv.routes['POST /blog'] = async () => [200, { data: { ok: true } }];
    await Promise.all([T.api.apiRequest('/blog', { method: 'POST', body: '{}' }), T.api.apiRequest('/blog', { method: 'POST', body: '{}' })]);
    ok('POSTs are never joined', count('/blog', 'POST') === 2, srv.calls);
    await Promise.all([T.api.apiRequest('/blog'), T.api.apiRequest('/blog', { fresh: true })]);
    ok('a GET marked fresh is not joined', count('/blog') === 6, srv.calls);
  }
  // ── 3b. a save sent with a plain fetch: invalidateInFlight stops the join ──
  {
    const { T, srv, count } = page({ token: 't1' });
    const g = gate();
    srv.routes['/wallet/balance'] = async () => { await g.p; return [200, { data: {} }]; };
    const a = T.api.apiRequest('/wallet/balance');
    T.api.invalidateInFlight();
    const b = T.api.apiRequest('/wallet/balance');
    g.open(); await Promise.all([a, b]);
    ok('after invalidateInFlight the next GET is its own request', count('/wallet/balance') === 2, srv.calls);
  }
  // ── 4. a save in between: the read after it never gets the older answer ──
  {
    const { T, srv, count } = page({ token: 't1' });
    let name = 'Old';
    const g = gate();
    srv.routes['GET /users/me'] = async () => { const n = name; await g.p; return [200, { data: { firstName: n } }]; };
    srv.routes['PATCH /users/me'] = async () => { name = 'New'; return [200, { data: {} }]; };
    const early = T.api.apiRequest('/users/me'); // e.g. the currency provider
    await T.api.apiRequest('/users/me', { method: 'PATCH', body: '{"firstName":"New"}' });
    const fresh = T.api.apiRequest('/users/me'); // EditProfile's read after saving
    g.open();
    const [re, rf] = await Promise.all([early, fresh]);
    ok('PATCH then GET: a new request, not the one that began before the save', count('/users/me') === 2 && rf.firstName === 'New' && re.firstName === 'Old', [re, rf, srv.calls]);
  }
  // ── 5. 401: one renewal, one retry, shared by both callers ──
  {
    const { w, T, srv, count } = page({ token: 'old' });
    srv.routes['/scores/me'] = async (c) => c.auth === 'Bearer new' ? [200, { data: { score: 5 } }] : [401, { error: 'expired' }];
    srv.routes['POST /auth/refresh'] = async () => { await tick(5); return [200, { data: { tokens: { accessToken: 'new', refreshToken: 'r2' } } }]; };
    const [a, b] = await Promise.all([T.api.apiRequest('/scores/me'), T.api.apiRequest('/scores/me')]);
    ok('expired token: both callers get the answer after one renewal', a.score === 5 && b.score === 5, [a, b]);
    ok('one first try, one renewal, one retry', count('/scores/me') === 2 && count('/auth/refresh', 'POST') === 1 && w.localStorage.getItem('ogapay_access_token') === 'new', srv.calls);
  }
  // ── 6. a session the server turns down still signs out ──
  {
    const { w, T, srv } = page({ token: 'old' });
    srv.routes['/scores/me'] = async () => [401, { error: 'expired' }];
    srv.routes['POST /auth/refresh'] = async () => [401, { error: 'no' }];
    const r = await Promise.allSettled([T.api.apiRequest('/scores/me'), T.api.apiRequest('/scores/me')]);
    ok('refused renewal: both fail, session cleared, one sign-out event', r.every((x) => x.status === 'rejected') && !w.localStorage.getItem('ogapay_access_token') && srv.expired === 1, [r.map((x) => x.status), srv.expired]);
  }

  const SAVED = { id: 'u1', email: 'ada@test.io', firstName: 'Ada', username: 'ada', avatarUrl: 'https://img/ada.png', role: 'WORKER', kycStatus: 'APPROVED', kycTier: 2, createdAt: '2026-10-01T00:00:00Z' };
  const ME = { id: 'u1', email: 'ada@test.io', firstName: 'Ada', lastName: 'Obi', username: 'ada', avatar: 'https://img/ada.png', displayName: 'Ada Obi', role: 'WORKER', kycStatus: 'APPROVED', kycTier: 2, country: 'GH', wallet: { NGN: { balance: 10, pendingWithdrawals: 0 } }, phone: '+2348000000000', hasPassword: true, bankAccount: { accountNumber: '0123456789', bankName: 'GTB' }, onboarding: { profileComplete: true }, _count: { taskSubmissions: 3, tasksCreated: 0, referrals: 1 }, createdAt: '2026-10-01T00:00:00Z' };

  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
