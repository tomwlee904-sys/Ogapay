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
// `name` is the checked business name. It is always shown as text next to the
// badge (phones have no hover), because the username beside it can be changed
// by the poster and the badge only vouches for the checked name. No checked
// name, no badge.
export function VerifiedBusinessMark({ label = false, name }: { label?: boolean; name?: string | null }) {
  if (!name) return null
  const title = `Verified business: ${name}`
  return (
    <span className={`oga-biz${label ? ' full' : ' icon'}`} title={title} aria-label={label ? undefined : title}>
      <i className="ti ti-rosette-discount-check" aria-hidden="true" />{label && <span>Verified business: <b>{name}</b></span>}
    </span>
  )
}

// The same, as a small line under a name on job cards and the job page
export function VerifiedBusinessLine({ name }: { name?: string | null }) {
  if (!name) return null
  return (
    <small className="oga-biz-line" title={`Verified business: ${name}`}>
      <i className="ti ti-rosette-discount-check" aria-hidden="true" /><span>Verified business: <b>{name}</b></span>
    </small>
  )
}
