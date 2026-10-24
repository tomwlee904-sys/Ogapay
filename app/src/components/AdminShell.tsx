import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Layout from './Layout'
import '../styles/admin.css'

/* The admin frame, used by /admin and every /admin/* page instead of the
   member sidebar. Desktop: a sticky rail with every admin section on the left.
   Phone and tablet: a 44px "Admin" back link and the sections as one sideways
   row. Then one header: title, a one-line subtitle, optional actions on the
   right (an icon Refresh, a compact button) and an optional "How this works"
   fold-out for the longer rules. Styles: styles/admin.css. */

export type AdminSection =
  | 'withdrawals' | 'linked' | 'vault'
  | 'kyc' | 'creators' | 'brands' | 'ranks' | 'warnings'
  | 'moderation' | 'support' | 'blog' | 'updates' | 'highlights'

type Item = { key: AdminSection; to: string; icon: string; title: string; short: string; desc: string }

// Only pages that exist. The hub (pages/Admin.tsx) shows the same groups.
export const ADMIN_GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Money',
    items: [
      { key: 'withdrawals', to: '/admin/withdrawals', icon: 'ti-cash', title: 'Withdrawals', short: 'Withdrawals', desc: 'Pay out and settle pending withdrawals' },
      { key: 'linked', to: '/admin/linked-accounts', icon: 'ti-users-group', title: 'Linked accounts', short: 'Linked', desc: 'Accounts that share a bank, phone or ID: one person, one account' },
      { key: 'vault', to: '/admin/vault', icon: 'ti-building-bank', title: 'Vault', short: 'Vault', desc: 'Revenue pool, distributions and $PAY' },
    ],
  },
  {
    title: 'Trust and safety',
    items: [
      { key: 'kyc', to: '/admin/kyc', icon: 'ti-id', title: 'Identity checks', short: 'Identity', desc: 'Identity checks waiting for review, and past approvals' },
      { key: 'creators', to: '/admin/creators', icon: 'ti-user-check', title: 'Creator checks', short: 'Creators', desc: 'Follower counts waiting to be verified' },
      { key: 'brands', to: '/admin/brands', icon: 'ti-rosette-discount-check', title: 'Business checks', short: 'Businesses', desc: 'Posters asking for the Verified business badge' },
      { key: 'ranks', to: '/admin/ranks', icon: 'ti-trophy', title: 'Rank claims', short: 'Ranks', desc: 'Rank-ups from accounts with warning signs' },
      { key: 'warnings', to: '/admin/warnings', icon: 'ti-alert-triangle', title: 'Warnings', short: 'Warnings', desc: 'Appeals, members who can’t take jobs, and warning a member' },
    ],
  },
  {
    title: 'Content and support',
    items: [
      { key: 'moderation', to: '/admin/moderation', icon: 'ti-flag', title: 'Moderation', short: 'Moderation', desc: 'Job submissions to check and store orders with a problem' },
      { key: 'support', to: '/admin/support', icon: 'ti-lifebuoy', title: 'Support and reports', short: 'Support', desc: 'Help centre tickets and reports, priority first' },
      { key: 'blog', to: '/admin/blog', icon: 'ti-news', title: 'Blog', short: 'Blog', desc: 'Articles waiting for review, drafts and publishing' },
      { key: 'updates', to: '/admin/updates', icon: 'ti-speakerphone', title: 'Platform updates', short: 'Updates', desc: 'Tell every user what is new, in their Notifications' },
      { key: 'highlights', to: '/admin/highlights', icon: 'ti-star', title: 'Highlighted jobs', short: 'Highlights', desc: 'Jobs shown first on the homepage and jobs page' },
    ],
  },
]

function AdminRail({ current }: { current: AdminSection }) {
  return (
    <nav className="adm-rail" aria-label="Admin sections">
      <ul className="adm-rail-home">
        <li><Link to="/admin"><i className="ti ti-layout-dashboard" aria-hidden="true" />Admin home</Link></li>
      </ul>
      {ADMIN_GROUPS.map((g) => (
        <div className="adm-rail-group" key={g.title}>
          <p className="adm-rail-label">{g.title}</p>
          <ul>
            {g.items.map((it) => (
              <li key={it.key}>
                <Link to={it.to} aria-current={it.key === current ? 'page' : undefined}>
                  <i className={`ti ${it.icon}`} aria-hidden="true" />{it.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function AdminMobileNav({ current }: { current: AdminSection }) {
  const row = useRef<HTMLDivElement>(null)
  // Bring the current section into view in the sideways row (without moving the page)
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('[aria-current="page"]')
    if (row.current && el) row.current.scrollLeft = el.offsetLeft - row.current.clientWidth / 2 + el.offsetWidth / 2
  }, [current])
  return (
    <nav className="adm-mnav" aria-label="Admin sections">
      <Link to="/admin" className="adm-back"><i className="ti ti-arrow-left" aria-hidden="true" />Admin</Link>
      <div className="ui-scroll-row adm-chips" ref={row}>
        {ADMIN_GROUPS.flatMap((g) => g.items).map((it) => (
          <Link key={it.key} to={it.to} className={`ui-chip${it.key === current ? ' on' : ''}`} aria-current={it.key === current ? 'page' : undefined}>
            {it.short}
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default function AdminShell({ section, title, sub, how, howLabel = 'How this works', actions, children }: {
  section: AdminSection | 'hub'
  title: ReactNode
  sub?: ReactNode
  how?: ReactNode
  howLabel?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const hub = section === 'hub'
  return (
    <Layout>
      <div className="ui-page adm">
        <div className={`adm-frame${hub ? '' : ' has-rail'}`}>
          {!hub && <AdminRail current={section} />}
          <div className="adm-main">
            {!hub && <AdminMobileNav current={section} />}
            <header className="adm-head">
              <div className="adm-head-text">
                <h1 className="ui-title adm-title">{title}</h1>
                {sub && <p className="ui-sub adm-sub">{sub}</p>}
              </div>
              {actions && <div className="adm-head-actions">{actions}</div>}
            </header>
            {how && (
              <details className="adm-how">
                <summary><i className="ti ti-info-circle" aria-hidden="true" />{howLabel}<i className="ti ti-chevron-down" aria-hidden="true" /></summary>
                <div className="adm-how-body">{how}</div>
              </details>
            )}
            <div className="adm-body">{children}</div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// 44px icon-only Refresh for the header
export function AdminRefresh({ onClick, loading = false }: { onClick: () => void; loading?: boolean }) {
  return (
    <button type="button" className={`ui-btn ui-btn-ghost ui-btn-icon${loading ? ' is-loading' : ''}`} onClick={onClick}
      aria-label="Refresh" title="Refresh" aria-busy={loading || undefined}>
      <i className="ti ti-refresh" aria-hidden="true" />
    </button>
  )
}

// Shown only after a successful load that came back empty (failed loads use LoadError)
export function AdminEmpty({ title, children, done = false, at, compact = false }: {
  title: string; children?: ReactNode; done?: boolean; at?: Date | null; compact?: boolean
}) {
  return (
    <div className={`ui-empty adm-empty${compact ? ' compact' : ''}`}>
      {done && <i className="ti ti-circle-check adm-empty-icon" aria-hidden="true" />}
      <strong>{title}</strong>
      {children}
      {at && <small>Last checked {at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</small>}
    </div>
  )
}

// Grey shapes the size of the cards while a list loads
export function AdminSkeleton({ rows = 3, height = 140 }: { rows?: number; height?: number }) {
  return (
    <div className="adm-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="ui-sk" style={{ height }} />)}
    </div>
  )
}
