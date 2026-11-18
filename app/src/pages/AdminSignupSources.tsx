import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

/* Sign-up sources (2026-11-18): where new members came from, per channel, and
   how good those sign-ups turned out (backend GET /admin/signup-sources, saved
   once at sign-up from the first visit's UTM tags, ad click ids, referral code and
   referrer; lib/signupSource). Nothing on this page changes anything. */

type Quality = { signups: number; verified: number; kyc: number; level2Rejected: number; paidJob: number; flagged: number }
type Channel = Quality & { channel: string; byDay: Record<string, number> }
type Inviter = Quality & { userId: string; username: string | null; name: string | null; isBanned: boolean }
type Campaign = Quality & { campaign: string }
type Data = { days: number; dayList: string[]; totals: Quality; channels: Channel[]; topInviters: Inviter[]; topCampaigns: Campaign[] }

const NAMES: Record<string, string> = {
  google_ads: 'Google Ads', referral: 'Referral link', facebook: 'Facebook', instagram: 'Instagram', x: 'X (Twitter)',
  telegram: 'Telegram', whatsapp: 'WhatsApp', tiktok: 'TikTok', linkedin: 'LinkedIn', google_search: 'Google search',
  other: 'Other website', direct: 'Direct (no source)', unknown: 'Before tracking',
}
const RANGES = [1, 7, 30]
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '-')
const shortDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function QualityCells({ q }: { q: Quality }) {
  return (
    <>
      <td className="r">{q.signups}</td>
      <td className="r">{pct(q.verified, q.signups)}</td>
      <td className="r">{pct(q.kyc, q.signups)}</td>
      <td className="r">{pct(q.level2Rejected, q.signups)}</td>
      <td className="r">{pct(q.paidJob, q.signups)}</td>
      <td className="r">{q.flagged}</td>
    </>
  )
}
const QUALITY_HEAD = (
  <>
    <th className="r">Sign-ups</th><th className="r">Verified email</th><th className="r">Level 1+</th>
    <th className="r">Level 2 rejected</th><th className="r">Did a paid job</th><th className="r">Flagged</th>
  </>
)

export default function AdminSignupSources() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = (d = days) => {
    setLoading(true); setError('')
    apiRequest<Data>(`/admin/signup-sources?days=${d}`, { fresh: true })
      .then(setData)
      .catch((e: any) => setError(e?.message || "Couldn't load sign-up sources"))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load(days) }, [days])

  return (
    <Layout sidebar>
      <style>{`
        .ss{max-width:1100px;margin:0 auto;padding:28px 24px 64px;display:flex;flex-direction:column;gap:14px}
        .ss-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
        .ss-head h1{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:0 0 4px}
        .ss-head p{color:var(--text2);font-size:14px;margin:0;max-width:640px;line-height:1.5}
        .ss-back{font-size:13px;color:var(--text2);text-decoration:none}
        .ss-range{display:flex;border:1px solid var(--border);border-radius:999px;overflow:hidden}
        .ss-range button{background:none;border:0;padding:8px 14px;font:inherit;font-size:13px;font-weight:600;color:var(--text);cursor:pointer;min-height:36px}
        .ss-range button[aria-pressed="true"]{background:var(--text);color:var(--bg)}
        .ss-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 20px;min-width:0}
        .ss-card h2{font-size:16px;font-weight:600;margin:0 0 4px}
        .ss-card > small{display:block;font-size:12px;color:var(--text2);margin-bottom:6px}
        .ss-table{overflow-x:auto;margin-top:8px}
        .ss-table table{width:100%;border-collapse:collapse;font-size:13px;min-width:640px}
        .ss-table th{font-size:11px;font-weight:500;color:var(--text3);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);white-space:nowrap}
        .ss-table td{padding:8px;border-bottom:1px solid var(--border);font-variant-numeric:tabular-nums;white-space:nowrap}
        .ss-table tr:last-child td{border-bottom:0}
        .ss-table .r{text-align:right}
        .ss-table tfoot td{font-weight:700;border-top:1px solid var(--text2)}
        .ss-empty{color:var(--text2);font-size:14px;padding:12px 0}
        .ss-retry{background:none;border:0;padding:0;color:var(--text);font:inherit;font-weight:700;text-decoration:underline;cursor:pointer}
        @media (max-width:640px){.ss{padding:20px 16px 56px}.ss-card{padding:14px}}
      `}</style>
      <div className="ss">
        <Link className="ss-back" to="/admin">← Admin</Link>
        <div className="ss-head">
          <div>
            <h1>Sign-up sources</h1>
            <p>Where new members came from (their first visit: ad click, link tags, referral code or the site that sent them), and how good those sign-ups were. Admins and closed accounts aren't counted.</p>
          </div>
          <div className="ss-range" role="group" aria-label="Day range">
            {RANGES.map((d) => (
              <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>{d === 1 ? '24 hours' : `${d} days`}</button>
            ))}
          </div>
        </div>

        {loading && !data ? <div className="ss-empty">Loading…</div>
          : error && !data ? <div className="ss-empty" role="alert">{error} <button type="button" className="ss-retry" onClick={() => load()}>Try again</button></div>
          : data && (
            <>
              {error && <div className="ss-empty" role="alert">{error}</div>}
              <section className="ss-card" aria-labelledby="ss-ch-h">
                <h2 id="ss-ch-h">By channel</h2>
                <small>Percentages are of that channel's sign-ups. Level 1+ = ID or NIN approved. Flagged = open farm flags.</small>
                {!data.channels.length ? <div className="ss-empty">No sign-ups in this range.</div> : (
                  <div className="ss-table">
                    <table>
                      <thead><tr><th>Channel</th>{QUALITY_HEAD}</tr></thead>
                      <tbody>
                        {data.channels.map((c) => <tr key={c.channel}><td>{NAMES[c.channel] || c.channel}</td><QualityCells q={c} /></tr>)}
                      </tbody>
                      <tfoot><tr><td>All</td><QualityCells q={data.totals} /></tr></tfoot>
                    </table>
                  </div>
                )}
              </section>

              {data.days > 1 && data.channels.length > 0 && (
                <section className="ss-card" aria-labelledby="ss-day-h">
                  <h2 id="ss-day-h">Sign-ups per day</h2>
                  <small>Lagos time, newest first.</small>
                  <div className="ss-table">
                    <table>
                      <thead><tr><th>Day</th>{data.channels.map((c) => <th key={c.channel} className="r">{NAMES[c.channel] || c.channel}</th>)}<th className="r">All</th></tr></thead>
                      <tbody>
                        {[...data.dayList].reverse().map((d) => (
                          <tr key={d}>
                            <td>{shortDay(d)}</td>
                            {data.channels.map((c) => <td key={c.channel} className="r">{c.byDay[d] || 0}</td>)}
                            <td className="r">{data.channels.reduce((n, c) => n + (c.byDay[d] || 0), 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <section className="ss-card" aria-labelledby="ss-inv-h">
                <h2 id="ss-inv-h">Top inviters</h2>
                <small>Members whose referral link brought the most sign-ups in this range.</small>
                {!data.topInviters.length ? <div className="ss-empty">No referred sign-ups in this range.</div> : (
                  <div className="ss-table">
                    <table>
                      <thead><tr><th>Inviter</th>{QUALITY_HEAD}</tr></thead>
                      <tbody>
                        {data.topInviters.map((i) => (
                          <tr key={i.userId}>
                            <td>{i.username ? <Link to={`/user/${encodeURIComponent(i.username)}`}>@{i.username}</Link> : (i.name || '-')}{i.isBanned ? ' (banned)' : ''}</td>
                            <QualityCells q={i} />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="ss-card" aria-labelledby="ss-camp-h">
                <h2 id="ss-camp-h">Top campaigns</h2>
                <small>The utm_campaign tag on the link they first came in on.</small>
                {!data.topCampaigns.length ? <div className="ss-empty">No tagged campaigns in this range.</div> : (
                  <div className="ss-table">
                    <table>
                      <thead><tr><th>Campaign</th>{QUALITY_HEAD}</tr></thead>
                      <tbody>
                        {data.topCampaigns.map((c) => <tr key={c.campaign}><td>{c.campaign}</td><QualityCells q={c} /></tr>)}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
      </div>
    </Layout>
  )
}
