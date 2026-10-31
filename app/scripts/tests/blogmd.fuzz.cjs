// Random inputs: every href/src must be https:// or a site path, only known tags,
// no hidden markers, nothing slow.
const { renderBlog: r } = require('./load-blogmd.cjs');
const BS = String.fromCharCode(92);
const parts = ['https://', 'http://', 'javascript:', '//', '/', BS, '"', "'", '“', '”', '(', ')', '[', ']', '`', '*', '**', '~~', '&', '&amp;', '<', '>', ' ', '\n', '.', ',', ';', '!', '?', '🔥', '👈🏽', '—', '…', '\u0000', '0', '1', 'a', 'x.com', 'ogapay.app', '![', '](', '- ', '1. ', '## ', '| ', ' |', 'onerror=', 'onclick=', 'alert(1)', '<script>', '%0a', 'data:', '&#039;', '&quot;'];
let seed = 12345;
const rand = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const ALLOWED = /^<\/?(p|a|strong|em|del|code|pre|ul|ol|li|h2|h3|blockquote|figure|figcaption|img|div|table|thead|tbody|tr|th|td|input)(\s|>|\/)/;
let bad = 0, worst = 0;
for (let i = 0; i < 200000; i++) {
  const len = 1 + rand(14);
  let s = '';
  for (let k = 0; k < len; k++) s += parts[rand(parts.length)];
  const t = Date.now();
  const h = r(s);
  worst = Math.max(worst, Date.now() - t);
  const problems = [];
  for (const m of h.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const v = m[2];
    if (!(v.startsWith('https://') || (v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/' + BS)))) problems.push('unsafe ' + m[1] + ': ' + v);
    if (v.includes(BS)) problems.push('backslash in ' + m[1]);
    if (/[<>\s]/.test(v)) problems.push('odd char in ' + m[1]);
  }
  for (const m of h.matchAll(/<[^>]*>/g)) if (!ALLOWED.test(m[0])) problems.push('tag ' + m[0].slice(0, 40));
  for (const m of h.matchAll(/<[^>]*>/g)) if (/\son\w+=/i.test(m[0].replace(/"[^"]*"/g, '""'))) problems.push('event attribute in ' + m[0].slice(0, 60));
  for (const m of h.matchAll(/<(a|img)\s[^>]*>/g)) {
    const attrs = m[0].replace(/"[^"]*"/g, '""').match(/\s([a-z-]+)=/g) || [];
    if (attrs.some((x) => !/^\s(href|src|alt|target|rel|loading|decoding)=$/.test(x))) problems.push('unexpected attribute in ' + m[0].slice(0, 60));
  }
  if (h.includes('\u0000')) problems.push('marker left');
  if (problems.length) { bad++; if (bad <= 5) console.log('PROBLEM', JSON.stringify(s), '\n  ', problems.join('; '), '\n  ', h.slice(0, 300)); }
}
console.log(`\n200000 inputs, ${bad} with problems, slowest ${worst} ms`);
process.exit(bad ? 1 : 0);
