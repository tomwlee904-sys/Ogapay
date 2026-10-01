import { useState, useEffect } from 'react'
import { useCurrency } from '../context/CurrencyContext'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import { SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader"
import type { Currency } from '../lib/currency'

// Earnings from the wallet ledger. This used to look for lower-case statuses
// ("completed") and add amounts as text, so it showed ₦0, "?" and raw type names.
type Kind = 'task' | 'referral' | 'bonus' | 'vault'
type HistoryItem = { date: string; source: string; amount: number; currency: Currency; ngn: number; kind: Kind; pending: boolean }

const LABEL: Record<Kind, string> = { task: 'Job payment', referral: 'Referral bonus', bonus: 'Sign-up bonus', vault: 'Vault reward' }
const MONEY: Currency[] = ['NGN', 'USDC', 'USDT', 'SOL']

function kindOf(t: any): Kind | null {
  const ref = `${t.reference || ''} ${t.description || ''}`.toUpperCase()
  if (ref.includes('VAULT')) return 'vault'
  if (['TASK_PAYMENT', 'EARNING', 'TASK_REWARD'].includes(t.type)) return 'task'
  if (t.type === 'REFERRAL_BONUS') return 'referral'
  if (t.type === 'SIGNUP_BONUS') return 'bonus'
  return null
}

export default function TabEarningsContent() {
  const { fmt, convert } = useCurrency()
  const { user: authUser } = useAuth()
  const [period, setPeriod] = useState('7d')
  const [tab, setTab] = useState<'all' | Kind>('all')

  const [loading, setLoading] = useState(true)
  const [taskTotal, setTaskTotal] = useState(0)
  const [availableBalance, setAvailableBalance] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  async function loadData() {
    const [summary, balanceData, txData] = await Promise.all([
      apiRequest<any>('/wallet/summary').catch(() => null),
      apiRequest<any>('/wallet/balance').catch(() => null),
      apiRequest<any>('/users/transactions/history?limit=100').catch(() => null),
    ])
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
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    const onFocus = () => loadData()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authUser?.id])

  useEffect(() => { injectSkeletonStyles(); }, []);

  const done = history.filter((h) => !h.pending)
  const sum = (k: Kind) => done.filter((h) => h.kind === k).reduce((s, h) => s + h.ngn, 0)
  const referrals = sum('referral'), bonuses = sum('bonus'), vault = sum('vault')
  const totalEarned = taskTotal + referrals + bonuses + vault
  const pending = history.filter((h) => h.pending).reduce((s, h) => s + h.ngn, 0)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  const monthEarnings = done.filter((h) => new Date(h.date).getTime() >= monthStart).reduce((s, h) => s + h.ngn, 0)
  const jobsPaid = done.filter((h) => h.kind === 'task').length

  // Money earned per day (oldest first)
  const days = period === '7d' ? 7 : 30
  const bars = (() => {
    if (!done.length) return []
    const out = new Array(days).fill(0)
    const now = Date.now()
    for (const h of done) {
      const idx = Math.floor((now - new Date(h.date).getTime()) / 86400000)
      if (idx >= 0 && idx < days) out[days - 1 - idx] += h.ngn
    }
    return out
  })()

  const naira = (v: number) => fmt(v, 'NGN')
  const filtered = tab === 'all' ? history : history.filter(h => h.kind === tab)

  const formatDate = (d: string) => {
    const date = new Date(d)
    const days = Math.floor((Date.now() - date.getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return <SkeletonPage />
  }

  return (
    <>
      <style>{`
        .en-hero{margin-bottom:20px}
        .en-hero h1{font-family:Geist;font-size:28px;font-weight:900;margin:0 0 4px}
        .en-hero p{color:var(--text2);font-size:14px;margin:0}
        .en-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        @media(max-width:800px){.en-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:500px){.en-grid{grid-template-columns:1fr}}
        .en-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;transition:all .25s}
        .en-stat:hover{transform:none;border-color:var(--accent)}
        .en-stat .esi{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;margin-bottom:8px}
        .en-stat .esn{font-family:Geist;font-size:22px;font-weight:900}
        .en-stat .esl{color:var(--text2);font-size:12px;margin-top:2px}
        .en-graph-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:24px}
        .en-graph-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px}
        .en-graph-title{font-family:Geist;font-size:15px;font-weight:800}
        .en-tabs{display:flex;gap:4px}
        .en-tab{padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}
        .en-tab:hover,.en-tab.active{border-color:var(--accent);color:var(--accent);background:rgba(var(--accent-rgb),.08)}
        .en-graph{display:flex;align-items:flex-end;gap:4px;height:120px}
        .en-bar{flex:1;border-radius:4px 4px 0 0;min-height:8px;position:relative;background:linear-gradient(to top, rgba(var(--accent-rgb),.3), var(--accent));transition:height .3s}
        .en-bar .en-val{position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:9px;color:var(--text3);white-space:nowrap}
        .en-history{margin-top:16px}
        .en-h-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
        .en-h-item:last-child{border-bottom:0}
        .en-h-date{font-size:11px;color:var(--text3);min-width:70px}
        .en-h-source{flex:1;font-size:13px;font-weight:600}
        .en-h-amount{font-weight:700;font-size:13px;color:var(--green);white-space:nowrap}
      `}</style>

      <div className="en-hero">
        <h1>Earnings</h1>
        <p>Money you've earned from jobs, referrals, bonuses and the vault</p>
      </div>

      <div className="en-grid">
        {[
          { icon: 'ti ti-coin', color: 'var(--accent)', num: naira(totalEarned), label: 'Total earned' },
          { icon: 'ti ti-wallet', color: 'var(--green)', num: availableBalance === null ? '—' : naira(availableBalance), label: 'Available to withdraw' },
          { icon: 'ti ti-clock', color: '#F59E0B', num: naira(pending), label: 'On the way' },
          { icon: 'ti ti-trending-up', color: 'var(--accent)', num: naira(monthEarnings), label: 'This month' },
        ].map((s, i) => (
          <div className="en-stat" key={i}>
            <div className="esi" style={{ background: `${s.color}15`, color: s.color }}><i className={s.icon} /></div>
            <div className="esn" style={{ color: s.color }}>{s.num}</div>
            <div className="esl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="en-graph-card">
        <div className="en-graph-header">
          <span className="en-graph-title"><i className="ti ti-trending-up" style={{color:'var(--accent)',marginRight:6}} />Earnings Overview</span>
          <div className="en-tabs">
            {['7d', '30d'].map(p => (
              <button key={p} className={`en-tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                {p === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>
        <div className="en-graph">
          {bars.some((b) => b > 0) && bars.map((b, i) => {
            const h = Math.min(Math.max(b / Math.max(...bars, 1) * 100, 4), 100)
            return (
              <div key={i} className="en-bar" style={{ height: h + '%' }}>
                {b > 0 && <div className="en-val">{naira(b)}</div>}
              </div>
            )
          })}
          {bars.every((b) => !b) && <div style={{width:'100%',textAlign:'center',color:'var(--text2)',fontSize:12,padding:24}}>Nothing earned in the last {days} days</div>}
        </div>
      </div>

      <div className="en-grid" style={{marginBottom:24}}>
        {[
          { icon: 'ti ti-briefcase', color: 'var(--accent)', num: naira(taskTotal), label: 'From jobs', sub: `${jobsPaid} recent ${jobsPaid === 1 ? 'payment' : 'payments'}` },
          { icon: 'ti ti-affiliate', color: 'var(--accent)', num: naira(referrals), label: 'From referrals', sub: 'Referral bonuses' },
          { icon: 'ti ti-gift', color: '#F59E0B', num: naira(bonuses), label: 'Bonuses', sub: 'Sign-up bonus' },
          { icon: 'ti ti-vault', color: 'var(--green)', num: naira(vault), label: 'From the vault', sub: 'Vault rewards' },
        ].map((s, i) => (
          <div className="en-stat" key={i}>
            <div className="esi" style={{ background: `${s.color}15`, color: s.color }}><i className={s.icon} /></div>
            <div className="esn">{s.num}</div>
            <div className="esl">{s.label}</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="en-graph-card">
        <div className="en-graph-header">
          <span className="en-graph-title"><i className="ti ti-history" style={{color:'var(--accent)',marginRight:6}} />Earnings History</span>
          <div className="en-tabs">
            {([['all', 'All'], ['task', 'Jobs'], ['referral', 'Referrals'], ['bonus', 'Bonuses'], ['vault', 'Vault']] as const).map(([t, label]) => (
              <button key={t} className={`en-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="en-history">
          {(filtered || []).map((h, i) => (
            <div className="en-h-item" key={i}>
              <span className="en-h-date">{formatDate(h.date)}</span>
              <span className="en-h-source">{h.source}</span>
              <span className="en-h-amount">{h.pending && <em style={{ fontStyle: 'normal', color: 'var(--text3)', fontWeight: 500, marginRight: 6 }}>on the way</em>}+{fmt(h.amount, h.currency)}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{textAlign:'center',padding:24,color:'var(--text2)',fontSize:13}}>No entries found</div>
          )}
        </div>
      </div>
    </>
  )
}
