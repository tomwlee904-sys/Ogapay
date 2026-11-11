// Crawlers get the blog post text inside #root (api/page-meta.js bodyFor), against the live API + shell
//   node scripts/tests/blog-crawl.test.mjs
import handler, { mdToHtml } from '../../api/page-meta.js'
let fails = 0
const ok = (n, c, x) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) { fails++; console.log('  ', x) } }
const run = (query) => new Promise((resolve) => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, end(b) { resolve({ status: this.statusCode, body: String(b || '') }) } }
  handler({ query, headers: { host: 'ogapay.app' } }, res)
})
const h = mdToHtml('Hi <b>x</b> **bold** [join](/join) [bad](javascript:alert(1))\n\n## Steps\n\n- one\n- two')
ok('markdown: escaped, bold, safe links only, lists', !/<b>/.test(h) && /<strong>bold<\/strong>/.test(h) && /<a href="\/join">join<\/a>/.test(h) && !/javascript:/.test(h.replace(/\[bad\]\(javascript:alert\(1\)\)/, '')) && /<h2>Steps<\/h2>/.test(h) && /<li>two<\/li>/.test(h), h)
const slug = 'how-to-earn-money-online-in-ghana-and-get-paid-in-cedis'
const post = await run({ t: 'blog', id: slug })
const root = post.body.slice(post.body.indexOf('<div id="root">'), post.body.indexOf('<div id="root">') + 20000)
ok('a post: 200 with its title and canonical in the head', post.status === 200 && /<title>How to Earn Money Online in Ghana/.test(post.body) && post.body.includes(`rel="canonical" href="https://ogapay.app/blog/${slug}"`))
ok('...and the article itself inside #root (h1, headings, paragraphs, links)', /<div id="root"><nav>/.test(post.body) && /<h1>How to Earn Money Online in Ghana/.test(root) && /<h2>/.test(root) && (root.match(/<p>/g) || []).length > 10 && /mobile money/i.test(root), root.slice(0, 300))
const list = await run({ t: 'page', p: '/blog' })
ok('the blog list links every post', (list.body.match(/<li><a href="\/blog\//g) || []).length >= 20, list.body.length)
const missing = await run({ t: 'blog', id: 'no-such-post-xyz' })
ok('an unknown post still gets the plain app shell', missing.status === 200 && /<div id="root"><\/div>|<div id="root">\s*</.test(missing.body))
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
