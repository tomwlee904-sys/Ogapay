import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { shrinkImage } from '../../lib/shrinkImage'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../context/AuthContext'
import { Card, Row, type SectionProps } from './ui'
import { levelsFor, UNLOCKS, SEND_RULE, BANK_ONLY_NEXT, ANY_ID, LIMIT_AND_PAYDAY } from '../../lib/levels'
import { naira, kycOf } from '../../lib/wallet'
import { DOB_MONTHS, MIN_AGE, dobIso, dobProblem, dobYears } from '../../lib/dob'
import AddBankForm from '../../components/wallet/AddBankForm'
import EmailCodeBox from '../../components/auth/EmailCodeBox'
import { safeNext, saveNext, readNext, clearNext, type NextVisit } from '../../lib/nextPath'
import '../../styles/wallet.css'

// Where VeryCallback keeps the claim key from a scan that came back signed out
const VERY_CLAIM_KEY = 'ogapay_very_claim'
// Once any level is approved the name can't be changed (user.service updateProfile)
const NAME_LOCK = "You can't change it after you're verified."
// The VeryAI app in the stores (ver-12). No official store links are in our code
// or VeryAI's docs we have, so these open a store search for "VeryAI".
export const VERYAI_PLAY = 'https://play.google.com/store/apps/details?id=xyz.veros.app'
export const VERYAI_APPSTORE = 'https://apps.apple.com/us/app/veryai-proof-of-reality/id6746761869'
// "Connect X" card closed with "Not now" (ver-18), per browser
const HIDE_X_KEY = 'ogapay_hide_connect_x'

// Levels as the backend enforces them, in the same words as the Wallet (lib/levels)
// Didit statuses that mean the person hasn't finished yet
const OPEN = ['Not Started', 'In Progress', 'Resubmitted']
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Level 2 checked by our team, when Didit doesn't work for someone
type ManualReq = { id?: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; reason?: string | null; createdAt?: string } | null
// Two photos on slow mobile data get as long as other file uploads (uploadFile
// in lib/upload.ts); other requests get 15 s (2026-11-01)
export const MANUAL_UPLOAD_MS = 300_000
// The server saves both photos before the request shows up, so a check made
// right after a timeout can be a few seconds early: look once more after this
export const ARRIVAL_RECHECK_MS = 5_000
const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // the server's limit per photo (kyc.routes.js)
export const MANUAL_SENT = 'Sent. Our team will check your ID.'
export const MANUAL_ALREADY = "Your earlier request is already with our team, so these photos weren't sent. We'll let you know when it's checked."

const errText = (e: any) => String(e?.message || '')
const timedOut = (e: any) => /timed out/i.test(errText(e))
const dropped = (e: any) => e?.name === 'TypeError' || /failed to fetch|networkerror|load failed|network (request|error)/i.test(errText(e))
// A proxy error page or a server crash, not a reason from our server
const broken = (e: any) => !errText(e) || e?.name === 'SyntaxError' || /unexpected error/i.test(errText(e))

// No answer came back, so the photos may still have reached us. Anything else
// is our server saying no (with its reason), and then nothing was kept.
export function mayHaveArrived(e: any): boolean {
  return timedOut(e) || dropped(e) || broken(e)
}

// What to say when sending didn't work (and the photos aren't with us)
export function manualSendError(e: any): string {
  if (timedOut(e)) return 'Your photos took too long to send on this connection. Check your data or move to a spot with better signal, then try again.'
  if (dropped(e)) return 'The connection dropped while sending your photos. Check your data, then try again.'
  if (/file too large/i.test(errText(e))) return 'A photo is too large. Please choose a smaller one (up to 5 MB).'
  if (broken(e)) return "Couldn't send your photos. Please try again."
  return errText(e)
}

// The member's latest request on the server: null if none, undefined if we couldn't ask
const latestRequest = () => apiRequest<{ request: ManualReq }>('/kyc/level2/manual').then((d) => d?.request || null, () => undefined)

// sent: these photos are with our team. waiting: an earlier request is, and
// these weren't kept. failed: nothing arrived; text says why.
export type ManualSendResult = { result: 'sent' | 'waiting' | 'failed'; text: string; request?: ManualReq }

// Sends the ID photo (2026-11-01; no selfie since 2026-11-03). Big phone photos are made smaller
// first (lib/shrinkImage) and the upload gets up to 5 minutes instead of 15 s.
// Before uploading we ask whether a request is already with our team (an earlier
// send that arrived late, or one from another phone), so photos aren't sent
// twice on paid data. A timeout or a dropped connection doesn't mean nothing
// arrived, so we look for the new request before asking them to try again.
export async function sendManualLevel2(
  { idType, idNumber, front }: { idType: string; idNumber: string; front: File },
  onStep: (text: string) => void = () => {},
): Promise<ManualSendResult> {
  onStep('Getting your photo ready…')
  const asked = latestRequest() // while the photo is made smaller, so no extra wait
  let id: File
  try {
    id = await shrinkImage(front, { maxBytes: MAX_PHOTO_BYTES, label: 'your ID photo' })
  } catch (e: any) {
    return { result: 'failed', text: e?.message || "Couldn't read your photo. Please choose it again." }
  }
  const before = await asked
  if (before?.status === 'PENDING') return { result: 'waiting', text: MANUAL_ALREADY, request: before }
  const fd = new FormData()
  fd.append('idType', idType)
  fd.append('idNumber', idNumber)
  fd.append('id_front', id)
  onStep('Sending your photo…')
  try {
    const request = await apiRequest<ManualReq>('/kyc/level2/manual', { method: 'POST', body: fd, timeoutMs: MANUAL_UPLOAD_MS })
    return { result: 'sent', text: MANUAL_SENT, request: request?.status ? request : { status: 'PENDING' } }
  } catch (e: any) {
    onStep('Checking if they arrived…')
    const unanswered = mayHaveArrived(e)
    let after = await latestRequest()
    if (unanswered && after?.status !== 'PENDING') {
      await wait(ARRIVAL_RECHECK_MS)
      after = await latestRequest()
    }
    // A request waiting now is newer than the one we saw before sending (that
    // one wasn't waiting, or we'd have stopped above). If we couldn't ask
    // before, and no answer came back, we take it to be this one.
    if (after?.status === 'PENDING') {
      // No answer came back, but the request is there: these photos arrived
      if (unanswered) return { result: 'sent', text: MANUAL_SENT, request: after }
      // Our server said no (most often "already with our team": an earlier send
      // got there first), so these photos weren't kept. Never shown as "Sent".
      return { result: 'waiting', text: MANUAL_ALREADY, request: after }
    }
    return { result: 'failed', text: manualSendError(e) }
  }
}

type Tone = 'ok' | 'wait' | 'err'
// VeryAI's tone: only 'failed' is an error; older servers send none (shown calmly)
const veryTone = (t?: string): Tone => (t === 'failed' ? 'err' : 'wait')
// A message in its tone: green when done, calm grey while waiting, red only for a real problem
function ToneMsg({ m }: { m: { tone: Tone; text: string } | null }) {
  if (!m) return null
  if (m.tone === 'wait') return <p className="st2-muted" role="status" style={{ margin: '6px 0 0', lineHeight: 1.55 }}><i className="ti ti-hourglass" aria-hidden="true" /> {m.text}</p>
  return <p className={m.tone === 'ok' ? 'st2-ok' : 'st2-err'} role={m.tone === 'err' ? 'alert' : 'status'}>{m.text}</p>
}

export default function Verification({ me, reload, providers }: SectionProps & { providers: Record<string, boolean> | null }) {
  const { toast } = useToast()
  const { user, refreshUser } = useAuth()
  const [params, setParams] = useSearchParams()
  const status = me.kyc?.status || 'NONE'
  const tier = status === 'APPROVED' ? me.kyc?.kycTier || 0 : 0
  const didit = !!providers?.didit
  const ninInstant = !!providers?.ninInstant // a NIN is confirmed with NIMC on the spot
  const bankKyc = !!providers?.bankKyc // Level 1 from a bank account in their name (free)
  const diditOpen = didit && status === 'PENDING' && me.kyc?.provider === 'didit' // started, not finished
  const inReview = status === 'SUBMITTED'
  // In Ghana the bank and NIN checks (Nigeria only) don't apply: Level 2 with a Ghana Card
  const ghana = me.country === 'GH'
  const want = tier === 0 ? 'NIN' : null // Level 2 is the ID check
  // With Didit, one ID + selfie check takes anyone below Level 2 straight to Level 2
  const useDidit = (didit && tier < 2) || diditOpen
  const nextTier = useDidit ? 2 : tier + 1
  const [num, setNum] = useState('')
  // Date of birth as day / month / year selects (lib/dob)
  const [dobD, setDobD] = useState('')
  const [dobM, setDobM] = useState('')
  const [dobY, setDobY] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // tone: ok (verified), wait (sent to our team: calm, not an error), err (a real problem)
  const [ninMsg, setNinMsg] = useState<{ tone: Tone; text: string } | null>(null)
  const [humanBusy, setHumanBusy] = useState(false)
  const [diditBusy, setDiditBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [useNin, setUseNin] = useState(false)
  const synced = useRef(false)

  // Came from a job's "Verify..." link (?next=/tasks/ID): once verified, a
  // "Back to the job" button (ver-10). What they had when they arrived is kept
  // in this browser, so it works after VeryAI or Didit bring them back without ?next.
  const [nextVisit] = useState<NextVisit | null>(() => {
    const path = safeNext(params.get('next'))
    if (!path) return readNext()
    const v = { path, tier, human: !!me.humanVerifiedAt }
    saveNext(v)
    return { ...v, at: Date.now() }
  })
  const backTo = nextVisit && (tier > nextVisit.tier || (!!me.humanVerifiedAt && !nextVisit.human)) ? nextVisit.path : null

  // "Connect X" for X jobs (ver-18), until connected or closed with "Not now"
  const [xHidden, setXHidden] = useState(() => { try { return localStorage.getItem(HIDE_X_KEY) === '1' } catch { return false } })
  const hideX = () => { setXHidden(true); try { localStorage.setItem(HIDE_X_KEY, '1') } catch { /* storage off */ } }

  // Level 2 checked by our team, when Didit doesn't work for someone
  const [manualReq, setManualReq] = useState<ManualReq | undefined>(undefined)
  const [showManual, setShowManual] = useState(false)
  const [mType, setMType] = useState(ghana ? 'GHANA_CARD' : 'NIN')
  const [mNumber, setMNumber] = useState('')
  const [mFront, setMFront] = useState<File | null>(null)
  const [mBusy, setMBusy] = useState(false)
  const [mStep, setMStep] = useState('') // what's happening, on the button
  const mSending = useRef(false) // a second tap before the button greys out
  const [mMsg, setMMsg] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => {
    if (tier >= 2) return
    apiRequest<{ request: ManualReq }>('/kyc/level2/manual').then((d) => setManualReq(d?.request || null)).catch(() => setManualReq(null))
  }, [tier])
  const sendManual = async () => {
    if (mSending.current) return
    if (mType === 'NIN' && !/^\d{11}$/.test(mNumber.replace(/\s+/g, ''))) { setMMsg({ ok: false, text: 'Type the 11-digit NIN on your slip or card.' }); return }
    if (mNumber.replace(/\s+/g, '').length < 5) { setMMsg({ ok: false, text: 'Type the number on your ID.' }); return }
    if (!mFront) { setMMsg({ ok: false, text: 'Add a photo of your ID.' }); return }
    mSending.current = true
    setMBusy(true); setMMsg(null)
    try {
      const r = await sendManualLevel2({ idType: mType, idNumber: mNumber, front: mFront }, setMStep)
      if (r.result === 'failed') setMMsg({ ok: false, text: r.text })
      else {
        // Sent now, or an earlier request is waiting: either way show "with our team"
        setManualReq(r.request || { status: 'PENDING' })
        setShowManual(false); setMFront(null); setMNumber('')
        toast(r.text, 'success')
      }
    } catch (e: any) {
      setMMsg({ ok: false, text: manualSendError(e) })
    }
    mSending.current = false
    setMBusy(false); setMStep('')
  }

  const submit = async () => {
    if (!want || busy) return
    if (num.length !== 11) { setNinMsg({ tone: 'err', text: `Enter all 11 digits of your ${want}.` }); return }
    const dobErr = dobProblem(dobD, dobM, dobY)
    if (dobErr) { setNinMsg({ tone: 'err', text: !dobD && !dobM && !dobY ? `Enter your date of birth as it is on your ${want} record.` : dobErr }); return }
    const dob = dobIso(dobD, dobM, dobY)
    setBusy(true); setNinMsg(null)
    try {
      const r = await apiRequest<any>('/kyc/submit', {
        method: 'POST',
        body: JSON.stringify({ idType: want, idNumber: num, dateOfBirth: new Date(`${dob}T00:00:00Z`).toISOString() }),
      })
      setNinMsg({ tone: r?.status === 'APPROVED' ? 'ok' : r?.status === 'SUBMITTED' ? 'wait' : 'err', text: r?.message || 'Submitted' })
      if (r?.status === 'APPROVED') toast(r.message, 'success')
      setNum(''); setDobD(''); setDobM(''); setDobY('')
      await reload()
      refreshUser()
    } catch (e: any) {
      setNinMsg({ tone: 'err', text: e?.message || 'Verification failed' })
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
      // The "send your ID to our team" form opens right under this message
      setMsg({ ok: false, text: `${e?.message || "Couldn't open the ID check."} If it keeps happening, send your ID to our team below.` })
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

  // "Check again": the server looks at this person's latest VeryAI check and,
  // if VeryAI sent a result it couldn't confirm at the time, asks VeryAI again.
  // The result can also have arrived in another browser or tab (VeryAI often
  // opens one on Android), so this reads the server, never this page's copy.
  // Servers before /very/check only have /very/status.
  // tone from the server (waiting / info / failed): only a real failure is red
  const [humanMsg, setHumanMsgState] = useState<{ tone: Tone; text: string } | null>(null)
  const setHumanMsg = useCallback((text: string, tone: Tone = 'wait') => setHumanMsgState(text ? { tone, text } : null), [])
  const [humanChecking, setHumanChecking] = useState(false)
  const lastHumanCheck = useRef(0)
  const checkHuman = useCallback(async (quiet = false) => {
    lastHumanCheck.current = Date.now()
    if (!quiet) setHumanChecking(true)
    try {
      let r: any
      // A scan that came back to this browser while signed out left a claim
      // key here; handing it over finishes that check for this account
      let claim: string | null = null
      try { claim = localStorage.getItem(VERY_CLAIM_KEY) } catch { /* private mode */ }
      try { r = await apiRequest<any>('/social/very/check', { method: 'POST', body: JSON.stringify(claim ? { claim } : {}) }) }
      catch (e) { r = await apiRequest<any>('/social/very/status').catch(() => { throw e }) }
      if (claim && (r?.claim === 'used' || r?.claim === 'invalid' || r?.verified)) {
        try { localStorage.removeItem(VERY_CLAIM_KEY) } catch { /* ignore */ }
      }
      if (r?.verified) {
        setHumanMsg('')
        toast("You're verified as a human", 'success')
        await reload(); refreshUser()
      } else if (!quiet) {
        setHumanMsg(r?.message || r?.check?.message || "You're not verified yet. If the VeryAI app says the scan is complete, go back to the browser page that opened VeryAI, or start a new check.", veryTone(r?.message ? r?.tone : r?.check?.tone))
      } else if (claim && r?.message) {
        setHumanMsg(r.message, veryTone(r.tone))
      } else if (r?.check?.message) {
        // The quiet look on opening: an old failed check is news, not an error just now
        setHumanMsg(r.check.message, 'wait')
      }
    } catch (e: any) {
      if (!quiet) setHumanMsg(e?.message || "Couldn't check right now. Please try again.", 'err')
    }
    setHumanChecking(false)
  }, [reload, refreshUser, toast, setHumanMsg])

  // Look once on opening, and again when the person comes back to this tab
  // (from the VeryAI app, say), so a finished scan shows without a reload
  const humanPending = !me.humanVerifiedAt && !!providers?.very
  // A job that needs it links to #human: show that card, not the top of the page
  useEffect(() => {
    if (window.location.hash !== '#human') return
    const t = setTimeout(() => document.getElementById('human')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!humanPending) return
    if (!lastHumanCheck.current) checkHuman(true)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastHumanCheck.current > 15000) checkHuman(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [humanPending, checkHuman])

  const [bankMsg, setBankMsg] = useState('')
  const verifyBank = async (bank: { code: string; name: string }, accountNumber: string) => {
    const r = await apiRequest<any>('/kyc/bank', { method: 'POST', body: JSON.stringify({ bankCode: bank.code, bankName: bank.name, accountNumber }) })
    toast(r?.message || "You're verified", 'success')
    setBankMsg(r?.message || "You're verified. Level 1 is on.")
    await reload(); refreshUser()
  }
  const myName = `${me.firstName || ''} ${me.lastName || ''}`.trim()
  // Level 1 from the bank check only: withdrawals yes, the bonus and sending money no
  const bankOnly = kycOf(me).verified && !kycOf(me).idVerified

  const bankPanel = bankKyc && tier === 0 && !diditOpen && (
    <div className="st2-panel st2-form">
      <strong>Verify with your bank account <span className="st2-free">Free · 1 minute</span></strong>
      <ol className="st2-steps">
        <li>Choose your bank.</li>
        <li>Type your 10-digit account number.</li>
        <li>If the name on the account is <b>{myName || 'your name'}</b>, you're verified. Your earnings will be paid into this account.</li>
      </ol>
      {/* Every name link on this page goes to Edit profile, in the same words (ver-15) */}
      {!me.firstName || !me.lastName
        ? <div className="st2-warn"><i className="ti ti-alert-circle" aria-hidden="true" /><span>First, add your name in <Link className="st2-linkbtn" to="/edit-profile">Edit profile</Link>, exactly as it is on your bank account.</span></div>
        : <div className="st2-warn"><i className="ti ti-alert-circle" aria-hidden="true" /><span>Is your name different on your bank account? Change it in <Link className="st2-linkbtn" to="/edit-profile">Edit profile</Link> first. {NAME_LOCK}</span></div>}
      {bankMsg ? <p className="st2-ok">{bankMsg}</p> : (
        <AddBankForm note="Use your own personal account, not a business account or someone else's." action={{ label: 'Verify me', busyLabel: 'Verifying…', run: (b, n) => verifyBank(b, n) }} />
      )}
      {/* What the bank check turns on, and what it doesn't (ver-1) */}
      <p className="st2-muted" style={{ margin: '4px 0 0', lineHeight: 1.55 }}>This turns on withdrawals. It doesn't count for the ₦1,000 first job bonus or for sending money: those need your NIN or ID.</p>
      {(ninInstant || !didit) && (
        <p className="st2-muted" style={{ margin: '4px 0 0' }}>
          No bank account in your own name? <button type="button" className="st2-linkbtn" onClick={() => setUseNin((v) => !v)}>{useNin ? 'Hide the NIN form' : 'Use your NIN instead'}</button>
        </p>
      )}
      {/* Without Didit, Level 2 is checked by our team and can be the first step too */}
      {!didit && manualReq !== undefined && manualReq?.status !== 'PENDING' && (
        <p className="st2-muted" style={{ margin: '4px 0 0' }}>
          Want Level 2 straight away? <button type="button" className="st2-linkbtn" onClick={() => { setShowManual((v) => !v); setMMsg(null) }}>{showManual ? 'Hide' : 'Send your ID to our team'}</button>
        </p>
      )}
    </div>
  )

  const ninForm = want && (
    // noValidate: submit() explains what's missing. The browser's own "required"
    // bubble doesn't show in some in-app browsers, so the button looked dead.
    <form className="st2-panel st2-form" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      <strong>{useDidit ? 'No ID card to scan? Get Level 1 with your NIN' : 'Get Level 1 with your NIN'}</strong>
      {ninInstant && (
        <p className="st2-muted" style={{ margin: 0, lineHeight: 1.55 }}>
          We confirm your NIN, date of birth and name with NIMC through Didit, our verification partner. It takes a few seconds.
          The name on your OgaPay account, <b>{`${me.firstName || ''} ${me.lastName || ''}`.trim() || 'not set'}</b>, must match your NIN. If it doesn't, change it in <Link className="st2-linkbtn" to="/edit-profile">Edit profile</Link> first. {NAME_LOCK}
        </p>
      )}
      {!ninInstant && <p className="st2-muted" style={{ margin: 0, lineHeight: 1.55 }}>Our team checks your NIN, usually within a day. The name on your OgaPay account must match it. If it doesn't, change it in <Link className="st2-linkbtn" to="/edit-profile">Edit profile</Link> first. {NAME_LOCK}</p>}
      <label className="st2-f"><span>{want} (11 digits)</span>
        <input inputMode="numeric" autoComplete="off" value={num} maxLength={11} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="National Identification Number" required />
      </label>
      {/* Day, month, year: the date picker opened on today (ver-16); years start at 18 */}
      <fieldset className="st2-f st2-dob">
        <legend><span>Date of birth (as on your {want} record)</span></legend>
        <div className="st2-dob-row">
          <select aria-label="Day" value={dobD} onChange={(e) => setDobD(e.target.value)}>
            <option value="">Day</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <select aria-label="Month" value={dobM} onChange={(e) => setDobM(e.target.value)}>
            <option value="">Month</option>
            {DOB_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select aria-label="Year" value={dobY} onChange={(e) => setDobY(e.target.value)}>
            <option value="">Year</option>
            {dobYears().map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <small className="st2-muted">You must be {MIN_AGE} or older.</small>
      </fieldset>
      <ToneMsg m={ninMsg} />
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
      {manualReq?.status !== 'PENDING' && (
        <p className="st2-muted" style={{ margin: '10px 0 0' }}>
          Didit not working? <button type="button" className="st2-linkbtn" onClick={() => { setShowManual((v) => !v); setMMsg(null) }}>{showManual ? 'Hide' : 'Send your ID to our team instead'}</button>
        </p>
      )}
    </div>
  )

  // Level 2 by hand: a photo of the ID and its number, checked by our team
  const manualPanel = manualReq?.status === 'PENDING' ? (
    <div className="st2-banner"><i className="ti ti-hourglass" /> Your ID is with our team. We'll notify you when your Level 2 is checked. Your current level stays until then.</div>
  ) : (
    <form className="st2-panel st2-form" noValidate onSubmit={(e) => { e.preventDefault(); sendManual() }}>
      <strong>Get Level 2: send your ID to our team</strong>
      <p className="st2-muted" style={{ margin: '6px 0 0', lineHeight: 1.55 }}>
        Take a clear photo of {ANY_ID} and type its number. The photo must show the ID itself with your name and number readable. A selfie or a photo of your face is not an ID and will be rejected. Our team checks it by hand, usually within a day. Your photo is private and only our verification team can see it.
      </p>
      {manualReq?.status === 'REJECTED' && <div className="st2-warn"><i className="ti ti-alert-circle" aria-hidden="true" /><span>Your last request wasn't approved{manualReq.reason ? `: ${manualReq.reason}` : ''}. You can send a new photo.</span></div>}
      <label className="st2-f"><span>Type of ID</span>
        <select value={mType} onChange={(e) => setMType(e.target.value)}>
          <option value="NIN">National ID (NIN slip or card)</option>
          <option value="PASSPORT">International passport</option>
          <option value="DRIVERS_LICENSE">Driver's licence</option>
          <option value="VOTERS_CARD">Voter's card</option>
          <option value="GHANA_CARD">Ghana Card</option>
        </select>
      </label>
      <label className="st2-f"><span>{mType === 'NIN' ? 'NIN (11 digits)' : 'ID number'}</span>
        <input autoComplete="off" inputMode={mType === 'NIN' ? 'numeric' : undefined} value={mNumber} maxLength={40} onChange={(e) => setMNumber(e.target.value)} placeholder="The number on your ID" />
      </label>
      {/* Big photos are made smaller before sending, so no size limit to worry about */}
      <label className="st2-f"><span>Photo of your ID, not a selfie (JPG or PNG)</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setMFront(e.target.files?.[0] || null)} />
      </label>
      {mMsg && <p className={mMsg.ok ? 'st2-ok' : 'st2-err'}>{mMsg.text}</p>}
      <div className="st2-actions"><button className="up-btn primary" disabled={mBusy}>{mBusy ? mStep || 'Sending…' : 'Send for checking'}</button></div>
      {mBusy && <p className="st2-muted" style={{ margin: 0 }}>This can take a few minutes on slow mobile data. Please keep this page open.</p>}
    </form>
  )
  // Shown when they ask for it, or when Didit failed for them
  const manualWanted = tier < 2 && manualReq !== undefined && (manualReq?.status === 'PENDING' || showManual || (!!msg && !msg.ok))
  // On slow data, wait for the checks that are on and the member's ID request
  // before showing a form, so nobody sees the wrong one first (a Level 1 told
  // to ask for Level 3, a NIN form that turns into the bank form while typing) (ver-7)
  const ready = providers !== null && (tier >= 2 || manualReq !== undefined)

  return (
    <>
      {backTo && (
        <div className="st2-banner st2-back" role="status">
          <i className="ti ti-circle-check" aria-hidden="true" />
          <span>You're verified. Go back and take the job.</span>
          <Link className="up-btn primary" to={backTo} onClick={clearNext}><i className="ti ti-arrow-back-up" aria-hidden="true" /> {backTo.startsWith('/tasks/') ? 'Back to the job' : 'Go back'}</Link>
        </div>
      )}
      {/* Email by a code typed here (ver-11); a wallet account adds its email first */}
      {user && !user.isEmailVerified && (
        <Card title={user.hasEmail === false ? 'Add your email' : 'Verify your email'} sub={user.hasEmail === false
          ? 'For job alerts and payment receipts, and to sign in without your wallet.'
          : `We'll email a 6-digit code to ${user.email}. Type it here to verify your email.`}>
          <EmailCodeBox mode={user.hasEmail === false ? 'add' : 'verify'} email={user.email} />
        </Card>
      )}
      <Card title="Verify your identity" sub="You need this before you can withdraw your earnings or send money. Your details are private and never shown to other users.">
        {!ready ? <p className="st2-muted" role="status" style={{ margin: '6px 0 0' }}><i className="ti ti-loader-2" aria-hidden="true" /> Loading your verification…</p> : <>
        <div className="st2-levels">
          {levelsFor(didit, ninInstant, bankKyc).map((l) => {
            const done = tier >= l.tier
            const next = !done && l.tier === nextTier
            return (
              <div key={l.tier} className={`st2-level${done ? ' done' : next ? ' next' : ''}`}>
                <i className={`ti ${done ? 'ti-circle-check' : 'ti-circle-dashed'}`} />
                <div><strong>{l.name}: withdraw up to {naira(l.limit, 0)} a day</strong><span>{l.how}</span></div>
                {done && <em>Verified</em>}
              </div>
            )
          })}
        </div>
        <p className="st2-muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>{LIMIT_AND_PAYDAY} Any level lets you {UNLOCKS}. {SEND_RULE} Without a level you can still earn and add money by card or USSD.</p>
        {/* not while their ID photo is already with our team: the panel below says so */}
        {bankOnly && tier === 1 && manualReq?.status !== 'PENDING' && <div className="st2-banner"><i className="ti ti-info-circle" aria-hidden="true" /> {BANK_ONLY_NEXT}</div>}

        {status === 'REJECTED' && tier === 0 && (
          <div className="st2-banner"><i className="ti ti-alert-circle" /> Your last attempt wasn't approved{me.kyc?.rejectionReason ? `: ${me.kyc.rejectionReason}` : ''}. You can try again below.</div>
        )}

        {ghana && tier < 2 && !inReview ? (
          <>
            <p className="st2-muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>In Ghana? The bank account and NIN checks are for Nigeria, so send your Ghana Card (or passport) to our team for Level 2.</p>
            {manualReq !== undefined && manualPanel}
          </>
        ) : inReview && tier === 0 ? (
          <>
            <div className="st2-banner"><i className="ti ti-hourglass" /> {me.kyc?.provider === 'didit' ? "Your ID check is being reviewed." : 'Your NIN is with our team for review.'} We'll notify you when it's done.{bankPanel ? ' Or skip the wait with your bank account below.' : ''}</div>
            {msg && <p className={msg.ok ? 'st2-ok' : 'st2-err'}>{msg.text}</p>}
            {ninMsg?.tone !== 'wait' && <ToneMsg m={ninMsg} />}
            {me.kyc?.provider !== 'didit' && bankPanel}
          </>
        ) : bankPanel ? (
          <>
            {bankPanel}
            {useNin && ninForm}
            {useDidit && diditPanel}
            {manualWanted && manualPanel}
          </>
        ) : useDidit ? (
          <>
            {diditPanel}
            {manualWanted && manualPanel}
            {(useNin || ninInstant) && !diditOpen && tier === 0 && ninForm}
          </>
        ) : want ? ninForm : tier === 1 && manualReq !== undefined ? manualPanel : (
          <Row title="Need a higher limit?" sub="Ask our team for Level 3. No documents needed.">
            <Link className="up-btn" to="/support">Contact support</Link>
          </Row>
        )}
        </>}
      </Card>

      <Card id="human" title="Human verification" sub="Proves you're a real person (VeryAI palm scan). Some jobs require it, and it adds to your OgaScore.">
        <Row
          title="Status"
          sub={me.humanVerifiedAt ? <span className="st2-ok"><i className="ti ti-circle-check" /> Verified</span> : <span className="st2-muted">Not verified</span>}
        >
          {!me.humanVerifiedAt && (providers?.very
            ? <>
                <button className="up-btn primary" onClick={startHuman} disabled={humanBusy}>{humanBusy ? 'Opening VeryAI…' : 'Verify with VeryAI'}</button>
                <button className="up-btn" onClick={() => checkHuman()} disabled={humanChecking}>{humanChecking ? 'Checking…' : 'Check again'}</button>
              </>
            : <span className="st2-muted">{providers === null ? 'Loading…' : 'Coming soon'}</span>)}
        </Row>
        {humanPending && (
          <>
            {/* Said up front, with the stores (ver-12) */}
            <div className="st2-panel st2-very-app">
              <strong>You need the free VeryAI app</strong>
              <p className="st2-muted" style={{ margin: '4px 0 0', lineHeight: 1.55 }}>Install it on your phone before you start. Search for “VeryAI” if the store shows other apps.</p>
              <div className="st2-actions">
                <a className="up-btn" href={VERYAI_PLAY} target="_blank" rel="noopener noreferrer"><i className="ti ti-download" aria-hidden="true" /> Play Store (Android)</a>
                <a className="up-btn" href={VERYAI_APPSTORE} target="_blank" rel="noopener noreferrer"><i className="ti ti-download" aria-hidden="true" /> App Store (iPhone)</a>
              </div>
            </div>
            {/* Members found the scan hard to follow (2026-11-10): the whole trip, step by step */}
            <p className="st2-row-sub" style={{ margin: '6px 0 0' }}>How it works. It takes about 2 minutes and uses your phone's camera.</p>
            <ol className="st2-steps" style={{ margin: '6px 0 8px' }}>
              <li>Tap <b>Verify with VeryAI</b>. A VeryAI page opens.</li>
              <li>Open the <b>VeryAI</b> app when the page asks (install it first, see above).</li>
              <li>Hold your open hand in front of the camera, palm facing it, until the app says it's done.</li>
              <li>Come back to OgaPay. This page updates by itself. If it still says Not verified, tap <b>Check again</b>.</li>
            </ol>
          </>
        )}
        {humanPending && <ToneMsg m={humanMsg} />}
      </Card>

      {/* Many jobs are on X and need it connected (ver-18); skippable */}
      {!me.connections?.twitter?.connected && !xHidden && (
        <Card id="connect-x" title="Connect X for X jobs" sub="Many jobs are on X: follow, like, repost or comment. To take them, connect your X account first. It's free and takes a minute.">
          <div className="st2-actions">
            <button type="button" className="up-btn" onClick={hideX}>Not now</button>
            <Link className="up-btn primary" to="/settings/connections"><i className="ti ti-brand-x" aria-hidden="true" /> Connect X</Link>
          </div>
        </Card>
      )}
    </>
  )
}
