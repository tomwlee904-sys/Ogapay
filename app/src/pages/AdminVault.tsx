import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

const OGAPAY_BLUE = 'var(--accent)'

export default function AdminVault() {
  const { user: authUser } = useAuth()

  // Vault state
  const [pool, setPool] = useState<any>(null)
  const [holders, setHolders] = useState<any[]>([])
  const [recentRevenue, setRecentRevenue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Action states
  const [seedUserId, setSeedUserId] = useState('')
  const [seedAmount, setSeedAmount] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [revAmount, setRevAmount] = useState('')
  const [revSource, setRevSource] = useState('task_fee')
  const [revDesc, setRevDesc] = useState('')
  const [addingRevenue, setAddingRevenue] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchPool = async () => {
    try {
      const res = await apiRequest<any>('/vault/admin/pool')
      const d = res?.data || res
      setPool(d?.pool || null)
      setHolders(d?.holders || [])
      // Also fetch holders separately
      const hRes = await apiRequest<any>('/vault/admin/holders').catch(() => null)
      if (hRes?.data) setHolders(hRes.data)
      if (d?.recentRevenue) setRecentRevenue(d.recentRevenue)
    } catch {
      showToast('Failed to load vault data')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchPool() }, [])

  const handleSeedPay = async () => {
    if (!seedUserId.trim() || !seedAmount) return
    setSeeding(true)
    try {
      const res = await apiRequest<any>('/vault/admin/seed-pay', {
        method: 'POST',
        body: JSON.stringify({ userId: seedUserId.trim(), amount: parseFloat(seedAmount) }),
      })
      if (res?.success) {
        showToast(<> <i className="ti ti-circle-check" style={{color:'var(--green)'}} /> Seeded {seedAmount} $PAY to {seedUserId}</>)
        setSeedUserId(''); setSeedAmount('')
        fetchPool()
      }
    } catch { showToast(<> <i className="ti ti-circle-x" style={{color:'var(--red)'}} /> Failed to seed $PAY</>) }
    setSeeding(false)
  }

  const handleDistribute = async () => {
    setDistributing(true)
    try {
      const res = await apiRequest<any>('/vault/admin/distribute', { method: 'POST' })
      const d = res?.data || res
      if (d?.distributed) {
        showToast(<> <i className="ti ti-circle-check" style={{color:'var(--green)'}} /> Distributed {(d.totalNgp || 0).toLocaleString()} to {d.recipients} holders</>)
      } else {
        showToast(`⏸ ${d?.reason || 'Skipped'}`)
      }
      fetchPool()
    } catch { showToast(<> <i className="ti ti-circle-x" style={{color:'var(--red)'}} /> Distribution failed</>) }
    setDistributing(false)
  }

  const handleAddRevenue = async () => {
    if (!revAmount) return
    setAddingRevenue(true)
    try {
      const res = await apiRequest<any>('/vault/admin/add-revenue', {
        method: 'POST',
        body: JSON.stringify({ amountNgp: parseFloat(revAmount), source: revSource, description: revDesc }),
      })
      if (res?.success) {
        showToast(<> <i className="ti ti-circle-check" style={{color:'var(--green)'}} /> ${revAmount} added to pool</>)
        setRevAmount(''); setRevDesc('')
        fetchPool()
      }
    } catch { showToast(<> <i className="ti ti-circle-x" style={{color:'var(--red)'}} /> Failed to add revenue</>) }
    setAddingRevenue(false)
  }

  const isAdmin = authUser?.role === 'ADMIN' || localStorage.getItem('ogapay_admin_session') === 'true'

  if (!isAdmin) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <i className="ti ti-shield-lock" style={{ fontSize: 48, color: 'var(--text3)' }} />
          <h2 style={{ fontFamily: 'Outfit', marginTop: 12 }}>Admin Access Required</h2>
          <p style={{ color: 'var(--text2)' }}>You need admin privileges to access this page.</p>
        </div>
      </Layout>
    )
  }

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' },
    card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16 },
    cardTitle: { fontSize: 15, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' },
    rowLast: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
    label: { fontSize: 13, color: 'var(--text2)' },
    value: { fontSize: 14, fontWeight: 700 },
    input: { width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const },
    select: { padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit' },
    btn: { height: 38, padding: '0 18px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
    btnPrimary: { height: 38, padding: '0 18px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, background: OGAPAY_BLUE, color: '#fff' },
    statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 },
    statCard: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' as const },
    statNum: { fontFamily: 'Outfit', fontSize: 24, fontWeight: 900 },
    statLabel: { fontSize: 11, color: 'var(--text2)', marginTop: 2 },
    flexRow: { display: 'flex', gap: 8, alignItems: 'flex-end' as const, flexWrap: 'wrap' as const },
    formGroup: { flex: 1, minWidth: 140 },
    formLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 4, display: 'block' },
    toast: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#fff', padding: '12px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
  }

  return (
    <Layout>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.page}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, margin: '0 0 4px' }}>
          <i className="ti ti-vault" style={{ color: OGAPAY_BLUE }} /> Vault Admin
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, margin: '0 0 24px' }}>
          Manage the $PAY revenue distribution vault
        </p>

        {/* ── Pool Stats ── */}
        <div style={S.statGrid}>
          <div style={S.statCard}>
            <div style={{ ...S.statNum, color: OGAPAY_BLUE }}>${pool?.totalNgp?.toLocaleString() || '0'}</div>
            <div style={S.statLabel}>Pool Balance (USD)</div>
          </div>
          <div style={S.statCard}>
            <div style={{ ...S.statNum, color: 'var(--green)' }}>{pool?.nextDistributionAt ? new Date(pool.nextDistributionAt).toLocaleDateString() : 'N/A'}</div>
            <div style={S.statLabel}>Next Distribution</div>
          </div>
          <div style={S.statCard}>
            <div style={{ ...S.statNum, color: '#f59e0b' }}>{holders.length}</div>
            <div style={S.statLabel}>$PAY Holders</div>
          </div>
        </div>

        {/* ── Pool Info ── */}
        <div style={S.card}>
          <div style={S.cardTitle}><i className="ti ti-coin" style={{ color: OGAPAY_BLUE }} /> Pool Overview</div>
          <div style={S.row}>
            <span style={S.label}>Total in Pool</span>
            <span style={S.value}>${(pool?.totalNgp || 0).toLocaleString()}</span>
          </div>
          <div style={S.row}>
            <span style={S.label}>Last Distribution</span>
            <span style={S.value}>{pool?.lastDistributionAt ? new Date(pool.lastDistributionAt).toLocaleString() : 'Never'}</span>
          </div>
          <div style={S.rowLast}>
            <span style={S.label}>Next Distribution</span>
            <span style={S.value}>{pool?.nextDistributionAt ? new Date(pool.nextDistributionAt).toLocaleString() : 'Not scheduled'}</span>
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'grid', gap: 16 }}>

          {/* 1. Seed $PAY Tokens */}
          <div style={S.card}>
            <div style={S.cardTitle}><i className="ti ti-currency-dollar" style={{ color: OGAPAY_BLUE }} /> Seed $PAY Tokens</div>
            <div style={S.flexRow}>
              <div style={S.formGroup}>
                <label style={S.formLabel}>User ID</label>
                <input style={S.input} value={seedUserId} onChange={e => setSeedUserId(e.target.value)} placeholder="uuid..." />
              </div>
              <div style={S.formGroup}>
                <label style={S.formLabel}>Amount $PAY</label>
                <input style={S.input} type="number" value={seedAmount} onChange={e => setSeedAmount(e.target.value)} placeholder="1000" />
              </div>
              <button style={{ ...S.btnPrimary, marginTop: 18 }} onClick={handleSeedPay} disabled={seeding || !seedUserId || !seedAmount}>
                {seeding ? '⏳ Seeding...' : <><i className="ti ti-droplet" /> Seed $PAY</>}
              </button>
            </div>
          </div>

          {/* 2. Add Revenue */}
          <div style={S.card}>
            <div style={S.cardTitle}><i className="ti ti-upload" style={{ color: 'var(--green)' }} /> Add Revenue to Pool</div>
            <div style={S.flexRow}>
              <div style={S.formGroup}>
                <label style={S.formLabel}>Amount (USD)</label>
                <input style={S.input} type="number" value={revAmount} onChange={e => setRevAmount(e.target.value)} placeholder="50000" />
              </div>
              <div style={S.formGroup}>
                <label style={S.formLabel}>Source</label>
                <select style={S.select} value={revSource} onChange={e => setRevSource(e.target.value)}>
                  <option value="task_fee">Task Fee</option>
                  <option value="store_commission">Store Commission</option>
                  <option value="service_cut">Service Cut</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={S.formGroup}>
                <label style={S.formLabel}>Description</label>
                <input style={S.input} value={revDesc} onChange={e => setRevDesc(e.target.value)} placeholder="Optional note" />
              </div>
              <button style={{ ...S.btn, background: 'var(--green)', color: '#fff', marginTop: 18 }} onClick={handleAddRevenue} disabled={addingRevenue || !revAmount}>
                {addingRevenue ? '⏳ Adding...' : <><i className="ti ti-coin" /> Add Revenue</>}
              </button>
            </div>
          </div>

          {/* 3. Trigger Distribution */}
          <div style={S.card}>
            <div style={S.cardTitle}><i className="ti ti-player-play" style={{ color: OGAPAY_BLUE }} /> Trigger Distribution</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 12px' }}>
              Manually trigger a distribution. Normally runs automatically at midnight UTC.
            </p>
            <button style={{ ...S.btnPrimary, height: 44, fontSize: 14, padding: '0 24px' }} onClick={handleDistribute} disabled={distributing}>
              <i className="ti ti-vault" style={{ fontSize: 16 }} /> {distributing ? '⏳ Distributing...' : <><i className="ti ti-package" /> Run Distribution Now</>}
            </button>
          </div>

          {/* 4. $PAY Holders */}
          <div style={S.card}>
            <div style={S.cardTitle}><i className="ti ti-users" style={{ color: '#f59e0b' }} /> $PAY Holders ({holders.length})</div>
            {holders.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>No $PAY holders yet. Seed tokens above.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>Username</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>User ID</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>$PAY Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holders.map((h: any) => (
                      <tr key={h.userId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 6px', fontWeight: 600 }}>{h.username || h.email || '—'}</td>
                        <td style={{ padding: '8px 6px', color: 'var(--text2)', fontSize: 10 }}>{h.userId}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>{(h.payBalance || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. Recent Revenue */}
          <div style={S.card}>
            <div style={S.cardTitle}><i className="ti ti-history" style={{ color: OGAPAY_BLUE }} /> Recent Revenue Log</div>
            {recentRevenue.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>No revenue logged yet. Add revenue above or wait for task fees.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>Source</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>Description</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>Amount</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRevenue.map((r: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 6px' }}><span style={{ background: 'rgba(var(--accent-rgb),0.1)', padding: '2px 6px', borderRadius: 4, fontWeight: 600, fontSize: 10 }}>{r.source}</span></td>
                        <td style={{ padding: '8px 6px', color: 'var(--text2)' }}>{r.description || '—'}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>${(r.amountNgp || 0).toLocaleString()}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text2)' }}>{new Date(r.recordedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 6. Refresh */}
          <div style={{ textAlign: 'center', padding: 8 }}>
            <button style={{ ...S.btn, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} onClick={() => { setLoading(true); fetchPool() }}>
              <i className="ti ti-refresh" /> Refresh Data
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
