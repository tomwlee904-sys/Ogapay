import { useState } from 'react'

/* Cover for a store item. A seller's own picture is shown as is; a missing or
   broken picture, or a demo placeholder (random picsum.photos images, the old
   ogapay.io badge art), gets a branded cover for its category instead of an
   unrelated photo. */

const PLACEHOLDER = /picsum\.photos|placehold\.|via\.placeholder|\/\/ogapay\.io\//i

type Look = { icon: string; tone: string; label: string }
const LOOKS: Array<[RegExp, Look]> = [
  [/writ|content|copy|blog|article/i, { icon: 'pencil', tone: 'sand', label: 'Writing' }],
  [/web|app|code|develop|software|site/i, { icon: 'code', tone: 'sky', label: 'Web & apps' }],
  [/graphic|design|logo|brand|ui|ux/i, { icon: 'palette', tone: 'rose', label: 'Design' }],
  [/data|dashboard|sheet|entry|analytics/i, { icon: 'chart-bar', tone: 'mint', label: 'Data' }],
  [/market|ads|social|promo|growth/i, { icon: 'speakerphone', tone: 'amber', label: 'Marketing' }],
  [/consult|advis|business|plan|strategy/i, { icon: 'briefcase', tone: 'slate', label: 'Consulting' }],
  [/product|operation|survey|research/i, { icon: 'adjustments-horizontal', tone: 'violet', label: 'Operations' }],
  [/video|motion|animation/i, { icon: 'movie', tone: 'violet', label: 'Video' }],
  [/translat|language/i, { icon: 'language', tone: 'sky', label: 'Translation' }],
  [/^badge$|premium/i, { icon: 'rosette-discount-check', tone: 'amber', label: 'Premium badge' }],
  [/^boost$/i, { icon: 'rocket', tone: 'mint', label: 'Job boost' }],
  [/^cosmetic$|frame/i, { icon: 'frame', tone: 'rose', label: 'Profile frame' }],
  [/^service$|support/i, { icon: 'headset', tone: 'slate', label: 'Support' }],
]

export function coverLook(category?: string | null, title?: string | null): Look {
  const text = `${category || ''}`
  for (const [re, look] of LOOKS) if (re.test(text)) return look
  for (const [re, look] of LOOKS) if (re.test(title || '')) return look
  return { icon: 'package', tone: 'slate', label: 'Service' }
}

/** Readable category name (the API sends codes like BADGE for OgaPay's own items) */
export function itemCategoryLabel(category?: string | null, title?: string | null): string {
  if (category && /[a-z]/.test(category)) return category
  return coverLook(category, title).label
}

export function isPlaceholderImage(src?: string | null) {
  return !src || PLACEHOLDER.test(src)
}

export default function ItemCover({ src, category, title, className = '', alt = '' }: {
  src?: string | null; category?: string | null; title?: string | null; className?: string; alt?: string
}) {
  const [broken, setBroken] = useState(false)
  const look = coverLook(category, title)
  const usePicture = !broken && !isPlaceholderImage(src)
  return (
    <div className={`o-cover ${className}`.trim()}>
      {usePicture
        ? <img src={src!} alt={alt} loading="lazy" onError={() => setBroken(true)} />
        : (
          <div className={`o-cover-art tone-${look.tone}`} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
            <span className="o-cover-tile"><i className={`ti ti-${look.icon}`} /></span>
          </div>
        )}
    </div>
  )
}
