import { useEffect, useId, useState, type FormEvent } from 'react'
import { apiRequest } from '../../lib/api'
import { compact, fullCount } from '../../lib/creators'
import { xBanner, xError, xPic, type XProfile, type XShown } from '../../lib/xprofile'
import { useToast } from '../Toast'
import '../../styles/profile-own.css'
import '../../styles/xprofile.css'

// The X profile the server read when someone connected X: picture, name, @handle,
// blue tick, bio and follower counts (the way wurk.fun shows it). Used on Profile,
// Settings > Connections and public profiles.

const initials = (s: string) => s.replace(/^@/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'X'

// X's picture, or initials when it won't load (X removes old pictures when someone
// changes theirs, so a saved link can stop working). Tries the bigger copy first,
// then the saved link.
export function XAvatar({ url, name, size }: { url: string | null | undefined; name: string; size: number }) {
  const first = xPic(url, size)
  const [src, setSrc] = useState(first)
  useEffect(() => setSrc(first), [first])
  if (!src) {
    return <span className="xp-av xp-av-ph" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">{initials(name)}</span>
  }
  return (
    <img className="xp-av" src={src} width={size} height={size} alt={`${name}'s profile picture on X`} loading="lazy" decoding="async"
      referrerPolicy="no-referrer" onError={() => setSrc(src !== url && url ? url : '')} />
  )
}

function XBanner({ url }: { url: string }) {
  const first = xBanner(url, 520)
  const [src, setSrc] = useState(first)
  useEffect(() => setSrc(first), [first])
  if (!src) return null
  return (
    <img className="xp-banner" src={src} width={600} height={200} alt="" loading="lazy" decoding="async"
      referrerPolicy="no-referrer" onError={() => setSrc(src !== url ? url : '')} />
  )
}

export const XBlueTick = () => <i className="ti ti-rosette-discount-check xp-blue" role="img" aria-label="Blue tick on X" title="Blue tick on X" />

export const xLink = (handle: string) => `https://x.com/${encodeURIComponent(handle)}`

export function XHandleLink({ handle }: { handle: string }) {
  return (
    <a className="xp-handle" href={xLink(handle)} target="_blank" rel="noopener noreferrer">
      <span>@{handle}</span> <i className="ti ti-external-link" aria-hidden="true" />
    </a>
  )
}

/** Picture, name and tick, @handle, bio (3 lines at most), followers and following */
export function XProfileSummary({ handle, profile, size = 56, banner = false }: { handle: string; profile: XShown | null; size?: number; banner?: boolean }) {
  const name = profile?.name || `@${handle}`
  const counts = [
    { n: profile?.followers, label: profile?.followers === 1 ? 'Follower' : 'Followers' },
    { n: profile?.following, label: 'Following' },
  ].filter((c): c is { n: number; label: string } => typeof c.n === 'number')
  return (
    <div className="xp">
      {banner && profile?.bannerUrl && <XBanner url={profile.bannerUrl} />}
      <div className="xp-top">
        <XAvatar url={profile?.avatarUrl} name={name} size={size} />
        <div className="xp-id">
          <div className="xp-name"><b>{name}</b>{profile?.blue && <XBlueTick />}</div>
          <XHandleLink handle={handle} />
        </div>
      </div>
      {profile?.bio && <p className="xp-bio">{profile.bio}</p>}
      {counts.length > 0 && (
        <div className="xp-counts">
          {counts.map((c) => <span key={c.label} title={`${fullCount(c.n)} ${c.label.toLowerCase()}`}><b>{compact(c.n)}</b> {c.label}</span>)}
        </div>
      )}
    </div>
  )
}

// Bring in a fresh copy of the X profile (new picture, bio, followers). X can't
// be asked directly, so the server reads it from any public post by the
// connected account; it allows this once a minute.
export function XRefresh({ handle, onRefreshed }: { handle: string; onRefreshed: (profile: XProfile, handle: string) => void }) {
  const { toast } = useToast()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !url.trim()) return
    setBusy(true); setErr('')
    try {
      const r = await apiRequest<{ handle: string; profile: XProfile }>('/social/twitter/refresh-profile', { method: 'POST', body: JSON.stringify({ url: url.trim() }) })
      toast('Your X profile is up to date', 'success')
      setOpen(false); setUrl('')
      onRefreshed(r.profile, r.handle || handle)
    } catch (e: any) {
      setErr(xError(e, "Couldn't refresh your X profile. Wait a minute and try again."))
    }
    setBusy(false)
  }

  if (!open) {
    return <button type="button" className="xr-open" onClick={() => setOpen(true)}><i className="ti ti-refresh" aria-hidden="true" /> Refresh from X</button>
  }
  return (
    <form className="xr" onSubmit={submit}>
      <label className="xr-l" htmlFor={id}>Paste the link to any post from @{handle}. We read your picture, name, bio and followers from it.</label>
      <div className="xr-row">
        <input id={id} className="xv-input" value={url} onChange={(e) => { setUrl(e.target.value); setErr('') }} placeholder={`https://x.com/${handle}/status/...`} inputMode="url" autoComplete="off" autoFocus />
        <button type="submit" className="po-btn primary" disabled={busy || !url.trim()}>{busy ? 'Refreshing…' : 'Refresh'}</button>
        <button type="button" className="po-btn" onClick={() => { setOpen(false); setErr(''); setUrl('') }} disabled={busy}>Cancel</button>
      </div>
      {err && <div className="xv-msg" role="alert">{err}</div>}
    </form>
  )
}
