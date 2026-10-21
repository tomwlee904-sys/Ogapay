import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

/* Site-wide banner for rule warnings (backend services/warning.service.js).
   Shows a new warning with its reason and the rule until "Got it", and stays
   while the member can't take new jobs (3 warnings in 30 days). Shown at the
   top of every page (components/Layout.tsx), not on /warnings itself. */

export type MyWarning = {
  id: string; reason: string; reasonLabel: string; rule: string; note: string | null; taskId: string | null
  outcome: 'WARNING' | 'RANK_DOWN' | 'SUSPENDED'; fromLevelName: string | null; toLevelName: string | null
  seenAt: string | null; appealNote: string | null; appealedAt: string | null
  appealDecidedAt?: string | null; appealReply?: string | null
  withdrawnAt: string | null; withdrawNote: string | null; createdAt: string
}
export type MyWarnings = { suspended: { since: string } | null; recentWarnings: number; windowDays: number; unseen: MyWarning[]; warnings: MyWarning[] }

// One fetch per minute at most: every page has its own Layout
let cache: { at: number; userId: string; data: MyWarnings } | null = null
export function clearWarningsCache() { cache = null }
let inflight: { userId: string; p: Promise<MyWarnings | null> } | null = null
function fetchWarnings(userId: string): Promise<MyWarnings | null> {
  if (cache && cache.userId === userId && Date.now() - cache.at < 60000) return Promise.resolve(cache.data)
  if (inflight && inflight.userId === userId) return inflight.p
  const p = apiRequest<MyWarnings>('/warnings/me')
    .then((d) => { if (d) cache = { at: Date.now(), userId, data: d }; return d || null })
    .catch(() => null)
    .finally(() => { inflight = null })
  inflight = { userId, p }
  return p
}

// The member's warnings for the menu: it shows a Warnings link once there are
// any, so the history and the appeal button can be found again after "Got it"
export function useMyWarnings(): MyWarnings | null {
  const { user } = useAuth()
  const [data, setData] = useState<MyWarnings | null>(cache && cache.userId === user?.id ? cache.data : null)
  useEffect(() => {
    if (!user?.id) { setData(null); return }
    let live = true
    fetchWarnings(user.id).then((d) => { if (live && d) setData(d) })
    return () => { live = false }
  }, [user?.id])
  return data
}

export default function WarningBanner() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [data, setData] = useState<MyWarnings | null>(cache && cache.userId === user?.id ? cache.data : null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user?.id) { setData(null); return }
    let live = true
    fetchWarnings(user.id).then((d) => { if (live && d) setData(d) })
    return () => { live = false }
  }, [user?.id])

  if (!user || !data || pathname === '/warnings') return null
  const w = data.unseen[0]
  if (!data.suspended && !w) return null

  const gotIt = async () => {
    if (!w || busy) return
    setBusy(true)
    const next = { ...data, unseen: data.unseen.filter((x) => x.id !== w.id) }
    setData(next)
    if (cache) cache = { ...cache, data: next }
    await apiRequest(`/warnings/${w.id}/seen`, { method: 'POST' }).catch(() => {})
    setBusy(false)
  }

  const stop = !!data.suspended
  return (
    <div className={`wb ${stop ? 'wb-stop' : ''}`} role="alert">
      <style>{`
        .wb{display:flex;gap:12px;align-items:flex-start;margin:0 0 16px;padding:14px 16px;border-radius:14px;border:1px solid rgba(245,158,11,.45);background:rgba(245,158,11,.1);color:var(--text);font-size:14px;line-height:1.5}
        .wb-stop{border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.08)}
        .wb>i{font-size:22px;color:#d97706;flex-shrink:0;margin-top:1px}
        .wb-stop>i{color:var(--red)}
        .wb b{display:block;font-size:14.5px;margin-bottom:2px}
        .wb p{margin:0 0 4px;color:var(--text2)}
        .wb-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
        .wb-row a,.wb-row button{min-height:36px;padding:7px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
        .wb-row a{background:var(--accent);color:var(--on-accent)}
        .wb-row button{background:transparent;border:1px solid var(--border);color:var(--text)}
      `}</style>
      <i className={`ti ${stop ? 'ti-ban' : 'ti-alert-triangle'}`} aria-hidden="true" />
      <div style={{ minWidth: 0 }}>
        {stop ? (
          <>
            <b>You can't take new jobs right now</b>
            <p>Your account got 3 warnings in {data.windowDays} days, so it is waiting for an admin to review it. Work you already sent is still reviewed and paid, and you can still withdraw the money you earned.</p>
          </>
        ) : (
          <>
            <b>Warning: {w.reasonLabel}</b>
            <p>{w.rule}</p>
            {w.note && <p>What we saw: {w.note}</p>}
            <p>
              {w.outcome === 'RANK_DOWN'
                ? `This is your 2nd warning in ${data.windowDays} days, so your rank went down from ${w.fromLevelName} to ${w.toLevelName}. A 3rd warning stops new jobs.`
                : data.recentWarnings >= 2
                  ? `You have ${data.recentWarnings} warnings in the last ${data.windowDays} days. A 3rd warning stops new jobs.`
                  : `A 2nd warning within ${data.windowDays} days lowers your rank.`}
            </p>
          </>
        )}
        <div className="wb-row">
          <Link to="/warnings">{stop ? 'See why and appeal' : 'Details and appeal'}</Link>
          {!stop && <button onClick={gotIt} disabled={busy}>Got it</button>}
        </div>
      </div>
    </div>
  )
}
