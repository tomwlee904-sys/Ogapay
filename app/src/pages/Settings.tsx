import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'
import type { Me } from './settings/ui'
import Account from './settings/Account'
import { Notifications, Privacy, Payments, Developer } from './settings/Simple'
import Security from './settings/Security'
import Verification from './settings/Verification'
import Connections, { PLATFORMS } from './settings/Connections'
import Devices from './settings/Devices'
import '../styles/profile-public.css'
import '../styles/settings.css'

// Settings, one route per section: /settings/account, /settings/security, ...
// Old links (/settings#kyc, /settings?tab=kyc, OAuth and VeryAI returns to
// /settings?...) are sent to the right section.
const SECTIONS = [
  { id: 'account', label: 'Account', icon: 'ti-user' },
  { id: 'notifications', label: 'Notifications', icon: 'ti-bell' },
  { id: 'privacy', label: 'Privacy', icon: 'ti-lock' },
  { id: 'security', label: 'Security', icon: 'ti-shield-lock' },
  { id: 'verification', label: 'Verification', icon: 'ti-id' },
  { id: 'connections', label: 'Connections', icon: 'ti-link' },
  { id: 'payments', label: 'Payments', icon: 'ti-wallet' },
  { id: 'devices', label: 'Devices', icon: 'ti-devices' },
  { id: 'developer', label: 'Developer', icon: 'ti-code' },
] as const

const OAUTH_ERRORS: Record<string, string> = {
  invalid_state: 'That sign-in took too long or was already used. Please try again.',
  missing_params: 'The sign-in was cancelled.',
  invalid_hash: "Telegram couldn't confirm your account.",
  invalid: "Telegram couldn't confirm your account.",
  expired: 'That Telegram sign-in has expired. Please try again.',
  access_denied: 'You cancelled the connection.',
}

function legacyTarget(hash: string, params: URLSearchParams) {
  if (hash === '#kyc' || params.get('tab') === 'kyc') return 'verification'
  if (params.get('human')) return 'verification'
  if (PLATFORMS.some((p) => params.get(p.id))) return 'connections'
  const h = hash.replace('#', '')
  return SECTIONS.some((s) => s.id === h) ? h : null
}

export default function Settings() {
  const { section } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { toast } = useToast()
  const [me, setMeState] = useState<Me | null>(null)
  const [err, setErr] = useState(false)
  const [providers, setProviders] = useState<Record<string, boolean> | null>(null)
  const toasted = useRef(false)

  const reload = useCallback(async () => {
    try {
      const d = await apiRequest<Me>('/users/me')
      setMeState(d); setErr(false)
    } catch { setErr(true) }
  }, [])
  const setMe = useCallback((fn: (m: Me) => Me) => setMeState((m) => (m ? fn(m) : m)), [])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    apiRequest<Record<string, boolean>>('/social/providers', { auth: false }).then(setProviders).catch(() => setProviders({}))
  }, [])

  // Results of OAuth / VeryAI round trips, then tidy the address bar
  useEffect(() => {
    if (toasted.current || !section) return // old /settings?... links are redirected first
    let shown = false
    for (const p of PLATFORMS) {
      const v = params.get(p.id)
      if (v === 'connected') { toast(`${p.label} connected`, 'success'); shown = true }
      else if (v === 'error') { toast(OAUTH_ERRORS[params.get('message') || ''] || params.get('message') || `Couldn't connect ${p.label}`, 'error'); shown = true }
    }
    const human = params.get('human')
    if (human === 'verified') { toast("You're verified as a human", 'success'); shown = true }
    else if (human === 'error') { toast(params.get('message') || 'VeryAI verification failed', 'error'); shown = true }
    if (shown) {
      toasted.current = true
      setParams({}, { replace: true })
      reload()
    }
    // section too: after an old /settings?... link redirects, the same page
    // instance is reused with the same query, so params alone doesn't change
  }, [params, section])

  if (!section) {
    const t = legacyTarget(location.hash, params)
    return <Navigate to={`/settings/${t || 'account'}${location.search}`} replace />
  }
  const current = SECTIONS.find((s) => s.id === section)
  if (!current) return <Navigate to="/settings/account" replace />

  const props = me && { me, setMe, reload }

  return (
    <Layout>
      <div className="up-wrap st2-wrap">
        <div className="st2-head">
          <h1>Settings</h1>
          <p>Your account, privacy, security and verification.</p>
        </div>
        <div className="st2-body">
          <nav className="st2-nav" aria-label="Settings sections">
            {SECTIONS.map((s) => (
              <NavLink key={s.id} to={`/settings/${s.id}`} className={({ isActive }) => (isActive ? 'on' : '')}>
                <i className={`ti ${s.icon}`} /> {s.label}
              </NavLink>
            ))}
          </nav>
          <div className="st2-content">
            <h2 className="st2-section-title">{current.label}</h2>
            {err && !me ? (
              <div className="up-empty"><i className="ti ti-cloud-off" />Couldn't load your settings. <button className="up-btn" onClick={() => reload()}>Try again</button></div>
            ) : !props ? (
              <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
            ) : section === 'account' ? <Account {...props} />
              : section === 'notifications' ? <Notifications {...props} />
              : section === 'privacy' ? <Privacy {...props} />
              : section === 'security' ? <Security {...props} />
              : section === 'verification' ? <Verification {...props} providers={providers} />
              : section === 'connections' ? <Connections {...props} providers={providers} />
              : section === 'payments' ? <Payments {...props} />
              : section === 'devices' ? <Devices />
              : <Developer />}
          </div>
        </div>
      </div>
    </Layout>
  )
}
