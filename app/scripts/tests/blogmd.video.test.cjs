// YouTube videos in product descriptions and blog posts (src/lib/blogMarkdown.ts, F10):
// only a youtube.com / youtu.be link with a real video id, on a line of its own,
// becomes a youtube-nocookie video; nothing else from the link reaches the page.
//   npm run test:blog-links
const { renderBlog: r, youtubeVideo: yt } = require('./load-blogmd.cjs');
let fails = 0;
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + got)); if (!cond) fails++; };
const V = (id, start) => `<div class="md-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ''}" title="YouTube video" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
const ID = 'dQw4w9WgXcQ';
let h;
h = r(`https://www.youtube.com/watch?v=${ID}`);
ok('a watch link on its own line becomes the video', h === V(ID), h);
h = r(`https://youtu.be/${ID}`);
ok('a youtu.be share link', h === V(ID), h);
h = r(`https://youtube.com/shorts/${ID}`);
ok('a Shorts link', h === V(ID), h);
h = r(`https://m.youtube.com/watch?v=${ID}&feature=share`);
ok('a phone (m.) link with extra parts', h === V(ID), h);
h = r(`https://www.youtube.com/live/${ID}`);
ok('a live link', h === V(ID), h);
h = r(`[My showreel](https://youtu.be/${ID})`);
ok('a [text](link) line', h === V(ID), h);
h = r(`https://youtu.be/${ID}?t=90`);
ok('a start time (t=90)', h === V(ID, 90), h);
h = r(`https://www.youtube.com/watch?v=${ID}&t=1m30s`);
ok('a start time (t=1m30s)', h === V(ID, 90), h);
h = r(`  https://youtu.be/${ID}.  `);
ok('spaces and a full stop around the link', h === V(ID), h);
h = r(`## Showreel\n\nhttps://youtu.be/${ID}\n\nMore text`);
ok('between other lines', h === `<h2>Showreel</h2>${V(ID)}<p>More text</p>`, h);

// Stays a plain link
const A = (href) => `<a href="${href}" target="_blank" rel="noopener nofollow ugc">${href}</a>`;
h = r(`Watch https://youtu.be/${ID} now`);
ok('a link inside a sentence stays a link', h === `<p>Watch ${A(`https://youtu.be/${ID}`)} now</p>`, h);
h = r(`- https://youtu.be/${ID}`);
ok('a link in a list stays a link', !h.includes('iframe'), h);
h = r(`http://www.youtube.com/watch?v=${ID}`);
ok('http:// is not a video', !h.includes('iframe'), h);
h = r('https://www.youtube.com/watch?v=short');
ok('a bad video id is not a video', !h.includes('iframe'), h);
h = r(`https://www.youtube.com/watch?v=${ID}x`);
ok('a 12-character id is not a video', !h.includes('iframe'), h);
h = r(`https://evil.com/watch?v=${ID}`);
ok('another site is not a video', !h.includes('iframe'), h);
h = r(`https://youtube.com.evil.com/watch?v=${ID}`);
ok('a look-alike host is not a video', !h.includes('iframe'), h);
h = r(`https://evilyoutube.com/watch?v=${ID}`);
ok('a host ending in youtube.com is not a video', !h.includes('iframe'), h);
h = r(`https://user:pw@youtube.com/watch?v=${ID}`);
ok('a link with a user name is not a video', !h.includes('iframe'), h);
h = r(`https://www.youtube.com/watch?v=${ID}"onload="alert(1)`);
ok('a quote can\'t get into the frame', !/onload/.test(h.match(/<iframe[^>]*>/)?.[0] || '') && !/<iframe[^>]*onload/.test(h), h);
h = r(`https://www.youtube.com/watch?v=${ID}&t=99999999999`);
ok('a silly start time is ignored', h === V(ID), h);
h = r(`https://www.youtube.com/embed/${ID}"><script>alert(1)</script>`);
ok('no tags get through', !/<script/i.test(h), h);
h = r('```\nhttps://youtu.be/' + ID + '\n```');
ok('inside a code block it stays code', h === `<pre><code>https://youtu.be/${ID}</code></pre>`, h);

ok('youtubeVideo: watch link', JSON.stringify(yt(`https://www.youtube.com/watch?v=${ID}`)) === JSON.stringify({ id: ID, start: 0 }));
ok('youtubeVideo: junk', yt('not a link') === null && yt('javascript:alert(1)') === null && yt(`https://youtu.be/${ID}/extra`) === null);
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
