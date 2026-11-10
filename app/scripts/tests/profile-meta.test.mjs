// Link previews for profiles (api/profile-meta.js, pp-26, 2026-11-10): the large
// card with a cover, the blog list in the search data, and noindex for private
// and missing profiles. The handler runs against a fake fetch, so nothing goes
// to the network.
//   npm run test:profile-meta
import { buildHead, hiddenHead, injectHead } from '../../api/profile-meta.js'
import handler from '../../api/profile-meta.js'

let fails = 0
const ok = (name, cond, got) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '\n   got: ' + JSON.stringify(got))); if (!cond) fails++ }
const ldOf = (head) => JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])

const ada = { username: 'ada', firstName: 'Ada', lastName: 'Obi', avatarUrl: 'https://cdn.example/a.jpg', coverUrl: 'https://cdn.example/c.jpg', bio: '', creatorVerified: true, contests: { wins: 2 }, workerProfile: { tasksCompleted: 5 } }
const posts = [{ title: 'First </script><b>post', slug: 'first-post' }, { title: 'Second', slug: 'second' }]

let head = buildHead(ada, 'ada', posts)
ok('a cover makes the large card, with the cover as the picture', head.includes('content="summary_large_image"') && head.includes('og:image" content="https://cdn.example/c.jpg"'), head)
const ld = ldOf(head)
ok('search data: ProfilePage and an ItemList of their posts', ld['@graph'][0]['@type'] === 'ProfilePage' && ld['@graph'][1]['@type'] === 'ItemList'
  && ld['@graph'][1].itemListElement.length === 2 && ld['@graph'][1].itemListElement[0].url === 'https://ogapay.app/blog/first-post', ld)
ok('a post title can not close the script tag', !/<\/script><b>/.test(head.split('application/ld+json">')[1].split('</script>')[0]), head)
ok('the description names Verified creator, jobs and contest wins', /Verified creator · 5 jobs done · 2 contest wins/.test(head), head)
ok('no noindex on a public profile', !/robots/.test(head), head)

head = buildHead({ ...ada, coverUrl: null }, 'ada', [])
ok('no cover: the photo in the small card, no ItemList', head.includes('content="summary"') && head.includes('og:image" content="https://cdn.example/a.jpg"') && ldOf(head)['@graph'].length === 1, head)
head = buildHead({ ...ada, coverUrl: 'http://tracker.example/c.jpg', avatarUrl: null }, 'ada')
ok('a picture that is not https is not used', !/og:image/.test(head) && head.includes('content="summary"'), head)

head = hiddenHead('shy', false)
ok('private: noindex, a plain title, nothing about the person', head.includes('noindex,nofollow') && head.includes('<title>@shy | OgaPay</title>') && !/description|og:image/.test(head), head)
ok('missing: "User not found" and noindex', hiddenHead('ghost', true).includes('<title>User not found | OgaPay</title>'))

const shell = '<html><head><title>OgaPay</title><meta name="robots" content="index" /><meta name="description" content="x" /></head><body></body></html>'
const injected = injectHead(shell, hiddenHead('shy', false))
ok('the shell\'s own title, description and robots are replaced', (injected.match(/<title>/g) || []).length === 1 && (injected.match(/name="robots"/g) || []).length === 1 && !/content="index"/.test(injected), injected)

// The handler, with a fake fetch
const run = async (username, answers) => {
  const seen = []
  globalThis.fetch = async (url) => {
    seen.push(String(url))
    if (String(url) === 'https://ogapay.app/') return new Response(shell)
    const a = answers(String(url))
    return new Response(JSON.stringify(a.body), { status: a.status })
  }
  const res = { headers: {}, statusCode: 0, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v }, end(b) { this.body = b || '' } }
  await handler({ query: { u: username }, headers: { host: 'ogapay.app' } }, res)
  return { res, seen }
}
let { res, seen } = await run('ada', (u) => (u.includes('/blogs') ? { status: 200, body: { data: { posts, page: 1, totalPages: 1, total: 2 } } } : { status: 200, body: { data: ada } }))
ok('handler: a public profile gets the preview and the post list', res.body.includes('summary_large_image') && res.body.includes('Posts by Ada Obi') && seen.some((u) => u.endsWith('/users/public/ada/blogs?page=1&limit=5')), res.body)
ok('handler: kept 10 minutes at the edge', /s-maxage=600/.test(res.headers['cache-control']) && !res.headers['x-robots-tag'], res.headers)
;({ res } = await run('shy', (u) => (u.includes('/blogs') ? { status: 404, body: {} } : { status: 200, body: { data: { username: 'shy', isPublic: false } } })))
ok('handler: a private profile is noindex (meta and header), kept only a minute', res.body.includes('noindex,nofollow') && res.headers['x-robots-tag'] === 'noindex, nofollow' && /s-maxage=60\b/.test(res.headers['cache-control']), { h: res.headers })
;({ res } = await run('ghost', () => ({ status: 404, body: { success: false } })))
ok('handler: a missing profile is noindex', res.body.includes('User not found | OgaPay') && res.headers['x-robots-tag'] === 'noindex, nofollow', res.body)
;({ res } = await run('ada', () => ({ status: 500, body: {} })))
ok('handler: a server error keeps the plain shell (no noindex)', res.body === shell && !res.headers['x-robots-tag'], res.body)

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
