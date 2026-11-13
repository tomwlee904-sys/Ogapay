// Vault launch countdown: the real Vault page in headless Chrome against a fake
// server (vault-launch.harness.tsx). Before launch it counts down to the launch
// (days, hours, minutes, seconds, ticking) under "Launching 15 December, 12:00"
// with the pool collected so far, and says nothing about a "next distribution".
// After launch it is the normal page. Also checked at phone width (390px) and
// desktop with the real styles: nothing overflows, and screenshots are saved
// (set VAULT_SHOTS=<folder> to keep them). Every request that isn't the local
// test page is blocked and counted, so nothing reaches the internet.
//   npm run test:vault-launch
const path = require('path');
const fs = require('fs');
const os = require('os');
const { build } = require('esbuild');
const puppeteer = require('puppeteer');

const SRC = path.join(__dirname, '../../src');
const stubs = path.join(__dirname, 'vault-launch.stubs.tsx');
const stubPlugin = { name: 'stubs', setup(b) { b.onResolve({ filter: /components\/Layout$/ }, () => ({ path: stubs })) } };

let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LAUNCH = Date.parse('2026-12-15T11:00:00Z');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogapay-vault-'));
  const common = {
    bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic', plugins: [stubPlugin],
    alias: { 'vault-under-test': path.join(SRC, 'pages/Vault.tsx') },
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"https://api.example.test/api/v1"}', 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  };
  // Logic bundle (no styles), like the other harnesses
  await build({ ...common, entryPoints: [path.join(__dirname, 'vault-launch.harness.tsx')], outfile: path.join(dir, 'bundle.js'), loader: { '.css': 'empty' } });
  // Looks bundle: the site's global styles + the page's own, fonts/icons left out
  const styled = path.join(dir, 'styled-entry.tsx');
  const css = ['tokens.css', 'system.css', 'variables.css', 'global.css', 'ui.css'].map((f) => path.join(SRC, 'styles', f)).filter(fs.existsSync);
  fs.writeFileSync(styled, css.map((f) => `import ${JSON.stringify(f.replace(/\\/g, '/'))}`).join('\n') + `\nimport ${JSON.stringify(path.join(__dirname, 'vault-launch.harness.tsx').replace(/\\/g, '/'))}\n`);
  // Tailwind (tokens.css) needs its own build step; the Vault page doesn't use its classes
  const noTailwind = { name: 'no-tailwind', setup(b) { b.onResolve({ filter: /^tailwindcss/ }, () => ({ path: 'tw', namespace: 'empty-css' })); b.onLoad({ filter: /.*/, namespace: 'empty-css' }, () => ({ contents: '', loader: 'css' })) } };
  await build({ ...common, plugins: [stubPlugin, noTailwind], entryPoints: [styled], outdir: path.join(dir, 'styled'), loader: { '.woff2': 'empty', '.woff': 'empty', '.ttf': 'empty', '.eot': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' } });

  fs.writeFileSync(path.join(dir, 'page.html'), '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="bundle.js"></script>');
  fs.writeFileSync(path.join(dir, 'styled.html'), '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="styled/styled-entry.css"><div id="root"></div><script src="styled/styled-entry.js"></script>');
  const url = (file) => 'file:///' + path.join(dir, file).replace(/\x5c/g, '/');

  const browser = await puppeteer.launch({ headless: true });
  const outside = [];
  const open = async (query, { file = 'page.html', width = 1280, height = 900 } = {}) => {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (/^(file|data):/.test(r.url())) r.continue(); else { outside.push(r.url()); r.abort(); } });
    page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); fails++; });
    await page.goto(url(file) + query);
    await page.waitForFunction(() => /₦/.test(document.querySelector('.vt2-big')?.textContent || ''), { timeout: 8000 }).catch(() => {});
    return page;
  };
  const read = (page) => page.evaluate(() => {
    const next = document.querySelector('.vt2-next');
    return {
      eyebrow: next?.querySelector('.up-eyebrow')?.textContent || '',
      count: next?.querySelector('.vt2-count')?.textContent || '',
      sub: next?.querySelector('.vt2-sub')?.textContent || '',
      pool: document.querySelector('.vt2-big')?.textContent || '',
      poolSub: document.querySelector('.vt2-bal .vt2-sub')?.textContent || '',
      head: document.querySelector('.vt2-head p')?.textContent || '',
      shared: [...document.querySelectorAll('.vt2-stat')].find((s) => /Shared so far/.test(s.textContent))?.querySelector('b')?.textContent || '',
      text: document.body.innerText,
      how: document.querySelector('.vt2-steps')?.textContent || '', // inside a closed <details>
      calls: window.__vaultCalls,
    };
  });
  let p, s, s2;

  // 1. Before launch
  p = await open('?mode=prelaunch');
  s = await read(p);
  ok('1a heading says "Launching 15 December, 12:00"', s.eyebrow === 'Launching 15 December, 12:00', s.eyebrow);
  const days = Math.floor((LAUNCH - Date.now()) / 86400000);
  ok('1b countdown in days, hours, minutes, seconds', /^\d+d \d\dh \d\dm \d\ds$/.test(s.count) && s.count.startsWith(days + 'd '), { count: s.count, days });
  await sleep(1300);
  s2 = await read(p);
  ok('1c it ticks every second', s2.count !== s.count && /^\d+d \d\dh \d\dm \d\ds$/.test(s2.count), [s.count, s2.count]);
  ok('1d the pool collected so far is shown', s.pool === '₦48,250.5' && /collected so far/i.test(s.poolSub) && /shared at launch/i.test(s.poolSub), [s.pool, s.poolSub]);
  ok('1e no "next distribution" wording anywhere before launch', !/next distribution/i.test(s.text) && !/next payout/i.test(s.text), s.text.match(/.{0,40}next (distribution|payout).{0,20}/i));
  ok('1f shared so far is ₦0 (fresh start)', s.shared === '₦0', s.shared);
  ok('1g intro says sharing starts on 15 December', /From 15 December, platform revenue is shared/.test(s.head), s.head);
  ok('1h the sub line says Lagos time and that the first run shares everything', /Lagos time/.test(s.sub) && /first distribution shares everything/i.test(s.sub), s.sub);
  ok('1i how-it-works gives the Lagos schedule', /From 15 December, at 12:00 and 00:00 Lagos time/.test(s.how), s.how);
  await p.close();

  // 2. After launch: the normal page, schedule from the launch time
  p = await open('?mode=launched');
  s = await read(p);
  ok('2a "Next distribution" with an hours countdown', s.eyebrow === 'Next distribution' && /^\d+h \d\dm \d\ds$/.test(s.count), s);
  ok('2b schedule: 12:00 and 00:00 in Lagos (11:00 and 23:00 UTC)', s.sub === 'Runs at 12:00 and 00:00 in Lagos (11:00 and 23:00 UTC).', s.sub);
  ok('2c no launch wording after launch', !/Launching/.test(s.text) && /Fees collected since the last distribution/.test(s.poolSub) && s.shared === '₦48,250', s);
  await p.close();

  // 3. An older server without launchAt: exactly the old page
  p = await open('?mode=legacy');
  s = await read(p);
  ok('3a older server: old wording kept', s.eyebrow === 'Next distribution' && s.sub === 'Runs at 00:00 and 12:00 UTC (1am and 1pm in Lagos).' && /^\d+h/.test(s.count), s);
  await p.close();

  // 4. Page left open across the launch: shows Launching…, then the normal page
  p = await open('?mode=prelaunch&launchIn=2500&flipAfter=1');
  s = await read(p);
  ok('4a seconds before launch: 0d 00h 00m 0Xs', /^0d 00h 00m 0\ds$/.test(s.count), s.count);
  await sleep(3000);
  s = await read(p);
  ok('4b at launch it says Launching…', s.count === 'Launching…', s.count);
  await p.waitForFunction(() => document.querySelector('.vt2-next .up-eyebrow')?.textContent === 'Next distribution', { timeout: 9000 }).catch(() => {});
  s = await read(p);
  ok('4c a few seconds later it reloads the vault and shows the next distribution', s.eyebrow === 'Next distribution' && s.calls === 2 && /^\d+h \d\dm \d\ds$/.test(s.count), s);
  await p.close();

  // 5. Looks: phone (390px) and desktop, with the real styles
  const shotDir = process.env.VAULT_SHOTS || dir;
  fs.mkdirSync(shotDir, { recursive: true });
  for (const [label, width, height] of [['phone', 390, 844], ['desktop', 1280, 900]]) {
    p = await open('?mode=prelaunch', { file: 'styled.html', width, height });
    await sleep(300);
    const m = await p.evaluate(() => {
      const r = (sel) => { const e = document.querySelector(sel); const b = e?.getBoundingClientRect(); return b ? { x: b.x, w: b.width, right: b.right } : null };
      const c = document.querySelector('.vt2-count');
      return {
        scroll: document.documentElement.scrollWidth, inner: window.innerWidth,
        card: r('.vt2-next'), count: r('.vt2-count'),
        countFits: c ? c.scrollWidth <= c.clientWidth + 1 : false,
        countLines: c ? Math.round(c.getBoundingClientRect().height / parseFloat(getComputedStyle(c).lineHeight)) : 0,
        sideBySide: (() => { const a = document.querySelector('.vt2-bal')?.getBoundingClientRect(); const b = document.querySelector('.vt2-next')?.getBoundingClientRect(); return a && b ? Math.abs(a.top - b.top) < 2 : null })(),
      };
    });
    ok(`5 ${label}: no sideways scroll`, m.scroll <= m.inner, m);
    ok(`5 ${label}: countdown fits on one line inside its card`, m.countFits && m.countLines === 1 && m.count.right <= m.card.right, m);
    ok(`5 ${label}: layout as before (cards ${label === 'phone' ? 'stacked' : 'side by side'})`, label === 'phone' ? m.sideBySide === false : m.sideBySide === true, m);
    await p.screenshot({ path: path.join(shotDir, `vault-prelaunch-${label}.png`), fullPage: false });
    await p.close();
  }
  if (process.env.VAULT_SHOTS) console.log('screenshots in ' + shotDir);

  await browser.close();
  if (!process.env.VAULT_SHOTS) fs.rmSync(dir, { recursive: true, force: true });
  ok('no request left the page', outside.length === 0, outside);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
