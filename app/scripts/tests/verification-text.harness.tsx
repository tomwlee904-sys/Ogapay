// Test page for verification-text.test.cjs: the real Settings → Verification
// section and the real Send money / tip modal, with the real lib/api apiRequest.
// window.fetch is a fake server answering like the backend (kyc.service,
// bankKyc.service, veryai.service, /auth/me kyc.idVerified), so nothing leaves the page.
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import Verification from 'verification-under-test'
// @ts-ignore resolved by esbuild alias
import TransferModal from 'transfer-under-test'
// @ts-ignore resolved by esbuild alias
import { ToastProvider } from 'toast-under-test'

const w = window as any
const reply = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any, message = 'OK') => reply(200, { success: true, message, data })

const base = { id: 'u1', firstName: 'Ada', lastName: 'Obi', username: 'ada', email: 'ada@test.io', country: 'NG', humanVerifiedAt: null }
const kyc = (status: string, kycTier: number, provider: string | null, idType: string | null) => ({ status, kycTier, provider, idType, rejectionReason: null })
const WAITING = "VeryAI hasn't confirmed your scan yet. Tap Check again in a minute."
const OLD_FAIL = "Your last check didn't go through: VeryAI said no. Tap Verify with VeryAI to start a new check."
const OTHER_ACCOUNT = 'The palm scan saved in this browser was for a different OgaPay account. Sign in to that account here to finish it.'
const SENT = "Sent. Our team checks your NIN, usually within a day. We'll notify you when it's done."

type Case = { me?: any; providers?: any; user?: any; transfer?: any; very?: (n: number) => any; manual?: any }
const CASES: Record<string, Case> = {
  // Settings → Verification
  bank0: { me: { ...base, kyc: null }, providers: { bankKyc: true } },
  nin0: { me: { ...base, kyc: null }, providers: {} },
  bank0NoName: { me: { ...base, firstName: '', lastName: '', kyc: null }, providers: { bankKyc: true } },
  ninInstant0: { me: { ...base, kyc: null }, providers: { ninInstant: true } },
  bank1: { me: { ...base, kyc: kyc('APPROVED', 1, 'bank-name', 'BANK') }, providers: { bankKyc: true } },
  nin1: { me: { ...base, kyc: kyc('APPROVED', 1, 'admin', 'NIN') }, providers: { bankKyc: true } },
  // bank Level 1 whose ID photo (Level 2) is already with our team
  bank1Pending: { me: { ...base, kyc: kyc('APPROVED', 1, 'bank-name', 'BANK') }, providers: { bankKyc: true }, manual: { id: 'm1', status: 'PENDING', createdAt: '2026-11-10T09:00:00Z' } },
  // VeryAI: this browser holds another account's claim (veryai.service claim 'other-account', tone 'info')
  veryOther: { me: { ...base, kyc: null }, providers: { very: true }, very: () => ({ verified: false, claim: 'other-account', check: { status: 'NONE', message: '', tone: 'info' }, message: OTHER_ACCOUNT, tone: 'info' }) },
  // VeryAI: quiet look on opening, then "Check again"
  veryWait: { me: { ...base, kyc: null }, providers: { very: true }, very: () => ({ verified: false, check: { status: 'CODE_RECEIVED', message: WAITING, tone: 'waiting' }, message: WAITING, tone: 'waiting' }) },
  veryFail: { me: { ...base, kyc: null }, providers: { very: true }, very: (n) => n === 1
    ? { verified: false, check: { status: 'FAILED', message: OLD_FAIL, tone: 'failed' }, message: OLD_FAIL, tone: 'failed' }
    : { verified: false, check: { status: 'FAILED', message: OLD_FAIL, tone: 'failed' }, message: OLD_FAIL, tone: 'failed' } },
  veryOld: { me: { ...base, kyc: null }, providers: { very: true }, very: () => ({ verified: false, check: { status: 'STARTED', message: 'VeryAI hasn\'t sent your result to OgaPay yet.' }, message: 'VeryAI hasn\'t sent your result to OgaPay yet.' }) },
  veryDown: { me: { ...base, kyc: null }, providers: { very: true }, very: (n) => (n === 1 ? { verified: false, check: { status: 'NONE', message: '' }, message: '', tone: 'info' } : 'down') },
  // Send money / tips (the user is /auth/me's shape)
  sendBank: { user: { ...base, kycStatus: 'APPROVED', kycTier: 1, kyc: { status: 'APPROVED', kycTier: 1, idVerified: false } }, transfer: {} },
  sendNin: { user: { ...base, kycStatus: 'APPROVED', kycTier: 1, kyc: { status: 'APPROVED', kycTier: 1, idVerified: true } }, transfer: {} },
  sendNone: { user: { ...base, kycStatus: null, kycTier: 0, kyc: { status: null, kycTier: 0, idVerified: false } }, transfer: {} },
  // The cached user (AuthContext getStoredUser) or the login user: kycStatus + kycTier, no kyc details
  sendCachedL1: { user: { ...base, kycStatus: 'APPROVED', kycTier: 1 }, transfer: {} },
  sendCachedL2: { user: { ...base, kycStatus: 'APPROVED', kycTier: 2 }, transfer: {} },
  tipWorkBank: { user: { ...base, kycStatus: 'APPROVED', kycTier: 1, kyc: { status: 'APPROVED', kycTier: 1, idVerified: false } }, transfer: { tip: true, submissionId: 's1', to: { id: 'u2', username: 'tunde', firstName: 'Tunde', lastName: 'Bello' } } },
}
const name = new URLSearchParams(location.search).get('case') || 'bank0'
const c = CASES[name]
w.__user = c.user || c.me
w.__calls = []
w.__veryN = 0
w.__nin = 'sent'
// The claim key VeryCallback leaves in this browser (Verification VERY_CLAIM_KEY)
try { if (name === 'veryOther') localStorage.setItem('ogapay_very_claim', 'k'.repeat(43)); else localStorage.removeItem('ogapay_very_claim') } catch { /* no storage */ }

w.fetch = async (url: string, init: RequestInit = {}) => {
  const p = new URL(String(url)).pathname.replace(/^\/api\/v1/, '')
  const method = String(init.method || 'GET').toUpperCase()
  w.__calls.push({ path: p, method, body: init.body })
  if (p === '/kyc/level2/manual') return ok({ request: c.manual || null })
  if (p === '/wallet/banks/list') return ok([{ code: '058', name: 'GTBank' }])
  if (p === '/wallet/balance') return ok({ NGN: { available: 2500 } })
  if (p === '/kyc/submit' && method === 'POST') {
    if (w.__nin === 'bad') return reply(400, { success: false, message: "That isn't a real NIN. Check the number and try again." })
    return ok({ status: 'SUBMITTED', tier: 0, level: 0, message: SENT })
  }
  if (p === '/social/very/check' || p === '/social/very/status') {
    w.__veryN += 1
    const r = c.very?.(w.__veryN)
    if (r === 'down') return Promise.reject(new TypeError('Failed to fetch'))
    return ok(r)
  }
  return reply(404, { success: false, message: 'not stubbed: ' + p })
}

function App() {
  if (c.transfer) return <TransferModal onClose={() => { w.__closed = true }} {...c.transfer} />
  return <Verification me={c.me} setMe={() => {}} reload={async () => { w.__reloads = (w.__reloads || 0) + 1 }} providers={c.providers} />
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/settings/verification']}><ToastProvider><div id="ready" /><App /></ToastProvider></MemoryRouter>,
)
