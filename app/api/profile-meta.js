// Link previews for public profiles.
// vercel.json sends crawler user agents (X, WhatsApp, Facebook, Slack, search engines…)
// on /user/:username here. We serve the normal app shell with the person's name, bio
// and photo in the <head>. People always get the plain SPA; any failure falls back to it.
// Private and missing profiles get "noindex" so search engines drop them (2026-11-10).

const API = (process.env.OGAPAY_API_URL || 'https://ogapay-production.up.railway.app/api/v1').replace(/\/$/, '')
const SITE = 'https://ogapay.app'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
const https = (u) => (/^https:\/\//.test(u || '') ? u : null)

// posts: the first page of their published blog posts (shown in search data)
export function buildHead(profile, username, posts = []) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || username
  const handle = profile.username || username
  const wp = profile.workerProfile || {}
  const facts = [
    profile.creatorVerified ? 'Verified creator' : null,
    wp.tasksCompleted ? `${wp.tasksCompleted} jobs done` : null,
    wp.totalRatings ? `${Number(wp.avgRating || 0).toFixed(1)}★ from ${wp.totalRatings} ${wp.totalRatings === 1 ? 'review' : 'reviews'}` : null,
    profile.contests?.wins ? `${profile.contests.wins} contest ${profile.contests.wins === 1 ? 'win' : 'wins'}` : null,
  ].filter(Boolean).join(' · ')
  const description = clip(String(profile.bio || '').replace(/\s+/g, ' ').trim() || `${name} on OgaPay${facts ? ` · ${facts}` : ''}. Hire them or see their work.`, 200)
  const title = `${name} (@${handle}) | OgaPay`
  const url = `${SITE}/user/${encodeURIComponent(handle)}`
  // The wide cover makes the large card; otherwise their photo in the small one
  // (a square photo in the large card gets its top and bottom cut off), or no
  // image at all (a text card beats a broken one)
  const cover = https(profile.coverUrl)
  const avatar = https(profile.avatarUrl)
  const image = cover || avatar
  const person = { '@type': 'Person', name, alternateName: `@${handle}`, url, ...(avatar ? { image: avatar } : {}), ...(profile.bio ? { description: clip(profile.bio, 300) } : {}) }
  const list = (Array.isArray(posts) ? posts : []).filter((p) => p && p.title && (p.slug || p.id)).slice(0, 5)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'ProfilePage', '@id': `${url}#page`, url, name: title, mainEntity: person },
      ...(list.length ? [{
        '@type': 'ItemList',
        name: `Posts by ${name}`,
        itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/blog/${encodeURIComponent(p.slug || p.id)}`, name: clip(String(p.title), 110) })),
      }] : []),
    ],
  }
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:site_name" content="OgaPay" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    ...(image ? [
      `<meta property="og:image" content="${esc(image)}" />`,
      `<meta property="og:image:alt" content="${esc(cover ? `${name}'s cover photo` : `${name}'s photo`)}" />`,
      `<meta name="twitter:image" content="${esc(image)}" />`,
    ] : []),
    `<meta property="profile:username" content="${esc(handle)}" />`,
    `<meta name="twitter:card" content="${cover ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    // JSON in a script tag: escape "<" so a bio can't close the tag
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ')
}

// A private or missing profile: a plain title and "noindex", nothing about the person
export function hiddenHead(username, missing) {
  const title = missing ? 'User not found | OgaPay' : `@${username} | OgaPay`
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="robots" content="noindex,nofollow" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:site_name" content="OgaPay" />`,
  ].join('\n    ')
}

export function injectHead(html, head) {
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]*|twitter:[^"]*)"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
  return cleaned.replace(/<head([^>]*)>/i, `<head$1>\n    ${head}`)
}

export default async function handler(req, res) {
  const username = String(req.query?.u || '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64)
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const shellUrl = `https://${host}/` // the app shell (index.html; /index.html itself now redirects)

  let shell = ''
  try {
    shell = await (await fetch(shellUrl)).text()
  } catch {
    res.statusCode = 302
    res.setHeader('Location', `/user/${username}`)
    return res.end()
  }

  let html = shell
  let hidden = false
  try {
    if (username) {
      const u = encodeURIComponent(username)
      const [r, b] = await Promise.all([
        fetch(`${API}/users/${u}`, { headers: { accept: 'application/json' } }),
        fetch(`${API}/users/public/${u}/blogs?page=1&limit=5`, { headers: { accept: 'application/json' } }).catch(() => null),
      ])
      if (r.ok) {
        const json = await r.json()
        const profile = json?.data
        const blogs = b?.ok ? (await b.json().catch(() => null))?.data : null
        const posts = Array.isArray(blogs) ? blogs : blogs?.posts
        if (profile && profile.isPublic !== false) html = injectHead(shell, buildHead(profile, username, posts))
        else if (profile) { html = injectHead(shell, hiddenHead(profile.username || username, false)); hidden = true }
      } else if (r.status === 404) {
        html = injectHead(shell, hiddenHead(username, true)); hidden = true
      }
    }
  } catch { /* generic preview */ }

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Private and missing pages: a short cache, so a profile made public again shows soon
  res.setHeader('Cache-Control', hidden ? 'public, s-maxage=60' : 'public, s-maxage=600, stale-while-revalidate=86400')
  if (hidden) res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.end(html)
}
