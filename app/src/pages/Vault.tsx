import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { apiRequest, API_BASE } from '../lib/api'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const OGAPAY_BLUE = '#191C6B'
const GREEN = '#16a34a'
const RED = '#dc2626'

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: '0 auto', padding: '0 0 40px' },
  hero: { marginBottom: 20, textAlign: 'center' as const },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(25,28,107,0.12)', color: OGAPAY_BLUE, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' },
  title: { fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, margin: '8px 0 4px' },
  sub: { color: 'var(--text2)', fontSize: 14, margin: '0 0 16px' },
  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' },
  rowLast: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' },
  label: { fontSize: 12, color: 'var(--text2)' },
  value: { fontSize: 14, fontWeight: 700 },
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
  totalSupplyPay?: number
  eligibleSupplyPay?: number
  avgDailyReturnPct?: number
  sevenDayReturnPct?: number
  thirtyDayReturnPct?: number
  upcomingDistributionPreview?: Array<{
    wallet: string
    amountPay: number
    isLP: boolean
    isEligible: boolean
    vaultSharePct: number
  }>
  recentContributions?: Array<{
    completedAt: string
    amountPay: number
    jobId: string
    reason: string
  }>
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

function formatPay(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
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

// $PAY token contract address (Solana)
const PAY_TOKEN_CA = 'Hx5bE1K9Q3YxR8vM2nP6cJ7fD4aL0wT3uS9gN1qV2'  // $PAY on Solana

function WalletConnectButton({ provider, icon, label, color }: { provider: string; icon: string; label: string; color: string }) {
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    setConnecting(true)
    try {
      let providerObj: any = null
      if (provider === 'phantom') providerObj = (window as any).phantom?.solana
      else if (provider === 'solflare') providerObj = (window as any).solflare
      else if (provider === 'backpack') providerObj = (window as any).backpack?.solana

      if (!providerObj) {
        window.open(`https://${provider}.app`, '_blank')
        return
      }

      const resp = await providerObj.connect()
      if (resp?.publicKey) {
        const walletAddress = resp.publicKey.toString()
        const token = localStorage.getItem('ogapay_access_token')
        if (token) {
          await fetch(`${API_BASE}/auth/wallet/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ walletAddress, provider }),
          }).catch(() => {})
        }
        window.location.reload()
      }
    } catch (err) {
      console.error(`Failed to connect ${provider}:`, err)
    }
    setConnecting(false)
  }

  return (
    <button onClick={handleConnect} disabled={connecting}
      style={{
        height: 36, padding: '0 14px', borderRadius: 9, border: `1px solid ${color}`,
        background: `${color}15`, color, fontSize: 12, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
        transition: 'all .15s', opacity: connecting ? 0.6 : 1,
      }}>
      <img src={icon} alt="" style={{ width: 16, height: 16 }} />
      {connecting ? 'Connecting...' : label}
    </button>
  )
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
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [vaultRes, statsRes, histRes, pendingRes, walletRes] = await Promise.all([
        apiRequest<any>('/vault'),
        authUser ? apiRequest<any>('/vault/my-stats').catch(() => null) : Promise.resolve(null),
        apiRequest<any>(`/vault/history?range=${historyRange}`),
        authUser ? apiRequest<any>('/vault/pending-payouts').catch(() => null) : Promise.resolve(null),
        authUser ? apiRequest<any>('/auth/me').catch(() => null) : Promise.resolve(null),
      ])
      if (vaultRes) setVaultData(vaultRes?.data || vaultRes)
      if (statsRes) setUserStats(statsRes?.data || statsRes)
      const hist = histRes?.data || histRes || []
      setHistory(Array.isArray(hist) ? hist : [])
      const pending = pendingRes?.data || pendingRes || []
      setPendingPayouts(Array.isArray(pending) ? pending : [])
      if (walletRes) {
        const w = walletRes?.data || walletRes || {}
        if (w.walletAddress) {
          setWalletConnected(true)
          setWalletAddress(w.walletAddress)
        }
      }
      setLastRefreshed(new Date())
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
      const res = await apiRequest<any>(`/vault/lookup?wallet=${encodeURIComponent(lookupUser.trim())}`)
      const data = res?.data || res
      if (data?.user) {
        setLookupResult(data)
      } else {
        setLookupError('Wallet not found on OgaPay')
      }
    } catch {
      setLookupError('Failed to look up. Check the wallet address.')
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
        const el = document.getElementById('appToast')
        if (el) { el.textContent = `$${(data.totalNgp || 0).toLocaleString()} claimed!`; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
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

  // Format refreshed time
  const refreshedText = lastRefreshed
    ? `Refreshed ${timeAgo(lastRefreshed.toISOString())}`
    : ''

  // Chart data
  const chartData = history.map(h => ({
    label: new Date(h.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: h.amount,
  }))

  // Use amounts as-is; if they look like percentages (<= 1), format as pct
  const isReturnChart = chartData.length > 0 && chartData.every(d => d.amount <= 1)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const val = payload[0].value
      return (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div style={{ color: GREEN, fontWeight: 600 }}>
            {isReturnChart ? `${Number(val).toFixed(4)}%` : formatUSD(val)}
          </div>
        </div>
      )
    }
    return null
  }

  const formatPct = (v: number | undefined | null) => {
    if (v === undefined || v === null) return '—'
    return `${v.toFixed(4)}%`
  }

  const topEligible = vaultData?.upcomingDistributionPreview?.slice(0, 5) || []
  const topContributions = vaultData?.recentContributions?.slice(0, 5) || []

  return (
    <Layout>
      <div style={S.page}>
        {loading && <SkeletonPage />}

        {!loading && (
          <>
            {/* ════════════════════════════════════════
                1. HERO
               ════════════════════════════════════════ */}
            <div style={S.hero}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <div style={S.badge}>
                  <i className="ti ti-vault" style={{ fontSize: 14 }} /> $PAY Revenue Vault
                </div>
              </div>
              <h1 style={S.title}>Vault</h1>
              <p style={S.sub}>Every 12 hours platform revenue is distributed to $PAY holders</p>
            </div>

            {/* ── $PAY Token Contract Address ── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-currency-solana" style={{ color: '#9945FF', fontSize: 18 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text2)' }}>$PAY Token</div>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text)', wordBreak: 'break-all' }}>{PAY_TOKEN_CA}</div>
                </div>
              </div>
              <button onClick={() => { navigator.clipboard?.writeText(PAY_TOKEN_CA); const el = document.getElementById('appToast'); if (el) { el.textContent = 'CA copied!'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2000) } }}
                style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-copy" /> Copy CA
              </button>
            </div>

            {/* ════════════════════════════════════════
                2. VAULT BALANCE CARD
               ════════════════════════════════════════ */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 16, textAlign: 'center' as const }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 6 }}>Vault Balance</div>
              <div style={{ fontFamily: 'Outfit', fontSize: 40, fontWeight: 900, color: OGAPAY_BLUE, lineHeight: 1.1, marginBottom: 4 }}>
                {(pool?.totalPay || 0).toLocaleString()} <span style={{ fontSize: 20, fontWeight: 700 }}>$PAY</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text2)' }}>{formatUSD(pool?.totalNgp || 0)}</div>
            </div>

            {/* ════════════════════════════════════════
                3. NEXT DISTRIBUTION CARD
               ════════════════════════════════════════ */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16, textAlign: 'center' as const }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 8 }}>Next Distribution</div>
              <div style={{ fontFamily: 'Outfit', fontSize: 40, fontWeight: 900, color: OGAPAY_BLUE, letterSpacing: '0.02em', marginBottom: 6 }}>
                <CountdownTo target={nextDistAt} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                {nextDistAt ? `at ${new Date(nextDistAt).toLocaleString()}` : 'N/A'}
              </div>
            </div>

            {/* ── Wallet Connect ── */}
            {authUser && !walletConnected && (
              <div style={S.card}>
                <div style={S.cardTitle}>
                  <i className="ti ti-wallet" style={{ color: '#9945FF' }} /> Connect Your Solana Wallet
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 12px' }}>
                  Connect a Solana wallet to receive vault payouts directly to your wallet.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <WalletConnectButton provider="phantom" icon="https://img.icons8.com/color/48/phantom-wallet.png" label="Phantom" color="#AB9FF2" />
                  <WalletConnectButton provider="solflare" icon="https://img.icons8.com/color/48/solana.png" label="Solflare" color="#FC7B2F" />
                  <WalletConnectButton provider="backpack" icon="https://img.icons8.com/color/48/backpack.png" label="Backpack" color="#E33EFF" />
                </div>
              </div>
            )}

            {walletConnected && authUser && (
              <div style={S.card}>
                <div style={S.cardTitle}>
                  <i className="ti ti-wallet" style={{ color: '#16a34a' }} /> Wallet Connected
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connected'}
                  <button onClick={() => { navigator.clipboard?.writeText(walletAddress); const el = document.getElementById('appToast'); if (el) { el.textContent = 'Address copied!'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2000) } }}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>
                    <i className="ti ti-copy" /> Copy
                  </button>
                </div>
              </div>
            )}

            {/* ── User Stats Card (only if logged in) ── */}
            {authUser && userStats && (
              <div style={S.card}>
                <div style={S.cardTitle}>
                  <i className="ti ti-user" style={{ color: OGAPAY_BLUE }} /> Your Vault Stats
                </div>
                <div style={S.row}>
                  <span style={S.label}>$PAY Balance</span>
                  <span style={S.value}>{(userStats.payBalance || 0).toLocaleString()} $PAY</span>
                </div>
                <div style={S.row}>
                  <span style={S.label}>Estimated Next Payout</span>
                  <span style={{ ...S.value, color: '#16a34a' }}>{formatUSD(userStats.estimatedNextNgp)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.label}>Total Earned</span>
                  <span style={S.value}>{formatUSD(userStats.totalEarnedNgp)}</span>
                </div>
                <div style={S.rowLast}>
                  <span style={S.label}>Distributions Received</span>
                  <span style={S.value}>{userStats.distributionsReceived}</span>
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
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                      <i className="ti ti-wallet" /> Payouts sent to {walletConnected && walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : 'your connected Solana wallet'}
                    </div>
                    <button onClick={handleClaimAll} disabled={claiming || !walletConnected}
                      style={{ width: '100%', height: 38, marginTop: 4, borderRadius: 9, background: '#16a34a', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: (claiming || !walletConnected) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      {!walletConnected ? 'Connect Solana Wallet First' : claiming ? 'Claiming...' : `Claim All to Solana (${formatUSD(pendingPayouts.reduce((s: number, p: any) => s + p.shareNgp, 0))})`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════
                4. THREE STAT CARDS
               ════════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' as const }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 4 }}>Total Supply</div>
                <div style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 900, color: OGAPAY_BLUE }}>
                  {vaultData?.totalSupplyPay !== undefined ? `${formatPay(vaultData.totalSupplyPay)} $PAY` : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' as const }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 4 }}>Eligible Supply</div>
                <div style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 900, color: '#16a34a' }}>
                  {vaultData?.eligibleSupplyPay !== undefined ? `${formatPay(vaultData.eligibleSupplyPay)} $PAY` : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' as const }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 4 }}>Eligible Wallets</div>
                <div style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>{vaultData?.eligibleCount || 0}</div>
              </div>
            </div>

            {/* ════════════════════════════════════════
                5. CHECK YOUR WALLET
               ════════════════════════════════════════ */}
            <div style={S.card}>
              <div style={S.cardTitle}>
                <i className="ti ti-search" style={{ color: OGAPAY_BLUE }} /> Check Your Wallet
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 12px' }}>
                Enter any wallet address to see whether it is eligible in the latest vault snapshot and what share of the current preview it has.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={lookupUser} onChange={e => setLookupUser(e.target.value)}
                  placeholder="Enter Solana wallet address..."
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                  style={{ flex: 1, height: 40, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={handleLookup} disabled={lookingUp || !lookupUser.trim()}
                  style={{ height: 40, padding: '0 18px', borderRadius: 9, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-search" /> {lookingUp ? 'Searching...' : 'Check Wallet'}
                </button>
              </div>
              {refreshedText && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{refreshedText}</div>}

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
                <div style={{ marginTop: 10, fontSize: 12, color: RED, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-alert-circle" /> {lookupError}
                </div>
              )}
            </div>

            {/* ── Not logged in prompt (for user stats) ── */}
            {!authUser && (
              <div style={S.card}>
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text2)', fontSize: 13 }}>
                  <i className="ti ti-user-off" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--text3)' }} />
                  Log in to see your vault stats and earnings
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════
                6. HOW IT WORKS — COLLAPSIBLE
               ════════════════════════════════════════ */}
            <div style={S.card}>
              <div onClick={() => setHowItWorksOpen(!howItWorksOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-info-circle" style={{ color: OGAPAY_BLUE }} /> How it works
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Learn what activity is needed to qualify for distribution.</div>
                </div>
                <i className="ti ti-chevron-down" style={{ fontSize: 18, color: 'var(--text3)', transform: howItWorksOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }} />
              </div>

              {howItWorksOpen && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={S.howStep}>
                    <div style={S.stepNum}>1</div>
                    <div style={S.stepContent}>
                      <div style={S.stepTitle}>Platform Revenue is Pooled</div>
                      Every task fee, store commission, and service cut is added to the Safe.
                    </div>
                  </div>
                  <div style={S.howStepLast}>
                    <div style={S.stepNum}>2</div>
                    <div style={S.stepContent}>
                      <div style={S.stepTitle}>Hold $PAY to Qualify</div>
                      The more $PAY you hold, the larger your share of the next distribution. No minimum lock-up period.
                    </div>
                  </div>
                  <div style={S.howStepLast}>
                    <div style={S.stepNum}>3</div>
                    <div style={S.stepContent}>
                      <div style={S.stepTitle}>Automatic Distribution</div>
                      Revenue is distributed automatically every 12 hours to all eligible $PAY holders proportional to their holdings.
                    </div>
                  </div>
                  <div style={S.howStepLast}>
                    <div style={S.stepNum}>4</div>
                    <div style={S.stepContent}>
                      <div style={S.stepTitle}>Claim to Solana Wallet</div>
                      Your share is paid out to your connected Solana wallet in USDC. Connect Phantom, Solflare, or Backpack to receive payouts.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════
                7. RETURN TREND (LAST 30 DAYS)
               ════════════════════════════════════════ */}
            <div style={S.card}>
              <div style={S.cardTitle}>
                <i className="ti ti-chart-bar" style={{ color: GREEN }} /> Return Trend (Last 30 Days)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Vault performance</div>

              {/* Small stat blocks above chart */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, textAlign: 'center' as const, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 2 }}>Avg Daily Return (30D)</div>
                  <div style={{ fontFamily: 'Outfit', fontSize: 16, fontWeight: 800, color: GREEN }}>{formatPct(vaultData?.avgDailyReturnPct)}</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, textAlign: 'center' as const, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 2 }}>7D Cumulative Return</div>
                  <div style={{ fontFamily: 'Outfit', fontSize: 16, fontWeight: 800, color: GREEN }}>{formatPct(vaultData?.sevenDayReturnPct)}</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, textAlign: 'center' as const, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 2 }}>30D Cumulative Return</div>
                  <div style={{ fontFamily: 'Outfit', fontSize: 16, fontWeight: 800, color: GREEN }}>{formatPct(vaultData?.thirtyDayReturnPct)}</div>
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
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => isReturnChart ? `${v.toFixed(2)}%` : `${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, textAlign: 'center' as const }}>Data grouped by UTC day.</div>
            </div>

            {/* ════════════════════════════════════════
                8. PREVIEW UPCOMING DISTRIBUTION
               ════════════════════════════════════════ */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-clock-hourglass" style={{ color: OGAPAY_BLUE, fontSize: 15 }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Preview Upcoming Distribution</span>
                  <span onClick={() => fetchAll()} style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text3)' }}>
                    <i className="ti ti-refresh" /> {refreshedText}
                  </span>
                </div>
                <div style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(25,28,107,0.1)', color: OGAPAY_BLUE, fontSize: 11, fontWeight: 700 }}>
                  {vaultData?.eligibleCount || 0} Eligible
                </div>
              </div>

              {topEligible.length === 0 ? (
                <div style={S.empty}>
                  <i className="ti ti-users" style={{ fontSize: 24, color: 'var(--text3)', marginBottom: 6, display: 'block' }} />
                  <p style={{ margin: 0, fontSize: 12 }}>No distribution preview available yet</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)' }}>
                    <span>Wallet</span>
                    <span style={{ textAlign: 'right' as const }}>Amount</span>
                    <span style={{ textAlign: 'center' as const }}>Eligible</span>
                    <span style={{ textAlign: 'right' as const }}>Vault Share</span>
                  </div>
                  {topEligible.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, padding: '10px 0', borderBottom: i < topEligible.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center' }}>
                      <span style={{ color: OGAPAY_BLUE, fontWeight: 600, cursor: 'pointer' }}>{truncateWallet(item.wallet)}</span>
                      <span style={{ textAlign: 'right' as const, fontWeight: 600 }}>{formatPay(item.amountPay)}</span>
                      <span style={{ textAlign: 'center' as const }}>
                        {item.isLP && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontSize: 10, fontWeight: 700, marginRight: 4 }}>LP</span>}
                        <span style={{ padding: '2px 6px', borderRadius: 4, background: item.isEligible ? 'rgba(22,163,74,0.12)' : 'rgba(100,100,100,0.1)', color: item.isEligible ? GREEN : 'var(--text3)', fontSize: 10, fontWeight: 700 }}>
                          {item.isEligible ? 'YES' : 'NO'}
                        </span>
                      </span>
                      <span style={{ textAlign: 'right' as const, color: 'var(--text2)' }}>{item.vaultSharePct.toFixed(4)}%</span>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center' as const, marginTop: 10 }}>
                    <button style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      View More
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ════════════════════════════════════════
                9. RECENT VAULT CONTRIBUTIONS
               ════════════════════════════════════════ */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-coin" style={{ color: GREEN, fontSize: 15 }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Recent Vault Contributions</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Last 50 contributions</span>
              </div>

              {topContributions.length === 0 ? (
                <div style={S.empty}>
                  <i className="ti ti-currency-dollar-off" style={{ fontSize: 24, color: 'var(--text3)', marginBottom: 6, display: 'block' }} />
                  <p style={{ margin: 0, fontSize: 12 }}>No contributions recorded yet</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1.5fr', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)' }}>
                    <span>Completed At</span>
                    <span style={{ textAlign: 'right' as const }}>Amount</span>
                    <span>Job</span>
                    <span>Reason</span>
                  </div>
                  {topContributions.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1.5fr', gap: 8, padding: '10px 0', borderBottom: i < topContributions.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center' }}>
                      <span style={{ color: 'var(--text2)', fontSize: 11 }}>{timeAgo(item.completedAt)}</span>
                      <span style={{ textAlign: 'right' as const, fontWeight: 600, color: GREEN }}>{item.amountPay.toLocaleString()} $PAY</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(25,28,107,0.08)', color: OGAPAY_BLUE, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', display: 'inline-block', width: 'fit-content' }}>
                        #{item.jobId?.slice(0, 8) || '—'}
                      </span>
                      <span style={{ color: 'var(--text3)', fontSize: 11 }}>{item.reason || '—'}</span>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center' as const, marginTop: 10 }}>
                    <button style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      View More
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ════════════════════════════════════════
                10. DISTRIBUTION HISTORY LINK
               ════════════════════════════════════════ */}
            <div style={{ textAlign: 'center' as const, marginTop: 8, marginBottom: 16 }}>
              <a href="/vault/history"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 20px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>
                <i className="ti ti-clock" /> Distribution History
              </a>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
