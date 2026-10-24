import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import { apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import '../styles/vault.css'

// The vault shares platform revenue with $PAY holders every 12 hours (like wurk.fun's vault).
// This page used to be a hard-coded "document vault" with made-up files.
//
// Desktop: the vault's numbers, the 30-day chart and the contributions on the
// left; your share (and Claim), how it works and "Check a wallet" in a side
// panel that stays in view. Phones and tablets: one column with your share
// first and "Check a wallet" last (the .vt2-o* order classes).

type Summary = {
  pool: { totalNgp: number }
  totalDistributedNgp: number
  distributionCount: number
  eligibleCount: number
  paySupply: number
  nextRunAt: string
}
type Contribution = { id: string; at: string; amountNgp: number; reason: string; ref: string | null }
type Day = { day: string; distributedNgp: number; revenueNgp: number }
type Mine = { payBalance: number; totalEarnedNgp: number; distributionsReceived: number; isEligible: boolean }
type Payout = { id: string; shareNgp?: number; share?: number; status: string }

const naira = (n: number, dp = 2) => (n < 0 ? '−' : '') + '₦' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dp })
const num = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
const ago = (d: string) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}
const shortDay = (d?: string) => (d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')

// A card whose request failed, said in one line with Try again
function Failed({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="vt2-failed" role="alert">
      <span>We couldn't load {what}. Check your connection and try again.</span>
      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={onRetry}><i className="ti ti-refresh" aria-hidden="true" /> Try again</button>
    </div>
  )
}

// Check any Solana wallet linked to an OgaPay account (the answer never says whose it is).
// Same name and button as the lookup on the distribution history page.
function WalletCheck({ className = '' }: { className?: string }) {
  const [addr, setAddr] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<{ ok: true; wallet: string; v: { payBalance: number; totalEarned: number; distributionsReceived: number; isEligible: boolean } } | { ok: false; msg: string } | null>(null)
  const check = async () => {
    const a = addr.trim()
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) { setRes({ ok: false, msg: "That doesn't look like a Solana address." }); return }
    setBusy(true); setRes(null)
    try {
      const d = await apiRequest<any>(`/vault/lookup?wallet=${encodeURIComponent(a)}`, { auth: false })
      setRes(d?.vault ? { ok: true, wallet: a, v: d.vault } : { ok: false, msg: 'No OgaPay account uses this wallet.' })
    } catch (e: any) {
      setRes({ ok: false, msg: /not found/i.test(e?.message || '') ? 'No OgaPay account uses this wallet.' : "Couldn't check right now. Try again." })
    }
    setBusy(false)
  }
  return (
    <section className={`ui-card vt2-sec ${className}`} aria-labelledby="vt2-check-h">
      <h2 id="vt2-check-h">Check a wallet</h2>
      <p className="vt2-lead">Paste a Solana address linked to an OgaPay account to see its $PAY and vault rewards.</p>
      <form className="vt2-check" onSubmit={(e) => { e.preventDefault(); check() }}>
        <input className="ui-input" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Solana wallet address" aria-label="Solana wallet address" spellCheck={false} autoComplete="off" />
        <button type="submit" className={`ui-btn ui-btn-dark${busy ? ' is-loading' : ''}`} disabled={busy}>Check rewards</button>
      </form>
      {res && (res.ok ? (
        <>
          <div className="ui-stats vt2-mini" style={{ marginTop: 14 }}>
            <div><span className="ui-stats-label">$PAY held</span><b className="ui-stats-value">{num(res.v.payBalance)}</b></div>
            <div><span className="ui-stats-label">Earned from the vault</span><b className="ui-stats-value">{naira(res.v.totalEarned)}</b></div>
            <div><span className="ui-stats-label">Distributions received</span><b className="ui-stats-value">{num(res.v.distributionsReceived)}</b></div>
            <div><span className="ui-stats-label">In the next run</span><b className="ui-stats-value">{res.v.isEligible ? 'Yes' : 'No'}</b></div>
          </div>
          <Link className="vt2-more tap" to={`/vault/history?wallet=${encodeURIComponent(res.wallet)}`}>See its payouts in the distribution history <i className="ti ti-arrow-right" aria-hidden="true" /></Link>
        </>
      ) : <p className="vt2-lead" role="status" style={{ margin: '10px 0 0' }}>{res.msg}</p>)}
    </section>
  )
}

function useCountdown(to?: string) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  if (!to) return null
  const ms = new Date(to).getTime() - now
  if (ms <= 0) return 'Processing…'
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

// Bars only in the SVG (it stretches to the card's width); the labels are
// HTML around it, so they keep their size on every screen
function TrendChart({ days }: { days: Day[] }) {
  const W = 720, H = 150, top = 6
  const max = Math.max(1, ...days.map((d) => Math.max(d.revenueNgp, d.distributedNgp)))
  const bw = W / days.length
  const y = (v: number) => (v / max) * (H - top)
  return (
    <div className="vt2-chart-wrap">
      <div className="vt2-chart-max">{naira(max, 0)}</div>
      <svg className="vt2-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Fees in and amount shared per day, last 30 days">
        {[0.5, 1].map((f) => <line key={f} x1={0} x2={W} y1={H - f * (H - top)} y2={H - f * (H - top)} stroke="var(--border)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
        {days.map((d, i) => {
          const x = i * bw
          const rh = y(Math.max(0, d.revenueNgp))
          const dh = y(d.distributedNgp)
          return (
            <g key={d.day}>
              <title>{`${shortDay(d.day)}: fees ${naira(d.revenueNgp)} · shared ${naira(d.distributedNgp)}`}</title>
              <rect x={x + bw * 0.12} y={H - rh} width={bw * 0.36} height={rh} fill="var(--text3)" opacity=".45" />
              <rect x={x + bw * 0.52} y={H - dh} width={bw * 0.36} height={dh} fill="var(--green)" />
            </g>
          )
        })}
      </svg>
      <div className="vt2-chart-x"><span>{shortDay(days[0]?.day)}</span><span>{shortDay(days[days.length - 1]?.day)}</span></div>
    </div>
  )
}

export default function Vault() {
  const signedIn = !!getAccessToken()
  const [sum, setSum] = useState<Summary | null>(null)
  const [sumErr, setSumErr] = useState(false)
  const [contrib, setContrib] = useState<Contribution[] | null>(null)
  const [contribErr, setContribErr] = useState(false)
  const [trend, setTrend] = useState<Day[] | null>(null)
  const [trendErr, setTrendErr] = useState(false)
  const [mine, setMine] = useState<Mine | null>(null)
  const [mineErr, setMineErr] = useState(false)
  const [pending, setPending] = useState<number>(0)
  const [claiming, setClaiming] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)

  const loadMine = () => {
    if (!signedIn) return
    setMineErr(false)
    apiRequest<Mine>('/vault/my-stats').then(setMine).catch(() => { setMine(null); setMineErr(true) })
    apiRequest<Payout[]>('/vault/pending-payouts')
      .then((l) => setPending((Array.isArray(l) ? l : []).reduce((s, p) => s + Number(p.shareNgp ?? p.share ?? 0), 0)))
      .catch(() => setPending(0))
  }
  const loadSummary = () => { setSumErr(false); setSum(null); apiRequest<Summary>('/vault', { auth: false }).then(setSum).catch(() => setSumErr(true)) }
  const loadContrib = () => { setContribErr(false); setContrib(null); apiRequest<Contribution[]>('/vault/contributions?limit=20', { auth: false }).then((d) => setContrib(Array.isArray(d) ? d : [])).catch(() => setContribErr(true)) }
  const loadTrend = () => { setTrendErr(false); setTrend(null); apiRequest<Day[]>('/vault/trend', { auth: false }).then((d) => setTrend(Array.isArray(d) ? d : [])).catch(() => setTrendErr(true)) }

  useEffect(() => {
    document.title = 'Vault | OgaPay'
    loadSummary(); loadContrib(); loadTrend()
    loadMine()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const countdown = useCountdown(sum?.nextRunAt)
  const k = useMemo(() => {
    const d = trend || []
    const fees = d.reduce((s, x) => s + x.revenueNgp, 0)
    const shared = d.reduce((s, x) => s + x.distributedNgp, 0)
    const last7 = d.slice(-7).reduce((s, x) => s + x.distributedNgp, 0)
    return { fees, shared, last7 }
  }, [trend])
  const trendHasData = !!trend && trend.some((d) => d.revenueNgp !== 0 || d.distributedNgp > 0)

  const share = mine && sum && sum.paySupply > 0 ? mine.payBalance / sum.paySupply : 0
  const estNext = sum ? share * sum.pool.totalNgp : 0

  const claim = async () => {
    setClaiming(true); setNote(null)
    try {
      const r = await apiRequest<any>('/vault/claim', { method: 'POST' })
      setNote({ ok: true, text: r?.claimed ? `${naira(r.totalNgp)} added to your wallet.` : 'Nothing to claim right now.' })
      loadMine()
    } catch (e: any) { setNote({ ok: false, text: e?.message || 'Claim failed' }) }
    setClaiming(false)
  }

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow"><i className="ti ti-shield-lock" aria-hidden="true" /> $PAY rewards</span>
            <h1 className="ui-title">Vault</h1>
            <p className="ui-sub">Every 12 hours, platform fees are shared with $PAY holders.</p>
          </div>
          <div className="ui-actions">
            <Link className="ui-btn ui-btn-ghost ui-btn-sm" to="/vault/history"><i className="ti ti-history" aria-hidden="true" /> History</Link>
          </div>
        </div>

        <div className="ui-split vt2-split">
          <div className="vt2-col">
            {sumErr ? (
              <div className="vt2-o2"><LoadError what="the vault" onRetry={loadSummary} /></div>
            ) : (
              <>
                <div className="vt2-top vt2-o2">
                  <section className="ui-card vt2-bal" aria-label="Vault balance">
                    <div className="vt2-label">Vault balance</div>
                    {sum ? <div className="vt2-big">{naira(sum.pool.totalNgp)}</div> : <div className="ui-sk vt2-sk-big" />}
                    <div className="vt2-sub">Fees since the last run, shared at the next one.</div>
                  </section>
                  <section className="ui-card vt2-next" aria-label="Next distribution">
                    <div className="vt2-label">Next distribution</div>
                    {sum && countdown ? <div className="vt2-count">{countdown}</div> : <div className="ui-sk vt2-sk-count" />}
                    <div className="vt2-sub">Every 12 hours: 1am and 1pm in Lagos.</div>
                  </section>
                </div>

                <section className="ui-card vt2-strip vt2-o3" aria-label="The vault in numbers">
                  <div><span>$PAY held</span><b>{sum ? num(sum.paySupply) : <span className="ui-sk vt2-sk-val" />}</b></div>
                  <div><span>Eligible holders</span><b>{sum ? num(sum.eligibleCount) : <span className="ui-sk vt2-sk-val" />}</b></div>
                  <div><span>Shared so far</span><b>{sum ? naira(sum.totalDistributedNgp, 0) : <span className="ui-sk vt2-sk-val" />}</b></div>
                </section>
              </>
            )}

            <section className="ui-card vt2-sec vt2-o5" aria-labelledby="vt2-30-h">
              <h2 id="vt2-30-h">Last 30 days</h2>
              <p className="vt2-lead">Fees into the vault and the amount shared with holders, per day (UTC).</p>
              {trendErr ? <Failed what="the last 30 days" onRetry={loadTrend} /> : trend === null ? <div className="ui-sk" style={{ height: 210 }} /> : (
                <>
                  <div className="vt2-strip vt2-kpis">
                    <div><span>Fees in (30 days)</span><b>{naira(k.fees)}</b></div>
                    <div><span>Shared (7 days)</span><b>{naira(k.last7)}</b></div>
                    <div><span>Shared (30 days)</span><b>{naira(k.shared)}</b></div>
                  </div>
                  {trendHasData ? (
                    <>
                      <TrendChart days={trend} />
                      <div className="vt2-legend"><span><i style={{ background: 'var(--text3)', opacity: .45 }} />Fees in</span><span><i style={{ background: 'var(--green)' }} />Shared</span></div>
                    </>
                  ) : <p className="vt2-none">No fees in the last 30 days.</p>}
                </>
              )}
            </section>

            <section className="ui-card vt2-sec vt2-o6" aria-labelledby="vt2-contrib-h">
              <h2 id="vt2-contrib-h">Recent vault contributions</h2>
              <p className="vt2-lead">Latest fees paid into the vault.</p>
              {contribErr ? <Failed what="the contributions" onRetry={loadContrib} />
                : contrib === null ? <div className="ui-sk" style={{ height: 120 }} />
                : contrib.length === 0 ? <p className="vt2-none">No contributions yet. Fees arrive as jobs are posted.</p>
                : (
                  <table className="vt2-table">
                    <thead><tr><th>When</th><th>Amount</th><th>Job</th><th>Reason</th></tr></thead>
                    <tbody>
                      {contrib.map((c) => (
                        <tr key={c.id}>
                          <td className="when">{ago(c.at)}</td>
                          <td className={`amt ${c.amountNgp < 0 ? 'neg' : ''}`}>{naira(c.amountNgp)}</td>
                          <td className="ref">{c.ref || '—'}</td>
                          <td className="why">{c.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </section>
          </div>

          <div className="ui-split-side vt2-col vt2-side">
            <section className="ui-card vt2-sec vt2-o1" aria-labelledby="vt2-share-h">
              <div className="vt2-sec-head">
                <h2 id="vt2-share-h">Your share</h2>
                {mine && <span className={`vt2-pill${mine.payBalance > 0 ? ' ok' : ''}`}>{mine.payBalance > 0 ? 'In the next run' : 'Not in the next run'}</span>}
              </div>
              {!signedIn ? (
                <>
                  <p className="vt2-lead">Sign in to see your $PAY, your share of the next distribution and anything to claim.</p>
                  <button type="button" className="ui-btn ui-btn-dark vt2-wide" onClick={() => openSignIn({ redirect: '/vault' })}>Sign in</button>
                </>
              ) : mineErr ? (
                <Failed what="your share" onRetry={loadMine} />
              ) : !mine ? (
                <div className="ui-sk" style={{ height: 150 }} />
              ) : (
                <>
                  {pending > 0 && (
                    <div className="vt2-claim">
                      <span>You have <b>{naira(pending)}</b> from past distributions waiting.</span>
                      <button type="button" className={`ui-btn ui-btn-dark vt2-wide${claiming ? ' is-loading' : ''}`} disabled={claiming} onClick={claim}>Claim {naira(pending)}</button>
                    </div>
                  )}
                  {note && <div className={`vt2-note ${note.ok ? 'ok' : 'err'}`} role="status">{note.text}</div>}
                  <div className="ui-stats vt2-mini">
                    <div><span className="ui-stats-label">Your $PAY</span><b className="ui-stats-value">{num(mine.payBalance)}</b></div>
                    <div><span className="ui-stats-label">Vault share</span><b className="ui-stats-value">{sum ? `${(share * 100).toFixed(share > 0 && share < 0.0001 ? 6 : 2)}%` : '—'}</b></div>
                    <div><span className="ui-stats-label">Next payout (est.)</span><b className="ui-stats-value">{sum ? naira(estNext) : '—'}</b></div>
                    <div><span className="ui-stats-label">Earned so far</span><b className="ui-stats-value">{naira(mine.totalEarnedNgp)}</b></div>
                  </div>
                  {mine.payBalance <= 0 && <p className="vt2-lead" style={{ margin: '12px 0 0' }}>You don't hold $PAY yet, so you're not in the next distribution.</p>}
                </>
              )}
            </section>

            <section className="ui-card vt2-sec vt2-o4">
              <details className="vt2-how">
                <summary><div><h2>How it works</h2><p className="vt2-lead" style={{ margin: '4px 0 0' }}>Where the money comes from and who gets it.</p></div><i className="ti ti-chevron-down" aria-hidden="true" /></summary>
                <ol className="vt2-steps">
                  <li><span className="n">1</span><div><b>Fees fill the vault.</b> The platform fee on every job goes into the vault. When a job is cancelled and its fee refunded, that amount comes back out.</div></li>
                  <li><span className="n">2</span><div><b>Every 12 hours it's shared.</b> At 00:00 and 12:00 UTC the whole vault balance is split between everyone holding $PAY, in proportion to how much they hold.</div></li>
                  <li><span className="n">3</span><div><b>Your share is yours to claim.</b> Payouts appear here and go to your naira wallet when you claim. Shares under ₦1 are skipped.</div></li>
                </ol>
              </details>
            </section>

            <WalletCheck className="vt2-o7" />
          </div>
        </div>
      </div>
    </Layout>
  )
}
