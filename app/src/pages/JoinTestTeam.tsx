import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import '../styles/legal.css'

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
        .tt-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:28px;align-items:start}
        .tt-card{padding:20px}
        .tt-card h2{margin:0 0 10px;font-size:18px;font-weight:600;color:var(--text)}
        .tt-card p{margin:0;font-size:14px;line-height:1.7;color:var(--text2)}
        .tt-list{margin:0 0 12px;padding:0;list-style:none;display:grid;gap:10px}
        .tt-list li{display:flex;gap:10px;font-size:14px;line-height:1.6;color:var(--text2)}
        .tt-list i{font-size:18px;color:var(--green);flex-shrink:0;margin-top:2px}
        .tt-status{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:var(--r-pill);background:var(--card2);border:1px solid var(--border);font-size:12.5px;font-weight:600;color:var(--text)}
        .tt-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
        .tt-note{margin:12px 0 0;font-size:13px;line-height:1.55;color:var(--text2)}
        .tt-foot{margin-top:24px;font-size:13px;color:var(--text2)}
        @media(min-width:768px){.tt-card{max-width:none}}
        /* Desktop: what testers do on the left, the status and button on the right, kept in view */
        @media(min-width:1024px){
          .tt-grid{grid-template-columns:minmax(0,1fr) 360px;gap:24px}
          .tt-side{position:sticky;top:calc(var(--nav-h) + 16px)}
          .tt-main{max-width:680px}
        }
        @media(max-width:767.98px){.tt-actions .ui-btn{flex:1 1 auto}}
      `}</style>
      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-flask" /> Beta</span>
          <h1 className="ui-title">Join the OgaPay test team</h1>
          <p className="ui-sub">Try new features before everyone else, tell us what breaks, and help shape OgaPay.</p>
        </header>

        <div className="tt-grid">
          <div className="ui-card tt-card tt-main">
            <h2>What testers do</h2>
            <ul className="tt-list">
              <li><i className="ti ti-circle-check" aria-hidden="true" />Get early access to new pages and features in the OgaPay Beta Testers community.</li>
              <li><i className="ti ti-circle-check" aria-hidden="true" />Follow short test steps on your phone or computer and report what didn't work, with a screenshot.</li>
              <li><i className="ti ti-circle-check" aria-hidden="true" />Share honest feedback on what's confusing or slow.</li>
            </ul>
            <p>We pick a small group from the requests. Tell us in your request which phone you use and how often you use OgaPay.</p>
          </div>

          <div className="ui-card tt-card tt-side" aria-live="polite">
            <h2>Apply</h2>
            {info === null ? <p className="tt-note" style={{ marginTop: 0 }}>Loading…</p> : info === 'missing' ? (
              <>
                <span className="tt-status"><i className="ti ti-clock" aria-hidden="true" /> Applications open soon</span>
                <p className="tt-note">The test team isn't taking requests yet. Follow our Telegram channel to hear when it opens.</p>
                <div className="tt-actions">
                  <a className="ui-btn ui-btn-dark" href="https://t.me/ogapayhq" target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" aria-hidden="true" /> Get notified on Telegram</a>
                </div>
              </>
            ) : member ? (
              <>
                <p>You're already in {info.name}.</p>
                <div className="tt-actions"><button className="ui-btn ui-btn-dark" onClick={() => navigate(`/communities/${BETA_COMMUNITY_SLUG}`)}>Open the test team</button></div>
              </>
            ) : pending ? (
              <>
                <p>Your request is waiting for the team leaders.</p>
                <div className="tt-actions"><button className="ui-btn ui-btn-dark" onClick={() => navigate(joinPath)}>See my request</button></div>
              </>
            ) : (
              <>
                {info.requirements?.length > 0 ? <p>To apply: {info.requirements.join(' · ')}</p> : <p>Requests are open.</p>}
                <div className="tt-actions"><button className="ui-btn ui-btn-dark" onClick={apply}>{signedIn ? 'Apply to join' : 'Sign in to apply'}</button></div>
              </>
            )}
          </div>
        </div>

        <p className="tt-foot lg-prose">Found a bug but don't want to join? <Link to="/support">Tell Support</Link>.</p>
      </div>
    </Layout>
  )
}
