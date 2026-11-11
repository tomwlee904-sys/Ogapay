// Pages draw at once for someone signed in on this device (login-24, 2026-11-11):
// the real AuthProvider and lib/api.ts start from the account saved at the last
// sign-in and read /auth/me behind it, instead of showing a loader until it
// answers. A session the server turns down still signs out.
//   npm run test:auth-instant
// Runs in jsdom with a fake server (window.fetch), so nothing goes to the network.
const path = require('path');
const { build } = require('esbuild');
const { JSDOM } = require('jsdom');

const SRC = path.join(__dirname, '../../src');
const BASE = 'https://api.example.test/api/v1';
let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

// The real AuthProvider; push alerts and the sign-in dialog are stand-ins
const harness = `
import { createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { AuthProvider, useAuth } from ${JSON.stringify(path.join(SRC, 'context/AuthContext.tsx'))}
function Probe() {
  const a = useAuth()
  window.__seen.push({ isLoading: a.isLoading, id: a.user && a.user.id, firstName: a.user && a.user.firstName, avatar: a.user && a.user.avatar, kycTier: a.user && a.user.kycTier, country: a.user && a.user.country })
  return null
}
export function mount() { window.__seen = []; const r = createRoot(document.getElementById('root')); flushSync(() => r.render(h(AuthProvider, null, h(Probe)))) }
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

function page({ token, refresh = 'r1', user } = {}) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://ogapay.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  if (token) w.localStorage.setItem('ogapay_access_token', token);
  if (refresh) w.localStorage.setItem('ogapay_refresh_token', refresh);
  if (user) w.localStorage.setItem('ogapay_user', JSON.stringify(user));
  const srv = { calls: [], routes: {} };
  w.fetch = async (url, init = {}) => {
    const u = String(url).replace(BASE, '');
    const call = { url: u, method: (init.method || 'GET').toUpperCase() };
    srv.calls.push(call);
    const route = srv.routes[u];
    const [status, body] = route ? await route(call) : [404, { error: 'no route' }];
    return new w.Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  w.structuredClone = structuredClone; w.Headers = Headers; w.Response = Response;
  w.eval(out + ';window.T=T');
  return { w, T: w.T, srv, count: (u) => srv.calls.filter((c) => c.url === u).length };
}
function gate() { let open; const p = new Promise((r) => { open = r; }); return { p, open }; }
const SAVED = { id: 'u1', username: 'tunde', firstName: 'Tunde', lastName: 'Ade', avatarUrl: 'https://img/a.png', role: 'WORKER', isEmailVerified: true, kycStatus: 'APPROVED', kycTier: 1, country: 'GH' };
const ME = { id: 'u1', username: 'tunde', firstName: 'Tunde B', lastName: 'Ade', avatar: 'https://img/b.png', role: 'WORKER', isEmailVerified: true, kycStatus: 'APPROVED', kycTier: 2, country: 'GH', hasEmail: true, walletAddress: 'So1', wallet: { NGN: { balance: 9000, pendingWithdrawals: 0 } }, bankAccount: { accountNumber: '0123456789', bankName: 'GTB' } };

(async () => {
  await bundle();
  // 1. Signed in before: drawn at once from the saved account
  {
    const { w, T, srv, count } = page({ token: 't1', user: SAVED });
    const g = gate();
    srv.routes['/auth/me'] = async () => { await g.p; return [200, { success: true, data: { user: ME } }]; };
    T.mount();
    const first = w.__seen[0];
    ok('1a the first draw already has the account (no loader while /auth/me runs)', first && first.isLoading === false && first.id === 'u1', w.__seen);
    ok('1b the saved picture is read (saved as avatarUrl)', first.avatar === 'https://img/a.png' && first.kycTier === 1 && first.country === 'GH', first);
    await tick(10);
    ok('1c /auth/me is still asked, once, behind it', count('/auth/me') === 1, srv.calls);
    g.open();
    await tick(20);
    const last = w.__seen[w.__seen.length - 1];
    ok('1d its answer replaces the saved account', last.firstName === 'Tunde B' && last.kycTier === 2 && last.avatar === 'https://img/b.png', last);
    const saved = JSON.parse(w.localStorage.getItem('ogapay_user'));
    ok('1e saved for next time: country, email, wallet address, Level', saved.country === 'GH' && saved.hasEmail === true && saved.walletAddress === 'So1' && saved.kycTier === 2, saved);
    ok('1f never saved: balances or bank details', !('wallet' in saved) && !('bankAccount' in saved) && !JSON.stringify(saved).includes('0123456789'), saved);
  }
  // 2. A token but nothing saved (older sign-in): waits for /auth/me as before
  {
    const { w, T, srv } = page({ token: 't1' });
    srv.routes['/auth/me'] = async () => [200, { success: true, data: { user: ME } }];
    T.mount();
    ok('2a nothing saved: loading until /auth/me answers', w.__seen[0].isLoading === true && !w.__seen[0].id, w.__seen[0]);
    await tick(20);
    const last = w.__seen[w.__seen.length - 1];
    ok('2b then signed in', last.isLoading === false && last.id === 'u1', last);
  }
  // 3. The saved session is turned down by the server: signed out
  {
    const { w, T, srv } = page({ token: 'old', user: SAVED });
    srv.routes['/auth/me'] = async () => [401, { success: false, message: 'Invalid access token' }];
    srv.routes['/auth/refresh'] = async () => [401, { success: false, message: 'Refresh token revoked' }];
    T.mount();
    ok('3a drawn from the saved account first', w.__seen[0].id === 'u1', w.__seen[0]);
    await tick(50);
    const last = w.__seen[w.__seen.length - 1];
    ok('3b the server says no: signed out and asked to sign in again', !last.id && !!w.__signIn, { last, signIn: w.__signIn });
  }
  // 4. A saved account without a token (signed out): not signed in, nothing asked
  {
    const { w, T, count } = page({ user: SAVED, refresh: null });
    T.mount();
    await tick(10);
    ok('4a no token: signed out, /auth/me not asked', w.__seen.every((s) => !s.id) && w.__seen[w.__seen.length - 1].isLoading === false && count('/auth/me') === 0, w.__seen);
  }
  // 5. No connection: the saved account stays
  {
    const { w, T, srv } = page({ token: 't1', user: SAVED });
    srv.routes['/auth/me'] = async () => { throw new TypeError('Failed to fetch'); };
    T.mount();
    await tick(50);
    const last = w.__seen[w.__seen.length - 1];
    ok('5a /auth/me can\'t be reached: still signed in with the saved account', last.id === 'u1' && last.isLoading === false, last);
  }
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
