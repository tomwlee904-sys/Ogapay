import { useState, useEffect } from 'react'
import { apiRequest } from '../lib/api'

interface VirtualAccount {
  id: string
  accountNumber: string
  bankName: string
  accountName: string | null
  isActive: boolean
}

function normalizeDva(raw: any): VirtualAccount | null {
  if (!raw || typeof raw !== 'object') return null
  const acct = raw.accountNumber || raw.account_number || raw.accountnumber || raw.id || raw.ID
  if (!acct) return null
  return {
    id: raw.id || raw.ID || '',
    accountNumber: raw.accountNumber || raw.account_number || raw.accountnumber || '',
    bankName: raw.bankName || raw.bank_name || raw.bankname || '',
    accountName: raw.accountName || raw.account_name || raw.accountname || null,
    isActive: raw.isActive ?? raw.is_active ?? raw.isactive ?? true,
  }
}

export default function VirtualAccountCard() {
  const [dva, setDva] = useState<VirtualAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    try {
      const data = await apiRequest<any>('/wallet/dva')
      setDva(normalizeDva(data))
    } catch { /* no DVA yet */ }
    setLoading(false)
  }

  async function create() {
    setCreating(true)
    setError('')
    try {
      const data = await apiRequest<any>('/wallet/dva', { method: 'POST' })
      setDva(normalizeDva(data))
    } catch (e: any) {
      setError(e?.message || 'Failed to create virtual account')
    }
    setCreating(false)
  }

  useEffect(() => { load() }, [])

  const copy = () => {
    if (!dva?.accountNumber) return
    navigator.clipboard.writeText(dva.accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', fontSize: 13 }}>
          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Loading virtual account...
        </div>
      </div>
    )
  }

  if (!dva) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Outfit', fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Virtual Account</div>
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>Get a dedicated bank account to receive payments instantly.</div>
          </div>
          <button
            onClick={create}
            disabled={creating}
            style={{
              height: 38, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            {creating ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Creating...</> : <><i className="ti ti-plus" /> Create Account</>}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, fontSize: 12, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} />
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, var(--accent), #1a5fb4)', borderRadius: 14, padding: '22px 24px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 2, letterSpacing: 1 }}>DEDICATED VIRTUAL ACCOUNT</div>
      <div style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 900, letterSpacing: 2, marginBottom: 12 }}>
        {dva.accountNumber || '—'}
      </div>

      <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 14 }}>
        {dva.bankName}{dva.accountName ? ` • ${dva.accountName}` : ''}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={copy}
          style={{
            height: 34, padding: '0 14px', borderRadius: 8, fontWeight: 700, fontSize: 12,
            background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
            backdropFilter: 'blur(4px)',
          }}
        >
          <i className={`ti ${copied ? 'ti-circle-check' : 'ti-copy'}`} /> {copied ? 'Copied!' : 'Copy Number'}
        </button>
        <button
          onClick={load}
          style={{
            height: 34, padding: '0 14px', borderRadius: 8, fontWeight: 700, fontSize: 12,
            background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
          }}
        >
          <i className="ti ti-refresh" /> Refresh
        </button>
      </div>
      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 12 }}>
        Send money to this account and it will be credited to your wallet automatically.
      </div>
    </div>
  )
}
