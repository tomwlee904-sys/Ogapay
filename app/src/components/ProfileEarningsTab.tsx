import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useCurrency } from '../context/CurrencyContext'
import { useMoney } from '../lib/useMoney'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import LoadError from './LoadError'
import type { Currency } from '../lib/currency'

// Earnings from the wallet ledger. This used to look for lower-case statuses
// ("completed") and add amounts as text, so it showed ₦0, "?" and raw type names.
// Laid out: the four headline numbers in one card (2 per row on phones), the
// chart beside "Where it came from" (desktop), then the history. One filter
// (kind) drives both the chart and the history; the source rows set it too.
type Kind = 'task' | 'referral' | 'bonus' | 'vault' | 'tip'
type HistoryItem = { date: string; source: string; amount: number; currency: Currency; ngn: number; kind: Kind; pending: boolean }

const LABEL: Record<Kind, string> = { task: 'Job payment', referral: 'Referral bonus', bonus: 'Sign-up bonus', vault: 'Vault reward', tip: 'Tip' }
const MONEY: Currency[] = ['NGN', 'USDC', 'USDT', 'SOL']
// The filter, in the same order as "Where it came from"
const KINDS: ['all' | Kind, string][] = [['all', 'All'], ['task', 'Jobs'], ['referral', 'Referrals'], ['bonus', 'Bonuses'], ['vault', 'Vault'], ['tip', 'Tips']]
const PERIODS = [['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['1y', '1 year']] as const
const ICON: Record<Kind, string> = { task: 'ti-briefcase', referral: 'ti-affiliate', bonus: 'ti-gift', vault: 'ti-vault', tip: 'ti-heart-handshake' }
const TINT: Record<Kind, string> = { task: 'var(--text)', referral: 'var(--text)', bonus: 'var(--en-warn)', vault: 'var(--green)', tip: 'var(--green)' }

function kindOf(t: any): Kind | null {
  // Tips from other members (profile, approved work or a blog post) are transfers
  // the server marks { tip: true }; first, so a tip's note can't make it look like a vault reward
  if (t.type === 'TRANSFER' && t.metadata?.tip) return 'tip'
  // Blog tips from before tips were marked: their record says 'Received: Tip for "<post>"'
  if (t.type === 'TRANSFER' && /^Received: Tip for "/.test(t.description || '')) return 'tip'
  const ref = `${t.reference || ''} ${t.description || ''}`.toUpperCase()
  if (ref.includes('VAULT')) return 'vault'
  if (['TASK_PAYMENT', 'EARNING', 'TASK_REWARD'].includes(t.type)) return 'task'
  if (t.type === 'REFERRAL_BONUS') return 'referral'
  if (t.type === 'SIGNUP_BONUS') return 'bonus'
  return null
}

export default function TabEarningsContent() {
  const { convert } = useCurrency()
  const { user: authUser } = useAuth()
  const [period, setPeriod] = useState('7d')
  const [kind, setKind] = useState<'all' | Kind>('all')

  const [loading, setLoading] = useState(true)
  // The first load failed: say so instead of showing ₦0 everywhere. (A later
  // refresh that fails keeps what's on screen.)
  const [failed, setFailed] = useState(false)
  const loadedOnce = useRef(false)
  const [taskTotal, setTaskTotal] = useState(0)
  const [availableBalance, setAvailableBalance] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  // Per-day totals from the server for the chart, so 90 days and a year work
  // (the history list below only has the latest 100 entries)
  const [series, setSeries] = useState<{ day: string; kind: Kind; currency: Currency; amount: number }[] | null>(null)
  const [seriesFailed, setSeriesFailed] = useState(false)
  const [seriesKey, setSeriesKey] = useState(0)

  async function loadData() {
    const [summary, balanceData, txData] = await Promise.all([
      apiRequest<any>('/wallet/summary').catch(() => null),
      apiRequest<any>('/wallet/balance').catch(() => null),
      apiRequest<any>('/users/transactions/history?limit=100').catch(() => null),
    ])
    // The history and the balance are what the numbers come from
    if (txData === null || balanceData === null) {
      if (!loadedOnce.current) { setFailed(true); setLoading(false) }
      return
    }
    const rows: any[] = Array.isArray(txData) ? txData : txData?.transactions ?? []
    const toNgn = (amount: number, cur: Currency) => cur === 'NGN' ? amount : convert(amount, cur, 'NGN')

    const items: HistoryItem[] = []
    for (const t of rows) {
      const kind = kindOf(t)
      const currency = (MONEY.includes(t.currency) ? t.currency : null) as Currency | null
      const status = String(t.status || '').toUpperCase()
      // money coming in only (the same types can also be a refund going out)
      const credit = Number(t.balanceAfter) > Number(t.balanceBefore) || (t.balanceAfter == null && Number(t.amount) > 0)
      if (!kind || !currency || !credit || !['COMPLETED', 'PENDING', 'PROCESSING'].includes(status)) continue
      const amount = Number(t.amount) || 0
      items.push({ date: t.completedAt || t.createdAt, source: t.description || LABEL[kind], amount, currency, ngn: toNgn(amount, currency), kind, pending: status !== 'COMPLETED' })
    }

    // Lifetime job earnings come from the server's total, not just the last 100 entries
    let lifetimeTasks: number | null = null
    if (summary && typeof summary === 'object') {
      lifetimeTasks = 0
      for (const [cur, v] of Object.entries<any>(summary)) {
        if (MONEY.includes(cur as Currency)) lifetimeTasks += toNgn(Number(v?.earned) || 0, cur as Currency)
      }
    }
    setTaskTotal(lifetimeTasks ?? items.filter((h) => h.kind === 'task' && !h.pending).reduce((s, h) => s + h.ngn, 0))
    const ngn = balanceData?.NGN
    setAvailableBalance(ngn ? Number(ngn.available ?? ngn.balance) || 0 : null)
    setHistory(items)
    loadedOnce.current = true
    setFailed(false)
    setLoading(false)
  }
  const retry = () => { setFailed(false); setLoading(true); loadData() }

  useEffect(() => {
    loadData()
    const onFocus = () => loadData()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authUser?.id])

  const days = ({ '7d': 7, '30d': 30, '90d': 90, '1y': 365 } as Record<string, number>)[period] || 30
  useEffect(() => {
    let live = true
    setSeries(null)
    setSeriesFailed(false)
    apiRequest<any>(`/users/me/earnings/series?days=${days}`)
      .then((d) => { if (live) setSeries(Array.isArray(d?.series) ? d.series : []) })
      // Keep the series empty (the chart falls back to the latest entries) and say so
      .catch(() => { if (live) setSeriesFailed(true) })
    return () => { live = false }
  }, [days, authUser?.id, seriesKey])

  const done = history.filter((h) => !h.pending)
  const sum = (k: Kind) => done.filter((h) => h.kind === k).reduce((s, h) => s + h.ngn, 0)
  const referrals = sum('referral'), bonuses = sum('bonus'), vault = sum('vault'), tips = sum('tip')
  const tipCount = done.filter((h) => h.kind === 'tip').length
  const totalEarned = taskTotal + referrals + bonuses + vault + tips
  const pending = history.filter((h) => h.pending).reduce((s, h) => s + h.ngn, 0)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  const monthEarnings = done.filter((h) => new Date(h.date).getTime() >= monthStart).reduce((s, h) => s + h.ngn, 0)
  const jobsPaid = done.filter((h) => h.kind === 'task').length

  // Money earned per bar (oldest first): a day for 7 and 30 days, a week for 90
  // days, a month (30 days) for the last year. From the server's per-day totals,
  // or the recent history while those load.
  const step = days === 365 ? 30 : days === 90 ? 7 : 1
  const barCount = Math.ceil(days / step)
  const toNgn = (amount: number, cur: Currency) => cur === 'NGN' ? amount : convert(amount, cur, 'NGN')
  const points = series
    ? series.filter((p) => kind === 'all' || p.kind === kind).map((p) => ({ date: p.day + 'T12:00:00Z', ngn: toNgn(Number(p.amount) || 0, p.currency) }))
    : done.filter((h) => kind === 'all' || h.kind === kind).map((h) => ({ date: h.date, ngn: h.ngn }))
  const bars = (() => {
    if (!points.length) return []
    const out = new Array(barCount).fill(0)
    const now = Date.now()
    for (const h of points) {
      const idx = Math.floor((now - new Date(h.date).getTime()) / 86400000 / step)
      if (idx >= 0 && idx < barCount) out[barCount - 1 - idx] += h.ngn
    }
    return out
  })()
  const rangeTotal = bars.reduce((a, b) => a + b, 0)
  const rangeName = days === 365 ? 'the last year' : `the last ${days} days`

  // In the display currency the person chose (it always showed naira)
  const show = useMoney()
  const naira = (v: number) => show(v, 'NGN')
  const filtered = kind === 'all' ? history : history.filter((h) => h.kind === kind)
  const kindLabel = KINDS.find(([k]) => k === kind)?.[1] || ''

  const formatDate = (d: string) => {
    const date = new Date(d)
    const days = Math.floor((Date.now() - date.getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const sources: { kind: Kind; label: string; sub: string; num: string }[] = [
    { kind: 'task', label: 'Jobs', sub: `${jobsPaid} recent ${jobsPaid === 1 ? 'payment' : 'payments'}`, num: naira(taskTotal) },
    { kind: 'referral', label: 'Referrals', sub: 'Referral bonuses', num: naira(referrals) },
    { kind: 'bonus', label: 'Bonuses', sub: 'Sign-up bonus', num: naira(bonuses) },
    { kind: 'vault', label: 'Vault', sub: 'Vault rewards', num: naira(vault) },
    { kind: 'tip', label: 'Tips', sub: `${tipCount} recent ${tipCount === 1 ? 'tip' : 'tips'} from members`, num: naira(tips) },
  ]
  const tint = (k: Kind) => ({ '--c': TINT[k] }) as CSSProperties

  const header = (
    <div className="ui-head en-head">
      <div>
        <span className="ui-eyebrow"><i className="ti ti-coin" aria-hidden="true" /> Money</span>
        <h1 className="ui-title">Earnings</h1>
        <p className="ui-sub">What you've earned from jobs, referrals, bonuses, tips and the vault.</p>
      </div>
    </div>
  )

  return (
    <div className="en">
      <style>{`
        .en{--en-warn:#b45309;display:grid;gap:16px}
        [data-theme="dark"] .en{--en-warn:#fbbf24}
        .en-head{margin-bottom:8px}
        .en-stats .ui-stats-value.pos{color:var(--green)}
        .en-stats .ui-stats-value.warn{color:var(--en-warn)}
        .en-row{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start}
        .en-card{padding:20px;min-width:0}
        .en-card h2{margin:0;font-size:16px;font-weight:600;letter-spacing:-.02em;color:var(--text)}
        .en-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px 12px;flex-wrap:wrap;margin-bottom:14px}
        .en-card-sub{margin:4px 0 0;font-size:13px;line-height:1.5;color:var(--text2)}
        .en-seg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:4px;border-radius:var(--r-ctl);background:var(--card2)}
        .en-seg button{height:36px;border:0;border-radius:8px;background:transparent;color:var(--text2);font:500 13px var(--font);cursor:pointer;white-space:nowrap}
        .en-seg button:hover:not([aria-pressed="true"]){color:var(--text)}
        .en-seg button[aria-pressed="true"]{background:var(--text);color:var(--bg)}
        .en-kinds{margin:12px 0 4px;padding:2px 0}
        .en-kinds .ui-chip{height:36px}
        .en-graph{display:flex;align-items:flex-end;gap:4px;height:140px;margin-top:28px}
        .en-bar{flex:1;border-radius:4px 4px 0 0;min-height:8px;position:relative;background:linear-gradient(to top, rgba(var(--accent-rgb),.3), var(--accent));transition:height .3s}
        .en-bar .en-val{position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:11px;color:var(--text2);white-space:nowrap}
        .en-graph-empty{width:100%;align-self:center;text-align:center;color:var(--text2);font-size:13px;padding:24px 8px}
        .en-hint{margin:10px 0 0;font-size:12.5px;line-height:1.5;color:var(--text2)}
        .en-hint button{border:0;background:none;padding:0;font:600 12.5px var(--font);color:var(--text);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
        .en-ic{width:36px;height:36px;flex-shrink:0;border-radius:var(--r-ctl);display:grid;place-items:center;font-size:17px;color:var(--c);background:color-mix(in srgb, var(--c) 12%, transparent)}
        .en-src{list-style:none;margin:8px 0 0;padding:0}
        .en-src li+li{border-top:1px solid var(--border)}
        .en-src-row{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 6px;margin:0 -6px;width:calc(100% + 12px);border:0;border-radius:var(--r-ctl);background:none;text-align:left;cursor:pointer;font-family:inherit;color:inherit}
        .en-src-row:hover{background:var(--card2)}
        .en-src-row[aria-pressed="true"]{background:var(--card2);box-shadow:inset 3px 0 0 var(--text)}
        .en-src-main{flex:1;min-width:0}
        .en-src-main b{display:block;font-size:14px;font-weight:600;color:var(--text)}
        .en-src-main span{display:block;margin-top:2px;font-size:12.5px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .en-src-amt{flex-shrink:0;font-size:14px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums}
        .en-h-list{list-style:none;margin:0;padding:0}
        .en-h{display:flex;align-items:center;gap:12px;padding:12px 0}
        .en-h+.en-h{border-top:1px solid var(--border)}
        .en-h-main{flex:1;min-width:0}
        .en-h-main b{display:block;font-size:14px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .en-h-main span{display:block;margin-top:2px;font-size:12.5px;color:var(--text2)}
        .en-h-amt{flex-shrink:0;text-align:right;font-size:14px;font-weight:600;color:var(--green);font-variant-numeric:tabular-nums}
        .en-h-amt em{display:block;margin-top:3px;font:500 12px var(--font);font-style:normal;color:var(--en-warn)}
        .en-empty-act{margin-top:14px}
        @media (min-width:1024px){
          .en-row{grid-template-columns:minmax(0,2fr) minmax(320px,1fr)}
          .en-card{padding:24px}
        }
        @media (max-width:767.98px){
          .en-card{padding:16px}
          .en-kinds{margin-right:-16px;padding-right:16px}
          .en-kinds .ui-chip{height:40px}
          .en-seg button{height:36px;font-size:13px}
          .en-graph{height:120px}
        }
      `}</style>

      {header}

      {loading ? (
        <>
          <div className="ui-sk" style={{ height: 150 }} />
          <div className="ui-sk" style={{ height: 280 }} />
          <div className="ui-sk" style={{ height: 240 }} />
        </>
      ) : failed ? (
        <LoadError what="your earnings" onRetry={retry} />
      ) : (
        <>
          <section className="ui-stats en-stats" aria-label="Your earnings in numbers">
            <div><span className="ui-stats-label">Total earned</span><b className="ui-stats-value">{naira(totalEarned)}</b></div>
            <div><span className="ui-stats-label">Available to withdraw</span><b className="ui-stats-value pos">{availableBalance === null ? '—' : naira(availableBalance)}</b></div>
            <div><span className="ui-stats-label">On the way</span><b className="ui-stats-value warn">{naira(pending)}</b></div>
            <div><span className="ui-stats-label">This month</span><b className="ui-stats-value">{naira(monthEarnings)}</b></div>
          </section>

          <div className="en-row">
            <section className="ui-card en-card" aria-labelledby="en-chart-h">
              <div className="en-card-head">
                <div>
                  <h2 id="en-chart-h">Earned over time</h2>
                  <p className="en-card-sub">{naira(rangeTotal)}{kind !== 'all' ? ` from ${kindLabel.toLowerCase()}` : ''} in {rangeName}{step > 1 ? ` · each bar is ${step === 7 ? 'a week' : 'a month'}` : ''}</p>
                </div>
              </div>
              <div className="en-seg" role="group" aria-label="Period">
                {PERIODS.map(([p, label]) => (
                  <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>{label}</button>
                ))}
              </div>
              <div className="en-kinds ui-scroll-row" role="group" aria-label="Show earnings from">
                {KINDS.map(([k, label]) => (
                  <button key={k} type="button" className={`ui-chip${kind === k ? ' on' : ''}`} aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>
                ))}
              </div>
              <div className="en-graph">
                {bars.some((b) => b > 0) && bars.map((b, i) => {
                  const h = Math.min(Math.max(b / Math.max(...bars, 1) * 100, 4), 100)
                  return (
                    <div key={i} className="en-bar" style={{ height: h + '%' }} title={naira(b)}>
                      {b > 0 && barCount <= 13 && <div className="en-val">{naira(b)}</div>}
                    </div>
                  )
                })}
                {bars.every((b) => !b) && <div className="en-graph-empty">Nothing earned in {rangeName}{kind !== 'all' ? ` from ${kindLabel.toLowerCase()}` : ''}.</div>}
              </div>
              {seriesFailed && (
                <p className="en-hint" role="status">We couldn't load the full chart, so it shows only your latest entries. <button type="button" onClick={() => setSeriesKey((n) => n + 1)}>Try again</button></p>
              )}
            </section>

            <section className="ui-card en-card" aria-labelledby="en-src-h">
              <h2 id="en-src-h">Where it came from</h2>
              <ul className="en-src">
                {sources.map((s) => (
                  <li key={s.kind}>
                    <button type="button" className="en-src-row" aria-pressed={kind === s.kind} onClick={() => setKind(kind === s.kind ? 'all' : s.kind)}>
                      <span className="en-ic" style={tint(s.kind)} aria-hidden="true"><i className={`ti ${ICON[s.kind]}`} /></span>
                      <span className="en-src-main"><b>{s.label}</b><span>{s.sub}</span></span>
                      <span className="en-src-amt">{s.num}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="ui-card en-card" aria-labelledby="en-hist-h">
            <div className="en-card-head" style={{ marginBottom: 4 }}>
              <h2 id="en-hist-h">Earnings history{kind !== 'all' ? `: ${kindLabel}` : ''}</h2>
              {kind !== 'all' && <button type="button" className="ui-btn ui-btn-text ui-btn-sm" onClick={() => setKind('all')}>Show all</button>}
            </div>
            {history.length === 0 ? (
              <div className="ui-empty" style={{ marginTop: 10 }}>
                <strong>No earnings yet</strong>
                Finish a job to get paid. Everything you earn shows up here.
                <div className="en-empty-act"><Link className="ui-btn ui-btn-dark" to="/tasks">Find a job</Link></div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="ui-empty" style={{ marginTop: 10, padding: '32px 20px' }}>
                <strong>No {kindLabel.toLowerCase()} earnings yet</strong>
                They show up here once they're paid.
              </div>
            ) : (
              <ul className="en-h-list">
                {filtered.map((h, i) => (
                  <li className="en-h" key={i}>
                    <span className="en-ic" style={tint(h.kind)} aria-hidden="true"><i className={`ti ${ICON[h.kind]}`} /></span>
                    <span className="en-h-main"><b>{h.source}</b><span>{LABEL[h.kind]} · {formatDate(h.date)}</span></span>
                    <span className="en-h-amt">+{show(h.amount, h.currency || 'NGN')}{h.pending && <em>On the way</em>}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
