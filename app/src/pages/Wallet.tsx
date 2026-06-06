import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

export default function Wallet() {
  const [activeTab, setActiveTab] = useState('all')
  const [balances, setBalances] = useState<Record<string, { balance: number; lockedBalance: number; available: number }> | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [balData, txData] = await Promise.all([
          apiRequest('/wallet/balance').catch(() => null),
          apiRequest('/users/transactions/history').catch(() => null),
        ])
        if (balData) setBalances(balData)
        if (txData) setTransactions(Array.isArray(txData) ? txData : [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const ngnBal = balances?.NGN?.balance ?? 0
  const usdcBal = balances?.USDC?.balance ?? 0
  const solBal = balances?.SOL?.balance ?? 0
  const ngnAvailable = balances?.NGN?.available ?? 0

  const totalDeposits = transactions
    .filter(t => t.type?.toLowerCase() === 'deposit')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const totalWithdrawn = transactions
    .filter(t => t.type?.toLowerCase() === 'withdrawal')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const formatCurrency = (n: number) => {
    if (n >= 1000) return 'NGN ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return 'NGN ' + n.toFixed(2)
  }

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return mins + 'm ago'
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return hrs + 'h ago'
    const days = Math.floor(hrs / 24)
    if (days < 7) return days + 'd ago'
    return new Date(d).toLocaleDateString()
  }

  const displayType = (t: any) => {
    const type = (t.type || t.transactionType || '').replace(/_/g, ' ')
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
  }

  const displayAmount = (t: any) => {
    const amt = Number(t.amount || 0)
    const cur = t.currency || 'NGN'
    const prefix = amt >= 0 ? '+' : ''
    return prefix + cur + ' ' + Math.abs(amt).toLocaleString('en-US', { minimumFractionDigits: 2 })
  }

  const isCredit = (t: any) => Number(t.amount || 0) >= 0

  const statusColor = (s: string) => {
    const st = (s || '').toLowerCase()
    if (st === 'completed' || st === 'approved' || st === 'success') return 'var(--green)'
    if (st === 'pending' || st === 'processing') return 'var(--gold)'
    if (st === 'failed' || st === 'rejected') return 'var(--red)'
    return 'var(--text2)'
  }

  const filtered = activeTab === 'all'
    ? transactions
    : transactions.filter(t => (t.type || t.transactionType || '').toLowerCase().includes(activeTab))

  return (
    <Layout>
      <style>{`
        .wl-hero{background:linear-gradient(135deg,rgba(31,140,255,.1),var(--card));border:1px solid var(--border);border-radius:14px;padding:28px 32px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .wl-hero .wlh-label{color:var(--text2);font-size:13px;font-weight:600;margin-bottom:4px}
        .wl-hero .wlh-bal{font-family:Outfit;font-size:36px;font-weight:900;background:linear-gradient(135deg,#fff,var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .wl-hero .wlh-sub{color:var(--text2);font-size:14px}
        .wl-actions{display:flex;gap:8px;flex-wrap:wrap}
        .wla-btn{height:40px;padding:0 20px;border-radius:10px;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;text-decoration:none}
        .wla-btn.primary{background:var(--accent);color:#fff;border:0}
        .wla-btn.primary:hover{box-shadow:0 4px 20px rgba(31,140,255,.3)}
        .wla-btn.outline{border:1px solid var(--border);background:transparent;color:var(--text2)}
        .wla-btn.outline:hover{border-color:var(--accent);color:var(--accent)}
        .wl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
        @media(max-width:900px){.wl-stats{grid-template-columns:repeat(2,1fr)}}
        .wl-stat{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;transition:all .25s}
        .wl-stat:hover{transform:translateY(-2px);border-color:var(--accent)}
        .wl-stat .wsi{width:36px;height:36px;border-radius:8px;display:grid;place-items:center;margin-bottom:8px}
        .wl-stat .wsn{font-family:Outfit;font-size:24px;font-weight:900}
        .wl-stat .wsl{color:var(--text2);font-size:13px;margin-top:2px}
        .wl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px}
        @media(max-width:600px){.wl-grid{grid-template-columns:1fr}}
        .wl-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:14px;text-align:center;cursor:pointer;transition:all .25s;text-decoration:none}
        .wl-card:hover{transform:translateY(-3px);border-color:var(--accent);box-shadow:0 0 30px rgba(31,140,255,.08)}
        .wl-card i{font-size:28px}
        .wl-card .wlc-label{font-weight:700;font-size:14px;color:var(--text)}
        .wl-card .wlc-desc{color:var(--text2);font-size:12px}
        .wl-tabs{display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap}
        .wl-tab{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
        .wl-tab.active,.wl-tab:hover{border-color:var(--accent);color:var(--accent);background:rgba(31,140,255,.08)}
        .wl-table{width:100%;border-collapse:collapse;font-size:13px}
        .wl-table th{text-align:left;padding:10px 12px;color:var(--text3);font-size:11px;font-weight:600;border-bottom:1px solid var(--border)}
        .wl-table td{padding:12px;border-bottom:1px solid var(--border);color:var(--text2)}
        .wl-table td strong{color:var(--text);font-weight:600}
        .wl-table .amt{font-weight:700}
        .wl-table .amt.plus{color:var(--green)}
        .wl-table .amt.minus{color:var(--red)}
        .sec-title{font-family:Outfit;font-size:18px;font-weight:800;margin:0 0 14px;display:flex;align-items:center;gap:8px}
        .sec-title i{font-size:20px;color:var(--accent)}
        .wl-empty{text-align:center;padding:48px;color:var(--text2);font-size:14px}
        .wl-loading{text-align:center;padding:48px;color:var(--text3);display:flex;align-items:center;justify-content:center;gap:8px}
      `}</style>

      <div className="wl-hero">
        <div>
          <div className="wlh-label">Wallet Balance</div>
          <div className="wlh-bal">{formatCurrency(ngnAvailable)}</div>
          <div className="wlh-sub">${usdcBal.toFixed(2)} USDC &middot; {solBal.toFixed(3)} SOL</div>
        </div>
        <div className="wl-actions">
          <a href="#" className="wla-btn primary"><i className="ti ti-plus" /> Deposit</a>
          <a href="#" className="wla-btn outline"><i className="ti ti-logout" /> Withdraw</a>
          <a href="#" className="wla-btn outline"><i className="ti ti-transfer" /> Transfer</a>
        </div>
      </div>

      <div className="wl-stats">
        {[
          { icon: 'ti ti-wallet', color: '#1F8CFF', num: formatCurrency(ngnBal), label: 'Balance' },
          { icon: 'ti ti-coin', color: '#16a34a', num: `$${usdcBal.toFixed(2)} USDC`, label: 'Crypto' },
          { icon: 'ti ti-trending-up', color: '#2563EB', num: formatCurrency(totalDeposits), label: 'Total Deposits' },
          { icon: 'ti ti-trending-down', color: '#f5b301', num: formatCurrency(totalWithdrawn), label: 'Total Withdrawn' },
        ].map((s, i) => (
          <div className="wl-stat" key={i}>
            <div className="wsi" style={{ background: `${s.color}15`, color: s.color }}><i className={s.icon} /></div>
            <div className="wsn">{loading ? '...' : s.num}</div>
            <div className="wsl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="wl-grid">
        {[
          { icon: 'ti ti-plus-circle', color: '#1F8CFF', label: 'Deposit', desc: 'Add funds to your wallet' },
          { icon: 'ti ti-logout', color: '#2563EB', label: 'Withdraw', desc: 'Withdraw to bank or crypto' },
          { icon: 'ti ti-transfer', color: '#16a34a', label: 'Transfer', desc: 'Send to another user' },
        ].map((c, i) => (
          <a className="wl-card" href="#" key={i}>
            <i className={c.icon} style={{ color: c.color }} />
            <div className="wlc-label">{c.label}</div>
            <div className="wlc-desc">{c.desc}</div>
          </a>
        ))}
      </div>

      <div className="sec-title"><i className="ti ti-history" /> Transaction History</div>
      <div className="wl-tabs">
        {['all', 'deposit', 'withdrawal', 'reward'].map(t => (
          <button key={t} className={`wl-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="wl-loading"><span className="spinner" /> Loading transactions...</div>
      ) : filtered.length === 0 ? (
        <div className="wl-empty"><i className="ti ti-history" style={{ fontSize: 32, marginBottom: 8, display: 'block', color: 'var(--text3)' }} />No transactions found</div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table className="wl-table">
            <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id || i}>
                  <td><strong>{formatDate(t.createdAt || t.date)}</strong></td>
                  <td>{displayType(t)}</td>
                  <td className={`amt ${isCredit(t) ? 'plus' : 'minus'}`}>{displayAmount(t)}</td>
                  <td style={{ color: statusColor(t.status), fontWeight: 600 }}>{(t.status || 'Pending').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
