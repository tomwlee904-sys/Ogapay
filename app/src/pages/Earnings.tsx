import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useCurrency } from '../context/CurrencyContext'
import { apiRequest } from '../lib/api'
import { SkeletonPage, SkeletonStats, injectSkeletonStyles } from "../components/SkeletonLoader"

const graphValues: Record<string, number[]> = {
  '7d': [35, 55, 42, 70, 48, 62, 85],
  '30d': [45, 62, 38, 55, 72, 48, 58, 65, 42, 58, 70, 52, 48, 62, 78, 55, 48, 62, 70, 52, 58, 45, 62, 68, 52, 58, 72, 48, 55, 62],
}

type HistoryItem = {
  date: string
  source: string
  amount: number
  type: string
}

export default function Earnings() {
  const { fmt } = useCurrency()
  const [period, setPeriod] = useState('7d')
  const [tab, setTab] = useState('all')
  const bars = graphValues[period] || graphValues['7d']

  const [loading, setLoading] = useState(true)
  const [totalEarned, setTotalEarned] = useState<number | null>(null)
  const [availableBalance, setAvailableBalance] = useState<number | null>(null)
  const [pendingEarnings, setPendingEarnings] = useState<number | null>(null)
  const [monthEarnings, setMonthEarnings] = useState<number | null>(null)
  const [jobsCompleted, setJobsCompleted] = useState(0)
  const [referrals, setReferrals] = useState<number | null>(null)
  const [tips, setTips] = useState<number | null>(null)
  const [vault, setVault] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      let total: number | null = null
      let balance: number | null = null
      let transactions: any[] = []

      try {
        const [earningsData, balanceData, txData] = await Promise.all([
          apiRequest('/users/me/earnings').catch(() => null),
          apiRequest('/wallet/balance').catch(() => null),
          apiRequest('/users/transactions/history').catch(() => null),
        ])
        total = earningsData?.total ?? null
        balance = balanceData?.balance ?? balanceData?.availableBalance ?? null
        transactions = Array.isArray(txData) ? txData : txData?.transactions ?? txData?.data ?? []
      } catch {}

      if (total === null && transactions.length > 0) {
        total = transactions
          .filter((t: any) => t.status === 'completed' || t.status === 'successful')
          .filter((t: any) => ['TASK_PAYMENT', 'REFERRAL_BONUS', 'TIP', 'VAULT_REWARD'].includes(t.type))
          .reduce((s: number, t: any) => s + (t.amount || 0), 0)
      }

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthTotal = transactions
        .filter((t: any) => {
          const d = new Date(t.createdAt || t.date)
          return d >= monthStart && (t.status === 'completed' || t.status === 'successful')
        })
        .filter((t: any) => ['TASK_PAYMENT', 'REFERRAL_BONUS', 'TIP', 'VAULT_REWARD'].includes(t.type))
        .reduce((s: number, t: any) => s + (t.amount || 0), 0)

      const pending = transactions
        .filter((t: any) => t.status === 'pending')
        .reduce((s: number, t: any) => s + (t.amount || 0), 0)

      const referralTotal = transactions
        .filter((t: any) => t.type === 'REFERRAL_BONUS' && (t.status === 'completed' || t.status === 'successful'))
        .reduce((s: number, t: any) => s + (t.amount || 0), 0)

      const tipsTotal = transactions
        .filter((t: any) => t.type === 'TIP' && (t.status === 'completed' || t.status === 'successful'))
        .reduce((s: number, t: any) => s + (t.amount || 0), 0)

      const vaultTotal = transactions
        .filter((t: any) => t.type === 'VAULT_REWARD' && (t.status === 'completed' || t.status === 'successful'))
        .reduce((s: number, t: any) => s + (t.amount || 0), 0)

      const jobs = transactions
        .filter((t: any) => t.type === 'TASK_PAYMENT' && (t.status === 'completed' || t.status === 'successful'))
        .length

      const incomeHistory: HistoryItem[] = transactions
        .filter((t: any) => ['TASK_PAYMENT', 'REFERRAL_BONUS', 'TIP', 'VAULT_REWARD'].includes(t.type))
        .map((t: any) => ({
          date: t.createdAt || t.date,
          source: t.description || t.type,
          amount: t.amount || 0,
          type: t.type === 'TASK_PAYMENT' ? 'task' : t.type === 'REFERRAL_BONUS' ? 'referral' : t.type === 'TIP' ? 'tip' : 'vault',
        }))

      setTotalEarned(total)
      setAvailableBalance(balance)
      setPendingEarnings(pending || null)
      setMonthEarnings(monthTotal || null)
      setJobsCompleted(jobs)
      setReferrals(referralTotal || null)
      setTips(tipsTotal || null)
      setVault(vaultTotal || null)
      setHistory(incomeHistory)
      setLoading(false)
    }

    fetchData()
  }, [])

  useEffect(() => { injectSkeletonStyles(); }, []);

  const dv = (v: number | null) => v !== null ? fmt(v, 'NGN') : '?'

  const tasksFromEarnings = totalEarned !== null
    ? fmt(totalEarned - (referrals ?? 0) - (tips ?? 0) - (vault ?? 0), 'NGN')
    : '?'

  const filtered = tab === 'all' ? history : history.filter(h => h.type === tab)

  const formatDate = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 14) return '1 week ago'
    return date.toLocaleDateString()
  }

  const formatAmount = (amount: number) => `+NGN ${amount.toLocaleString()}`

  if (loading) {
    return (
      <Layout>
        <SkeletonPage />
      </Layout>
    )
  }

  return (
    <Layout>
      <style>{`
        .en-hero{margin-bottom:20px}
        .en-hero h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0 0 4px}
        .en-hero p{color:var(--text2);font-size:14px;margin:0}
        .en-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        @media(max-width:800px){.en-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:500px){.en-grid{grid-template-columns:1fr}}
        .en-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;transition:all .25s}
        .en-stat:hover{transform:translateY(-2px);border-color:var(--accent)}
        .en-stat .esi{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;margin-bottom:8px}
        .en-stat .esn{font-family:Outfit;font-size:22px;font-weight:900}
        .en-stat .esl{color:var(--text2);font-size:12px;margin-top:2px}
        .en-graph-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:24px}
        .en-graph-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px}
        .en-graph-title{font-family:Outfit;font-size:15px;font-weight:800}
        .en-tabs{display:flex;gap:4px}
        .en-tab{padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}
        .en-tab:hover,.en-tab.active{border-color:var(--accent);color:var(--accent);background:rgba(31,140,255,.08)}
        .en-graph{display:flex;align-items:flex-end;gap:4px;height:120px}
        .en-bar{flex:1;border-radius:4px 4px 0 0;min-height:8px;position:relative;background:linear-gradient(to top, rgba(31,140,255,.3), var(--accent));transition:height .3s}
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
        <p>Track your income from tasks, referrals, tips, and vault rewards</p>
      </div>

      <div className="en-grid">
        {[
          { icon: 'ti ti-coin', color: '#191C6B', num: dv(totalEarned), label: 'Total Earned' },
          { icon: 'ti ti-wallet', color: '#16a34a', num: dv(availableBalance), label: 'Available Balance' },
          { icon: 'ti ti-clock', color: '#F59E0B', num: dv(pendingEarnings), label: 'Pending Earnings' },
          { icon: 'ti ti-trending-up', color: '#191C6B', num: dv(monthEarnings), label: 'This Month' },
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
          {bars.map((b, i) => (
            <div key={i} className="en-bar" style={{ height: Math.min(b * 1.1, 90) + '%' }}>
              <div className="en-val">NGN {b * 10}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="en-grid" style={{marginBottom:24}}>
        {[
          { icon: 'ti ti-briefcase', color: '#191C6B', num: tasksFromEarnings, label: 'From Tasks', sub: `${jobsCompleted} jobs completed` },
          { icon: 'ti ti-affiliate', color: '#191C6B', num: dv(referrals), label: 'From Referrals', sub: 'Referral bonuses' },
          { icon: 'ti ti-gift', color: '#F59E0B', num: dv(tips), label: 'From Tips', sub: 'Tips received' },
          { icon: 'ti ti-vault', color: '#16a34a', num: dv(vault), label: 'From Vault', sub: 'Vault rewards' },
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
            {['all', 'task', 'referral', 'tip', 'vault'].map(t => (
              <button key={t} className={`en-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="en-history">
          {filtered.map((h, i) => (
            <div className="en-h-item" key={i}>
              <span className="en-h-date">{formatDate(h.date)}</span>
              <span className="en-h-source">{h.source}</span>
              <span className="en-h-amount">{formatAmount(h.amount)}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{textAlign:'center',padding:24,color:'var(--text2)',fontSize:13}}>No entries found</div>
          )}
        </div>
      </div>
    </Layout>
  )
}
