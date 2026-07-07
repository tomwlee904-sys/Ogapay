import { useNavigate } from 'react-router-dom'
import { formatCompact } from '../lib/currency'

const OGAPAY_BLUE = 'var(--accent)'
const OGAPAY_BLUE_MUTED = 'rgba(var(--accent-rgb),0.08)'
const GREEN = 'var(--green)'
const GREEN_BG = 'rgba(22,163,74,0.12)'
const RED = '#dc2626'
const RED_BG = 'rgba(220,38,38,0.12)'

interface WalletPreviewData {
  wallet: string
  user?: {
    name: string
    username: string
    avatarUrl?: string | null
  }
  vault: {
    payBalance: number
    totalEarned: number
    distributionsReceived: number
    isEligible: boolean
    heldAmount?: number
    snapshotFound?: boolean
    distributionSharePct?: number
    estimatedCurrentPay?: number
    estimatedCurrentUsd?: number
  }
}

interface WalletPreviewCardProps {
  data: WalletPreviewData
}

function truncateWallet(addr: string) {
  if (!addr || addr.length < 10) return addr
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function formatUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

export default function WalletPreviewCard({ data }: WalletPreviewCardProps) {
  const navigate = useNavigate()
  const v = data.vault
  const isEligible = v.isEligible
  const snapshotFound = v.snapshotFound !== false // default true if not specified
  
  const heldAmt = v.heldAmount ?? v.payBalance
  const sharePct = v.distributionSharePct ?? 0
  const estPay = v.estimatedCurrentPay ?? 0
  const estUsd = v.estimatedCurrentUsd ?? 0

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-wallet" style={{ color: OGAPAY_BLUE }} /> Wallet Preview
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: 999, fontWeight: 700, fontSize: 11,
          background: isEligible ? GREEN_BG : RED_BG,
          color: isEligible ? GREEN : RED,
        }}>
          {isEligible ? 'Eligible' : 'Not Eligible'}
        </span>
      </div>

      {/* Wallet info sub-card */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 4 }}>Wallet</div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all' }}>
          {data?.user?.name ? (
            <span>
              {data.user.name} · <span style={{ color: 'var(--text2)', fontSize: 12 }}>@{data.user.username}</span>
              <br /><span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>{data.wallet}</span>
            </span>
          ) : truncateWallet(data.wallet)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
          Personal preview from the latest distribution snapshot
        </div>
      </div>

      {/* Stats sub-card */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '0 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>HELD AMOUNT</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{formatCompact(heldAmt)} $PAY</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>SNAPSHOT STATUS</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: snapshotFound ? GREEN : 'var(--text3)' }}>
            {snapshotFound ? 'Found' : 'Not Found'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>DISTRIBUTION SHARE</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{sharePct.toFixed(4)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>ESTIMATED CURRENT SHARE</span>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{formatCompact(estPay)} $PAY</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatUSD(estUsd)}</div>
          </div>
        </div>
      </div>

      {/* Open Distribution History button */}
      <button onClick={() => navigate(`/vault/history?wallet=${encodeURIComponent(data.wallet)}`)}
        style={{
          width: '100%', height: 38, borderRadius: 9, border: 'none',
          background: OGAPAY_BLUE_MUTED, color: OGAPAY_BLUE,
          fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8,
        }}>
        Open Distribution History
      </button>

      {/* Not eligible note */}
      {!isEligible && (
        <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', padding: '4px 0' }}>
          Eligibility note: Wallet not found in the latest holder snapshot
        </div>
      )}
    </div>
  )
}
