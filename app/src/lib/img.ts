// Smaller copies of uploaded pictures. Our Supabase storage holds full-size
// uploads (one avatar was 1.4 MB, shown at 32 px); Supabase resizes on request and
// sends WebP to browsers that take it (that avatar becomes ~4 KB). Anything that
// isn't in our storage (or is a GIF/SVG, or a local preview) is returned as is.

const OBJECT = '/storage/v1/object/public/'
const RENDER = '/storage/v1/render/image/public/'
// Few sizes, so the same resized copy is reused across pages and the CDN cache
const STEPS = [48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536]

/** `css` is the largest size the picture is shown at, in CSS pixels; pass `square`
 *  for avatars and icons (cropped to fill), leave it off to keep the shape. */
export function sized(url: string | null | undefined, css: number, square = false): string {
  if (!url) return ''
  if (!url.includes('.supabase.co' + OBJECT) || /\.(gif|svg)(\?|#|$)/i.test(url)) return url
  const want = Math.min(css * 2, 1536) // sharp on 2x screens
  const px = STEPS.find((s) => s >= want) || 1536
  const [base, query] = url.split('?')
  const params = new URLSearchParams(query || '')
  params.set('width', String(px))
  // Supabase's default resize is "cover" against the ORIGINAL height when only a width is
  // given, so a 1444x812 cover asked for at 1024 came back 1024x812 with its sides cut off.
  // "contain" keeps the whole picture; the page's CSS decides any cropping.
  if (square) { params.set('height', String(px)); params.set('resize', 'cover') }
  else params.set('resize', 'contain')
  params.set('quality', '75')
  return base.replace(OBJECT, RENDER) + '?' + params.toString()
}

// If Supabase can't resize one (too large, odd format), fall back to the original once
if (typeof document !== 'undefined') {
  document.addEventListener('error', (e) => {
    const img = e.target
    if (!(img instanceof HTMLImageElement) || !img.src.includes(RENDER) || img.dataset.full) return
    img.dataset.full = '1'
    const u = new URL(img.src)
    ;['width', 'height', 'resize', 'quality'].forEach((k) => u.searchParams.delete(k))
    img.src = u.toString().replace(RENDER, OBJECT).replace(/\?$/, '')
  }, true)
}

// Pictures, video and audio on public pages (2026-11-10): only files in our own
// storage are shown or played. A picture on someone's own server would let them
// log the address and device of everyone who opens the page; those stay plain
// links. Avatars may also come from Google or X sign-in (`signIn`).
const OUR_HOST = (() => {
  try { return import.meta.env.VITE_SUPABASE_URL ? new URL(import.meta.env.VITE_SUPABASE_URL).host.toLowerCase() : '' } catch { return '' }
})()
const SIGN_IN_HOSTS = /^(lh[0-9]+\.googleusercontent\.com|pbs\.twimg\.com)$/i

export function isOurMedia(url: string | null | undefined, signIn = false): boolean {
  if (!url) return false
  let u: URL
  try { u = new URL(url) } catch { return false }
  if (u.protocol !== 'https:') return false
  const host = u.host.toLowerCase()
  if (signIn && SIGN_IN_HOSTS.test(host)) return true
  if (!/^\/storage\/v1\/(object|render\/image)\/public\//.test(u.pathname)) return false
  return OUR_HOST ? host === OUR_HOST : host.endsWith('.supabase.co')
}
