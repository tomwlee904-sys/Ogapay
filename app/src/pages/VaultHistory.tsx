import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import { formatCompact } from '../lib/currency'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import '../styles/vault.css'

// Every vault distribution, and a lookup for what one wallet received. Same
// page frame as /vault: the batches in the main column, "Check a wallet" in the
// side panel (first on phones and tablets once a wallet is being looked at).

function formatUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

function truncateWallet(addr: string) {
  if (!addr || addr.length < 10) return addr
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

const ngn = (n: number, dp = 2) => '₦' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
const STATUS: Record<string, [string, string]> = { COMPLETED: ['ok', 'Completed'], PENDING: ['wait', 'Pending'], PROCESSING: ['wait', 'Processing'], FAILED: ['bad', 'Failed'] }
const RANGES = [['7d', '7 days'], ['30d', '30 days'], ['1y', '1 year']] as const

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
  const [, setRewardsLoading] = useState(false)

  // Distribution batches
  const [batches, setBatches] = useState<any[]>([])
  const [batchPage, setBatchPage] = useState(1)
  const [batchTotalPages, setBatchTotalPages] = useState(1)
  const [batchTotalBatches, setBatchTotalBatches] = useState(0)
  const [batchLoading, setBatchLoading] = useState(true)
  const [batchErr, setBatchErr] = useState(false)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const [batchDetail, setBatchDetail] = useState<any[] | null>(null)
  const [batchDetailLoading, setBatchDetailLoading] = useState(false)

  const fetchBatches = async (page: number) => {
    setBatchLoading(true)
    setBatchErr(false)
    try {
      const res = await apiRequest<any>(`/vault/history/batches?page=${page}`)
      const d = res?.data || res
      setBatches(d?.batches || [])
      setBatchTotalPages(d?.totalPages || 1)
      setBatchTotalBatches(d?.totalBatches || 0)
    } catch {
      // Said so, not "no batches yet"
      setBatchErr(true)
    } finally { setBatchLoading(false) }
  }
  const goPage = (p: number) => { setBatchPage(p); setExpandedBatch(null); fetchBatches(p) }

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
        setWalletError('No OgaPay account uses this wallet.')
      }
    } catch {
      setWalletError("Couldn't check this wallet. Check the address and try again.")
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
    // Auto-search if prefilled from URL
    if (prefillWallet) {
      fetchWalletLookup(prefillWallet)
    }
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
    label: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    amount: d.amount,
  })) || []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
          <div style={{ color: 'var(--text)', fontWeight: 600 }}>₦{(payload[0].value || 0).toLocaleString()}</div>
        </div>
      )
    }
    return null
  }

  const v = walletResult?.vault

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <Link className="vh-back tap" to="/vault"><i className="ti ti-arrow-left" aria-hidden="true" /> Vault</Link>
            <h1 className="ui-title">Distribution history</h1>
            <p className="ui-sub">Every vault distribution to $PAY holders, and what each wallet received. Amounts are in naira.</p>
          </div>
        </div>

        <div className="ui-split vt2-split">
          <div style={{ display: "grid", gap: 16, alignContent: "start", minWidth: 0 }}>
            <section className="ui-card vt2-sec" aria-labelledby="vh-batches-h">
              <div className="vh-sub-h">
                <div>
                  <h2 id="vh-batches-h">All distributions</h2>
                  {!batchErr && !batchLoading && <div className="vh-count">{batchTotalPages > 1 ? `Page ${batchPage} of ${batchTotalPages} · ` : ''}{batchTotalBatches} {batchTotalBatches === 1 ? 'distribution' : 'distributions'}</div>}
                </div>
                {batchTotalPages > 1 && !batchErr && (
                  <div className="vh-pager">
                    <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon" aria-label="Newer distributions" disabled={batchPage <= 1 || batchLoading} onClick={() => goPage(Math.max(1, batchPage - 1))}><i className="ti ti-chevron-left" aria-hidden="true" /></button>
                    <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon" aria-label="Older distributions" disabled={batchPage >= batchTotalPages || batchLoading} onClick={() => goPage(Math.min(batchTotalPages, batchPage + 1))}><i className="ti ti-chevron-right" aria-hidden="true" /></button>
                  </div>
                )}
              </div>

              {batchErr ? (
                <LoadError what="the distribution history" onRetry={() => fetchBatches(batchPage)} />
              ) : batchLoading ? (
                <div style={{ display: 'grid', gap: 10 }}>{[0, 1, 2, 3].map((i) => <div key={i} className="ui-sk" style={{ height: 52, borderRadius: 12 }} />)}</div>
              ) : batches.length === 0 ? (
                <p className="vt2-none">No distributions yet. The first one runs at the next 1am or 1pm (Lagos).</p>
              ) : (
                <>
                  <div className="vh-head" aria-hidden="true"><span>Batch</span><span>Distributed</span><span>Total shared</span><span>Status</span><span /></div>
                  <ul className="vh-batches">
                    {batches.map((batch: any) => {
                      const [cls, label] = STATUS[String(batch.status || 'COMPLETED').toUpperCase()] || ['', String(batch.status)]
                      const isOpen = expandedBatch === batch.id
                      return (
                        <li className="vh-batch" key={batch.id}>
                          <button type="button" className="vh-row" aria-expanded={isOpen} onClick={() => handleBatchToggle(batch.id)}>
                            <span className="num">#{batch.batchNumber || batch.id?.slice(0, 8) || '—'}</span>
                            <span className="time">{batch.distributedAt ? new Date(batch.distributedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
                            <span className="tot">{ngn(batch.totalNgn ?? batch.totalPay ?? 0)}</span>
                            <span className={`vh-st ${cls}`}>{label}</span>
                            <i className="ti ti-chevron-down chev" aria-hidden="true" />
                          </button>
                          {isOpen && (
                            <div className="vh-detail">
                              {batchDetailLoading ? (
                                <div style={{ padding: 8 }}>Loading the wallets…</div>
                              ) : batchDetail && batchDetail.length > 0 ? (
                                <>
                                  <div className="vh-w th"><span>Wallet</span><span>Amount</span><span>Share</span></div>
                                  {batchDetail.map((w: any, i: number) => (
                                    <div className="vh-w" key={i}>
                                      <span style={{ minWidth: 0, display: 'flex', alignItems: 'center' }}><code>{truncateWallet(w.wallet || w.address || '')}</code>{w.you && <b className="vh-you">You</b>}</span>
                                      <b>{ngn(w.amount || w.shareNgp || 0)}</b>
                                      <span>{(w.vaultSharePct || 0).toFixed(4)}%</span>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <div style={{ padding: 8 }}>No wallet details for this distribution.</div>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </section>
          </div>

          <div className={`ui-split-side vt2-side${searchedWallet ? ' ui-split-side-first' : ''}`} style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <section className="ui-card vt2-sec" aria-labelledby="vh-check-h">
              <h2 id="vh-check-h">Check a wallet</h2>
              <p className="vt2-lead">See what any wallet has received from the vault, and its payouts over time.</p>
              <form className="vt2-check" onSubmit={(e) => { e.preventDefault(); handleLoadRewards() }}>
                <input className="ui-input" value={searchWallet} onChange={(e) => setSearchWallet(e.target.value)} placeholder="Solana wallet address" aria-label="Solana wallet address" spellCheck={false} autoComplete="off" />
                <button type="submit" className={`ui-btn ui-btn-dark${walletLoading ? ' is-loading' : ''}`} disabled={walletLoading}>Check rewards</button>
              </form>
              {searchedWallet && <button type="button" className="ui-btn ui-btn-text ui-btn-sm vh-clear" onClick={handleClear}>Clear</button>}
              {walletError && <div className="vh-err" role="alert"><i className="ti ti-alert-circle" aria-hidden="true" /> {walletError}</div>}

              {v && (
                <>
                  <div className="vh-who">
                    {walletResult?.user?.name ? <><b>{walletResult.user.name}</b> · @{walletResult.user.username}<br /></> : null}
                    <code>{walletResult.wallet}</code>
                  </div>
                  <div className="ui-stats vt2-mini" style={{ marginTop: 12 }}>
                    <div><span className="ui-stats-label">$PAY held</span><b className="ui-stats-value">{formatCompact(v.heldAmount ?? v.payBalance)}</b></div>
                    <div><span className="ui-stats-label">In the next run</span><b className="ui-stats-value">{v.isEligible ? 'Yes' : 'No'}</b></div>
                    <div><span className="ui-stats-label">Share</span><b className="ui-stats-value">{(v.distributionSharePct ?? 0).toFixed(4)}%</b></div>
                    <div><span className="ui-stats-label">Share now (est.)</span><b className="ui-stats-value">{formatUSD(v.estimatedCurrentUsd ?? 0)}</b></div>
                  </div>
                </>
              )}
            </section>

            {walletResult && (
              <section className="ui-card vt2-sec" aria-labelledby="vh-rew-h">
                <div className="vh-sub-h" style={{ marginBottom: 0 }}>
                  <h2 id="vh-rew-h">Rewards for {truncateWallet(walletResult.wallet)}</h2>
                </div>
                <div className="vt2-strip vh-strip" style={{ marginTop: 12 }}>
                  <div><span>Received</span><b>₦{(rewardsData?.totalReceivedNgn ?? rewardsData?.totalReceivedPay ?? 0).toLocaleString()}</b></div>
                  <div><span>Distributions</span><b>{rewardsData?.completedDistributions || 0}</b></div>
                  <div><span>Other entries</span><b>{rewardsData?.otherEntries || 0}</b></div>
                </div>
                <div className="vh-seg" role="group" aria-label="Period">
                  {RANGES.map(([r, label]) => <button key={r} type="button" aria-pressed={rewardsRange === r} onClick={() => setRewardsRange(r)}>{label}</button>)}
                </div>
                <div className="vt2-strip vh-strip two">
                  <div><span>Received in this period</span><b>₦{(rewardsData?.receivedInPeriodNgn ?? rewardsData?.receivedInPeriodPay ?? 0).toLocaleString()}</b></div>
                  <div><span>Worth today (USD)</span><b>{formatUSD(rewardsData?.currentUsdEstimate || 0)}</b></div>
                </div>
                {chartData.length === 0 ? (
                  <p className="vt2-none">No rewards landed in this period.</p>
                ) : (
                  <>
                    <div style={{ width: '100%', height: 180, marginTop: 14 }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text2)' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: 'var(--text2)' }} axisLine={false} tickLine={false}
                            tickFormatter={(n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="amount" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="vh-foot"><span>USD uses today's naira rate.</span><span>Grouped by day (UTC).</span></div>
                  </>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
