import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../context/AuthContext'
import { Card, Row, type SectionProps } from './ui'
import { levelsFor, nextTierFor, UNLOCKS } from '../../lib/levels'
import { naira } from '../../lib/wallet'

// Levels as the backend enforces them, in the same words as the Wallet (lib/levels)
// Didit statuses that mean the person hasn't finished yet
const OPEN = ['Not Started', 'In Progress', 'Resubmitted']
// The two Didit checks: NIN + selfie (Level 1) and ID document + selfie (Level 2)
type Flow = 'nin' | 'id'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function Verification({ me, reload, providers }: SectionProps & { providers: Record<string, boolean> | null }) {
  const { toast } = useToast()
  const { refreshUser } = useAuth()
  const [params, setParams] = useSearchParams()
  const status = me.kyc?.status || 'NONE'
  const tier = status === 'APPROVED' ? me.kyc?.kycTier || 0 : 0
  const didit = !!providers?.didit
  const diditNin = !!providers?.diditNin
  const diditOpen = status === 'PENDING' && me.kyc?.provider === 'didit' // started, not finished
  const openFlow: Flow | null = diditOpen ? (me.kyc?.idType === 'NIN' ? 'nin' : 'id') : null
  const inReview = status === 'SUBMITTED'
  const want = tier === 0 ? 'NIN' : tier === 1 ? 'BVN' : null
  // With the NIN check on, someone with no level picks NIN + selfie (Level 1 in
  // seconds) or ID + selfie (Level 2). Otherwise, with Didit, one ID + selfie
  // check takes anyone below Level 2 straight to Level 2.
  const ninChoice = diditNin && tier === 0
  const useDidit = (didit && tier < 2) || diditOpen
  const nextTier = nextTierFor(tier, didit, diditNin)
  const [num, setNum] = useState('')
  const [dob, setDob] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [humanBusy, setHumanBusy] = useState(false)
  const [diditBusy, setDiditBusy] = useState<Flow | null>(null)
  const [checking, setChecking] = useState(false)
  const [useNin, setUseNin] = useState(false)
  const synced = useRef(false)

  const submit = async () => {
    if (!want || busy) return
    if (num.length !== 11) { setMsg({ ok: false, text: `Enter all 11 digits of your ${want}.` }); return }
    if (!dob) { setMsg({ ok: false, text: `Enter your date of birth as it is on your ${want} record.` }); return }
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

  // Open Didit (a new check, or the one they started)
  const startDidit = async (flow: Flow) => {
    setDiditBusy(flow); setMsg(null)
    try {
      const r = await apiRequest<any>('/kyc/didit/session', { method: 'POST', body: JSON.stringify({ flow }) })
      if (r?.url) { window.location.href = r.url; return }
      // Their earlier check had already finished: show its result
      setMsg({ ok: r?.status !== 'REJECTED', text: r?.message || 'Your verification was updated.' })
      await reload(); refreshUser()
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || `Couldn't open the ${flow === 'nin' ? 'NIN' : 'ID'} check. Please try again.` })
    }
    setDiditBusy(null)
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
      // verified: this check raised their level (older servers: an approved Level 2)
      if (r?.verified || (r?.status === 'APPROVED' && r?.didit === 'Approved' && r?.tier >= 2)) { toast(r.message || "You're verified", 'success'); setMsg({ ok: true, text: r.message || "You're verified." }) }
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
      <strong>{tier === 0 ? 'Get Level 1 with your NIN' : 'Upgrade to Level 2 with your BVN'}</strong>
      <label className="st2-f"><span>{want} (11 digits)</span>
        <input inputMode="numeric" autoComplete="off" value={num} maxLength={11} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder={want === 'NIN' ? 'National Identification Number' : 'Bank Verification Number'} required />
      </label>
      <label className="st2-f"><span>Date of birth (as on your {want} record)</span>
        <input type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} required />
      </label>
      {msg && <p className={msg.ok ? 'st2-ok' : 'st2-err'}>{msg.text}</p>}
      <div className="st2-actions"><button className="up-btn primary" disabled={busy}>{busy ? 'Checking…' : `Verify ${want}`}</button></div>
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
        <button className="up-btn primary" onClick={() => startDidit('id')} disabled={!!diditBusy || checking}>
          {diditBusy ? 'Opening Didit…' : diditOpen ? 'Continue verification' : 'Verify with Didit'}
        </button>
      </div>
      {!diditOpen && tier === 0 && (
        <p className="st2-muted" style={{ margin: '10px 0 0' }}>
          No ID to scan? <button type="button" className="st2-linkbtn" onClick={() => { setUseNin((v) => !v); setMsg(null) }}>{useNin ? 'Hide the NIN form' : 'Use your NIN number instead'}</button> for Level 1 (our team checks it).
        </p>
      )}
    </div>
  )

  // No level yet, with the NIN check on: the two ways in, side by side
  const choice = (flow: Flow) => {
    const nin = flow === 'nin'
    const open = openFlow === flow
    return (
      <Row
        key={flow}
        title={nin ? 'NIN + selfie: Level 1' : 'ID + selfie: Level 2'}
        sub={open
          ? "You started this check but haven't finished it. Pick up where you left off."
          : nin
            ? 'Type your NIN and take a selfie. We check them against your NIMC record in seconds.'
            : "Scan a national ID card, international passport, driver's licence or voter's card, then take a selfie. About 2 minutes."}
      >
        <button className={`up-btn${nin ? ' primary' : ''}`} onClick={() => startDidit(flow)} disabled={!!diditBusy || checking}>
          {diditBusy === flow ? 'Opening Didit…' : open ? 'Continue' : nin ? 'Verify with NIN' : 'Verify with ID'}
        </button>
      </Row>
    )
  }

  const choicePanel = (
    <div className="st2-panel">
      <strong>{diditOpen ? 'Finish verifying your identity' : 'Choose how to verify'}</strong>
      {choice('nin')}
      {(didit || openFlow === 'id') && choice('id')}
      <p className="st2-muted" style={{ margin: '4px 0 0', lineHeight: 1.55 }}>
        {didit
          ? "Both happen on Didit's secure page. Start with your NIN for Level 1 now, and add an ID for Level 2 whenever you need a higher limit."
          : "It happens on Didit's secure page and takes about a minute."}
      </p>
      {checking && <p className="st2-muted"><i className="ti ti-loader-2" /> Checking your result…</p>}
      {msg && !checking && <p className={msg.ok ? 'st2-ok' : 'st2-err'}>{msg.text}</p>}
    </div>
  )

  return (
    <>
      <Card title="Identity verification (KYC)" sub={`Needed before you can withdraw or send money.${didit || diditNin ? ' Checks are done by Didit.' : ''} Your ID details are never shown to other users.`}>
        <div className="st2-levels">
          {levelsFor(didit, diditNin).map((l) => {
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
            <div className="st2-banner"><i className="ti ti-hourglass" /> {me.kyc?.provider === 'didit' ? `Your ${me.kyc?.idType === 'NIN' ? 'NIN' : 'ID'} check is being reviewed.` : 'Your NIN is with our team for review.'} We'll notify you when it's done.</div>
            {msg && <p className={msg.ok ? 'st2-ok' : 'st2-err'}>{msg.text}</p>}
          </>
        ) : ninChoice ? choicePanel : useDidit ? (
          <>
            {diditPanel}
            {useNin && !diditOpen && tier === 0 && ninForm}
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
