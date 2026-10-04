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
  if (square) { params.set('height', String(px)); params.set('resize', 'cover') }
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
