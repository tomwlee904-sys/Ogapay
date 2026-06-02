import Layout from '../components/Layout'

export default function Wallet() {
  return (
    <Layout>
      <div className="sec">
        <div className="hero">
          <div className="greeting">Your Finances</div>
          <h1>Wallet</h1>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card"><div className="sc-icon" style={{ background: '#7C3AED15', color: '#7C3AED' }}><i className="ti ti-wallet" /></div><div className="sc-val">&#8358;0.00</div><div className="sc-label">Balance</div></div>
        <div className="stat-card"><div className="sc-icon" style={{ background: '#16a34a15', color: '#16a34a' }}><i className="ti ti-coin" /></div><div className="sc-val">0 USDC</div><div className="sc-label">Crypto</div></div>
        <div className="stat-card"><div className="sc-icon" style={{ background: '#2563EB15', color: '#2563EB' }}><i className="ti ti-trending-up" /></div><div className="sc-val">&#8358;0</div><div className="sc-label">Total Deposits</div></div>
        <div className="stat-card"><div className="sc-icon" style={{ background: '#f5b30115', color: '#f5b301' }}><i className="ti ti-trending-down" /></div><div className="sc-val">&#8358;0</div><div className="sc-label">Total Withdrawn</div></div>
      </div>

      <div className="grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        <a className="qaction" href="#" style={{ flexDirection: 'row', gap: 12, padding: '16px 14px' }}>
          <span className="qa-icon" style={{ background: '#7C3AED15', color: '#7C3AED', width: 40, height: 40, borderRadius: 10, fontSize: 18 }}><i className="ti ti-plus-circle" /></span>
          <span className="qa-label" style={{ fontSize: 13 }}>Deposit</span>
        </a>
        <a className="qaction" href="#" style={{ flexDirection: 'row', gap: 12, padding: '16px 14px' }}>
          <span className="qa-icon" style={{ background: '#2563EB15', color: '#2563EB', width: 40, height: 40, borderRadius: 10, fontSize: 18 }}><i className="ti ti-logout" /></span>
          <span className="qa-label" style={{ fontSize: 13 }}>Withdraw</span>
        </a>
        <a className="qaction" href="#" style={{ flexDirection: 'row', gap: 12, padding: '16px 14px' }}>
          <span className="qa-icon" style={{ background: '#16a34a15', color: '#16a34a', width: 40, height: 40, borderRadius: 10, fontSize: 18 }}><i className="ti ti-transfer" /></span>
          <span className="qa-label" style={{ fontSize: 13 }}>Transfer</span>
        </a>
      </div>

      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-history" /> Transaction History</h2></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>No transactions yet</td><td>—</td><td className="amt">—</td><td>—</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
