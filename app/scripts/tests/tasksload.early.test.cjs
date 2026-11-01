// Jobs list + index.html's early data, in headless Chrome (2026-11-01).
// index.html asks for a page's first public data before the page's code has loaded
// (build-plugins/routePreload.ts) and src/lib/early.ts hands that answer to the first
// request for it. The early request has a 15 s limit from when the page opened, and
// an answer read after that died with it even when it had long arrived: a slow phone
// (code took over 15 s), or signed in when the full list timed out first, got
// "We couldn't load jobs" with the list already downloaded.
//   node scripts/tests/tasksload.early.test.cjs [another/routePreload.ts]
// Runs the real index.html script (made by the real plugin, its 15 s limit cut to
// 1.5 s so this runs fast) with the real early.ts, api.ts and fetchTasks, bundled by
// esbuild. A small server here answers the page and the API; any request leaving
// this computer is blocked. Give another copy of routePreload.ts to compare (e.g.
// the one before the fix: the four tests that read an answer late then fail).
const fs = require('fs');
const path = require('path');
const http = require('http');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

const APP = path.join(__dirname, '../..');
const PLUGIN = process.argv[2] ? path.resolve(process.argv[2]) : path.join(APP, 'build-plugins/routePreload.ts');
const LIMIT = 1500; // the early requests' limit here (15000 on the site)

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const jobs = (n) => Array.from({ length: n }, (_, i) => ({ id: 'job' + i, title: 'Job ' + i, description: 'Do the thing. '.repeat(40) }));

// The script the real plugin writes into index.html, for a made-up build with one
// chunk per page it lists
function earlyScript(origin) {
  const src = fs.readFileSync(PLUGIN, 'utf8');
  const { code } = esbuild.transformSync(src, { loader: 'ts', format: 'cjs', target: 'es2020' });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', code)(m, m.exports, () => ({}));
  const plugin = m.exports.default();
  plugin.configResolved({ base: '/', env: { VITE_API_BASE_URL: origin + '/api/v1' } });
  const bundle = { 'assets/index.js': { type: 'chunk', fileName: 'assets/index.js', isEntry: true, imports: [] } };
  [...src.matchAll(/page: '([^']+)'/g)].forEach(([, page], i) => {
    const fileName = `assets/p${i}.js`;
    bundle[fileName] = { type: 'chunk', fileName, isDynamicEntry: true, facadeModuleId: '/app/' + page, imports: [], viteMetadata: { importedCss: new Set() } };
  });
  const html = plugin.transformIndexHtml.handler('<head><!-- route-preload --></head>', { bundle });
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  if (script.split('AbortSignal.timeout(15000)').length !== 2) throw new Error('The early script no longer has one 15 s limit: update this test');
  return script.replace('AbortSignal.timeout(15000)', `AbortSignal.timeout(${LIMIT})`);
}

// The real fetchTasks, apiRequest and earlyFetch for the browser. fetchTasks needs
// only apiRequest, so the page's other imports are empty stand-ins.
async function appCode(origin) {
  const stub = {
    name: 'stub',
    setup(b) {
      b.onResolve({ filter: /.*/ }, (a) => {
        const from = (a.importer || '').replace(/\\/g, '/');
        if (from.endsWith('/src/pages/Tasks.tsx') && a.path !== '../lib/api') return { path: a.path, namespace: 'stub' };
        if (from.endsWith('/src/lib/api.ts') && a.path.includes('supabaseClient')) return { path: a.path, namespace: 'stub' };
        return undefined;
      });
      b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'module.exports = {}', loader: 'js' }));
    },
  };
  const out = await esbuild.build({
    stdin: { contents: "export { fetchTasks } from './src/pages/Tasks.tsx'\nexport { earlyFetch } from './src/lib/early.ts'", resolveDir: APP, loader: 'ts' },
    bundle: true, write: false, format: 'iife', globalName: 'App', target: 'es2020', jsx: 'automatic', logLevel: 'error',
    define: { 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: origin + '/api/v1' }) },
    plugins: [stub],
  });
  return out.outputFiles[0].text;
}

// ── The local server: the page, empty code files, and the API (answered by `api`) ──
let early = '';
let api = () => null; // (url) => { status, body, after, half } or null (404)
let seen = []; // API requests, e.g. "/tasks?limit=100"
const sockets = new Set();
const server = http.createServer((q, s) => {
  const u = new URL(q.url, 'http://localhost');
  if (u.pathname.startsWith('/api/v1/')) {
    const what = u.pathname.slice(7) + u.search;
    seen.push(what);
    const how = api(u, seen.filter((x) => x === what).length) || { status: 404, body: { message: 'Not found' } };
    const text = JSON.stringify(how.body);
    setTimeout(() => {
      s.writeHead(how.status || 200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      // half: send the first half, then nothing more (patchy data)
      if (how.half) s.write(text.slice(0, text.length >> 1)); else s.end(text);
    }, how.after || 0);
    return;
  }
  if (u.pathname.startsWith('/assets/')) { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(''); }
  s.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
  s.end(`<!doctype html><html><head><meta charset="utf-8"><script>${early}</script></head><body>test</body></html>`);
});
server.on('connection', (c) => { sockets.add(c); c.on('close', () => sockets.delete(c)); });

(async () => {
  await new Promise((r) => server.listen(0, 'localhost', r));
  const ORIGIN = `http://localhost:${server.address().port}`;
  const API = ORIGIN + '/api/v1';
  early = earlyScript(ORIGIN);
  const code = await appCode(ORIGIN);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-first-run', '--disable-background-networking', '--disable-component-update'] });
  const blocked = [];
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      if (new URL(r.url()).hostname !== 'localhost') { blocked.push(r.url()); return r.abort('blockedbyclient'); }
      r.continue();
    });
    // Open a page as a first visit would; signedIn sets the sign-in the app reads
    const open = async (where, signedIn) => {
      seen = [];
      await page.goto(ORIGIN + where, { waitUntil: 'load' });
      await page.evaluate((on) => { if (on) localStorage.setItem('ogapay_access_token', 'test-token'); else localStorage.clear(); }, signedIn);
    };
    const runApp = () => page.addScriptTag({ content: code });
    const load = (userId) => page.evaluate(async (userId) => {
      const r = await window.App.fetchTasks('all', userId || undefined, 0);
      return r ? { n: r.list.length, eligibility: r.eligibility } : null;
    }, userId || '');
    const count = (what) => seen.filter((x) => x === what).length;

    // 1. Signed out, slow phone: the page's code runs after the early limit
    api = (u) => (u.pathname.endsWith('/tasks') ? { body: { success: true, data: jobs(21) } } : null);
    await open('/tasks', false);
    await wait(LIMIT + 1000);
    await runApp();
    let r = await load();
    ok('signed out, code slower than the limit: the 21 jobs that came early show', r && r.n === 21 && r.eligibility === false, { r, seen });
    ok('...without asking again', count('/tasks?limit=100') === 1, seen);

    // 2. Signed in, opened directly: the full list fails after the early limit
    api = (u) => {
      if (!u.pathname.endsWith('/tasks')) return null;
      if (u.searchParams.get('eligible') === '1') return { status: 500, body: { message: 'Server busy' }, after: LIMIT + 1000 };
      return { body: { success: true, data: jobs(21) } };
    };
    await open('/tasks', true);
    await runApp();
    r = await load('u1');
    ok('signed in, full list fails after the limit: the public list index.html fetched shows', r && r.n === 21 && r.eligibility === false, { r, seen });
    ok('...it was the early answer (the public list was asked for once)', count('/tasks?limit=100') === 1 && count('/tasks?limit=100&eligible=1') === 1, seen);

    // 3. The early answer stops halfway: past the limit it's asked for again
    api = (u, nth) => (u.pathname.endsWith('/tasks') ? { body: { success: true, data: jobs(21) }, half: nth === 1 } : null);
    await open('/tasks', false);
    await wait(LIMIT + 500);
    await runApp();
    r = await load();
    ok('early answer stopped halfway: asked for again and the 21 jobs show', r && r.n === 21 && count('/tasks?limit=100') === 2, { r, seen });

    // 4. A quick first visit: the early answer is used once, later loads ask again
    api = (u) => (u.pathname.endsWith('/tasks') ? { body: { success: true, data: jobs(21) } } : null);
    await open('/tasks', false);
    await runApp();
    r = await load();
    const again = await load();
    ok('quick visit: the early answer shows, and the next load asks the server again', r && r.n === 21 && again && again.n === 21 && count('/tasks?limit=100') === 2, { r, again, seen });

    // 5. The homepage's early data, read late the way HomePage does (earlyFetch + json)
    api = (u) => ({ body: { success: true, data: { path: u.pathname } } });
    await open('/', false);
    await wait(LIMIT + 1000);
    await runApp();
    const home = await page.evaluate((api) => window.App.earlyFetch(api + '/tasks?status=OPEN').then((x) => x.json()).then((d) => d.data.path, (e) => 'failed: ' + e.name), API);
    ok('homepage, code slower than the limit: its early jobs data still reads', home === '/api/v1/tasks' && count('/tasks?status=OPEN') === 1, { home, seen });

    ok('nothing left this computer', blocked.length === 0, blocked);
  } finally {
    await browser.close();
    for (const c of sockets) c.destroy();
    server.close();
  }
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
