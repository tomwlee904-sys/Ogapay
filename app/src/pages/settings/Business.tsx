import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { VerifiedBusinessMark } from '../../components/Perks'
import { Card } from './ui'

/* Settings > Business: ask for the Verified business badge. Posters send their
   business details, our team checks them, and the badge then shows on their
   jobs and profile. It's optional: anyone can post jobs without it. */

interface Application {
  id: string; companyName: string; regNumber: string; website: string | null; socialUrl: string | null
  contactEmail: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; note: string | null; updatedAt: string
}
interface Mine { application: Application | null; verified: boolean; verifiedName: string | null; verifiedAt: string | null }

const fmt = (d: string) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
// People often type "mybiz.ng" without https://
const withScheme = (u: string) => {
  const v = u.trim()
  return !v || /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export default function Business() {
  const { toast } = useToast()
  const [data, setData] = useState<Mine | null>(null)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(false)

  const load = async () => {
    try { setData(await apiRequest<Mine>('/brands/me')); setErr('') } catch (e: any) { setErr(e?.message || "Couldn't load your business details") }
  }
  useEffect(() => { load() }, [])

  if (err && !data) return <div className="up-empty"><i className="ti ti-cloud-off" />{err} <button className="up-btn" onClick={load}>Try again</button></div>
  if (!data) return <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>

  const a = data.application
  const showForm = !data.verified && (editing || !a)

  return (
    <>
      <Card title="Verified business" sub="Posting jobs for a business? Get a Verified business badge on your jobs and your profile, so workers can see a real, registered business is behind them. It's optional. You can post jobs without it.">
        {data.verified ? (
          <div className="st2-panel">
            <strong>Verified as {data.verifiedName}</strong> <VerifiedBusinessMark label name={data.verifiedName} />
            <p className="st2-muted" style={{ margin: '6px 0 0' }}>
              {data.verifiedAt ? `Checked on ${fmt(data.verifiedAt)}. ` : ''}The badge shows next to your name on your jobs and profile. To change your business details, <Link to="/support">contact support</Link>.
            </p>
          </div>
        ) : a && !editing ? (
          <div className="st2-panel">
            <strong>{a.status === 'PENDING' ? 'Waiting for our team to check it' : "We couldn't verify your business"}</strong>
            <p className="st2-muted" style={{ margin: '6px 0 0' }}>
              {a.companyName} · {a.regNumber}
              {a.status === 'PENDING' ? ". We'll send you a notification when it's done." : ''}
            </p>
            {a.status === 'REJECTED' && a.note && <p className="cr-error" style={{ marginTop: 8 }}><i className="ti ti-alert-circle" /> {a.note}</p>}
            <div style={{ marginTop: 10 }}>
              <button className={`up-btn${a.status === 'REJECTED' ? ' primary' : ''}`} onClick={() => setEditing(true)}>
                {a.status === 'REJECTED' ? 'Fix and send again' : 'Edit details'}
              </button>
            </div>
          </div>
        ) : null}

        {showForm && (
          <BusinessForm current={a} onCancel={a ? () => setEditing(false) : undefined}
            onSaved={(m) => { setData(m); setEditing(false); toast("Sent. We'll check it and let you know.", 'success') }} />
        )}
      </Card>

      <Card title="How it works">
        <ol className="st2-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Send your business name, CAC number, a website or social media page, and an email we can reach you on.</li>
          <li>Our team checks the CAC number against the name, and that the website or page belongs to the business.</li>
          <li>Once approved, a Verified business badge shows next to your name on every job you post and on your profile.</li>
        </ol>
      </Card>
    </>
  )
}

function BusinessForm({ current, onCancel, onSaved }: { current: Application | null; onCancel?: () => void; onSaved: (m: Mine) => void }) {
  const { user } = useAuth()
  const [companyName, setCompanyName] = useState(current?.companyName || '')
  const [regNumber, setRegNumber] = useState(current?.regNumber || '')
  const [website, setWebsite] = useState(current?.website || '')
  const [socialUrl, setSocialUrl] = useState(current?.socialUrl || '')
  const [contactEmail, setContactEmail] = useState(current?.contactEmail || user?.email || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    if (companyName.trim().length < 2) { setError('Enter your business name'); return }
    if (!regNumber.trim()) { setError('Enter your CAC number'); return }
    if (!website.trim() && !socialUrl.trim()) { setError('Add your website or a social media page so we can check your business'); return }
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) { setError('Enter a valid email address'); return }
    setBusy(true); setError('')
    try {
      onSaved(await apiRequest<Mine>('/brands/me', {
        method: 'POST',
        body: JSON.stringify({ companyName: companyName.trim(), regNumber: regNumber.trim(), website: withScheme(website), socialUrl: withScheme(socialUrl), contactEmail: contactEmail.trim() }),
      }))
    } catch (e: any) { setError(e?.message || "Couldn't send it"); setBusy(false) }
  }

  return (
    <form className="st2-panel st2-form" onSubmit={(e) => { e.preventDefault(); send() }}>
      <label className="st2-f"><span>Business name</span>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="As registered with CAC" maxLength={100} autoComplete="organization" />
      </label>
      <label className="st2-f"><span>CAC number</span>
        <input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="e.g. RC 1234567 or BN 3456789" maxLength={30} autoComplete="off" />
        <small className="st2-muted">Your registration number from the Corporate Affairs Commission.</small>
      </label>
      <label className="st2-f"><span>Website (optional if you add a social page)</span>
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourbusiness.ng" inputMode="url" maxLength={300} autoComplete="url" />
      </label>
      <label className="st2-f"><span>Social media page (optional if you add a website)</span>
        <input value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} placeholder="https://instagram.com/yourbusiness" inputMode="url" maxLength={300} />
      </label>
      <label className="st2-f"><span>Contact email</span>
        <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hello@yourbusiness.ng" maxLength={200} autoComplete="email" />
        <small className="st2-muted">Only our team sees this, in case we need to ask you something.</small>
      </label>
      {error && <p className="cr-error" role="alert">{error}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="up-btn primary" disabled={busy}>{busy ? 'Sending…' : 'Send for checking'}</button>
        {onCancel && <button type="button" className="up-btn" onClick={onCancel} disabled={busy}>Cancel</button>}
      </div>
    </form>
  )
}
