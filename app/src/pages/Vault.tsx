import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import '../styles/profile-public.css'
import '../styles/vault.css'

// The vault shares platform revenue with $PAY holders every 12 hours (like wurk.fun's vault).
// This page used to be a hard-coded "document vault" with made-up files.

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

// Check any Solana wallet linked to an OgaPay account (the answer never says whose it is)
function WalletCheck() {
  const [addr, setAddr] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<{ ok: true; v: { payBalance: number; totalEarned: number; distributionsReceived: number; isEligible: boolean } } | { ok: false; msg: string } | null>(null)
  const check = async () => {
    const a = addr.trim()
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) { setRes({ ok: false, msg: "That doesn't look like a Solana address." }); return }
    setBusy(true); setRes(null)
    try {
      const d = await apiRequest<any>(`/vault/lookup?wallet=${encodeURIComponent(a)}`, { auth: false })
      setRes(d?.vault ? { ok: true, v: d.vault } : { ok: false, msg: 'No OgaPay account uses this wallet.' })
    } catch (e: any) {
      setRes({ ok: false, msg: /not found/i.test(e?.message || '') ? 'No OgaPay account uses this wallet.' : "Couldn't check right now. Try again." })
    }
    setBusy(false)
  }
  return (
    <section className="up-card vt2-sec">
      <h2>Check a wallet</h2>
      <p>Paste a Solana address linked to an OgaPay account to see its $PAY and vault earnings.</p>
      <form className="vt2-check" onSubmit={(e) => { e.preventDefault(); check() }}>
        <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Solana wallet address" aria-label="Solana wallet address" spellCheck={false} autoComplete="off" />
        <button className="up-btn primary" disabled={busy || !addr.trim()}>{busy ? 'Checking…' : 'Check'}</button>
      </form>
      {res && (res.ok ? (
        <div className="vt2-mine" style={{ marginTop: 12 }}>
          <div><span>$PAY held</span><b>{num(res.v.payBalance)}</b></div>
          <div><span>Earned from the vault</span><b>{naira(res.v.totalEarned)}</b></div>
          <div><span>Distributions received</span><b>{num(res.v.distributionsReceived)}</b></div>
          <div><span>Eligible next run</span><b>{res.v.isEligible ? 'Yes' : 'No'}</b></div>
        </div>
      ) : <p className="vt2-sub" style={{ marginTop: 10 }}>{res.msg}</p>)}
    </section>
  )
}

function useCountdown(to?: string) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  if (!to) return null
  const ms = new Date(to).getTime() - now
  if (ms <= 0) return 'Processing distribution…'
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

function TrendChart({ days }: { days: Day[] }) {
  const W = 720, H = 170, pad = 22
  const max = Math.max(1, ...days.map((d) => Math.max(d.revenueNgp, d.distributedNgp)))
  const bw = (W - pad * 2) / days.length
  return (
    <svg className="vt2-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Fees in and amount shared per day, last 30 days">
      {[0.5, 1].map((f) => <line key={f} x1={pad} x2={W - pad} y1={H - pad - f * (H - pad * 2)} y2={H - pad - f * (H - pad * 2)} stroke="var(--border)" strokeDasharray="3 4" />)}
      {days.map((d, i) => {
        const x = pad + i * bw
        const rh = (Math.max(0, d.revenueNgp) / max) * (H - pad * 2)
        const dh = (d.distributedNgp / max) * (H - pad * 2)
        return (
          <g key={d.day}>
            <title>{`${d.day}: fees ${naira(d.revenueNgp)} · shared ${naira(d.distributedNgp)}`}</title>
            <rect x={x + bw * 0.12} y={H - pad - rh} width={bw * 0.36} height={rh} rx="2" fill="var(--text3)" opacity=".45" />
            <rect x={x + bw * 0.52} y={H - pad - dh} width={bw * 0.36} height={dh} rx="2" fill="var(--green)" />
          </g>
        )
      })}
      <text x={pad} y={H - 4} fontSize="10" fill="var(--text3)">{days[0]?.day.slice(5)}</text>
      <text x={W - pad} y={H - 4} fontSize="10" fill="var(--text3)" textAnchor="end">{days[days.length - 1]?.day.slice(5)}</text>
      <text x={pad} y={12} fontSize="10" fill="var(--text3)">{naira(max, 0)}</text>
    </svg>
  )
}

export default function Vault() {
  const signedIn = !!getAccessToken()
  const [sum, setSum] = useState<Summary | null>(null)
  const [contrib, setContrib] = useState<Contribution[] | null>(null)
  const [trend, setTrend] = useState<Day[] | null>(null)
  const [mine, setMine] = useState<Mine | null>(null)
  const [pending, setPending] = useState<number>(0)
  const [claiming, setClaiming] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [err, setErr] = useState(false)

  const loadMine = () => {
    if (!signedIn) return
    apiRequest<Mine>('/vault/my-stats').then(setMine).catch(() => setMine(null))
    apiRequest<Payout[]>('/vault/pending-payouts')
      .then((l) => setPending((Array.isArray(l) ? l : []).reduce((s, p) => s + Number(p.shareNgp ?? p.share ?? 0), 0)))
      .catch(() => setPending(0))
  }

  useEffect(() => {
    document.title = 'Vault | OgaPay'
    apiRequest<Summary>('/vault', { auth: false }).then(setSum).catch(() => setErr(true))
    apiRequest<Contribution[]>('/vault/contributions?limit=20', { auth: false }).then((d) => setContrib(Array.isArray(d) ? d : [])).catch(() => setContrib([]))
    apiRequest<Day[]>('/vault/trend', { auth: false }).then((d) => setTrend(Array.isArray(d) ? d : [])).catch(() => setTrend([]))
    loadMine()
  }, [])

  const countdown = useCountdown(sum?.nextRunAt)
  const k = useMemo(() => {
    const d = trend || []
    const fees = d.reduce((s, x) => s + x.revenueNgp, 0)
    const shared = d.reduce((s, x) => s + x.distributedNgp, 0)
    const last7 = d.slice(-7).reduce((s, x) => s + x.distributedNgp, 0)
    return { fees, shared, last7 }
  }, [trend])

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
      <div className="up-wrap">
        <div className="vt2-head">
          <div>
            <h1>Vault</h1>
            <p>Every 12 hours, platform revenue is shared with $PAY holders.</p>
          </div>
          <Link className="up-btn" to="/vault/history"><i className="ti ti-history" /> Distribution history</Link>
        </div>

        {err && <div className="up-empty" style={{ marginBottom: 12 }}><i className="ti ti-cloud-off" />Couldn't load the vault. Refresh to try again.</div>}

        <div className="vt2-top">
          <section className="up-card vt2-bal">
            <div className="up-eyebrow">Vault balance</div>
            <div className="vt2-big">{sum ? naira(sum.pool.totalNgp) : '…'}</div>
            <div className="vt2-sub">Fees collected since the last distribution. Shared at the next run.</div>
          </section>
          <section className="up-card vt2-next">
            <div className="up-eyebrow">Next distribution</div>
            <div className="vt2-count">{countdown || '…'}</div>
            <div className="vt2-sub">Runs at 00:00 and 12:00 UTC (1am and 1pm in Lagos).</div>
          </section>
        </div>

        <div className="vt2-stats">
          <section className="up-card vt2-stat"><div className="up-eyebrow">$PAY held</div><b>{sum ? num(sum.paySupply) : '…'}</b></section>
          <section className="up-card vt2-stat"><div className="up-eyebrow">Eligible holders</div><b>{sum ? num(sum.eligibleCount) : '…'}</b></section>
          <section className="up-card vt2-stat"><div className="up-eyebrow">Shared so far</div><b>{sum ? naira(sum.totalDistributedNgp) : '…'}</b></section>
        </div>

        <section className="up-card vt2-sec">
          <h2>Your share</h2>
          {!signedIn ? (
            <>
              <p>Sign in to see your $PAY, your share of the next distribution and anything to claim.</p>
              <button className="up-btn primary" onClick={() => openSignIn({ redirect: '/vault' })}>Sign in</button>
            </>
          ) : !mine ? (
            <div className="up-skel" style={{ height: 70 }} />
          ) : (
            <>
              <p>{mine.payBalance > 0 ? "You're in the next distribution." : "You don't hold $PAY yet, so you're not in the next distribution."}</p>
              <div className="vt2-mine">
                <div><span>Your $PAY</span><b>{num(mine.payBalance)}</b></div>
                <div><span>Vault share</span><b>{(share * 100).toFixed(share > 0 && share < 0.0001 ? 6 : 2)}%</b></div>
                <div><span>Next payout (est.)</span><b>{naira(estNext)}</b></div>
                <div><span>Earned so far</span><b>{naira(mine.totalEarnedNgp)}</b></div>
              </div>
              {pending > 0 && (
                <div className="vt2-claim">
                  <span>You have <b style={{ color: 'var(--text)' }}>{naira(pending)}</b> from past distributions waiting.</span>
                  <button className="up-btn primary" disabled={claiming} onClick={claim}>{claiming ? 'Claiming…' : `Claim ${naira(pending)}`}</button>
                </div>
              )}
              {note && <div className={`up-note ${note.ok ? 'ok' : 'err'}`} role="status">{note.text}</div>}
            </>
          )}
        </section>

        <WalletCheck />

        <section className="up-card vt2-sec">
          <details className="vt2-how">
            <summary><div><h2>How it works</h2><p className="lead" style={{ margin: '4px 0 0' }}>Where the money comes from and who gets it.</p></div><i className="ti ti-chevron-down" /></summary>
            <ol className="vt2-steps">
              <li><span className="n">1</span><div><b>Fees fill the vault.</b> The platform fee on every job goes into the vault. When a job is cancelled and its fee refunded, that amount comes back out.</div></li>
              <li><span className="n">2</span><div><b>Every 12 hours it's shared.</b> At 00:00 and 12:00 UTC the whole vault balance is split between everyone holding $PAY, in proportion to how much they hold.</div></li>
              <li><span className="n">3</span><div><b>Your share is yours to claim.</b> Payouts appear here and go to your naira wallet when you claim. Shares under ₦1 are skipped.</div></li>
            </ol>
          </details>
        </section>

        <section className="up-card vt2-sec">
          <h2>Last 30 days</h2>
          <p>Fees into the vault and amount shared with holders, per day (UTC).</p>
          <div className="vt2-kpis">
            <div><span>Fees in (30d)</span><b>{trend ? naira(k.fees) : '…'}</b></div>
            <div><span>Shared (7d)</span><b>{trend ? naira(k.last7) : '…'}</b></div>
            <div><span>Shared (30d)</span><b>{trend ? naira(k.shared) : '…'}</b></div>
          </div>
          {trend === null ? <div className="up-skel" style={{ height: 170 }} /> : <TrendChart days={trend} />}
          <div className="vt2-legend"><span><i style={{ background: 'var(--text3)', opacity: .45 }} />Fees in</span><span><i style={{ background: 'var(--green)' }} />Shared</span></div>
        </section>

        <section className="up-card vt2-sec">
          <h2>Recent vault contributions</h2>
          <p>Latest fees paid into the vault.</p>
          {contrib === null ? <div className="up-skel" style={{ height: 120 }} />
            : contrib.length === 0 ? <div className="up-empty" style={{ padding: 24 }}><i className="ti ti-coin" />No contributions yet. Fees arrive as jobs are posted.</div>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table className="vt2-table">
                  <thead><tr><th>When</th><th>Amount</th><th>Job</th><th>Reason</th></tr></thead>
                  <tbody>
                    {contrib.map((c) => (
                      <tr key={c.id}>
                        <td>{ago(c.at)}</td>
                        <td className={`amt ${c.amountNgp < 0 ? 'neg' : ''}`}>{naira(c.amountNgp)}</td>
                        <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>{c.ref || '—'}</td>
                        <td>{c.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </div>
    </Layout>
  )
}
