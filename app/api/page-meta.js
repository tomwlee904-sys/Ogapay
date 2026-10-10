// Link previews for jobs, store products, blog posts and the main list pages.
// vercel.json sends crawler user agents (WhatsApp, X, Facebook, Telegram, search
// engines…) here, like profile-meta.js does for /user/:username. They get the app
// shell with this page's title, description and picture in the <head>. People
// always get the plain SPA; any failure falls back to the generic preview.

import { injectHead } from './profile-meta.js'

const API = (process.env.OGAPAY_API_URL || 'https://ogapay-production.up.railway.app/api/v1').replace(/\/$/, '')
const SITE = 'https://ogapay.app'
const CARD = `${SITE}/og-image.png` // the site's 1200×630 card

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
// Markdown and links to plain text, one line
export const plain = (s) => String(s || '')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_`#>~|]+/g, '')
  .replace(/\s+/g, ' ')
  .trim()
const SYMBOL = { NGN: '₦', USDC: '$', USD: '$' }
export const money = (n, cur) => {
  const v = Number(n || 0)
  const s = SYMBOL[cur] || ''
  const txt = v.toLocaleString('en-US', { maximumFractionDigits: cur === 'NGN' ? 0 : 2 })
  return s ? `${s}${txt}` : `${txt} ${cur || ''}`.trim()
}
// Same rule as the site's covers (src/components/ItemCover.tsx): stock placeholders count as no picture
const PLACEHOLDER = /picsum\.photos|placehold\.|via\.placeholder|\/\/ogapay\.io\//i
const picture = (u) => (/^https:\/\//.test(u || '') && !PLACEHOLDER.test(u) ? u : null)
// The first paragraph of a brief (the rest is usually steps and proof rules)
const firstPara = (s) => String(s || '').trim().split(/\n\s*\n/)[0]

// The main list pages: title and description
const PAGES = {
  '/tasks': ['Paid jobs | OgaPay', 'Paid jobs open right now in Nigeria. Do simple tasks, send your work and get paid in Naira or USDC when it is approved.'],
  '/store': ['Store | OgaPay', 'Services and digital products from OgaPay creators: design, writing, websites and more, paid safely through escrow.'],
  '/blog': ['Blog | OgaPay', 'Guides, ideas and earning stories from the OgaPay community.'],
  '/leaderboard': ['Leaderboard | OgaPay', 'The people earning, hiring and inviting the most on OgaPay.'],
  '/vault': ['Vault | OgaPay', 'The OgaPay reward pool: how it fills up and who it pays.'],
  '/create': ['Create a job | OgaPay', 'Post a paid job in minutes. Set your budget, and money is only released when you approve the work.'],
  '/faq': ['FAQ | OgaPay', 'Answers about earning, hiring, verification, withdrawals and fees on OgaPay.'],
  '/communities': ['Communities | OgaPay', 'Join groups on OgaPay and take jobs only their members can see.'],
  '/developer': ['Developer API | OgaPay', 'Post jobs and pay people from your own app with the OgaPay API.'],
  '/about': ['About OgaPay', "Africa's task network: find work, hire help and get paid in Naira or USDC."],
}

export function headFor({ title, description, url, image, type = 'website', large = false, jsonLd = null }) {
  const img = image || CARD
  const big = large || img === CARD
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${esc(type)}" />`,
    `<meta property="og:site_name" content="OgaPay" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    ...(img === CARD ? ['<meta property="og:image:width" content="1200" />', '<meta property="og:image:height" content="630" />'] : []),
    `<meta name="twitter:card" content="${big ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(img)}" />`,
    ...(jsonLd ? [`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`] : []),
  ].join('\n    ')
}

const getJson = async (path) => {
  const r = await fetch(`${API}${path}`, { headers: { accept: 'application/json' } })
  if (!r.ok) return null
  return (await r.json())?.data ?? null
}

export async function metaFor(kind, id) {
  if (kind === 'page') {
    const p = PAGES[id]
    return p ? headFor({ title: p[0], description: p[1], url: SITE + id }) : null
  }
  const safe = String(id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120)
  if (!safe) return null
  if (kind === 'job') {
    const t = (await getJson(`/tasks/${safe}`))?.task
    if (!t || ['DRAFT', 'CANCELLED'].includes(t.status)) return null
    const prize = t.isContest && Array.isArray(t.prizes) && t.prizes.length ? Number(t.prizes[0]) : null
    const pay = prize != null ? `1st prize ${money(prize, t.currency)}` : `${money(t.reward, t.currency)} per person`
    const left = Math.max(0, Number(t.maxWorkers || 0) - Number(t.currentWorkers || 0))
    const status = t.status === 'OPEN' ? (left && prize == null ? `${left} ${left === 1 ? 'place' : 'places'} left` : 'Open now') : 'Closed'
    const brief = clip(plain(firstPara(t.description)), 140)
    return headFor({
      title: `${t.title} · ${pay} | OgaPay`,
      description: clip(`${pay} · ${status}. ${brief}`, 200),
      url: `${SITE}/tasks/${t.id}`,
      large: true,
    })
  }
  if (kind === 'product') {
    const p = await getJson(`/store/${safe}`)
    if (!p || p.isActive === false) return null
    const by = p.official ? 'OgaPay' : `@${p.seller}`
    return headFor({
      title: `${p.title} · ${money(p.price, p.currency)} | OgaPay Store`,
      description: clip(`${plain(p.description) || p.title}. Sold by ${by}, paid safely through escrow.`, 200),
      url: `${SITE}/store/${p.id}`,
      image: picture(p.image),
      type: 'product',
    })
  }
  if (kind === 'blog') {
    const b = await getJson(`/blog/${safe}`)
    if (!b) return null
    const author = [b.author?.firstName, b.author?.lastName].filter(Boolean).join(' ') || b.author?.username || 'OgaPay'
    const url = `${SITE}/blog/${b.slug || safe}`
    return headFor({
      title: `${b.title} | OgaPay Blog`,
      description: clip(plain(b.excerpt || b.content || b.title), 200),
      url,
      image: picture(b.coverImage),
      type: 'article',
      large: true,
      jsonLd: { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: b.title, url, author: { '@type': 'Person', name: author }, ...(b.publishedAt ? { datePublished: b.publishedAt } : {}), ...(picture(b.coverImage) ? { image: b.coverImage } : {}) },
    })
  }
  return null
}

export default async function handler(req, res) {
  const kind = String(req.query?.t || '')
  const id = kind === 'page' ? String(req.query?.p || '') : String(req.query?.id || '')
  const back = kind === 'page' ? id : `/${{ job: 'tasks', product: 'store', blog: 'blog' }[kind] || ''}/${id}`
  const host = req.headers['x-forwarded-host'] || req.headers.host
  let shell = ''
  try {
    shell = await (await fetch(`https://${host}/`)).text()
  } catch {
    res.statusCode = 302
    res.setHeader('Location', back || '/')
    return res.end()
  }
  let html = shell
  try {
    const head = await metaFor(kind, id)
    if (head) html = injectHead(shell, head)
  } catch { /* generic preview */ }
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')
  res.end(html)
}
