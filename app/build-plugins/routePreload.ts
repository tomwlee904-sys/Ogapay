import type { Plugin } from 'vite'
import type { OutputBundle, OutputChunk } from 'rollup'

// A first visit used to load in steps: the main code, then (only once that had
// run) the page's own code, then (only once that had run) the page's data. On a
// phone each step is a round trip, ~3 s in all before the homepage showed jobs.
//
// This writes a small script into index.html that looks at the address and
// starts the page's code and its first public data at once, alongside the main
// code. The page then finds them already downloaded (or on the way):
// - code: Vite skips a file that already has a <link> in the page
// - data: src/lib/early.ts hands the answer to the first request for that URL
//
// Only the pages people land on are listed. A wrong guess costs one download,
// never a wrong page: the router still decides what shows.

type Route = {
  path: string // matched against location.pathname
  page: string // the page's source file
  data?: string[] // public data it asks for first; $1 is the path's first group
  guestData?: string[] // only when signed out (signed in, the page sends a token)
  bareOnly?: boolean // data only without a ?query (the query changes what it asks for)
}

const ROUTES: Route[] = [
  {
    path: '^/$',
    page: 'src/pages/HomePage.tsx',
    data: ['/stats/live', '/stats', '/tasks?status=OPEN', '/store?limit=9&sort=newest', '/blog?limit=9', '/communities?limit=12'],
  },
  { path: '^/tasks/?$', page: 'src/pages/Tasks.tsx', data: ['/tasks?limit=100'], bareOnly: true },
  { path: '^/tasks/(?!new/?$)([^/]+)/?$', page: 'src/pages/JobDetail.tsx' },
  { path: '^/blog/?$', page: 'src/pages/Blog.tsx', data: ['/blog?limit=100'] },
  { path: '^/blog/(?!write/?$)([^/]+)/?$', page: 'src/pages/ArticleDetail.tsx', guestData: ['/blog/$1'] },
  { path: '^/store/?$', page: 'src/pages/Store.tsx' },
  { path: '^/store/(?!orders/?$)([^/]+)/?$', page: 'src/pages/StoreProduct.tsx', data: ['/store/$1'] },
  { path: '^/(login|join|pair|ref/[^/]+)/?$', page: 'src/pages/LoginPage.tsx' },
  { path: '^/communities/?$', page: 'src/pages/Communities.tsx' },
  { path: '^/communities/(?!create/?$|mine/?$)[^/]+/?$', page: 'src/pages/CommunityDetail.tsx' },
  { path: '^/creators/?$', page: 'src/pages/Creators.tsx' },
  { path: '^/user/[^/]+/?$', page: 'src/pages/UserProfile.tsx' },
  { path: '^/leaderboard/?$', page: 'src/pages/Leaderboard.tsx' },
  { path: '^/about/?$', page: 'src/pages/About.tsx' },
  { path: '^/faq/?$', page: 'src/pages/FAQ.tsx' },
  { path: '^/create/?$', page: 'src/pages/CreateJob.tsx' },
  { path: '^/dashboard/?$', page: 'src/pages/Dashboard.tsx' },
  { path: '^/wallet/?$', page: 'src/pages/Wallet.tsx' },
]

const MARKER = '<!-- route-preload -->'

// Runs in the visitor's browser, before anything else has loaded. Kept to old
// syntax and wrapped in try: if it fails, pages load the slow way, nothing more.
const runtime = (routes: unknown[], apiBase: string) => `(function(){try{
var R=${JSON.stringify(routes)},B=${JSON.stringify(apiBase)},p=location.pathname,d=document,e=window.__early={},s=false;
try{s=!!localStorage.getItem('ogapay_access_token')}catch(x){}
for(var i=0;i<R.length;i++){var r=R[i],m=p.match(new RegExp(r[0]));if(!m)continue;
r[1].forEach(function(h){var l=d.createElement('link');if(/\\.css$/.test(h)){l.rel='preload';l.as='style'}else{l.rel='modulepreload'}l.crossOrigin='';l.href=h;d.head.appendChild(l)});
if(r[4]&&location.search)break;
var g=(r[2]||[]).concat(s?[]:(r[3]||[]));
g.forEach(function(x){var u=B+x.replace('$1',function(){try{return decodeURIComponent(m[1]||'')}catch(y){return m[1]||''}});
if(e[u])return;var o={};try{if(AbortSignal.timeout)o.signal=AbortSignal.timeout(15000)}catch(y){}
e[u]=fetch(u,o);e[u]['catch'](function(){})});
break}
}catch(x){}})();`

export default function routePreload(): Plugin {
  let base = '/'
  let apiBase = ''
  return {
    name: 'ogapay-route-preload',
    apply: 'build',
    configResolved(config) {
      base = config.base
      // the same address src/lib/api.ts uses, so the URLs match exactly
      apiBase = String(config.env.VITE_API_BASE_URL || 'https://ogapay.app/api/v1').replace(/\/$/, '')
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!html.includes(MARKER)) throw new Error(`routePreload: index.html is missing ${MARKER}`)
        const bundle = ctx.bundle as OutputBundle | undefined
        if (!bundle) return html.replace(MARKER, '')
        const chunks = Object.values(bundle).filter((f): f is OutputChunk => f.type === 'chunk')
        const byName = new Map(chunks.map((c) => [c.fileName, c]))

        // Everything the main code already loads
        const loaded = new Set<string>()
        const walk = (c: OutputChunk, into: Set<string>) => {
          for (const f of c.imports) {
            if (into.has(f) || loaded.has(f)) continue
            into.add(f)
            const dep = byName.get(f)
            if (dep) walk(dep, into)
          }
        }
        for (const c of chunks) if (c.isEntry) { loaded.add(c.fileName); walk(c, loaded) }

        const routes = ROUTES.map((r) => {
          const chunk = chunks.find((c) => c.isDynamicEntry && c.facadeModuleId?.replace(/\\/g, '/').endsWith('/' + r.page))
          if (!chunk) throw new Error(`routePreload: no chunk for ${r.page}; was the page renamed?`)
          const files = new Set<string>([chunk.fileName])
          walk(chunk, files)
          const css = new Set<string>()
          for (const f of files) for (const c of (byName.get(f) as any)?.viteMetadata?.importedCss ?? []) css.add(c)
          return [r.path, [...files, ...css].map((f) => base + f), r.data || [], r.guestData || [], r.bareOnly ? 1 : 0]
        })
        return html.replace(MARKER, `<script>${runtime(routes, apiBase)}</script>`)
      },
    },
  }
}
