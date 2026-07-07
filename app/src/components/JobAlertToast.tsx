import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJobAlert } from '../contexts/JobAlertContext'

const SYM: Record<string, string> = {
  NGN: '₦', USD: '$', EUR: '€', GBP: '£', SOL: 'SOL ', USDC: 'USDC ', USDT: 'USDT ',
}

function fmt(n: number, c?: string) {
  const s = SYM[c || 'NGN'] || (c || '') + ' '
  return s + Number(n || 0).toLocaleString()
}

export default function JobAlertToast() {
  const navigate = useNavigate()
  const { latestJob, dismissAlert } = useJobAlert()

  useEffect(() => {
    if (latestJob) {
      const timer = setTimeout(dismissAlert, 10000)
      return () => clearTimeout(timer)
    }
  }, [latestJob, dismissAlert])

  if (!latestJob) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999, maxWidth: 380, width: '100%',
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
      boxShadow: '0 12px 40px rgba(0,0,0,0.12)', overflow: 'hidden',
      animation: 'toastIn 0.25s ease-out',
    }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: 'var(--accent)18',
          color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0,
        }}>
          <i className="ti ti-bell-ringing" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>New task available</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{latestJob.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {fmt(latestJob.reward, latestJob.currency)} &middot; {latestJob.category || 'General'}
          </div>
        </div>
        <button onClick={dismissAlert} style={{
          background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1,
        }}>
          <i className="ti ti-x" />
        </button>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
        <button onClick={() => { dismissAlert(); navigate('/tasks/' + latestJob.id) }} style={{
          flex: 1, padding: '9px 0', background: 'none', border: 'none', color: 'var(--accent)',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRight: '1px solid var(--border)',
        }}>
          View Job
        </button>
        <button onClick={dismissAlert} style={{
          flex: 1, padding: '9px 0', background: 'none', border: 'none', color: 'var(--text3)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
