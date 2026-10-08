import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../context/AuthContext'
import { Card, Row, type SectionProps } from './ui'
import { levelsFor, UNLOCKS } from '../../lib/levels'
import { naira } from '../../lib/wallet'

// Levels as the backend enforces them, in the same words as the Wallet (lib/levels)
// Didit statuses that mean the person hasn't finished yet
const OPEN = ['Not Started', 'In Progress', 'Resubmitted']
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function Verification({ me, reload, providers }: SectionProps & { providers: Record<string, boolean> | null }) {
  const { toast } = useToast()
  const { refreshUser } = useAuth()
  const [params, setParams] = useSearchParams()
  const status = me.kyc?.status || 'NONE'
  const tier = status === 'APPROVED' ? me.kyc?.kycTier || 0 : 0
  const didit = !!providers?.didit
  const ninInstant = !!providers?.ninInstant // a NIN is confirmed with NIMC on the spot
  const diditOpen = status === 'PENDING' && me.kyc?.provider === 'didit' // started, not finished
  const inReview = status === 'SUBMITTED'
  const want = tier === 0 ? 'NIN' : null // Level 2 is the ID + selfie check
  // With Didit, one ID + selfie check takes anyone below Level 2 straight to Level 2
  const useDidit = (didit && tier < 2) || diditOpen
  const nextTier = useDidit ? 2 : tier + 1
  const [num, setNum] = useState('')
  const [dob, setDob] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [ninMsg, setNinMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [humanBusy, setHumanBusy] = useState(false)
  const [diditBusy, setDiditBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [useNin, setUseNin] = useState(false)
  const synced = useRef(false)

  const submit = async () => {
    if (!want || busy) return
    if (num.length !== 11) { setNinMsg({ ok: false, text: `Enter all 11 digits of your ${want}.` }); return }
    if (!dob) { setNinMsg({ ok: false, text: `Enter your date of birth as it is on your ${want} record.` }); return }
    setBusy(true); setNinMsg(null)
    try {
      const r = await apiRequest<any>('/kyc/submit', {
        method: 'POST',
        body: JSON.stringify({ idType: want, idNumber: num, dateOfBirth: new Date(`${dob}T00:00:00Z`).toISOString() }),
      })
      setNinMsg({ ok: r?.status === 'APPROVED', text: r?.message || 'Submitted' })
      if (r?.status === 'APPROVED') toast(r.message, 'success')
      setNum(''); setDob('')
      await reload()
      refreshUser()
    } catch (e: any) {
      setNinMsg({ ok: false, text: e?.message || 'Verification failed' })
    } finally { setBusy(false) }
  }

  // Open Didit (a new check, or the one they started)
  const startDidit = async () => {
    setDiditBusy(true); setMsg(null)
    try {
      const r = await apiRequest<any>('/kyc/didit/session', { method: 'POST' })
      if (r?.url) { window.location.href = r.url; return }
      // Their earlier check had already finished: show its result
      setMsg({ ok: r?.status !== 'REJECTED', text: r?.message || 'Your verification was updated.' })
      await reload(); refreshUser()
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Couldn't open the ID check. Please try again." })
    }
    setDiditBusy(false)
  }

  // Record the result of a Didit check. Right after coming back, Didit can
  // need a few seconds to finish, so ask again a few times.
  const sync = useCallback(async (justBack: boolean, sessionId?: string | null) => {
    setChecking(true)
    try {
      let r: any = null
      for (let i = 0; i < (justBack ? 5 : 1); i++) {
        if (i) await wait(3000)
        r = await apiRequest<any>('/kyc/didit/sync', { method: 'POST', body: JSON.stringify({ sessionId: sessionId || undefined }) })
        if (!OPEN.includes(r?.didit)) break
      }
      if (r?.status === 'APPROVED' && r?.didit === 'Approved' && r?.tier >= 2) { toast(r.message || "You're verified", 'success'); setMsg({ ok: true, text: r.message || "You're verified." }) }
      else if (justBack && r?.message) setMsg({ ok: r.status !== 'REJECTED' && r.didit !== 'Declined', text: r.message })
      await reload(); refreshUser()
    } catch (e: any) {
      if (justBack) setMsg({ ok: false, text: e?.message || "We couldn't get your result yet. Refresh this page in a minute." })
    }
    setChecking(false)
  }, [reload, refreshUser, toast])

  // Coming back from Didit (?verificationSessionId=…&status=…), or a check left
  // open earlier (finished on another device, say): record the result
  useEffect(() => {
    if (synced.current) return
    const back = params.get('verificationSessionId')
    if (!back && !diditOpen) return
    synced.current = true
    if (back) setParams({}, { replace: true })
    sync(!!back, back)
  }, [params, diditOpen, setParams, sync])

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

  const ninForm = want && (
    // noValidate: submit() explains what's missing. The browser's own "required"
    // bubble doesn't show in some in-app browsers, so the button looked dead.
    <form className="st2-panel st2-form" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      <strong>{useDidit ? 'No ID card to scan? Get Level 1 with your NIN' : 'Get Level 1 with your NIN'}</strong>
      {ninInstant && (
        <p className="st2-muted" style={{ margin: 0, lineHeight: 1.55 }}>
          We confirm your NIN, date of birth and name with NIMC through Didit, our verification partner. It takes a few seconds.
          The name on your OgaPay account, <b>{`${me.firstName || ''} ${me.lastName || ''}`.trim() || 'not set'}</b>, must match your NIN: <Link className="st2-linkbtn" to="/settings/account">change it</Link> first if it doesn't.
        </p>
      )}
      <label className="st2-f"><span>{want} (11 digits)</span>
        <input inputMode="numeric" autoComplete="off" value={num} maxLength={11} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="National Identification Number" required />
      </label>
      <label className="st2-f"><span>Date of birth (as on your {want} record)</span>
        <input type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} required />
      </label>
      {ninMsg && <p className={ninMsg.ok ? 'st2-ok' : 'st2-err'}>{ninMsg.text}</p>}
      <div className="st2-actions"><button className={`up-btn${useDidit ? '' : ' primary'}`} disabled={busy}>{busy ? 'Checking…' : `Verify ${want}`}</button></div>
    </form>
  )

  const diditPanel = (
    <div className="st2-panel st2-form">
      <strong>{diditOpen ? 'Finish your ID check' : tier >= 1 ? 'Upgrade to Level 2: verify your ID' : 'Get Level 2: verify your ID'}</strong>
      <p className="st2-muted" style={{ margin: '6px 0 0', lineHeight: 1.55 }}>
        {diditOpen
          ? "You started an ID check with Didit but haven't finished it. Pick up where you left off."
          : "Scan a government ID (national ID card, international passport, driver's licence or voter's card), then take a quick selfie. It takes about 2 minutes on Didit's secure page."}
      </p>
      {checking && <p className="st2-muted"><i className="ti ti-loader-2" /> Checking your result…</p>}
      {msg && !checking && <p className={msg.ok ? 'st2-ok' : 'st2-err'}>{msg.text}</p>}
      <div className="st2-actions">
        <button className="up-btn primary" onClick={startDidit} disabled={diditBusy || checking}>
          {diditBusy ? 'Opening Didit…' : diditOpen ? 'Continue verification' : 'Verify with Didit'}
        </button>
      </div>
      {!diditOpen && tier === 0 && !ninInstant && (
        <p className="st2-muted" style={{ margin: '10px 0 0' }}>
          No ID to scan? <button type="button" className="st2-linkbtn" onClick={() => { setUseNin((v) => !v); setMsg(null) }}>{useNin ? 'Hide the NIN form' : 'Use your NIN number instead'}</button> for Level 1 (our team checks it).
        </p>
      )}
    </div>
  )

  return (
    <>
      <Card title="Identity verification (KYC)" sub={`Needed before you can withdraw or send money.${didit ? ' ID checks are done by Didit.' : ''} Your ID details are never shown to other users.`}>
        <div className="st2-levels">
          {levelsFor(didit, ninInstant).map((l) => {
            const done = tier >= l.tier
            const next = !done && l.tier === nextTier
            return (
              <div key={l.tier} className={`st2-level${done ? ' done' : next ? ' next' : ''}`}>
                <i className={`ti ${done ? 'ti-circle-check' : 'ti-circle-dashed'}`} />
                <div><strong>{l.name}: {l.short}</strong><span>{l.how}. Withdraw up to {naira(l.limit, 0)} each time.</span></div>
                {done && <em>Verified</em>}
              </div>
            )
          })}
        </div>
        <p className="st2-muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>Any level lets you {UNLOCKS}. Without one you can still earn and add money by card or USSD.</p>

        {status === 'REJECTED' && tier === 0 && (
          <div className="st2-banner"><i className="ti ti-alert-circle" /> Your last attempt wasn't approved{me.kyc?.rejectionReason ? `: ${me.kyc.rejectionReason}` : ''}. You can try again below.</div>
        )}

        {inReview && tier === 0 ? (
          <>
            <div className="st2-banner"><i className="ti ti-hourglass" /> {me.kyc?.provider === 'didit' ? "Your ID check is being reviewed." : 'Your NIN is with our team for review.'} We'll notify you when it's done.</div>
            {msg && <p className={msg.ok ? 'st2-ok' : 'st2-err'}>{msg.text}</p>}
            {ninMsg && <p className={ninMsg.ok ? 'st2-ok' : 'st2-err'}>{ninMsg.text}</p>}
          </>
        ) : useDidit ? (
          <>
            {diditPanel}
            {(useNin || ninInstant) && !diditOpen && tier === 0 && ninForm}
          </>
        ) : want ? ninForm : (
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
