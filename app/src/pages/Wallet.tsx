import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import FundWalletModal from '../components/FundWalletModal'
import TransferModal from '../components/TransferModal'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// Tabs → backend TransactionType values
const TX_TABS: { key: string; label: string; types: string[] }[] = [
  { key: 'all', label: 'All', types: [] },
  { key: 'deposit', label: 'Deposits', types: ['DEPOSIT'] },
  { key: 'withdrawal', label: 'Withdrawals', types: ['WITHDRAWAL'] },
  { key: 'transfer', label: 'Transfers', types: ['TRANSFER'] },
  { key: 'earning', label: 'Earnings', types: ['TASK_PAYMENT', 'TASK_REWARD', 'EARNING', 'REFERRAL_BONUS', 'SIGNUP_BONUS'] },
  { key: 'refund', label: 'Refunds', types: ['TASK_REFUND', 'REFUND'] },
]
// Used only when a row has no balance change to read the direction from
const DEBIT_TYPES = ['WITHDRAWAL', 'TRANSFER', 'TASK_PAYMENT', 'PLATFORM_FEE', 'STORE_PURCHASE', 'ESCROW', 'SYSTEM_DEBIT']
const txType = (t: any) => String(t.type || t.transactionType || '').toUpperCase()

export default function Wallet() {
  const { refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [balances, setBalances] = useState<Record<string, { balance: number; lockedBalance: number; available: number }> | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'deposit' | 'withdraw' | 'transfer'>(null)

  const load = useCallback(async () => {
    try {
      const [balData, txData] = await Promise.all([
        apiRequest<any>('/wallet/balance').catch(() => null),
        apiRequest<any>('/users/transactions/history?limit=100').catch(() => null),
      ])
      if (balData) setBalances(balData)
      if (txData) setTransactions(Array.isArray(txData) ? txData : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const refreshAll = () => { load(); refreshUser() }

  const ngnBal = balances?.NGN?.balance ?? 0
  const usdcBal = balances?.USDC?.balance ?? 0
  const solBal = balances?.SOL?.balance ?? 0
  const ngnAvailable = balances?.NGN?.available ?? 0

  // No money moved on these
  const isVoid = (t: any) => ['FAILED', 'CANCELLED', 'REJECTED'].includes(String(t.status).toUpperCase())

  // Naira only: USDC/SOL amounts must not be added into a naira figure
  const ngnTotal = (type: string) => transactions
    .filter(t => txType(t) === type && (t.currency || 'NGN') === 'NGN' && !isVoid(t))
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0)
  const totalDeposits = ngnTotal('DEPOSIT')
  const totalWithdrawn = ngnTotal('WITHDRAWAL')

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

  // Amounts are stored positive; the direction comes from the balance change,
  // then the P2P metadata, then the type
  const isCredit = (t: any) => {
    const before = t.balanceBefore ?? t.balance_before
    const after = t.balanceAfter ?? t.balance_after
    if (before != null && after != null) {
      const delta = Number(after) - Number(before)
      if (delta !== 0) return delta > 0
    }
    const dir = t.metadata?.direction
    if (dir === 'credit' || dir === 'debit') return dir === 'credit'
    return !DEBIT_TYPES.includes(txType(t))
  }

  const displayType = (t: any) => {
    if (txType(t) === 'TRANSFER' && t.metadata?.p2p) {
      const who = t.metadata?.counterparty ? ' @' + t.metadata.counterparty : ''
      return isCredit(t) ? 'Received' : 'Sent' + (who ? ' to' + who : '')
    }
    const type = txType(t).replace(/_/g, ' ')
    return type.charAt(0) + type.slice(1).toLowerCase()
  }

  const displayAmount = (t: any) => {
    const amt = Math.abs(Number(t.amount || 0))
    const cur = t.currency || 'NGN'
    return (isVoid(t) ? '' : isCredit(t) ? '+' : '-') + cur + ' ' + amt.toLocaleString('en-US', { minimumFractionDigits: 2 })
  }

  const statusColor = (s: string) => {
    const st = (s || '').toLowerCase()
    if (st === 'completed' || st === 'approved' || st === 'success') return 'var(--green)'
    if (st === 'pending' || st === 'processing') return 'var(--gold)'
    if (st === 'failed' || st === 'rejected') return 'var(--red)'
    return 'var(--text2)'
  }

  const tab = TX_TABS.find(x => x.key === activeTab) || TX_TABS[0]
  const filtered = tab.types.length === 0
    ? transactions
    : transactions.filter(t => tab.types.includes(txType(t)) && (tab.key !== 'earning' || isCredit(t)))

  return (
    <Layout>
      <style>{`
        .wl-hero{background:linear-gradient(135deg,rgba(var(--accent-rgb),.1),var(--card));border:1px solid var(--border);border-radius:14px;padding:28px 32px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .wl-hero .wlh-label{color:var(--text2);font-size:13px;font-weight:600;margin-bottom:4px}
        .wl-hero .wlh-bal{font-family:Geist;font-size:36px;font-weight:900;color:var(--text);letter-spacing:-.04em;background-clip:text}
        .wl-hero .wlh-sub{color:var(--text2);font-size:14px}
        .wl-actions{display:flex;gap:8px;flex-wrap:wrap}
        .wla-btn{height:40px;padding:0 20px;border-radius:10px;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;text-decoration:none;font-family:inherit}
        .wla-btn.primary{background:var(--accent);color:var(--on-accent);border:0}
        .wla-btn.primary:hover{box-shadow:0 4px 20px rgba(var(--accent-rgb),.3)}
        .wla-btn.outline{border:1px solid var(--border);background:transparent;color:var(--text2)}
        .wla-btn.outline:hover{border-color:var(--accent);color:var(--accent)}
        .wl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
        @media(max-width:900px){.wl-stats{grid-template-columns:repeat(2,1fr)}}
        .wl-stat{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;transition:all .25s}
        .wl-stat:hover{transform:translateY(-2px);border-color:var(--accent)}
        .wl-stat .wsi{width:36px;height:36px;border-radius:8px;display:grid;place-items:center;margin-bottom:8px}
        .wl-stat .wsn{font-family:Geist;font-size:24px;font-weight:900}
        .wl-stat .wsl{color:var(--text2);font-size:13px;margin-top:2px}
        .wl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px}
        @media(max-width:600px){.wl-grid{grid-template-columns:1fr}}
        .wl-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:14px;text-align:center;cursor:pointer;transition:all .25s;text-decoration:none;font-family:inherit;width:100%}
        .wl-card:hover{transform:translateY(-3px);border-color:var(--accent);box-shadow:0 0 30px rgba(var(--accent-rgb),.08)}
        .wl-card i{font-size:28px}
        .wl-card .wlc-label{font-weight:700;font-size:14px;color:var(--text)}
        .wl-card .wlc-desc{color:var(--text2);font-size:12px}
        .wl-tabs{display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap}
        .wl-tab{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
        .wl-tab.active,.wl-tab:hover{border-color:var(--accent);color:var(--accent);background:rgba(var(--accent-rgb),.08)}
        .wl-table{width:100%;border-collapse:collapse;font-size:13px}
        .wl-table th{text-align:left;padding:10px 12px;color:var(--text3);font-size:11px;font-weight:600;border-bottom:1px solid var(--border)}
        .wl-table td{padding:12px;border-bottom:1px solid var(--border);color:var(--text2)}
        .wl-table td strong{color:var(--text);font-weight:600}
        .wl-table .amt{font-weight:700}
        .wl-table .amt.plus{color:var(--green)}
        .wl-table .amt.minus{color:var(--red)}
        .wl-table .amt.void{color:var(--text3);text-decoration:line-through;font-weight:600}
        .sec-title{font-family:Geist;font-size:18px;font-weight:800;margin:0 0 14px;display:flex;align-items:center;gap:8px}
        .sec-title i{font-size:20px;color:var(--accent)}
        .wl-empty{text-align:center;padding:48px;color:var(--text2);font-size:14px}
        .wl-loading{text-align:center;padding:48px;color:var(--text3);display:flex;align-items:center;justify-content:center;gap:8px}
        .wl-wrap{max-width:1100px;margin:0 auto;padding:28px 24px 60px}
        @media(max-width:600px){
          .wl-wrap{padding:16px 16px 40px}
          .wl-hero{padding:20px;margin-bottom:16px}
          .wl-hero .wlh-bal{font-size:28px}
          .wl-actions{width:100%}
          .wla-btn{flex:1;justify-content:center;padding:0 10px}
          .wl-stats{gap:10px;margin-bottom:16px}
          .wl-stat{padding:14px}
          .wl-stat .wsn{font-size:17px}
          .wl-table{font-size:12px}
          .wl-table th,.wl-table td{padding:10px 8px}
        }
      `}</style>

      <div className="wl-wrap">
      <div className="wl-hero">
        <div>
          <div className="wlh-label">Wallet Balance</div>
          <div className="wlh-bal">{formatCurrency(ngnAvailable)}</div>
          <div className="wlh-sub">${usdcBal.toFixed(2)} USDC &middot; {solBal.toFixed(3)} SOL</div>
        </div>
        <div className="wl-actions">
          <button type="button" className="wla-btn primary" onClick={() => setModal('deposit')}><i className="ti ti-plus" /> Deposit</button>
          <button type="button" className="wla-btn outline" onClick={() => setModal('withdraw')}><i className="ti ti-logout" /> Withdraw</button>
          <button type="button" className="wla-btn outline" onClick={() => setModal('transfer')}><i className="ti ti-transfer" /> Transfer</button>
        </div>
      </div>

      <div className="wl-stats">
        {[
          { icon: 'ti ti-wallet', color: '#52525b', num: formatCurrency(ngnBal), label: 'Balance' },
          { icon: 'ti ti-coin', color: '#16a34a', num: `$${usdcBal.toFixed(2)} USDC`, label: 'Crypto' },
          { icon: 'ti ti-trending-up', color: '#52525b', num: formatCurrency(totalDeposits), label: 'Total Deposits' },
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
          { icon: 'ti ti-circle-plus', color: '#52525b', label: 'Deposit', desc: 'Add funds to your wallet', to: 'deposit' as const },
          { icon: 'ti ti-logout', color: '#52525b', label: 'Withdraw', desc: 'Withdraw to bank or crypto', to: 'withdraw' as const },
          { icon: 'ti ti-transfer', color: '#16a34a', label: 'Transfer', desc: 'Send to another user', to: 'transfer' as const },
        ].map((c, i) => (
          <button type="button" className="wl-card" key={i} onClick={() => setModal(c.to)}>
            <i className={c.icon} style={{ color: c.color }} />
            <div className="wlc-label">{c.label}</div>
            <div className="wlc-desc">{c.desc}</div>
          </button>
        ))}
      </div>

      <div className="sec-title"><i className="ti ti-history" /> Transaction History</div>
      <div className="wl-tabs">
        {TX_TABS.map(t => (
          <button key={t.key} className={`wl-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
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
                  <td className={`amt ${isVoid(t) ? 'void' : isCredit(t) ? 'plus' : 'minus'}`}>{displayAmount(t)}</td>
                  <td style={{ color: statusColor(t.status), fontWeight: 600 }}>{String(t.status || 'Pending').toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {(modal === 'deposit' || modal === 'withdraw') && (
        <FundWalletModal initialStep={modal} onClose={() => { setModal(null); load() }} onDone={refreshAll} />
      )}
      {modal === 'transfer' && (
        <TransferModal onClose={() => setModal(null)} onSuccess={refreshAll} />
      )}
    </Layout>
  )
}
