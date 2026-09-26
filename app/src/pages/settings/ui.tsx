import type { ReactNode } from 'react'
import { apiRequest } from '../../lib/api'

// What GET /users/me returns that Settings uses
export type Prefs = {
  emailNotifications: boolean; taskAlerts: boolean; payoutAlerts: boolean; communityAlerts: boolean
  newTaskAlerts: boolean; weeklyDigest: boolean; loginAlerts: boolean; autoConvert: boolean
  showEarnings: boolean; showRank: boolean; defaultCurrency: string
}
export type Me = {
  id: string; email: string; username: string; firstName: string; lastName: string; avatarUrl: string | null
  isEmailVerified: boolean; isPublic: boolean; isTwoFactorEnabled: boolean; hasPassword: boolean
  humanVerifiedAt: string | null; ogaScore: number; role: string
  preferences: Prefs
  kyc: { status: string; kycTier: number; rejectionReason: string | null; idType: string | null } | null
  connections: Record<'linkedin' | 'twitter' | 'github' | 'google' | 'telegram', { connected: boolean; handle: string | null }>
}

export type SectionProps = { me: Me; setMe: (fn: (m: Me) => Me) => void; reload: () => Promise<void> }

// Save one preference (the backend merges it into the rest)
export async function savePref(key: keyof Prefs | 'isPublic', value: boolean | string) {
  const r = await apiRequest<{ preferences: Prefs & { isPublic: boolean } }>('/users/me/preferences', {
    method: 'PATCH',
    body: JSON.stringify({ preferences: { [key]: value } }),
  })
  return r.preferences
}

export function Card({ title, sub, children, danger }: { title: string; sub?: ReactNode; children: ReactNode; danger?: boolean }) {
  return (
    <section className={`up-card st2-card${danger ? ' danger' : ''}`}>
      <h2>{title}</h2>
      {sub && <p className="st2-card-sub">{sub}</p>}
      {children}
    </section>
  )
}

export function Row({ title, sub, children, id }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <div className="st2-row">
      <div className="st2-row-t">
        <div className="st2-row-title" id={id}>{title}</div>
        {sub && <div className="st2-row-sub">{sub}</div>}
      </div>
      {children && <div className="st2-row-c">{children}</div>}
    </div>
  )
}

export function Toggle({ on, onChange, disabled, labelledBy }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; labelledBy?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      disabled={disabled}
      className={`st2-toggle${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span />
    </button>
  )
}

// A toggle row wired to one preference, with optimistic update and rollback
export function PrefRow({ me, setMe, k, title, sub, disabled, toast }: SectionProps & {
  k: keyof Prefs | 'isPublic'; title: string; sub?: ReactNode; disabled?: boolean; toast: (m: string, t?: 'success' | 'error') => void
}) {
  const id = `pref-${k}`
  const value = k === 'isPublic' ? me.isPublic : !!me.preferences[k as keyof Prefs]
  const set = (v: boolean) => setMe((m) => (k === 'isPublic' ? { ...m, isPublic: v } : { ...m, preferences: { ...m.preferences, [k]: v } }))
  const change = async (v: boolean) => {
    set(v)
    try {
      await savePref(k, v)
    } catch (e: any) {
      set(!v)
      toast(e?.message || "Couldn't save that", 'error')
    }
  }
  return (
    <Row title={title} sub={sub} id={id}>
      <Toggle on={value} onChange={change} disabled={disabled} labelledBy={id} />
    </Row>
  )
}
