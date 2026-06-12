import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const OGAPAY_BLUE = '#191C6B'

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: '0 auto', padding: '0 0 40px' },
  hero: { marginBottom: 24 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(25,28,107,0.12)', color: OGAPAY_BLUE, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' },
  title: { fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, margin: '8px 0 4px' },
  sub: { color: 'var(--text2)', fontSize: 14, margin: '0 0 16px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 },
  statCard: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' as const },
  statIcon: { fontSize: 22, marginBottom: 6, display: 'block' },
  statNum: { fontFamily: 'Outfit', fontSize: 22, fontWeight: 900 },
  statLabel: { fontSize: 11, color: 'var(--text2)', marginTop: 2 },
  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' },
  rowLast: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' },
  label: { fontSize: 12, color: 'var(--text2)' },
  value: { fontSize: 14, fontWeight: 700 },
  countdownBox: { background: `linear-gradient(135deg, ${OGAPAY_BLUE}, #0d0f2e)`, borderRadius: 12, padding: 20, marginBottom: 16, textAlign: 'center' as const },
  countdownNum: { fontFamily: 'Outfit', fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '0.02em' },
  countdownLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 },
  controls: { display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'flex-end' },
  pill: { padding: '6px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' },
  pillActive: { padding: '6px 14px', borderRadius: 999, border: '1px solid ' + OGAPAY_BLUE, background: OGAPAY_BLUE, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' },
  empty: { textAlign: 'center' as const, padding: '48px 20px', color: 'var(--text2)' },
  howStep: { display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)' },
  howStepLast: { display: 'flex', gap: 14, padding: '12px 0' },
  stepNum: { width: 28, height: 28, borderRadius: 8, background: OGAPAY_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 },
  stepContent: { fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 },
  stepTitle: { fontWeight: 700, color: 'var(--text)', marginBottom: 2 },
}

interface VaultData {
  pool: { totalNgp: number; totalPay: number; lastDistributionAt: string | null; nextDistributionAt: string | null }
  totalDistributedNgp: number
  totalDistributedPay: number
  distributionCount: number
  eligibleCount: number
}

interface UserVaultStats {
  payBalance: number
  totalEarnedNgp: number
  totalEarnedPay: number
  distributionsReceived: number
  isEligible: boolean
  estimatedNextNgp: number
  latestPayout: any
}

interface HistoryItem {
  periodStart: string
  amount: number
  payAmount: number
  payoutCount: number
}

function CountdownTo({ target }: { target: string | null }) {
  const [display, setDisplay] = useState('--:--:--:--')
  useEffect(() => {
    if (!target) { setDisplay('N/A'); return }
    const calc = () => {
      const diff = new Date(target).getTime() - Date.now()
      if (diff <= 0) { setDisplay('Distributing...'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDisplay(`${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`)
    }
    calc()
    const int = setInterval(calc, 1000)
    return () => clearInterval(int)
  }, [target])
  return <>{display}</>
}

function formatUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

export default function Vault() {
  const { user: authUser } = useAuth()
  const [vaultData, setVaultData] = useState<VaultData | null>(null)
  const [userStats, setUserStats] = useState<UserVaultStats | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyRange, setHistoryRange] = useState('30d')
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([])
  const [claiming, setClaiming] = useState(false)
  const [lookupUser, setLookupUser] = useState('')
  const [lookupResult, setLookupResult] = useState<any>(null)
  const [lookupError, setLookupError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [vaultRes, statsRes, histRes, pendingRes] = await Promise.all([
        apiRequest<any>('/vault'),
        authUser ? apiRequest<any>('/vault/my-stats').catch(() => null) : Promise.resolve(null),
        apiRequest<any>(`/vault/history?range=${historyRange}`),
        authUser ? apiRequest<any>('/vault/pending-payouts').catch(() => null) : Promise.resolve(null),
      ])
      if (vaultRes) setVaultData(vaultRes?.data || vaultRes)
      if (statsRes) setUserStats(statsRes?.data || statsRes)
      const hist = histRes?.data || histRes || []
      setHistory(Array.isArray(hist) ? hist : [])
      const pending = pendingRes?.data || pendingRes || []
      setPendingPayouts(Array.isArray(pending) ? pending : [])
    } catch {
      const el = document.getElementById('appToast')
      if (el) { el.textContent = 'Failed to load vault data'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
    } finally { setLoading(false) }
  }
  
  const handleLookup = async () => {
    if (!lookupUser.trim()) return
    setLookingUp(true)
    setLookupError('')
    setLookupResult(null)
    try {
      const res = await apiRequest<any>(`/vault/lookup?username=${encodeURIComponent(lookupUser.trim())}`)
      const data = res?.data || res
      if (data?.user) {
        setLookupResult(data)
      } else {
        setLookupError('User not found')
      }
    } catch {
      setLookupError('Failed to look up user. Check the username.')
    } finally { setLookingUp(false) }
  }

  const handleClaimAll = async () => {
    setClaiming(true)
    try {
      const res = await apiRequest<any>('/vault/claim', { method: 'POST' })
      const data = res?.data || res
      if (data?.claimed > 0) {
        setPendingPayouts([])
        setUserStats((prev: any) => prev ? { ...prev, totalEarnedNgp: (prev.totalEarnedNgp || 0) + data.totalNgp } : prev)
        // Show toast
        const el = document.getElementById('appToast')
        if (el) { el.textContent = `$${(data.totalNgp || 0).toLocaleString()} claimed!`; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
        // Refresh stats
        fetchAll()
      } else {
        const el = document.getElementById('appToast')
        if (el) { el.textContent = 'No payouts to claim'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
      }
    } catch {
      const el = document.getElementById('appToast')
      if (el) { el.textContent = 'Failed to claim payouts'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
    } finally { setClaiming(false) }
  }

  useEffect(() => {
    fetchAll()
    injectSkeletonStyles()
  }, [authUser, historyRange])

  const pool = vaultData?.pool
  const nextDistAt = pool?.nextDistributionAt || null

  // Chart data
  const chartData = history.map(h => ({
    label: new Date(h.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: h.amount,
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div style={{ color: OGAPAY_BLUE, fontWeight: 600 }}>{formatUSD(payload[0].value)} distributed</div>
        </div>
      )
    }
    return null
  }

  return (
    <Layout>
      <div style={S.page}>
        {/* ── Hero ── */}
        <div style={S.hero}>
          <div style={S.badge}>
            <i className="ti ti-vault" style={{ fontSize: 14 }} /> $PAY Revenue Vault
          </div>
          <h1 style={S.title}>Safe</h1>
          <p style={S.sub}>
            Platform revenue is pooled and distributed to <strong>$PAY</strong> token holders. Hold more $PAY to earn a larger share.
          </p>
        </div>

        {/* ── Countdown ── */}
        <div style={S.countdownBox}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Next Distribution
          </div>
          <div style={S.countdownNum}>
            <CountdownTo target={nextDistAt} />
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
            {vaultData?.eligibleCount || 0} eligible holders · {vaultData?.distributionCount || 0} distributions so far
          </div>
        </div>

        {loading && <SkeletonPage />}

        {!loading && (
          <>
            {/* ── Stats Row ── */}
            <div style={S.statsGrid}>
              <div style={S.statCard}>
                <i className="ti ti-coin" style={{ ...S.statIcon, color: OGAPAY_BLUE }} />
                <div style={{ ...S.statNum, color: OGAPAY_BLUE }}>{formatUSD(pool?.totalNgp || 0)}</div>
                <div style={S.statLabel}>Pool Balance (USD)</div>
              </div>
              <div style={S.statCard}>
                <i className="ti ti-currency-dollar" style={{ ...S.statIcon, color: '#16a34a' }} />
                <div style={{ ...S.statNum, color: '#16a34a' }}>{formatUSD(vaultData?.totalDistributedNgp || 0)}</div>
                <div style={S.statLabel}>Total Distributed (USD)</div>
              </div>
              <div style={S.statCard}>
                <i className="ti ti-users" style={{ ...S.statIcon, color: '#f59e0b' }} />
                <div style={{ ...S.statNum, color: '#f59e0b' }}>{(pool?.totalPay || 0).toLocaleString()}</div>
                <div style={S.statLabel}>$PAY in Pool</div>
              </div>
            </div>

            {/* ── Vault Lookup — Check any user's eligibility ── */}
            <div style={S.card}>
              <div style={S.cardTitle}>
                <i className="ti ti-search" style={{ color: OGAPAY_BLUE }} /> Check User Eligibility
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 12px' }}>
                Enter a username to see their vault status and earnings.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={lookupUser} onChange={e => setLookupUser(e.target.value)}
                  placeholder="Enter username..."
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                  style={{ flex: 1, height: 40, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={handleLookup} disabled={lookingUp || !lookupUser.trim()}
                  style={{ height: 40, padding: '0 18px', borderRadius: 9, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-search" /> {lookingUp ? 'Searching...' : 'Look Up'}
                </button>
              </div>

              {lookupResult && (
                <div style={{ marginTop: 14, padding: 14, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: OGAPAY_BLUE, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 13, overflow: 'hidden', flexShrink: 0 }}>
                      {lookupResult.user.avatarUrl ? <img src={lookupResult.user.avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : lookupResult.user.name?.split(' ').map((w: string) => w[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{lookupResult.user.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>@{lookupResult.user.username}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: lookupResult.vault.isEligible ? 'rgba(22,163,74,0.12)' : 'rgba(100,100,100,0.1)', color: lookupResult.vault.isEligible ? '#16a34a' : 'var(--text3)' }}>
                      {lookupResult.vault.isEligible ? '✓ Eligible' : '✕ Not Eligible'}
                    </div>
                  </div>
                  <div style={S.row}><span style={S.label}>$PAY Balance</span><span style={S.value}>{(lookupResult.vault.payBalance || 0).toLocaleString()} $PAY</span></div>
                  <div style={S.row}><span style={S.label}>Total Earned</span><span style={S.value}>{formatUSD(lookupResult.vault.totalEarned || 0)}</span></div>
                  <div style={S.rowLast}><span style={S.label}>Distributions Received</span><span style={S.value}>{lookupResult.vault.distributionsReceived || 0}</span></div>
                </div>
              )}

              {lookupError && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-alert-circle" /> {lookupError}
                </div>
              )}
            </div>
            {/* ── User Stats Card (only if logged in) ── */}
            {authUser && userStats && (
              <div style={S.card}>
                <div style={S.cardTitle}>
                  <i className="ti ti-user" style={{ color: OGAPAY_BLUE }} /> Your Vault Stats
                </div>
                <div style={S.row}>
                  <span style={S.label}>Your $PAY Balance</span>
                  <span style={S.value}>{userStats.payBalance.toLocaleString()} $PAY</span>
                </div>
                <div style={S.row}>
                  <span style={S.label}>Estimated Next Payout</span>
                  <span style={{ ...S.value, color: '#16a34a' }}>{formatUSD(userStats.estimatedNextNgp)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.label}>Total Earned</span>
                  <span style={S.value}>{formatUSD(userStats.totalEarnedNgp)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.label}>Distributions Received</span>
                  <span style={S.value}>{userStats.distributionsReceived}</span>
                </div>
                <div style={S.rowLast}>
                  <span style={S.label}>Status</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: userStats.isEligible ? '#16a34a' : 'var(--text3)' }}>
                    {userStats.isEligible ? '✓ Eligible' : '✕ Not Eligible — Hold $PAY to qualify'}
                  </span>
                </div>

                {/* ── Pending Payouts ── */}
                {pendingPayouts.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 8 }}>
                      Pending Payouts ({pendingPayouts.length})
                    </div>
                    {pendingPayouts.slice(0, 3).map((p: any) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: 'var(--text2)' }}>
                        <span>{new Date(p.distributedAt).toLocaleDateString()}</span>
                        <span style={{ fontWeight: 600, color: '#16a34a' }}>+{formatUSD(p.shareNgp)}</span>
                      </div>
                    ))}
                    <button onClick={handleClaimAll} disabled={claiming}
                      style={{ width: '100%', height: 38, marginTop: 10, borderRadius: 9, background: '#16a34a', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: claiming ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      {claiming ? 'Claiming...' : `Claim All (${formatUSD(pendingPayouts.reduce((s: number, p: any) => s + p.shareNgp, 0))})`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Not logged in prompt ── */}
            {!authUser && (
              <div style={S.card}>
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text2)', fontSize: 13 }}>
                  <i className="ti ti-user-off" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--text3)' }} />
                  Log in to see your vault stats and earnings
                </div>
              </div>
            )}

            {/* ── Distribution History Chart ── */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={S.cardTitle}>
                  <i className="ti ti-chart-bar" style={{ color: OGAPAY_BLUE }} /> Distribution History
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['7d', '30d', '1y'].map(r => (
                    <button key={r} style={historyRange === r ? S.pillActive : S.pill} onClick={() => setHistoryRange(r)}>
                      {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '1 Year'}
                    </button>
                  ))}
                </div>
              </div>

              {chartData.length === 0 ? (
                <div style={S.empty}>
                  <i className="ti ti-chart-bar-off" style={{ fontSize: 28, color: 'var(--text3)', marginBottom: 8, display: 'block' }} />
                  <p style={{ margin: 0, fontSize: 13 }}>No distribution data yet</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" fill={OGAPAY_BLUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* ── How It Works ── */}
            <div style={S.card}>
              <div style={S.cardTitle}>
                <i className="ti ti-info-circle" style={{ color: OGAPAY_BLUE }} /> How the Safe Works
              </div>
              <div style={S.howStep}>
                <div style={S.stepNum}>1</div>
                <div style={S.stepContent}>
                  <div style={S.stepTitle}>Platform Revenue is Pooled</div>
                  Every task fee, store commission, and service cut is added to the Safe.
                </div>
              </div>
              <div style={S.howStep}>
                <div style={S.stepNum}>2</div>
                <div style={S.stepContent}>
                  <div style={S.stepTitle}>Hold $PAY to Qualify</div>
                  The more $PAY you hold, the larger your share of the next distribution. No minimum lock-up period.
                </div>
              </div>
              <div style={S.howStep}>
                <div style={S.stepNum}>3</div>
                <div style={S.stepContent}>
                  <div style={S.stepTitle}>Automatic Distribution</div>
                  Revenue is distributed automatically every 24 hours to all eligible $PAY holders proportional to their holdings.
                </div>
              </div>
              <div style={S.howStepLast}>
                <div style={S.stepNum}>4</div>
                <div style={S.stepContent}>
                  <div style={S.stepTitle}>Earn USD Rewards</div>
                  Your share is credited directly to your OgaPay wallet in USD. Use it to withdraw, spend in the store, or post more tasks.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
