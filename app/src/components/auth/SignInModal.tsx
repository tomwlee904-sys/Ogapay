import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import bs58 from 'bs58'
import { useAuth } from '../../context/AuthContext'
import { API_BASE, apiRequest } from '../../lib/api'
import { supabase } from '../../lib/supabaseClient'
import { safeRedirect, type SignInView } from '../../lib/signin'
import { inWalletAppBrowser, isPhone, openInWalletUrl, PHONE_WALLET_LINE, WALLET_APP_SIGNIN_LINE } from '../../lib/walletApps'
import { trackSignUpConversion } from '../../lib/ads'
import { chromeIntentUrl, copyText, inAppBrowserName, isAndroid } from '../../lib/inAppBrowser'
import { RESEND_SECONDS, retryAfterOf, useResendTimer } from '../../lib/emailCode'
import { suggestEmail } from '../../lib/emailTypos'
import '../../styles/signin.css'

/* Sign-in dialog in the wurk.fun style: pick a method (wallet, Google, email,
   pair a device), then one short step for that method.
   Email (2026-11-11) is one field: we email a 6-digit code, and the code signs
   you in or makes your account. A new account then gets one short step (name,
   country, what brings you here); a new wallet account is asked for an email
   first. Password sign-in stays behind "Use a password instead". */

type View = SignInView | 'twofa' | 'password' | 'profile' | 'addemail'
type Notice = { text: string; ok?: boolean } | null

interface Props {
  initialView?: SignInView
  initialCode?: string
  initialNotice?: string
  /** Opens on the 2FA step with this challenge (Google sign-in, AuthCallback) */
  initialChallenge?: { token: string; userId: string }
  /** A new Google account's sign-in, held until its last step is done (AuthCallback) */
  initialPending?: any
  redirect?: string | null
  onClose: () => void
  onSignedIn: (isNewAccount: boolean) => void
}

const TITLES: Record<View, string> = {
  options: 'Sign in to OgaPay',
  wallets: 'Choose a Solana wallet',
  email: 'Continue with email',
  signup: 'Create your account',
  password: 'Sign in with a password',
  forgot: 'Reset your password',
  pair: 'Sign in on this device',
  twofa: 'Two-factor authentication',
  profile: 'One last step',
  addemail: 'Add your email',
}
const BACK: Partial<Record<View, View>> = { wallets: 'options', email: 'options', signup: 'options', password: 'email', forgot: 'password', pair: 'options', twofa: 'options' }

// Every sign-in endpoint answers { user, tokens }
const toSession = (r: any) => {
  const accessToken = r?.tokens?.accessToken || r?.accessToken || r?.token
  const refreshToken = r?.tokens?.refreshToken || r?.refreshToken || accessToken
  return { user: r?.user || r, tokens: accessToken ? { accessToken, refreshToken, rememberMe: r?.tokens?.rememberMe } : undefined }
}

const friendly = (msg = '') => {
  if (/route .*not found|cannot post/i.test(msg)) return "This sign-in option isn't available yet. Use email or Google for now."
  if (/user rejected|rejected the request|user denied/i.test(msg)) return 'You cancelled the request in your wallet.'
  if (/failed to fetch|network/i.test(msg)) return "Couldn't reach OgaPay. Check your connection and try again."
  // Email sign-in for an account made with Google (no password yet). Inside a
  // wallet app "sign in with Google" is no help, so point at Forgot password.
  if (/sign in with google or reset your password/i.test(msg)) return inWalletAppBrowser()
    ? "This account was made with Google and has no password yet. Tap Forgot password to set one, then sign in here."
    : "This account was made with Google and has no password yet. Go back and use Continue with Google, or tap Forgot password to set one."
  return msg || 'Something went wrong. Please try again.'
}

// Sign-up: "What brings you to OgaPay?" (saved as signupIntent; changes nothing
// a member can do, every account can earn and hire)
type Intent = 'EARN' | 'HIRE' | 'BOTH'
const INTENTS: { value: Intent; label: string; icon: string }[] = [
  { value: 'EARN', label: 'Earn money', icon: 'ti-coin' },
  { value: 'HIRE', label: 'Hire people', icon: 'ti-briefcase' },
  { value: 'BOTH', label: 'Both', icon: 'ti-arrows-exchange' },
]

// Names as people write them (login-19): "Tobi" stays "Tobi" (no last name made
// up, it used to become "Tobi Tobi") and initials like "Ada N" are fine
const splitName = (raw: string) => {
  const parts = raw.trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') }
}
const nameProblem = (raw: string) => {
  const t = raw.trim()
  if (!t) return 'Enter your name.'
  if (!/\p{L}/u.test(t)) return 'Your name needs at least one letter.'
  if (t.replace(/\s/g, '').length < 2) return 'Enter at least 2 letters, e.g. Tobi.'
  const { firstName, lastName } = splitName(t)
  if (firstName.length > 50 || lastName.length > 50) return 'That name is too long.'
  return null
}

// The country for a new account's last step: Ghana when this phone's clock is
// set to Ghana's time zone, else Nigeria (the person can change it; login-23)
const guessCountry = (): 'NG' | 'GH' => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Africa/Accra' ? 'GH' : 'NG' } catch { return 'NG' }
}
// The name a Google account came with ("Member" is the server's stand-in for none)
const pendingName = (p: any) => {
  const u = p?.user || {}
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return n === 'Member' ? '' : n
}

// Official icons, from each wallet's @solana/wallet-adapter package (Trust cropped to its shield)
interface WalletDef { id: string; name: string; icon: string; detect: () => any; install: string; openIn?: (url: string) => string }
const win = () => window as any
const WALLETS: WalletDef[] = [
  { id: 'phantom', name: 'Phantom', icon: '/wallets/phantom.svg', detect: () => (win().phantom?.solana?.isPhantom ? win().phantom.solana : null), install: 'https://phantom.app/download',
    openIn: (url) => openInWalletUrl('phantom', url) },
  { id: 'solflare', name: 'Solflare', icon: '/wallets/solflare.svg', detect: () => (win().solflare?.isSolflare ? win().solflare : null), install: 'https://solflare.com/download',
    openIn: (url) => openInWalletUrl('solflare', url) },
  { id: 'backpack', name: 'Backpack', icon: '/wallets/backpack.png', detect: () => win().backpack?.solana || (win().backpack?.isBackpack ? win().backpack : null), install: 'https://backpack.app/downloads',
    openIn: (url) => openInWalletUrl('backpack', url) },
  { id: 'trust', name: 'Trust Wallet', icon: '/wallets/trust.svg', detect: () => win().trustwallet?.solana || null, install: 'https://trustwallet.com/download' },
  { id: 'bitget', name: 'Bitget Wallet', icon: '/wallets/bitget.svg', detect: () => win().bitkeep?.solana || null, install: 'https://web3.bitget.com/en/wallet-download' },
]

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function Option({ icon, name, desc, tag, onClick, disabled }: { icon: ReactNode; name: string; desc: string; tag?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="si-opt" onClick={onClick} disabled={disabled}>
      <span className="si-opt-icon">{icon}</span>
      <span className="si-opt-info"><span className="si-opt-name">{name}</span><span className="si-opt-desc">{desc}</span></span>
      {tag ? <span className="si-opt-tag">{tag}</span> : <i className="ti ti-arrow-right si-opt-arrow" aria-hidden="true" />}
    </button>
  )
}

const Spinner = () => <span className="si-spin" aria-hidden="true" />

export default function SignInModal({ initialView = 'options', initialCode = '', initialNotice = '', initialChallenge, initialPending, redirect, onClose, onSignedIn }: Props) {
  const { login } = useAuth()
  const [view, setView] = useState<View>(initialView)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<Notice>(initialNotice ? { text: initialNotice } : null)

  const [email, setEmail] = useState(() => localStorage.getItem('ogapay_remember_email') || '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  // Ticked unless unticked last time: unticked = a short session (lib/api setShortSession)
  const [remember, setRemember] = useState(() => localStorage.getItem('ogapay_remember_off') !== '1')
  const [name, setName] = useState(() => pendingName(initialPending))
  const [country, setCountry] = useState<'NG' | 'GH'>(guessCountry)
  const [intent, setIntent] = useState<Intent | ''>('')
  const [code, setCode] = useState(initialCode.toUpperCase())
  const [challenge, setChallenge] = useState<{ token: string; userId: string } | null>(initialChallenge || null)
  const [otp, setOtp] = useState('')
  // 2FA step: a backup code (10 letters and numbers, from Settings > Security) instead of the app's code
  const [useBackup, setUseBackup] = useState(false)
  // Instagram, Facebook, X, Telegram, WhatsApp... built-in browsers: Google
  // refuses to sign in there, so we say so first and offer to open Chrome/Safari
  const [inApp] = useState(inAppBrowserName)
  const [inAppHelp, setInAppHelp] = useState(false)
  const [copied, setCopied] = useState(false)
  // Opened from a referral link (the code is kept for Google and email sign-up alike)
  const [invited] = useState(() => { try { return !!localStorage.getItem('ogapay_referral') } catch { return false } })
  // Email code: the 6-digit code, whether one was sent, and the wait before a new one
  const [mailCode, setMailCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const timer = useResendTimer()
  // A new account (email code or wallet) before its last step: signed in on the
  // server, but saved here only when the step is done or skipped (or the sheet is
  // closed), so the sheet stays open for it
  const [pending, setPending] = useState<any>(initialPending || null)
  // "Did you mean …?" for a mistyped email (login-21): the address it was shown
  // for; sending again with the same address sends it as typed
  const [typo, setTypo] = useState<{ typed: string; fix: string } | null>(null)
  // The last code check got no answer (slow data): its code may be used up
  const timedOut = useRef(false)
  // Checked again shortly after opening: some wallet apps add their wallet to
  // the page a moment after it loads
  const [inWalletApp, setInWalletApp] = useState(inWalletAppBrowser)
  useEffect(() => {
    const t = setTimeout(() => setInWalletApp(inWalletAppBrowser()), 800)
    return () => clearTimeout(t)
  }, [])

  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const closeRef = useRef(onClose)
  // Closing during a new account's last step keeps the account signed in
  closeRef.current = pending ? () => completePending() : onClose

  // Lock page scroll, close on Escape, keep Tab inside the dialog, restore focus after
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current() }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="-1"]')
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey); prevFocus?.focus?.() }
  }, [])

  // Each step puts the cursor in its first field, so the keyboard is ready
  // (login-26); steps with no field focus the title for screen readers
  useEffect(() => {
    const field = dialogRef.current?.querySelector<HTMLElement>('.si-body input:not([type="checkbox"]):not([type="radio"]):not([disabled]), .si-body select')
    ;(field || titleRef.current)?.focus()
  }, [view, codeSent])

  const go = (v: View) => { setError(''); setNotice(null); setView(v) }

  const finish = (result: any, isNew = false) => {
    if (result?.requiresTwoFactor && result?.challengeToken) {
      setChallenge({ token: result.challengeToken, userId: result.userId })
      setOtp('')
      setUseBackup(false)
      go('twofa')
      return
    }
    const session = toSession(result)
    if (!session.tokens) throw new Error('Sign-in did not return a session. Please try again.')
    login(session)
    onSignedIn(isNew)
  }

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError('')
    try { await fn() } catch (e: any) { setNotice(null); setError(friendly(e?.message)) } finally { setBusy('') }
  }

  // ── Methods ──────────────────────────────────────────────────────────────
  const google = (anyway = false) => run('google', async () => {
    if (inApp && !anyway) { setInAppHelp(true); return }
    // Back to the page it was opened on after Google, not always the dashboard
    // (login-14); on /login itself there is none and the dashboard opens
    const back = redirect || safeRedirect(window.location.pathname + window.location.search)
    if (back) sessionStorage.setItem('ogapay_after_login', back)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
      if (err) throw err
    } catch {
      window.location.href = `${API_BASE}/auth/google`
    }
  })

  const emailLogin = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    run('email', async () => {
      const result = await apiRequest<any>('/auth/login', { method: 'POST', auth: false, body: JSON.stringify({ email: email.trim(), password, rememberMe: remember }) })
      if (remember) { localStorage.setItem('ogapay_remember_email', email.trim()); localStorage.removeItem('ogapay_remember_off') }
      else { localStorage.removeItem('ogapay_remember_email'); localStorage.setItem('ogapay_remember_off', '1') }
      finish(result)
    })
  }

  // A brand-new account (email code or wallet): count the Google Ads sign-up
  // (only when the server just made it) and show its last step
  const referral = () => { try { return localStorage.getItem('ogapay_referral') || '' } catch { return '' } }
  const startNew = (result: any, next: 'profile' | 'addemail') => {
    if (!toSession(result).tokens) throw new Error('Sign-in did not return a session. Please try again.')
    try { localStorage.setItem('ogapay_is_new_user', 'true') } catch { /* private mode */ }
    trackSignUpConversion(result?.user?.id)
    setPending(result)
    setCodeSent(false); setMailCode('')
    go(next)
  }
  // The new account's own token, before it's saved on this device
  const asNew = () => ({ Authorization: `Bearer ${toSession(pending).tokens?.accessToken || ''}` })
  const completePending = () => {
    const r = pending
    setPending(null)
    if (r) finish(r, true)
  }

  const forgot = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Enter the email on your account.'); return }
    run('forgot', async () => {
      await apiRequest('/auth/forgot-password', { method: 'POST', auth: false, body: JSON.stringify({ email: email.trim() }) })
      setNotice({ text: 'If that email has an account, a reset link is on its way. Check your inbox.', ok: true })
    })
  }

  // Email: one field, then the code. The server gives the same answer whether or
  // not the email has an account (auth/email-code/request); the code signs in or
  // makes the account. addemail: a new wallet account adds its email the same way.
  const sendMailCode = (e?: FormEvent) => {
    e?.preventDefault()
    const to = email.trim()
    if (!to) { setError('Enter your email address.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { setError('Check your email address. It should look like name@example.com.'); return }
    const fix = suggestEmail(to)
    if (fix && typo?.typed !== to) { setError(''); setTypo({ typed: to, fix }); return }
    setTypo(null)
    run('mailcode', async () => {
      try {
        if (view === 'addemail') await apiRequest('/auth/email/add/request', { method: 'POST', auth: false, headers: asNew(), body: JSON.stringify({ email: to }) })
        else await apiRequest('/auth/email-code/request', { method: 'POST', auth: false, body: JSON.stringify({ email: to }) })
      } catch (err: any) {
        // "We just sent a code": show the code box with the server's reason and
        // how long to wait (login-28)
        const wait = retryAfterOf(err)
        if (wait) { timer.wait(wait); setCodeSent(true) }
        throw err
      }
      setCodeSent(true)
      setMailCode('')
      timedOut.current = false
      timer.wait(RESEND_SECONDS)
      setNotice({ text: `We sent a 6-digit code to ${to}. It works for 10 minutes. Not there? Check your spam folder.`, ok: true })
    })
  }

  const mailCodeLogin = (e: FormEvent) => {
    e.preventDefault()
    if (mailCode.length !== 6) { setError('Enter the 6-digit code from the email.'); return }
    if (view === 'addemail') {
      run('mailcodein', async () => {
        const r = await apiRequest<any>('/auth/email/add/confirm', { method: 'POST', auth: false, headers: asNew(), body: JSON.stringify({ email: email.trim(), code: mailCode }) })
        setPending((p: any) => ({ ...p, user: { ...(p?.user || {}), email: r?.email || email.trim(), hasEmail: true, isEmailVerified: true } }))
        go('profile')
        setNotice({ text: 'Email added. You can now sign in with it too.', ok: true })
      })
      return
    }
    run('mailcodein', async () => {
      const ref = referral()
      // Slow data (login-11): a longer wait, and a lost answer is explained. The
      // code may already have made the account and be used up; a new code then
      // signs in, where retrying the old one only said "wrong code".
      let result: any
      try {
        result = await apiRequest<any>('/auth/email-code/verify', {
          method: 'POST', auth: false, timeoutMs: 30000, body: JSON.stringify({ email: email.trim(), code: mailCode, ...(ref && { referralCode: ref }) }),
        })
      } catch (err: any) {
        if (/timed out|failed to fetch|network/i.test(err?.message || '')) { timedOut.current = true; throw new Error('Your connection dropped before we heard back. Tap Send a new code and enter it: it signs you in, even if your account was just made.') }
        if (timedOut.current && err?.status === 401) throw new Error('That code was probably used when your connection dropped. Tap Send a new code and enter the new one.')
        throw err
      }
      try { localStorage.setItem('ogapay_remember_email', email.trim()) } catch { /* private mode */ }
      if (result?.isNewUser) startNew(result, 'profile')
      else finish(result)
    })
  }

  // The new account's last step: name, country and what brings them here.
  // Skip is fine; the dashboard asks again later.
  const saveProfile = (e: FormEvent) => {
    e.preventDefault()
    const problem = nameProblem(name)
    if (problem) { setError(problem); return }
    const { firstName, lastName } = splitName(name)
    run('profile', async () => {
      await apiRequest('/users/me', { method: 'PATCH', auth: false, headers: asNew(), body: JSON.stringify({ firstName, lastName, country, ...(intent && { signupIntent: intent }) }) })
      completePending()
    })
  }

  // Skip: nothing is saved, except Ghana (an account starts as Nigeria, and a
  // Ghanaian skipping shouldn't be treated as Nigerian; login-23)
  const skipProfile = () => {
    if (country === 'NG') { completePending(); return }
    run('profile', async () => {
      try { await apiRequest('/users/me', { method: 'PATCH', auth: false, headers: asNew(), body: JSON.stringify({ country }) }) } catch { /* set later in Settings */ }
      completePending()
    })
  }

  const pairLogin = (e: FormEvent) => {
    e.preventDefault()
    const c = code.replace(/[\s-]/g, '')
    if (c.length !== 25) { setError('Enter the full 25-character code.'); return }
    run('pair', async () => finish(await apiRequest<any>('/auth/pair', { method: 'POST', auth: false, body: JSON.stringify({ code: c }) })))
  }

  const verifyOtp = (e: FormEvent) => {
    e.preventDefault()
    if (!challenge) { setError('This sign-in expired. Please start again.'); return }
    if (!useBackup && otp.length < 6) { setError('Enter the 6-digit code.'); return }
    if (useBackup && otp.replace(/-/g, '').length < 10) { setError('Enter the 10-character backup code.'); return }
    run('otp', async () => finish(await apiRequest<any>('/auth/2fa/challenge', {
      method: 'POST', auth: false,
      body: JSON.stringify({ challengeToken: challenge.token, userId: challenge.userId, token: otp }),
    })))
  }

  const walletLogin = (w: WalletDef) => run(`wallet:${w.id}`, async () => {
    const provider = w.detect()
    if (!provider) throw new Error(`${w.name} isn't available in this browser.`)
    const connected = await provider.connect()
    const wallet = (connected?.publicKey || provider.publicKey)?.toString()
    if (!wallet) throw new Error("The wallet didn't share an address.")
    const { message } = await apiRequest<any>('/wallet/nonce', { method: 'POST', auth: false, body: JSON.stringify({ wallet }) })
    setNotice({ text: `Approve the message in ${w.name}. Signing is free and doesn't move any funds.`, ok: true })
    const signed = await provider.signMessage(new TextEncoder().encode(message), 'utf8')
    const bytes = signed?.signature ?? signed
    const signature = bs58.encode(bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes))
    setNotice(null)
    // A wallet no account uses yet makes a new account (login-17), then asks for an email
    const ref = referral()
    const result = await apiRequest<any>('/auth/wallet/login', { method: 'POST', auth: false, body: JSON.stringify({ wallet, signature, ...(ref && { referralCode: ref }) }) })
    if (result?.isNewUser) startNew(result, result.needsEmail ? 'addemail' : 'profile')
    else finish(result)
  })

  const pickWallet = (w: WalletDef) => {
    if (w.detect()) { walletLogin(w); return }
    if (isPhone() && w.openIn) { window.location.href = w.openIn(window.location.href); return }
    window.open(w.install, '_blank', 'noopener')
  }

  // ── Views ────────────────────────────────────────────────────────────────
  const errorLine = error && <p className="si-error" role="alert">{error}</p>
  const noticeLine = notice && <p className={`si-notice${notice.ok ? ' ok' : ''}`} role="status">{notice.text}</p>
  const legal = <p className="si-legal">By continuing you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
  const back = BACK[view]
  const copyLink = async () => {
    const done = await copyText(window.location.href)
    setCopied(done)
    if (!done) setError(`Couldn't copy. Open the ${inApp} menu (⋮ or ···) and choose Open in browser.`)
  }
  // Shown before Google inside an app's built-in browser
  const inAppNote = inApp && (
    <div className="si-notice ok" role="note" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span>Google sign-in doesn't work inside {inApp === 'an app' ? "this app's browser" : `${inApp}'s browser`}. Open OgaPay in {isAndroid() ? 'Chrome' : 'Safari or Chrome'} to use Google: tap the menu (⋮ or ···) and choose Open in browser, or copy the link and paste it there. Email sign-in works here.</span>
      <button type="button" className="si-secondary" onClick={copyLink}><i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} aria-hidden="true" /> {copied ? 'Link copied. Paste it in your browser' : 'Copy link'}</button>
      {isAndroid() && <a className="si-secondary" href={chromeIntentUrl()} style={{ textDecoration: 'none' }}><i className="ti ti-external-link" aria-hidden="true" /> Open in Chrome</a>}
      {inAppHelp && <button type="button" className="si-link" style={{ alignSelf: 'center', minHeight: 40 }} onClick={() => google(true)}>Try Google here anyway</button>}
    </div>
  )

  let body: ReactNode = null
  if (view === 'options') {
    // Inside a wallet app (after "Open in Phantom" and the like) Google refuses
    // to sign in, so Email comes first and Google says it likely won't work
    const googleOption = (
      <Option name="Continue with Google" disabled={busy === 'google'} onClick={() => google()}
        desc={inWalletApp ? "Usually doesn't work inside wallet apps" : inApp ? "Doesn't work in this app's browser" : 'Sign in or create an account with your Google account'}
        icon={busy === 'google' ? <Spinner /> : <GoogleIcon />} />
    )
    body = (
      <>
        <p className="si-desc">Choose how you want to sign in or create your OgaPay account.</p>
        {inWalletApp && <p className="si-notice ok" role="note">{WALLET_APP_SIGNIN_LINE}</p>}
        {!inWalletApp && inAppNote}
        {noticeLine}{errorLine}
        <div className="si-options">
          <Option name="Continue with wallet" desc="Phantom, Solflare, Backpack and more" onClick={() => go('wallets')}
            icon={<span className="si-wgrid" aria-hidden="true">{WALLETS.slice(0, 4).map(w => <img key={w.id} src={w.icon} alt="" />)}</span>} />
          {!inWalletApp && !inApp && googleOption}
          <Option name="Email" desc="Sign in or create an account with your email" onClick={() => go('email')}
            icon={<i className="ti ti-mail" aria-hidden="true" />} />
          {(inWalletApp || inApp) && googleOption}
          <Option name="Pair devices" desc="Signed in on another device? Pair this one with a code" onClick={() => go('pair')}
            icon={<i className="ti ti-devices" aria-hidden="true" />} />
        </div>
        {legal}
      </>
    )
  } else if (view === 'wallets') {
    body = (
      <>
        <p className="si-desc">Sign a free message with your Solana wallet. No transaction is sent. New here? Signing makes your OgaPay account.</p>
        {/* Phone browsers never see the wallet apps; their rows open OgaPay inside the app instead */}
        {isPhone() && !WALLETS.some(w => w.detect()) && <p className="si-notice ok" role="note">{PHONE_WALLET_LINE}</p>}
        {noticeLine}{errorLine}
        <div className="si-options">
          {WALLETS.map(w => {
            const found = !!w.detect()
            const running = busy === `wallet:${w.id}`
            return (
              <Option key={w.id} name={w.name} disabled={!!busy}
                desc={running ? 'Waiting for your wallet…' : found ? 'Detected in this browser' : isPhone() && w.openIn ? `Open in ${w.name}` : 'Not detected in this browser. Get it'}
                tag={found && !running ? 'Detected' : undefined}
                icon={running ? <Spinner /> : <img className="si-wlogo" src={w.icon} alt="" aria-hidden="true" />}
                onClick={() => pickWallet(w)} />
            )
          })}
        </div>
        <p className="si-hint">Already have an account with email or Google? Sign in that way first, then connect your wallet in Settings, so you don't get a second account.</p>
      </>
    )
  } else if (view === 'email' || view === 'signup' || view === 'addemail') {
    const adding = view === 'addemail'
    body = !codeSent ? (
      <form className="si-form" onSubmit={sendMailCode} noValidate>
        <p className="si-desc">{adding
          ? 'Your account is ready. Add your email to get payment receipts and to sign in without your wallet.'
          : `${invited ? 'A friend invited you. ' : ''}${view === 'signup' ? 'Earn from tasks, hire people and sell in the store. ' : ''}We'll email you a 6-digit code. It signs you in, or creates your account if you're new. No password needed.`}</p>
        {/* Referral links open sign-up: Google is one tap too, and keeps the invite (AuthCallback sends the code) */}
        {view === 'signup' && !inWalletApp && (
          <>
            {inAppHelp && inAppNote}
            <button type="button" className="si-secondary" disabled={busy === 'google'} onClick={() => google()}>
              {busy === 'google' ? <Spinner /> : <span style={{ width: 18, height: 18, display: 'inline-flex' }}><GoogleIcon /></span>} Continue with Google
            </button>
            {inApp && !inAppHelp && <p className="si-hint" style={{ margin: 0 }}>Google doesn't work in this app's browser. Tap the button to see how to open OgaPay in your browser.</p>}
            <p className="si-switch" style={{ margin: 0 }}>or use your email</p>
          </>
        )}
        {noticeLine}
        <div className="si-field">
          <label htmlFor="si-email">Email address</label>
          <input id="si-email" className="si-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setTypo(null) }} />
        </div>
        {typo && (
          <div className="si-notice" role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Did you mean <b>{typo.fix}</b>?</span>
            <div className="si-row">
              <button type="button" className="si-link" style={{ minHeight: 40 }} onClick={() => { setEmail(typo.fix); setTypo(null) }}>Yes, use {typo.fix.slice(typo.fix.lastIndexOf('@'))}</button>
              <button type="button" className="si-link" style={{ minHeight: 40 }} onClick={() => sendMailCode()}>No, send to what I typed</button>
            </div>
          </div>
        )}
        {errorLine}
        <button type="submit" className="si-primary" disabled={busy === 'mailcode'}>{busy === 'mailcode' ? <><Spinner /> Sending…</> : 'Send code'}</button>
        {adding
          ? <button type="button" className="si-link" style={{ alignSelf: 'center', minHeight: 40 }} onClick={() => go('profile')}>Skip for now</button>
          : <p className="si-switch"><button type="button" className="si-link" style={{ minHeight: 40 }} onClick={() => go('password')}>Use a password instead</button></p>}
        {view === 'signup' && legal}
      </form>
    ) : (
      <form className="si-form" onSubmit={mailCodeLogin} noValidate>
        {noticeLine}
        <p className="si-desc">Enter the code we sent to <b>{email.trim()}</b>.</p>
        <div className="si-field">
          <label htmlFor="si-mailcode">6-digit code</label>
          <input id="si-mailcode" className="si-input otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
            value={mailCode} onChange={e => setMailCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </div>
        {errorLine}
        <button type="submit" className="si-primary" disabled={busy === 'mailcodein' || mailCode.length !== 6}>{busy === 'mailcodein' ? <><Spinner /> Checking…</> : adding ? 'Add email' : 'Continue'}</button>
        <div className="si-row">
          <button type="button" className="si-link" style={{ minHeight: 40 }} onClick={() => { setCodeSent(false); setNotice(null); setError('') }}>Use another email</button>
          <button type="button" className="si-link" style={{ minHeight: 40 }} disabled={busy === 'mailcode' || timer.left > 0} onClick={() => sendMailCode()}>{timer.label}</button>
        </div>
        <p className="si-hint">After 5 wrong tries the code stops working and you need a new one.</p>
        {adding && <button type="button" className="si-link" style={{ alignSelf: 'center', minHeight: 40 }} onClick={() => go('profile')}>Skip for now</button>}
      </form>
    )
  } else if (view === 'profile') {
    body = (
      <form className="si-form" onSubmit={saveProfile} noValidate>
        <p className="si-desc">Your account is ready. Tell us a little about you. You can change this later.</p>
        {noticeLine}
        <div className="si-field">
          <label htmlFor="si-name">Your name</label>
          <input id="si-name" className="si-input" autoComplete="name" placeholder="e.g. Ada Okafor" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="si-field">
          <label htmlFor="si-country">Where do you live?</label>
          <select id="si-country" className="si-input" value={country} onChange={e => setCountry(e.target.value as 'NG' | 'GH')}>
            <option value="NG">Nigeria</option>
            <option value="GH">Ghana</option>
          </select>
        </div>
        <fieldset className="si-intent">
          <legend className="si-label">What brings you to OgaPay?</legend>
          <div className="si-intent-opts">
            {INTENTS.map((o) => (
              <label key={o.value} className={`si-intent-opt${intent === o.value ? ' on' : ''}`}>
                <input type="radio" name="si-intent" value={o.value} checked={intent === o.value} onChange={() => { setIntent(o.value); setError('') }} />
                <i className={`ti ${o.icon}`} aria-hidden="true" />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
          <p className="si-hint">You can do both either way. This helps us show you the right things first.</p>
        </fieldset>
        {errorLine}
        <button type="submit" className="si-primary" disabled={busy === 'profile'}>{busy === 'profile' ? <><Spinner /> Saving…</> : 'Continue'}</button>
        <button type="button" className="si-link" style={{ alignSelf: 'center', minHeight: 40 }} disabled={busy === 'profile'} onClick={skipProfile}>Skip for now</button>
      </form>
    )
  } else if (view === 'password') {
    body = (
      <form className="si-form" onSubmit={emailLogin} noValidate>
        <p className="si-desc">Sign in with the email and password on your OgaPay account.</p>
        {noticeLine}
        <div className="si-field">
          <label htmlFor="si-email">Email address</label>
          <input id="si-email" className="si-input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="si-field">
          <label htmlFor="si-pw">Password</label>
          <div className="si-pw">
            <input id="si-pw" className="si-input" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="si-eye" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}><i className={`ti ti-eye${showPw ? '-off' : ''}`} /></button>
          </div>
        </div>
        <div className="si-row">
          <label className="si-check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me</label>
          <button type="button" className="si-link" onClick={() => go('forgot')}>Forgot password?</button>
        </div>
        {errorLine}
        <button type="submit" className="si-primary" disabled={busy === 'email'}>{busy === 'email' ? <><Spinner /> Signing in…</> : 'Sign in'}</button>
        <button type="button" className="si-secondary" onClick={() => { setCodeSent(false); go('email') }}>
          <i className="ti ti-mail" aria-hidden="true" /> Email me a code instead
        </button>
        <p className="si-switch">New to OgaPay? <button type="button" className="si-link" onClick={() => { setCodeSent(false); go('email') }}>Get a code to join</button></p>
      </form>
    )
  } else if (view === 'forgot') {
    body = (
      <form className="si-form" onSubmit={forgot} noValidate>
        <p className="si-desc">Enter the email on your account and we'll send you a link to set a new password.</p>
        {noticeLine}
        <div className="si-field">
          <label htmlFor="si-email3">Email address</label>
          <input id="si-email3" className="si-input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        {errorLine}
        <button type="submit" className="si-primary" disabled={busy === 'forgot'}>{busy === 'forgot' ? <><Spinner /> Sending…</> : 'Send reset link'}</button>
      </form>
    )
  } else if (view === 'pair') {
    const n = code.replace(/[\s-]/g, '').length
    body = (
      <form className="si-form" onSubmit={pairLogin} noValidate>
        <p className="si-desc">Use a temporary code from a device where you're already signed in.</p>
        <div className="si-field">
          <label htmlFor="si-code">Pairing code</label>
          <input id="si-code" className="si-input code" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} maxLength={31}
            placeholder="Your 25-character code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
          <p className="si-hint" style={{ marginTop: 0 }}>{n}/25 characters</p>
        </div>
        {errorLine}
        <button type="submit" className="si-primary" disabled={busy === 'pair' || n !== 25}>{busy === 'pair' ? <><Spinner /> Signing in…</> : <>Sign in <i className="ti ti-arrow-right" /></>}</button>
        <p className="si-hint">Codes expire after 5 minutes and can be used once.</p>
        <ol className="si-steps" aria-label="How to get a pairing code">
          <li><i>01</i><b>Use your signed-in device</b><span>Open OgaPay on a phone or computer where you're already signed in.</span></li>
          <li><i>02</i><b>Create a code</b><span>Go to Pair a device (/pair-device) and select Create code.</span></li>
          <li><i>03</i><b>Sign in here</b><span>Enter the code on this device, or scan its QR code.</span></li>
        </ol>
      </form>
    )
  } else if (view === 'twofa') {
    body = (
      <form className="si-form" onSubmit={verifyOtp} noValidate>
        <p className="si-desc">{useBackup
          ? 'Enter one of the backup codes you saved when you turned on 2FA. Each code works once.'
          : 'Enter the 6-digit code from your authenticator app to finish signing in.'}</p>
        <div className="si-field">
          <label htmlFor="si-otp">{useBackup ? 'Backup code' : 'Authentication code'}</label>
          {useBackup ? (
            <input key="backup" id="si-otp" className="si-input code" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} maxLength={12} placeholder="A1B2C3D4E5"
              value={otp} onChange={e => setOtp(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12))} />
          ) : (
            <input key="app" id="si-otp" className="si-input otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
              value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          )}
        </div>
        {errorLine}
        <button type="submit" className="si-primary" disabled={busy === 'otp' || (useBackup ? otp.replace(/-/g, '').length < 10 : otp.length < 6)}>{busy === 'otp' ? <><Spinner /> Verifying…</> : 'Verify and sign in'}</button>
        <button type="button" className="si-secondary" onClick={() => { setUseBackup((b) => !b); setOtp(''); setError('') }}>
          <i className={`ti ${useBackup ? 'ti-device-mobile' : 'ti-key'}`} aria-hidden="true" /> {useBackup ? 'Use the code from my app' : 'Lost your phone? Use a backup code'}
        </button>
        {useBackup && <p className="si-hint">No backup codes? Email <a className="si-link" href="mailto:support@ogapay.app">support@ogapay.app</a> from your account's email address.</p>}
      </form>
    )
  }

  return (
    <div className="si-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeRef.current() }}>
      <div className="si-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="si-title">
        <div className="si-head">
          <div className="si-head-left">
            {back && <button type="button" className="si-back" onClick={() => go(back)} aria-label="Back"><i className="ti ti-arrow-left" /></button>}
            <h3 id="si-title" className="si-title" ref={titleRef} tabIndex={-1}>{TITLES[view]}</h3>
          </div>
          <button type="button" className="si-close" onClick={() => closeRef.current()} aria-label="Close"><i className="ti ti-x" /></button>
        </div>
        <div className="si-body">{body}</div>
      </div>
    </div>
  )
}
