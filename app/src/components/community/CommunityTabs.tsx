import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest, getAccessToken } from '../../lib/api'
import { openSignIn } from '../../lib/signin'
import '../../styles/store.css'

// All | Mine | Invitations on the Communities pages. Each one is its own address
// (/communities, /communities/mine, /communities/invitations), so refresh, Back
// and shared links land on the same view. Invitations shows how many are waiting.
export default function CommunityTabs({ active, inviteCount }: { active: 'all' | 'mine' | 'invites'; inviteCount?: number }) {
  const navigate = useNavigate()
  const signedIn = !!getAccessToken()
  const [count, setCount] = useState<number | null>(inviteCount ?? null)
  useEffect(() => {
    if (inviteCount !== undefined) { setCount(inviteCount); return }
    if (!signedIn) return
    apiRequest<any[]>('/communities/invites/mine').then((l) => setCount(Array.isArray(l) ? l.length : 0)).catch(() => setCount(null))
  }, [inviteCount, signedIn])

  const go = (to: string) => (signedIn || to === '/communities' ? navigate(to, { replace: true }) : openSignIn({ redirect: to }))
  const tabs: [typeof active, string, string][] = [['all', '/communities', 'All'], ['mine', '/communities/mine', 'Mine'], ['invites', '/communities/invitations', 'Invitations']]
  return (
    <div className="st-seg ch-views" role="tablist" aria-label="Communities">
      {tabs.map(([key, to, label]) => (
        <button key={key} role="tab" aria-selected={active === key} className={active === key ? 'on' : ''} onClick={() => active !== key && go(to)}>
          {label}{key === 'invites' && count ? <em>{count}</em> : null}
        </button>
      ))}
    </div>
  )
}
