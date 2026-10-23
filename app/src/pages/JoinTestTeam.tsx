import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'

// /join-test-team: asks people to help test new OgaPay features. Applying uses
// the normal community join flow for the "OgaPay Beta Testers" community
// (/communities/<slug>/request), so the leaders pick testers from the requests.
// The community has to exist with this address; until it does, the page says
// applications aren't open yet.
export const BETA_COMMUNITY_SLUG = 'ogapay-beta-testers'

type Info = { name: string; requirements: string[]; request: { status: string } | null; userRole: string | null }

export default function JoinTestTeam() {
  const navigate = useNavigate()
  const signedIn = !!getAccessToken()
  const [info, setInfo] = useState<Info | null | 'missing'>(null)

  useEffect(() => {
    apiRequest<Info>(`/communities/${BETA_COMMUNITY_SLUG}/join-info`, { auth: signedIn })
      .then((d) => setInfo(d && d.name ? d : 'missing'))
      .catch(() => setInfo('missing'))
  }, [signedIn])

  const joinPath = `/communities/${BETA_COMMUNITY_SLUG}/request`
  const apply = () => {
    if (!signedIn) { openSignIn({ redirect: joinPath }); return }
    navigate(joinPath)
  }
  const member = info && info !== 'missing' && !!info.userRole
  const pending = info && info !== 'missing' && info.request?.status === 'PENDING'

  return (
    <Layout>
      <style>{`
        .tt-card{margin-top:28px;border:1px solid var(--border);border-radius:16px;background:var(--card);padding:20px}
        .tt-card h2{margin:0 0 8px;font-size:18px;font-weight:700;color:var(--text)}
        .tt-card p,.tt-card li{font-size:14px;line-height:1.7;color:var(--text2)}
        .tt-card ul{margin:8px 0 0;padding-left:20px}
        .tt-btn{margin-top:16px;min-height:46px;padding:0 24px;border-radius:99px;border:none;background:#0a0a0a;color:#fff;font-size:15px;font-weight:700;cursor:pointer}
        .tt-btn:disabled{opacity:.5;cursor:default}
        .tt-note{margin-top:10px;font-size:13px;color:var(--text3)}
      `}</style>
      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-flask" /> Beta</span>
          <h1 className="ui-title">Join the OgaPay test team</h1>
          <p className="ui-sub">Try new features before everyone else, tell us what breaks, and help shape OgaPay.</p>
        </header>

        <div className="tt-card">
          <h2>What testers do</h2>
          <ul>
            <li>Get early access to new pages and features in the OgaPay Beta Testers community.</li>
            <li>Follow short test steps on your phone or computer and report what didn't work, with a screenshot.</li>
            <li>Share honest feedback on what's confusing or slow.</li>
          </ul>
          <p style={{ marginTop: 10 }}>We pick a small group from the requests. Tell us in your request which phone you use and how often you use OgaPay.</p>

          {info === null ? <p className="tt-note">Loading…</p> : info === 'missing' ? (
            <>
              <button className="tt-btn" disabled>Applications open soon</button>
              <p className="tt-note">The test team isn't taking requests yet. Follow us on <a href="https://t.me/ogapayhq" target="_blank" rel="noopener noreferrer">Telegram</a> to hear when it opens.</p>
            </>
          ) : member ? (
            <>
              <button className="tt-btn" onClick={() => navigate(`/communities/${BETA_COMMUNITY_SLUG}`)}>Open the test team</button>
              <p className="tt-note">You're already in {info.name}.</p>
            </>
          ) : pending ? (
            <>
              <button className="tt-btn" onClick={() => navigate(joinPath)}>See my request</button>
              <p className="tt-note">Your request is waiting for the team leaders.</p>
            </>
          ) : (
            <>
              <button className="tt-btn" onClick={apply}>{signedIn ? 'Apply to join' : 'Sign in to apply'}</button>
              {info.requirements?.length > 0 && <p className="tt-note">To apply: {info.requirements.join(' · ')}</p>}
            </>
          )}
        </div>

        <p className="tt-note" style={{ marginTop: 24 }}>Found a bug but don't want to join? <Link to="/support">Tell Support</Link>.</p>
      </div>
    </Layout>
  )
}
