// Link previews for public profiles.
// vercel.json sends crawler user agents (X, WhatsApp, Facebook, Slack, search engines…)
// on /user/:username here. We serve the normal app shell with the person's name, bio
// and photo in the <head>. People always get the plain SPA; any failure falls back to it.

const API = (process.env.OGAPAY_API_URL || 'https://ogapay-production.up.railway.app/api/v1').replace(/\/$/, '')
const SITE = 'https://ogapay.app'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

export function buildHead(profile, username) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || username
  const handle = profile.username || username
  const wp = profile.workerProfile || {}
  const facts = [
    wp.tasksCompleted ? `${wp.tasksCompleted} jobs done` : null,
    wp.totalRatings ? `${Number(wp.avgRating || 0).toFixed(1)}★ from ${wp.totalRatings} ${wp.totalRatings === 1 ? 'review' : 'reviews'}` : null,
  ].filter(Boolean).join(' · ')
  const description = clip(String(profile.bio || '').replace(/\s+/g, ' ').trim() || `${name} on OgaPay${facts ? ` · ${facts}` : ''}. Hire them or see their work.`, 200)
  const title = `${name} (@${handle}) | OgaPay`
  const url = `${SITE}/user/${encodeURIComponent(handle)}`
  // Their photo, or no image (a text card beats a broken one)
  const image = /^https:\/\//.test(profile.avatarUrl || '') ? profile.avatarUrl : null
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url,
    mainEntity: { '@type': 'Person', name, alternateName: `@${handle}`, url, ...(image ? { image } : {}), ...(profile.bio ? { description: clip(profile.bio, 300) } : {}) },
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
    ...(image ? [`<meta property="og:image" content="${esc(image)}" />`, `<meta name="twitter:image" content="${esc(image)}" />`] : []),
    `<meta property="profile:username" content="${esc(handle)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    // JSON in a script tag: escape "<" so a bio can't close the tag
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ')
}

export function injectHead(html, head) {
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]*|twitter:[^"]*)"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
  return cleaned.replace(/<head([^>]*)>/i, `<head$1>\n    ${head}`)
}

export default async function handler(req, res) {
  const username = String(req.query?.u || '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64)
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const shellUrl = `https://${host}/index.html`

  let shell = ''
  try {
    shell = await (await fetch(shellUrl)).text()
  } catch {
    res.statusCode = 302
    res.setHeader('Location', `/user/${username}`)
    return res.end()
  }

  let html = shell
  try {
    if (username) {
      const r = await fetch(`${API}/users/${encodeURIComponent(username)}`, { headers: { accept: 'application/json' } })
      if (r.ok) {
        const json = await r.json()
        const profile = json?.data
        // Private profiles keep the generic preview
        if (profile && profile.isPublic !== false) html = injectHead(shell, buildHead(profile, username))
      }
    }
  } catch { /* generic preview */ }

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')
  res.end(html)
}
