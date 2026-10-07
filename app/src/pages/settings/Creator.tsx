import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { uploadImage } from '../../lib/upload'
import { useToast } from '../../components/Toast'
import { AUDIENCE_PLATFORMS, compact, fullCount, tierFor, type Audience, type AudiencePlatform } from '../../lib/creators'
import { Card, Row, Toggle } from './ui'

/* Settings > Creator: the audiences brands can hire you for. X comes from the
   X connection (read from X, verified straight away); the other platforms are
   sent with a profile screenshot and checked by our team. */

interface Mine { listed: boolean; xConnected: boolean; xHandle: string | null; audiences: Audience[] }

export default function Creator() {
  const { toast } = useToast()
  const [data, setData] = useState<Mine | null>(null)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState<AudiencePlatform | null>(null)

  const load = async () => {
    try { setData(await apiRequest<Mine>('/creators/me')); setErr('') } catch (e: any) { setErr(e?.message || "Couldn't load your creator profile") }
  }
  useEffect(() => { load() }, [])

  const setListed = async (v: boolean) => {
    setData((d) => d && { ...d, listed: v })
    try {
      setData(await apiRequest<Mine>('/creators/me/settings', { method: 'PATCH', body: JSON.stringify({ listed: v }) }))
      toast(v ? 'You can now be found by brands' : 'Hidden from the directory and your profile', 'success')
    } catch (e: any) {
      setData((d) => d && { ...d, listed: !v })
      toast(e?.message || "Couldn't save that", 'error')
    }
  }

  const remove = async (p: AudiencePlatform) => {
    if (!window.confirm(`Remove your ${AUDIENCE_PLATFORMS.find((x) => x.id === p)?.label} audience? Jobs that need it won't be open to you.`)) return
    try {
      setData(await apiRequest<Mine>(`/creators/me/audience/${p}`, { method: 'DELETE' }))
      toast('Removed', 'success')
    } catch (e: any) { toast(e?.message || "Couldn't remove it", 'error') }
  }

  if (err && !data) return <div className="up-empty"><i className="ti ti-cloud-off" />{err} <button className="up-btn" onClick={load}>Try again</button></div>
  if (!data) return <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>

  const byPlatform = new Map(data.audiences.map((a) => [a.platform, a]))
  const verified = data.audiences.filter((a) => a.status === 'VERIFIED')

  return (
    <>
      <Card title="Creator profile" sub="Brands on OgaPay hire creators to promote their business. Add your audiences so jobs that need a minimum number of followers are open to you.">
        <Row
          id="creator-listed"
          title="Show my audience to brands"
          sub={verified.length
            ? 'Your verified audiences appear on your profile and in the creators directory.'
            : 'Turn this on once an audience is verified, so brands can find you in the creators directory.'}
        >
          <Toggle on={data.listed} onChange={setListed} labelledBy="creator-listed" />
        </Row>
        {data.listed && verified.length > 0 && (
          <p className="st2-muted" style={{ margin: '10px 0 0' }}>See how brands find you in the <Link to="/creators">creators directory</Link>.</p>
        )}
      </Card>

      <Card title="Your audiences" sub="Only verified audiences count. Tiers: Nano 1k+, Micro 10k+, Mid-tier 100k+, Macro 500k+.">
        <div className="cr-list">
        {AUDIENCE_PLATFORMS.map((p) => {
          const a = byPlatform.get(p.id)
          const isX = p.id === 'X'
          return (
            <div key={p.id}>
              <div className="st2-conn">
                <span className="st2-conn-ico"><i className={`ti ${p.icon}`} /></span>
                <div className="st2-conn-t">
                  <strong>{p.label}{a?.status === 'VERIFIED' && <span className="cr-badge ok"><i className="ti ti-rosette-discount-check" /> Verified</span>}</strong>
                  <span>{status(a, isX, data.xConnected, p.unit)}</span>
                </div>
                {isX ? (
                  <Link className={`up-btn${a ? '' : ' primary'}`} to="/settings/connections">{a ? 'Update' : data.xConnected ? 'Reconnect X' : 'Connect X'}</Link>
                ) : a ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="up-btn" onClick={() => setEditing(editing === p.id ? null : p.id)}>{a.status === 'REJECTED' ? 'Send again' : 'Update'}</button>
                    <button className="up-btn" onClick={() => remove(p.id)} aria-label={`Remove ${p.label}`}><i className="ti ti-trash" /></button>
                  </div>
                ) : (
                  <button className="up-btn primary" onClick={() => setEditing(editing === p.id ? null : p.id)}>Add</button>
                )}
              </div>
              {a?.status === 'REJECTED' && a.note && editing !== p.id && <p className="cr-note"><i className="ti ti-alert-circle" /> {a.note}</p>}
              {editing === p.id && !isX && (
                <AudienceForm platform={p.id} current={a} onCancel={() => setEditing(null)}
                  onSaved={(saved) => { setEditing(null); setData((d) => d && { ...d, audiences: [...d.audiences.filter((x) => x.platform !== saved.platform), saved] }); toast('Sent. We’ll check it and let you know.', 'success') }} />
              )}
            </div>
          )
        })}
        </div>
        <p className="st2-muted" style={{ margin: '12px 0 0' }}>
          X is read from X when you connect your account, so it's verified straight away. For the others, send a screenshot of your profile page that shows your username and follower count; our team checks it and you'll get a notification.
        </p>
      </Card>
    </>
  )
}

function status(a: Audience | undefined, isX: boolean, xConnected: boolean, unit: string) {
  if (!a) return isX ? (xConnected ? 'Reconnect X so we can read your followers' : 'Connect your X account to add your followers') : 'Not added'
  const count = `${compact(a.followers)} ${unit}`
  const tier = tierFor(a.followers)
  if (a.status === 'VERIFIED') return `@${a.handle} · ${count}${tier ? ` · ${tier}` : ''}${isX ? ' · from X' : ''}`
  if (a.status === 'PENDING') return `@${a.handle} · ${count} · waiting for our team to check`
  return `@${a.handle} · not verified`
}

function AudienceForm({ platform, current, onCancel, onSaved }: {
  platform: AudiencePlatform; current?: Audience; onCancel: () => void; onSaved: (a: Audience) => void
}) {
  const p = AUDIENCE_PLATFORMS.find((x) => x.id === platform)!
  const [handle, setHandle] = useState(current?.handle || '')
  const [followers, setFollowers] = useState(current ? String(current.followers) : '')
  const [proof, setProof] = useState('')
  const [busy, setBusy] = useState<'' | 'upload' | 'send'>('')
  const [error, setError] = useState('')
  const n = parseInt(followers.replace(/[^\d]/g, ''), 10) || 0

  const pick = async (file?: File) => {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { setError('The screenshot must be under 8 MB'); return }
    setBusy('upload'); setError('')
    try { setProof(await uploadImage(file, 'creator-proofs')) } catch (e: any) { setError(e?.message || 'Upload failed') }
    setBusy('')
  }

  const send = async () => {
    if (!handle.trim()) { setError(`Add your ${p.label} username`); return }
    if (n < 1) { setError(`Add how many ${p.unit} you have`); return }
    if (!proof) { setError('Add a screenshot of your profile'); return }
    setBusy('send'); setError('')
    try {
      onSaved(await apiRequest<Audience>('/creators/me/audience', { method: 'POST', body: JSON.stringify({ platform, handle: handle.trim(), followers: n, proofUrl: proof }) }))
    } catch (e: any) { setError(e?.message || "Couldn't send it"); setBusy('') }
  }

  return (
    <form className="st2-panel st2-form" onSubmit={(e) => { e.preventDefault(); send() }}>
      <label className="st2-f"><span>{p.label} username</span>
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={platform === 'YOUTUBE' ? '@yourchannel' : '@yourname'} autoComplete="off" />
      </label>
      <label className="st2-f"><span>{p.unit[0].toUpperCase() + p.unit.slice(1)}</span>
        <input inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value.replace(/[^\d,]/g, ''))} placeholder="e.g. 12,400" />
        {n > 0 && <small className="st2-muted">{fullCount(n)} {p.unit}{tierFor(n) ? ` · ${tierFor(n)} creator` : ''}</small>}
      </label>
      <div className="st2-f"><span>Screenshot of your profile</span>
        <div className="cr-proof">
          {proof && <img src={proof} alt="Your screenshot" />}
          <label className="up-btn" style={{ cursor: busy ? 'wait' : 'pointer' }}>
            <i className="ti ti-photo" /> {busy === 'upload' ? 'Uploading…' : proof ? 'Change screenshot' : 'Upload screenshot'}
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={!!busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </div>
        <small className="st2-muted">It must show your username and {p.unit.replace(/s$/, '')} count. We use it only to check your count; it isn't shown on your profile.</small>
      </div>
      {error && <p className="cr-error" role="alert">{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="up-btn primary" disabled={!!busy}>{busy === 'send' ? 'Sending…' : 'Send for checking'}</button>
        <button type="button" className="up-btn" onClick={onCancel} disabled={!!busy}>Cancel</button>
      </div>
    </form>
  )
}
