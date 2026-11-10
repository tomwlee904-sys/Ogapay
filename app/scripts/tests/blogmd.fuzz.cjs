// Random inputs: every href/src must be https:// or a site path, only known tags,
// no hidden markers, nothing slow.
const { renderBlog: r } = require('./load-blogmd.cjs');
const BS = String.fromCharCode(92);
const parts = ['https://', 'http://', 'javascript:', '//', '/', BS, '"', "'", '“', '”', '(', ')', '[', ']', '`', '*', '**', '~~', '&', '&amp;', '<', '>', ' ', '\n', '.', ',', ';', '!', '?', '🔥', '👈🏽', '—', '…', '\u0000', '0', '1', 'a', 'x.com', 'ogapay.app', '![', '](', '- ', '1. ', '## ', '| ', ' |', 'onerror=', 'onclick=', 'alert(1)', '<script>', '%0a', 'data:', '&#039;', '&quot;',
  // YouTube links (2026-11-10): only a real id on a line of its own becomes a youtube-nocookie frame
  'https://youtu.be/', 'https://www.youtube.com/watch?v=', 'youtube.com/shorts/', 'dQw4w9WgXcQ', '&t=90', '?t=', 'youtube.com.evil.com/', '\n', '\n'];
let seed = 12345;
const rand = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const ALLOWED = /^<\/?(p|a|strong|em|del|code|pre|ul|ol|li|h2|h3|blockquote|figure|figcaption|img|div|table|thead|tbody|tr|th|td|input|iframe)(\s|>|\/)/;
let bad = 0, worst = 0, frames = 0;
for (let i = 0; i < 200000; i++) {
  const len = 1 + rand(14);
  let s = '';
  for (let k = 0; k < len; k++) s += parts[rand(parts.length)];
  // One in four: a YouTube-looking line with random bits around and inside it
  if (i % 4 === 0) {
    const yt = ['https://youtu.be/', 'https://www.youtube.com/watch?v=', 'https://youtube.com/shorts/', '[x](https://youtu.be/'][rand(4)];
    s += '\n' + yt + 'dQw4w9WgXcQ' + (rand(2) ? parts[rand(parts.length)] : '') + (yt.startsWith('[') ? ')' : '') + '\n' + parts[rand(parts.length)];
  }
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
  // A frame only ever plays a YouTube video by its 11-character id, with fixed attributes
  for (const m of h.matchAll(/<iframe\s[^>]*>/g)) {
    frames++;
    if (!/^<iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}(\?start=\d+)?" title="YouTube video" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin">$/.test(m[0])) problems.push('unexpected frame ' + m[0].slice(0, 120));
  }
  if (h.includes('\u0000')) problems.push('marker left');
  if (problems.length) { bad++; if (bad <= 5) console.log('PROBLEM', JSON.stringify(s), '\n  ', problems.join('; '), '\n  ', h.slice(0, 300)); }
}
console.log(`\n200000 inputs, ${bad} with problems, ${frames} video frames checked, slowest ${worst} ms`);
// The YouTube parts must really reach the frame check
if (!frames) console.log('FAIL no input made a video frame');
process.exit(bad || !frames ? 1 : 0);
