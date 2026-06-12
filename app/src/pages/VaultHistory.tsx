import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'
import WalletPreviewCard from '../components/WalletPreviewCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const OGAPAY_BLUE = '#191C6D'
const GREEN = '#16a34a'
const GREEN_BG = 'rgba(22,163,74,0.12)'

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: '0 auto', padding: '0 0 40px', position: 'relative' as const, zIndex: 1 },
  hero: { marginBottom: 24 },
  title: { fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, margin: '0 0 4px' },
  sub: { color: 'var(--text2)', fontSize: 14, margin: '0 0 20px' },
  card: { background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.06)' },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 },
  statCard: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, textAlign: 'center' as const },
  statNum: { fontFamily: 'Outfit', fontSize: 20, fontWeight: 900 },
  statLabel: { fontSize: 10, color: 'var(--text2)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  pill: { padding: '5px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  pillActive: { padding: '5px 12px', borderRadius: 999, border: `1px solid ${OGAPAY_BLUE}`, background: OGAPAY_BLUE, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  empty: { textAlign: 'center' as const, padding: '48px 20px', color: 'var(--text2)' },
}

function formatPay(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

function truncateWallet(addr: string) {
  if (!addr || addr.length < 10) return addr
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function VaultHistory() {
  const [searchParams] = useSearchParams()
  const prefillWallet = searchParams.get('wallet') || ''

  // Wallet search
  const [searchWallet, setSearchWallet] = useState(prefillWallet)
  const [searchedWallet, setSearchedWallet] = useState(prefillWallet)
  const [walletResult, setWalletResult] = useState<any>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletError, setWalletError] = useState('')

  // Wallet rewards data
  const [rewardsData, setRewardsData] = useState<any>(null)
  const [rewardsRange, setRewardsRange] = useState('7d')
  const [rewardsLoading, setRewardsLoading] = useState(false)

  // Distribution batches
  const [batches, setBatches] = useState<any[]>([])
  const [batchPage, setBatchPage] = useState(1)
  const [batchTotalPages, setBatchTotalPages] = useState(1)
  const [batchTotalBatches, setBatchTotalBatches] = useState(0)
  const [batchLoading, setBatchLoading] = useState(false)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const [batchDetail, setBatchDetail] = useState<any[] | null>(null)
  const [batchDetailLoading, setBatchDetailLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchBatches = async (page: number) => {
    setBatchLoading(true)
    try {
      const res = await apiRequest<any>(`/vault/history/batches?page=${page}`)
      const d = res?.data || res
      setBatches(d?.batches || [])
      setBatchTotalPages(d?.totalPages || 1)
      setBatchTotalBatches(d?.totalBatches || 0)
    } catch {
      // empty state
    } finally { setBatchLoading(false) }
  }

  const fetchWalletLookup = async (wallet: string) => {
    if (!wallet.trim()) return
    setWalletLoading(true)
    setWalletError('')
    setWalletResult(null)
    try {
      const res = await apiRequest<any>(`/vault/lookup?wallet=${encodeURIComponent(wallet.trim())}`)
      const d = res?.data || res
      if (d?.vault) {
        setWalletResult(d)
        // Also fetch rewards
        fetchWalletRewards(wallet.trim())
      } else {
        setWalletError('Wallet not found on OgaPay')
      }
    } catch {
      setWalletError('Failed to look up. Check the wallet address.')
    } finally { setWalletLoading(false) }
  }

  const fetchWalletRewards = async (wallet: string) => {
    setRewardsLoading(true)
    try {
      const res = await apiRequest<any>(`/vault/lookup/rewards?wallet=${encodeURIComponent(wallet)}&range=${rewardsRange}`)
      const d = res?.data || res
      setRewardsData(d)
    } catch {
      // partial data
    } finally { setRewardsLoading(false) }
  }

  const handleLoadRewards = () => {
    if (!searchWallet.trim()) return
    setSearchedWallet(searchWallet.trim())
    fetchWalletLookup(searchWallet.trim())
  }

  const handleClear = () => {
    setSearchWallet('')
    setSearchedWallet('')
    setWalletResult(null)
    setRewardsData(null)
    setWalletError('')
  }

  useEffect(() => {
    fetchBatches(1)
    injectSkeletonStyles()
    // Auto-search if prefilled from URL
    if (prefillWallet) {
      fetchWalletLookup(prefillWallet)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (searchedWallet) {
      fetchWalletRewards(searchedWallet)
    }
  }, [rewardsRange])

  const handleBatchToggle = async (batchId: string) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null)
      setBatchDetail(null)
      return
    }
    setExpandedBatch(batchId)
    setBatchDetailLoading(true)
    setBatchDetail(null)
    try {
      const res = await apiRequest<any>(`/vault/history/batches/${batchId}`)
      const d = res?.data || res
      setBatchDetail(Array.isArray(d) ? d : d?.wallets || [])
    } catch {
      setBatchDetail([])
    } finally { setBatchDetailLoading(false) }
  }

  const chartData = rewardsData?.chartData?.map((d: any) => ({
    label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    amount: d.amount,
  })) || []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
          <div style={{ color: OGAPAY_BLUE, fontWeight: 600 }}>{(payload[0].value || 0).toLocaleString()} $PAY</div>
        </div>
      )
    }
    return null
  }

  return (
    <Layout>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 20% 10%, rgba(25,28,107,0.10), transparent 50%),radial-gradient(circle at 80% 30%, rgba(20,184,166,0.08), transparent 50%),radial-gradient(circle at 50% 90%, rgba(153,69,255,0.06), transparent 50%)',
      }} />
      <div style={S.page}>
        {loading && <SkeletonPage />}

        {!loading && (
          <>
            {/* Page header */}
            <div style={S.hero}>
              <h1 style={S.title}>Distribution History</h1>
              <p style={S.sub}>View all past $PAY token distributions to holders</p>
            </div>

            {/* Check your wallet rewards card */}
            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-search" style={{ color: OGAPAY_BLUE }} /> Check your wallet rewards
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 12px' }}>
                Search any wallet to see total rewards received and browse personal distribution payouts 10 at a time.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={searchWallet} onChange={e => setSearchWallet(e.target.value)}
                  placeholder="Enter Solana wallet address..."
                  onKeyDown={e => e.key === 'Enter' && handleLoadRewards()}
                  style={{ flex: 1, height: 40, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={handleLoadRewards} disabled={walletLoading || !searchWallet.trim()}
                  style={{ height: 40, padding: '0 16px', borderRadius: 9, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {walletLoading ? 'Loading...' : 'Load Rewards'}
                </button>
                {searchedWallet && (
                  <button onClick={handleClear}
                    style={{ height: 40, padding: '0 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Clear
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                Personal history is pulled from the distribution log.
              </div>

              {walletError && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-alert-circle" /> {walletError}
                </div>
              )}

              {/* Wallet Preview Card */}
              {walletResult && <WalletPreviewCard data={walletResult} />}
            </div>

            {/* Wallet Rewards section */}
            {walletResult && (
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-gift" style={{ color: OGAPAY_BLUE }} /> Wallet Rewards
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>
                    {truncateWallet(walletResult.wallet)}
                  </span>
                </div>

                {/* 3 stat cards */}
                <div style={S.statRow}>
                  <div style={S.statCard}>
                    <div style={{ ...S.statNum, color: OGAPAY_BLUE }}>{(rewardsData?.totalReceivedPay || 0).toLocaleString()} $PAY</div>
                    <div style={S.statLabel}>Total Received</div>
                  </div>
                  <div style={S.statCard}>
                    <div style={{ ...S.statNum, color: GREEN }}>{rewardsData?.completedDistributions || 0}</div>
                    <div style={S.statLabel}>Completed Distributions</div>
                  </div>
                  <div style={S.statCard}>
                    <div style={{ ...S.statNum, color: 'var(--text)' }}>{rewardsData?.otherEntries || 0}</div>
                    <div style={S.statLabel}>Other Entries</div>
                  </div>
                </div>

                {/* Time range pills */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {['7d', '30d', '1y'].map(r => (
                    <button key={r} style={rewardsRange === r ? S.pillActive : S.pill} onClick={() => setRewardsRange(r)}>
                      {r === '7d' ? '7 days' : r === '30d' ? '30 days' : 'Last year'}
                    </button>
                  ))}
                </div>

                {/* Received in period + USD estimate */}
                <div style={S.statRow}>
                  <div style={S.statCard}>
                    <div style={{ ...S.statNum, color: OGAPAY_BLUE }}>{(rewardsData?.receivedInPeriodPay || 0).toLocaleString()} $PAY</div>
                    <div style={S.statLabel}>Received in Period</div>
                  </div>
                  <div style={S.statCard}>
                    <div style={{ ...S.statNum, color: GREEN }}>{formatUSD(rewardsData?.currentUsdEstimate || 0)}</div>
                    <div style={S.statLabel}>Current USD Estimate</div>
                  </div>
                </div>

                {/* Bar chart */}
                {chartData.length === 0 ? (
                  <div style={S.empty}>
                    <i className="ti ti-chart-bar-off" style={{ fontSize: 24, color: 'var(--text3)', marginBottom: 6, display: 'block' }} />
                    <p style={{ margin: 0, fontSize: 12 }}>No completed rewards landed in this timeframe yet.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ width: '100%', height: 200, marginBottom: 8 }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false}
                            tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="amount" fill={OGAPAY_BLUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                      <span>USD estimate uses the current $PAY price.</span>
                      <span>Grouped in UTC.</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* All Distribution Batches */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-package" style={{ color: OGAPAY_BLUE }} /> All Distribution Batches
                </span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Browse batches 10 at a time</span>
              </div>

              {/* Pagination header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                  Page {batchPage} of {batchTotalPages} • {batchTotalBatches} batches
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setBatchPage(1); fetchBatches(1) }} disabled={batchPage <= 1}
                    style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: batchPage <= 1 ? 'var(--text3)' : 'var(--text2)', fontSize: 10, fontWeight: 700, cursor: batchPage <= 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    First
                  </button>
                  <button onClick={() => { const p = Math.max(1, batchPage - 1); setBatchPage(p); fetchBatches(p) }} disabled={batchPage <= 1}
                    style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: batchPage <= 1 ? 'var(--text3)' : 'var(--text2)', fontSize: 10, fontWeight: 700, cursor: batchPage <= 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    Prev
                  </button>
                  <button onClick={() => { const p = Math.min(batchTotalPages, batchPage + 1); setBatchPage(p); fetchBatches(p) }} disabled={batchPage >= batchTotalPages}
                    style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: batchPage >= batchTotalPages ? 'var(--text3)' : 'var(--text2)', fontSize: 10, fontWeight: 700, cursor: batchPage >= batchTotalPages ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    Next
                  </button>
                  <button onClick={() => { setBatchPage(batchTotalPages); fetchBatches(batchTotalPages) }} disabled={batchPage >= batchTotalPages}
                    style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: batchPage >= batchTotalPages ? 'var(--text3)' : 'var(--text2)', fontSize: 10, fontWeight: 700, cursor: batchPage >= batchTotalPages ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    Last
                  </button>
                </div>
              </div>

              {batchLoading ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>Loading batches...</div>
              ) : batches.length === 0 ? (
                <div style={S.empty}>
                  <i className="ti ti-package-off" style={{ fontSize: 24, color: 'var(--text3)', marginBottom: 6, display: 'block' }} />
                  <p style={{ margin: 0, fontSize: 12 }}>No distribution batches found yet</p>
                </div>
              ) : (
                batches.map((batch: any) => (
                  <div key={batch.id} style={{ marginBottom: 10 }}>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)', marginBottom: 2 }}>Batch</div>
                          <div style={{ fontWeight: 700, color: OGAPAY_BLUE, cursor: 'pointer' }}>#{batch.batchNumber || batch.id?.slice(0, 8) || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)', marginBottom: 2 }}>Distribution Time</div>
                          <div style={{ fontSize: 12 }}>{batch.distributedAt ? new Date(batch.distributedAt).toLocaleString() : '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)', marginBottom: 2 }}>Total $PAY</div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{(batch.totalPay || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                            background: batch.status === 'COMPLETED' ? GREEN_BG : batch.status === 'PENDING' ? 'rgba(245,158,11,0.12)' : 'rgba(220,38,38,0.12)',
                            color: batch.status === 'COMPLETED' ? GREEN : batch.status === 'PENDING' ? '#f59e0b' : '#dc2626',
                          }}>
                            {batch.status || 'COMPLETED'}
                          </span>
                          <button onClick={() => handleBatchToggle(batch.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontFamily: 'inherit', padding: 2, transition: 'transform .15s', transform: expandedBatch === batch.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <i className="ti ti-chevron-down" style={{ fontSize: 16 }} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded batch detail */}
                      {expandedBatch === batch.id && (
                        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                          {batchDetailLoading ? (
                            <div style={{ textAlign: 'center', padding: 12, fontSize: 12, color: 'var(--text2)' }}>Loading details...</div>
                          ) : batchDetail && batchDetail.length > 0 ? (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)' }}>
                                <span>Wallet</span>
                                <span style={{ textAlign: 'right' as const }}>Amount</span>
                                <span style={{ textAlign: 'right' as const }}>Vault Share</span>
                              </div>
                              {batchDetail.map((w: any, i: number) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, padding: '8px 0', borderBottom: i < batchDetail.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center' }}>
                                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: OGAPAY_BLUE }}>{truncateWallet(w.wallet || w.address || '')}</span>
                                  <span style={{ textAlign: 'right' as const, fontWeight: 600 }}>{(w.amount || w.shareNgp || 0).toLocaleString()}</span>
                                  <span style={{ textAlign: 'right' as const, color: 'var(--text2)', fontSize: 11 }}>{(w.vaultSharePct || 0).toFixed(4)}%</span>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', padding: 12, fontSize: 12, color: 'var(--text2)' }}>No wallet details available</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
