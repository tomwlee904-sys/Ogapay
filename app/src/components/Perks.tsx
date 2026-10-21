// Perks bought from the OgaPay store, shown next to a name.
// (The worker frame is the .oga-frame class on the photo.)
export function PremiumMark({ label = false }: { label?: boolean }) {
  return (
    <span className={`oga-prem${label ? '' : ' icon'}`} title="Premium member" aria-label={label ? undefined : 'Premium member'}>
      <i className="ti ti-crown" aria-hidden="true" />{label && 'Premium'}
    </span>
  )
}

export function BoostedTag() {
  return <span className="oga-boost" title="Boosted: listed first for now"><i className="ti ti-rocket" aria-hidden="true" />Boosted</span>
}

// A job poster whose business an admin has checked (Settings > Business).
// `name` is the checked business name, shown on hover.
export function VerifiedBusinessMark({ label = false, name }: { label?: boolean; name?: string | null }) {
  const title = name ? `Verified business: ${name}` : 'Verified business'
  return (
    <span className={`oga-biz${label ? '' : ' icon'}`} title={title} aria-label={label ? undefined : title}>
      <i className="ti ti-rosette-discount-check" aria-hidden="true" />{label && 'Verified business'}
    </span>
  )
}
