import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../context/AuthContext'
import { Card, Row, type SectionProps } from './ui'

// Levels as the backend enforces them (the old page asked for BVN first, which
// the API always refuses, so nobody could get verified from Settings)
const LEVELS = [
  { tier: 1, name: 'Level 1', what: 'NIN', limit: '₦10,000 per withdrawal' },
  { tier: 2, name: 'Level 2', what: 'BVN', limit: '₦20,000 per withdrawal' },
  { tier: 3, name: 'Level 3', what: 'ID documents, by our team', limit: '₦200,000 per withdrawal' },
]

export default function Verification({ me, reload, providers }: SectionProps & { providers: Record<string, boolean> | null }) {
  const { toast } = useToast()
  const { refreshUser } = useAuth()
  const status = me.kyc?.status || 'NONE'
  const tier = status === 'APPROVED' ? me.kyc?.kycTier || 0 : 0
  const pending = status === 'SUBMITTED' || status === 'PENDING'
  const want = tier === 0 ? 'NIN' : tier === 1 ? 'BVN' : null
  const [num, setNum] = useState('')
  const [dob, setDob] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [humanBusy, setHumanBusy] = useState(false)

  const submit = async () => {
    if (!want) return
    setBusy(true); setMsg(null)
    try {
      const r = await apiRequest<any>('/kyc/submit', {
        method: 'POST',
        body: JSON.stringify({ idType: want, idNumber: num, dateOfBirth: new Date(`${dob}T00:00:00Z`).toISOString() }),
      })
      setMsg({ ok: r?.status === 'APPROVED', text: r?.message || 'Submitted' })
      if (r?.status === 'APPROVED') toast(r.message, 'success')
      setNum(''); setDob('')
      await reload()
      refreshUser()
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Verification failed' })
    } finally { setBusy(false) }
  }

  const startHuman = async () => {
    setHumanBusy(true)
    try {
      const r = await apiRequest<any>('/social/very/init', { method: 'POST' })
      if (r?.authUrl) { window.location.href = r.authUrl; return }
      toast('Human verification is not available yet', 'error')
    } catch (e: any) {
      toast(e?.message || "Couldn't start human verification", 'error')
    }
    setHumanBusy(false)
  }

  return (
    <>
      <Card title="Identity verification (KYC)" sub="Needed before you can withdraw or send money. Checked with Dojah; your NIN and BVN are never shown to other users.">
        <div className="st2-levels">
          {LEVELS.map((l) => {
            const done = tier >= l.tier
            const next = !done && tier + 1 === l.tier
            return (
              <div key={l.tier} className={`st2-level${done ? ' done' : next ? ' next' : ''}`}>
                <i className={`ti ${done ? 'ti-circle-check' : 'ti-circle-dashed'}`} />
                <div><strong>{l.name}: {l.what}</strong><span>{l.limit}</span></div>
                {done && <em>Verified</em>}
              </div>
            )
          })}
        </div>

        {status === 'REJECTED' && tier === 0 && (
          <div className="st2-banner"><i className="ti ti-alert-circle" /> Your last attempt wasn't approved{me.kyc?.rejectionReason ? `: ${me.kyc.rejectionReason}` : ''}. You can try again below.</div>
        )}

        {pending && tier === 0 ? (
          <div className="st2-banner"><i className="ti ti-hourglass" /> Your NIN is with our team for review. We'll notify you when it's done.</div>
        ) : want ? (
          <form className="st2-panel st2-form" onSubmit={(e) => { e.preventDefault(); submit() }}>
            <strong>{tier === 0 ? 'Get Level 1 with your NIN' : 'Upgrade to Level 2 with your BVN'}</strong>
            <label className="st2-f"><span>{want} (11 digits)</span>
              <input inputMode="numeric" autoComplete="off" value={num} maxLength={11} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder={want === 'NIN' ? 'National Identification Number' : 'Bank Verification Number'} required />
            </label>
            <label className="st2-f"><span>Date of birth (as on your {want} record)</span>
              <input type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} required />
            </label>
            {msg && <p className={msg.ok ? 'st2-ok' : 'st2-err'}>{msg.text}</p>}
            <div className="st2-actions"><button className="up-btn primary" disabled={busy || num.length !== 11 || !dob}>{busy ? 'Checking…' : `Verify ${want}`}</button></div>
          </form>
        ) : (
          <Row title="Need a higher limit?" sub="Level 3 is done by our team with your ID documents.">
            <Link className="up-btn" to="/support">Contact support</Link>
          </Row>
        )}
      </Card>

      <Card title="Human verification" sub="Proves you're a real person (VeryAI palm scan). Some jobs require it, and it adds to your OgaScore.">
        <Row
          title="Status"
          sub={me.humanVerifiedAt ? <span className="st2-ok"><i className="ti ti-circle-check" /> Verified</span> : <span className="st2-muted">Not verified</span>}
        >
          {!me.humanVerifiedAt && (providers?.very
            ? <button className="up-btn primary" onClick={startHuman} disabled={humanBusy}>{humanBusy ? 'Opening VeryAI…' : 'Verify with VeryAI'}</button>
            : <span className="st2-muted">Coming soon</span>)}
        </Row>
      </Card>
    </>
  )
}
