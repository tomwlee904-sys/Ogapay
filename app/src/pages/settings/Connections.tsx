import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { Card, type SectionProps } from './ui'

type Platform = 'linkedin' | 'twitter' | 'github' | 'google' | 'telegram'
export const PLATFORMS: { id: Platform; label: string; icon: string; pts: number }[] = [
  { id: 'linkedin', label: 'LinkedIn', icon: 'ti-brand-linkedin', pts: 10 },
  { id: 'twitter', label: 'X (Twitter)', icon: 'ti-brand-x', pts: 8 },
  { id: 'github', label: 'GitHub', icon: 'ti-brand-github', pts: 8 },
  { id: 'google', label: 'Google', icon: 'ti-brand-google', pts: 5 },
  { id: 'telegram', label: 'Telegram', icon: 'ti-brand-telegram', pts: 5 },
]
const MAX_SCORE = 36 + 20 + 10

// Telegram returns #tgAuthResult=<base64 JSON> to the page it was opened from
function telegramResult(): Record<string, any> | null {
  const m = window.location.hash.match(/tgAuthResult=([^&]+)/)
  if (!m) return null
  try {
    let b = decodeURIComponent(m[1]).replace(/-/g, '+').replace(/_/g, '/')
    while (b.length % 4) b += '='
    return JSON.parse(atob(b))
  } catch { return null }
}

export default function Connections({ me, setMe, reload, providers }: SectionProps & { providers: Record<string, boolean> | null }) {
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState<Platform | null>(null)
  const handled = useRef(false)

  // Finish a Telegram sign-in that came back to this page
  useEffect(() => {
    if (handled.current || params.get('telegram') !== 'callback') return
    handled.current = true
    const state = params.get('state')
    const auth = telegramResult()
    const done = () => { window.history.replaceState(null, '', '/settings/connections'); setParams({}, { replace: true }) }
    if (!state || !auth) { toast('Telegram sign-in was cancelled', 'error'); done(); return }
    apiRequest('/social/telegram/complete', { method: 'POST', body: JSON.stringify({ state, auth }) })
      .then(() => { toast('Telegram connected', 'success'); reload() })
      .catch((e: any) => toast(e?.message || "Couldn't connect Telegram", 'error'))
      .finally(done)
  }, [params])

  const connect = async (p: Platform) => {
    setBusy(p)
    try {
      const r = await apiRequest<any>(`/social/${p}/init`, { method: 'POST' })
      if (r?.authUrl) { window.location.href = r.authUrl; return }
      toast(`${label(p)} isn't available yet`, 'error')
    } catch (e: any) {
      toast(e?.message || `Couldn't connect ${label(p)}`, 'error')
    }
    setBusy(null)
  }

  const disconnect = async (p: Platform) => {
    if (!window.confirm(`Disconnect ${label(p)}? Your OgaScore goes down by ${PLATFORMS.find((x) => x.id === p)!.pts}.`)) return
    setBusy(p)
    try {
      await apiRequest(`/social/${p}/disconnect`, { method: 'DELETE' })
      setMe((m) => ({ ...m, connections: { ...m.connections, [p]: { connected: false, handle: null } } }))
      toast(`${label(p)} disconnected`, 'success')
      reload()
    } catch (e: any) {
      toast(e?.message || `Couldn't disconnect ${label(p)}`, 'error')
    }
    setBusy(null)
  }

  const tier = me.kyc?.status === 'APPROVED' ? me.kyc.kycTier : 0
  const social = PLATFORMS.reduce((s, p) => s + (me.connections?.[p.id]?.connected ? p.pts : 0), 0)
  const kycPts = (tier >= 1 ? 10 : 0) + (tier >= 2 ? 10 : 0)
  const humanPts = me.humanVerifiedAt ? 10 : 0

  return (
    <>
      <Card title="OgaScore" sub="Your trust score. Some jobs ask for a minimum score.">
        <div className="st2-score">
          <div className="st2-score-top"><b>{me.ogaScore}</b><span>of {MAX_SCORE}</span></div>
          <div className="st2-bar"><i style={{ width: `${Math.min(100, (me.ogaScore / MAX_SCORE) * 100)}%` }} /></div>
          <div className="st2-score-parts">
            <span>Connected accounts <b>+{social}</b></span>
            <span>Identity (KYC) <b>+{kycPts}</b></span>
            <span>Human verified <b>+{humanPts}</b></span>
          </div>
        </div>
      </Card>

      <Card title="Connected accounts" sub="Connect through each site's own sign-in. We never post for you.">
        {PLATFORMS.map((p) => {
          const c = me.connections?.[p.id]
          const available = !!providers?.[p.id]
          return (
            <div key={p.id} className="st2-conn">
              <span className="st2-conn-ico"><i className={`ti ${p.icon}`} /></span>
              <div className="st2-conn-t">
                <strong>{p.label}</strong>
                <span>{c?.connected ? (c.handle ? `Connected as ${c.handle}` : 'Connected') : `+${p.pts} OgaScore`}</span>
              </div>
              {c?.connected
                ? <button className="up-btn" onClick={() => disconnect(p.id)} disabled={busy === p.id}>Disconnect</button>
                : available
                  ? <button className="up-btn primary" onClick={() => connect(p.id)} disabled={busy === p.id}>{busy === p.id ? 'Opening…' : 'Connect'}</button>
                  : <span className="st2-muted">{providers ? 'Coming soon' : '…'}</span>}
            </div>
          )
        })}
      </Card>
    </>
  )
}

const label = (p: Platform) => PLATFORMS.find((x) => x.id === p)!.label
