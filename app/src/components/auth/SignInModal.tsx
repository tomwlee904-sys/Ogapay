import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import bs58 from 'bs58'
import { useAuth } from '../../context/AuthContext'
import { API_BASE, apiRequest } from '../../lib/api'
import type { SignInView } from '../../lib/signin'
import { inWalletAppBrowser, isPhone, openInWalletUrl, PHONE_WALLET_LINE, WALLET_APP_SIGNIN_LINE } from '../../lib/walletApps'
import '../../styles/signin.css'

/* Sign-in dialog in the wurk.fun style: pick a method (wallet, Google, email,
   pair a device), then one short step for that method. */

type View = SignInView | 'twofa' | 'emailcode'
type Notice = { text: string; ok?: boolean } | null

interface Props {
  initialView?: SignInView
  initialCode?: string
  initialNotice?: string
  redirect?: string | null
  onClose: () => void
  onSignedIn: (isNewAccount: boolean) => void
}

const TITLES: Record<View, string> = {
  options: 'Sign in or create an account',
  wallets: 'Choose a Solana wallet',
  email: 'Sign in with email',
  signup: 'Create your account',
  forgot: 'Reset your password',
  pair: 'Sign in on this device',
  twofa: 'Two-factor authentication',
  emailcode: 'Sign in with an email code',
}
const BACK: Partial<Record<View, View>> = { wallets: 'options', email: 'options', signup: 'options', forgot: 'email', pair: 'options', twofa: 'options', emailcode: 'email' }

// Every sign-in endpoint answers { user, tokens }
const toSession = (r: any) => {
  const accessToken = r?.tokens?.accessToken || r?.accessToken || r?.token
  const refreshToken = r?.tokens?.refreshToken || r?.refreshToken || accessToken
  return { user: r?.user || r, tokens: accessToken ? { accessToken, refreshToken } : undefined }
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

// Sign-up: what's wrong with a password, in plain words (null when it's fine)
const passwordProblem = (pw: string) =>
  pw.length < 8 ? 'Use at least 8 characters for your password.'
    : !/[A-Z]/.test(pw) ? 'Add at least one capital letter (A–Z) to your password.'
    : !/[0-9]/.test(pw) ? 'Add at least one number (0–9) to your password.'
    : null

// A username the server accepts (3–30 letters, numbers or _) from an email:
// "kemi.adeyemi+jobs@x.com" → "kemi_adeyemi_jobs". `extra` adds 4 digits.
const usernameFrom = (email: string, extra = false) => {
  let u = email.trim().split('@')[0].toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  if (u.length < 3) u = (u ? u + '_' : '') + 'user'
  u = u.slice(0, extra ? 25 : 30)
  return extra ? `${u}${Math.floor(1000 + Math.random() * 9000)}` : u
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

function Option({ icon, name, desc, tag, onClick, disabled, primary }: { icon: ReactNode; name: string; desc: string; tag?: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button type="button" className={`si-opt${primary ? ' primary' : ''}`} onClick={onClick} disabled={disabled}>
      <span className="si-opt-icon">{icon}</span>
      <span className="si-opt-info"><span className="si-opt-name">{name}</span><span className="si-opt-desc">{desc}</span></span>
      {tag ? <span className="si-opt-tag">{tag}</span> : <i className="ti ti-arrow-right si-opt-arrow" aria-hidden="true" />}
    </button>
  )
}

const Spinner = () => <span className="si-spin" aria-hidden="true" />

export default function SignInModal({ initialView = 'options', initialCode = '', initialNotice = '', redirect, onClose, onSignedIn }: Props) {
  const { login } = useAuth()
  const [view, setView] = useState<View>(initialView)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<Notice>(initialNotice ? { text: initialNotice } : null)

  const [email, setEmail] = useState(() => localStorage.getItem('ogapay_remember_email') || '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(() => !!localStorage.getItem('ogapay_remember_email'))
  const [name, setName] = useState('')
  const [code, setCode] = useState(initialCode.toUpperCase())
  const [challenge, setChallenge] = useState<{ token: string; userId: string } | null>(null)
  const [otp, setOtp] = useState('')
  // Email code sign-in: the 6-digit code, and whether one was sent
  const [mailCode, setMailCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
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
  closeRef.current = onClose

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

  useEffect(() => { titleRef.current?.focus() }, [view])

  const go = (v: View) => { setError(''); setNotice(null); setView(v) }

  const finish = (result: any, isNew = false) => {
    if (result?.requiresTwoFactor && result?.challengeToken) {
      setChallenge({ token: result.challengeToken, userId: result.userId })
      setOtp('')
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
  const google = () => run('google', async () => {
    if (redirect) sessionStorage.setItem('ogapay_after_login', redirect)
    try {
      // Loaded only here, so a Supabase problem can't break email, wallet or pairing
      const { supabase } = await import('../../lib/supabaseClient')
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
      const result = await apiRequest<any>('/auth/login', { method: 'POST', auth: false, body: JSON.stringify({ email: email.trim(), password }) })
      if (remember) localStorage.setItem('ogapay_remember_email', email.trim())
      else localStorage.removeItem('ogapay_remember_email')
      finish(result)
    })
  }

  const signup = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) { setError('Fill in your name, email and a password.'); return }
    // The server's rules (validate.js registerSchema), checked here so the reason is clear
    const pwProblem = passwordProblem(password)
    if (pwProblem) { setError(pwProblem); return }
    const parts = name.trim().split(/\s+/)
    if (parts.some((p) => p.length < 2)) { setError('Enter your name with at least 2 letters in each part, e.g. Ada Okafor.'); return }
    const body: Record<string, string> = {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ') || parts[0],
      email: email.trim(),
      password,
      username: usernameFrom(email),
    }
    const ref = localStorage.getItem('ogapay_referral')
    if (ref) body.referralCode = ref
    run('signup', async () => {
      // The username comes from the email (it can be changed later in Edit profile).
      // If someone already has it, try it with a few digits added.
      let result: any
      for (let i = 0; ; i++) {
        try {
          result = await apiRequest<any>('/auth/signup', { method: 'POST', auth: false, body: JSON.stringify(body) })
          break
        } catch (err: any) {
          if (i < 3 && /username already taken/i.test(err?.message || '')) { body.username = usernameFrom(email, true); continue }
          throw err
        }
      }
      localStorage.setItem('ogapay_is_new_user', 'true')
      finish(result, true)
    })
  }

  const forgot = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Enter the email on your account.'); return }
    run('forgot', async () => {
      await apiRequest('/auth/forgot-password', { method: 'POST', auth: false, body: JSON.stringify({ email: email.trim() }) })
      setNotice({ text: 'If that email has an account, a reset link is on its way. Check your inbox.', ok: true })
    })
  }

  // "Email me a code": the server always gives the same answer, whether or not
  // the email has an account (auth/email-code/request)
  const sendMailCode = (e?: FormEvent) => {
    e?.preventDefault()
    if (!email.trim()) { setError('Enter the email on your account.'); return }
    run('mailcode', async () => {
      await apiRequest('/auth/email-code/request', { method: 'POST', auth: false, body: JSON.stringify({ email: email.trim() }) })
      setCodeSent(true)
      setMailCode('')
      setNotice({ text: 'If that email has an account, we sent a code. It works for 10 minutes.', ok: true })
    })
  }

  const mailCodeLogin = (e: FormEvent) => {
    e.preventDefault()
    if (mailCode.length !== 6) { setError('Enter the 6-digit code from the email.'); return }
    run('mailcodein', async () => finish(await apiRequest<any>('/auth/email-code/verify', {
      method: 'POST', auth: false, body: JSON.stringify({ email: email.trim(), code: mailCode }),
    })))
  }

  const pairLogin = (e: FormEvent) => {
    e.preventDefault()
    const c = code.replace(/[\s-]/g, '')
    if (c.length !== 25) { setError('Enter the full 25-character code.'); return }
    run('pair', async () => finish(await apiRequest<any>('/auth/pair', { method: 'POST', auth: false, body: JSON.stringify({ code: c }) })))
  }

  const verifyOtp = (e: FormEvent) => {
    e.preventDefault()
    if (!challenge || otp.length < 6) { setError('Enter the 6-digit code.'); return }
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
    finish(await apiRequest<any>('/auth/wallet/login', { method: 'POST', auth: false, body: JSON.stringify({ wallet, signature }) }))
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

  let body: ReactNode = null
  if (view === 'options') {
    // Inside a wallet app (after "Open in Phantom" and the like) Google refuses
    // to sign in, so Email comes first and Google says it likely won't work
    // Most people sign in with Google or email on an Android phone, so Google is
    // the one filled row and the wallet and pairing options sit under "Other ways"
    const googleOption = (
      <Option name="Continue with Google" disabled={busy === 'google'} onClick={google} primary={!inWalletApp}
        desc={inWalletApp ? "Usually doesn't work inside wallet apps" : 'Sign in or create an account in one tap'}
        icon={busy === 'google' ? <Spinner /> : <span className="si-gbadge"><GoogleIcon /></span>} />
    )
    body = (
      <>
        <p className="si-desc">New here? Any option below also creates your free account.</p>
        {inWalletApp && <p className="si-notice ok" role="note">{WALLET_APP_SIGNIN_LINE}</p>}
        {noticeLine}{errorLine}
        <div className="si-options">
          {!inWalletApp && googleOption}
          <Option name="Continue with email" desc="Sign in or create an account with your email" onClick={() => go('email')}
            icon={<i className="ti ti-mail" aria-hidden="true" />} />
          {inWalletApp && googleOption}
        </div>
        <p className="si-group">Other ways</p>
        <div className="si-options">
          <Option name="Solana wallet" desc="Phantom, Solflare, Backpack and more" onClick={() => go('wallets')}
            icon={<span className="si-wgrid" aria-hidden="true">{WALLETS.slice(0, 4).map(w => <img key={w.id} src={w.icon} alt="" />)}</span>} />
          <Option name="Pair devices" desc="Signed in on another device? Pair this one with a code" onClick={() => go('pair')}
            icon={<i className="ti ti-devices" aria-hidden="true" />} />
        </div>
        {legal}
      </>
    )
  } else if (view === 'wallets') {
    body = (
      <>
        <p className="si-desc">Sign a free message with a wallet that's linked to your OgaPay account. No transaction is sent.</p>
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
        <p className="si-hint">New to OgaPay? Create an account with {inWalletApp ? 'email' : 'email or Google'}, then connect your wallet in Settings to use it here.</p>
      </>
    )
  } else if (view === 'email') {
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
        <button type="button" className="si-secondary" onClick={() => { setCodeSent(false); go('emailcode') }}>
          <i className="ti ti-mail" aria-hidden="true" /> Email me a code instead
        </button>
        <p className="si-switch">New to OgaPay? <button type="button" className="si-link" onClick={() => go('signup')}>Create an account</button></p>
      </form>
    )
  } else if (view === 'signup') {
    body = (
      <form className="si-form" onSubmit={signup} noValidate>
        <p className="si-desc">Earn from tasks, hire people and sell in the store. It takes a minute.</p>
        {/* Referral links land here: Google works for sign-up too */}
        {!inWalletApp && (
          <>
            <button type="button" className="si-google" onClick={google} disabled={busy === 'google'}>
              {busy === 'google' ? <Spinner /> : <span className="si-gbadge"><GoogleIcon /></span>} Continue with Google
            </button>
            <p className="si-or"><span>or with your email</span></p>
          </>
        )}
        <div className="si-field">
          <label htmlFor="si-name">Full name</label>
          <input id="si-name" className="si-input" autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="si-field">
          <label htmlFor="si-email2">Email address</label>
          <input id="si-email2" className="si-input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="si-field">
          <label htmlFor="si-pw2">Password</label>
          <div className="si-pw">
            <input id="si-pw2" className="si-input" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="si-eye" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}><i className={`ti ti-eye${showPw ? '-off' : ''}`} /></button>
          </div>
          <p className="si-hint" style={{ marginTop: 0 }}>At least 8 characters, with a capital letter and a number.</p>
        </div>
        {errorLine}
        <button type="submit" className="si-primary" disabled={busy === 'signup'}>{busy === 'signup' ? <><Spinner /> Creating account…</> : 'Create account'}</button>
        <p className="si-switch">Already have an account? <button type="button" className="si-link" onClick={() => go('email')}>Sign in</button></p>
        {legal}
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
  } else if (view === 'emailcode') {
    body = !codeSent ? (
      <form className="si-form" onSubmit={sendMailCode} noValidate>
        <p className="si-desc">No password needed. We'll email you a 6-digit code to sign in. It works once, for 10 minutes.</p>
        {noticeLine}
        <div className="si-field">
          <label htmlFor="si-email4">Email address</label>
          <input id="si-email4" className="si-input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        {errorLine}
        <button type="submit" className="si-primary" disabled={busy === 'mailcode'}>{busy === 'mailcode' ? <><Spinner /> Sending…</> : 'Email me a code'}</button>
        <p className="si-hint">Only for accounts whose email is verified.</p>
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
        <button type="submit" className="si-primary" disabled={busy === 'mailcodein' || mailCode.length !== 6}>{busy === 'mailcodein' ? <><Spinner /> Signing in…</> : 'Sign in'}</button>
        <div className="si-row">
          <button type="button" className="si-link" onClick={() => { setCodeSent(false); setNotice(null); setError('') }}>Use another email</button>
          <button type="button" className="si-link" disabled={busy === 'mailcode'} onClick={() => sendMailCode()}>Send a new code</button>
        </div>
        <p className="si-hint">After 5 wrong tries the code stops working and you need a new one.</p>
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
          <li><i>02</i><b>Create a code</b><span>Open Settings, then Devices, and select Pair a device to create a code.</span></li>
          <li><i>03</i><b>Sign in here</b><span>Enter the code on this device, or scan its QR code.</span></li>
        </ol>
      </form>
    )
  } else if (view === 'twofa') {
    body = (
      <form className="si-form" onSubmit={verifyOtp} noValidate>
        <p className="si-desc">Enter the 6-digit code from your authenticator app to finish signing in.</p>
        <div className="si-field">
          <label htmlFor="si-otp">Authentication code</label>
          <input id="si-otp" className="si-input otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </div>
        {errorLine}
        <button type="submit" className="si-primary" disabled={busy === 'otp' || otp.length < 6}>{busy === 'otp' ? <><Spinner /> Verifying…</> : 'Verify and sign in'}</button>
      </form>
    )
  }

  return (
    <div className="si-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="si-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="si-title">
        <div className="si-head">
          <div className="si-head-left">
            {back && <button type="button" className="si-back" onClick={() => go(back)} aria-label="Back"><i className="ti ti-arrow-left" /></button>}
            <h3 id="si-title" className="si-title" ref={titleRef} tabIndex={-1}>{TITLES[view]}</h3>
          </div>
          <button type="button" className="si-close" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
        </div>
        <div className="si-body">{body}</div>
      </div>
    </div>
  )
}
