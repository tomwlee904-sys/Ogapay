import { useState, useEffect } from 'react'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const NIGERIAN_BANKS = [
  { code: '035', name: 'Access Bank' },
  { code: '035A', name: 'Access Bank (Diamond)' },
  { code: '044', name: 'Access Bank PLC' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '063', name: 'Diamond Bank' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '084', name: 'Enterprise Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '069', name: 'First Bank of Nigeria' },
  { code: '011', name: 'First Bank PLC' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '027', name: 'Globus Bank' },
  { code: '001', name: 'GTBank PLC' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '029', name: 'Kuda Bank' },
  { code: '060', name: 'Letshego Microfinance Bank' },
  { code: '056', name: 'Moniepoint Microfinance Bank' },
  { code: '100', name: 'Opay Digital Services' },
  { code: '327', name: 'Paga' },
  { code: '104', name: 'Palmpay' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '055', name: 'Sparkle Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Suntrust Bank' },
  { code: '077', name: 'TAJ Bank' },
  { code: '033', name: 'Union Bank of Nigeria' },
  { code: '215', name: 'United Bank for Africa (UBA)' },
  { code: '024', name: 'Unity Bank' },
  { code: '085', name: 'VFD Microfinance Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '000', name: 'Other Bank' },
]

interface Props {
  onClose: () => void
  onSuccess: (newBalance: number) => void
}

export default function WithdrawModal({ onClose, onSuccess }: Props) {
  const { refreshUser } = useAuth()
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')
  const [banks, setBanks] = useState<any[]>(NIGERIAN_BANKS)
  const [loadingBanks, setLoadingBanks] = useState(false)
  const [amount, setAmount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    apiRequest<any>('/wallet/balance')
      .then(d => setBalance(d?.NGN?.balance ?? d?.NGN?.available ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (accountNumber.length === 10 && bankCode) {
      verifyAccount()
    } else {
      setAccountName('')
      setVerified(false)
    }
  }, [accountNumber, bankCode])

  async function verifyAccount() {
    setVerifying(true)
    setAccountName('')
    setVerified(false)
    setError('')
    try {
      const res = await apiRequest<any>('/wallet/verify-account', {
        method: 'POST',
        body: JSON.stringify({ accountNumber, bankCode })
      })
      setAccountName(res.accountName)
      setVerified(true)
    } catch {
      setError('')
    }
    setVerifying(false)
  }

  function handleSubmit() {
    setError('')
    if (Number(amount) < 5000) return setError('Minimum withdrawal is ₦5,000')
    if (Number(amount) > balance) return setError('Amount exceeds your available balance')
    if (!accountName) return setError('Please enter the account name')
    setStep('confirm')
  }

  async function confirmWithdraw() {
    setSubmitting(true)
    setError('')
    try {
      const res = await apiRequest<any>('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          accountNumber,
          bankCode,
          bankName,
          accountName
        })
      })
      setReference(res.reference)
      await refreshUser()
      onSuccess(res.newBalance)
      setStep('success')
    } catch (e: any) {
      setError(e?.message || 'Withdrawal failed. Please try again.')
      setStep('form')
    }
    setSubmitting(false)
  }

  const quickAmounts = [5000, 10000, 20000, 50000]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Withdraw Funds</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              Available: <strong style={{ color: 'var(--text)' }}>₦{balance.toLocaleString()}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text3)' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {step === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (NGN)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 800, color: 'var(--text3)' }}>₦</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5,000" min={5000} max={balance}
                  style={{ width: '100%', height: 52, paddingLeft: 32, paddingRight: 14, border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 18, fontWeight: 800, background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {quickAmounts.map(v => (
                  <button key={v} onClick={() => setAmount(String(v))}
                    style={{ flex: 1, height: 32, borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid var(--border)', background: amount === String(v) ? '#191C6B' : 'var(--bg)', color: amount === String(v) ? '#fff' : 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    ₦{(v/1000).toFixed(0)}k
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Minimum withdrawal: ₦5,000</div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bank</label>
              <select value={bankCode} onChange={e => { const s = banks.find(b => b.code === e.target.value); setBankCode(e.target.value); setBankName(s?.name || ''); setVerified(false); setAccountName('') }}
                style={{ width: '100%', height: 48, padding: '0 14px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}>
                <option value="">{loadingBanks ? 'Loading banks...' : 'Select your bank'}</option>
                {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account Number</label>
              <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0123456789" maxLength={10}
                style={{ width: '100%', height: 48, padding: '0 14px', border: `1.5px solid ${verified ? 'rgba(22,163,74,0.5)' : 'var(--border)'}`, borderRadius: 12, fontSize: 14, background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              {verifying && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Verifying account...</div>}
              {verified && accountName && (
                <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 16, color: 'var(--green)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>{accountName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Account verified</div>
                  </div>
                </div>
              )}
            </div>

            {!verified && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account Name</label>
                <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Enter account name"
                  style={{ width: '100%', height: 48, padding: '0 14px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            )}

            {error && <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, fontSize: 13, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-alert-triangle" style={{ fontSize: 16 }} />{error}</div>}

            <button onClick={handleSubmit} disabled={!accountName || !amount || Number(amount) < 5000}
              style={{ width: '100%', height: 52, borderRadius: 14, fontWeight: 800, fontSize: 15, background: '#191C6B', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4, opacity: (!accountName || !amount || Number(amount) < 5000) ? 0.5 : 1 }}>
              Continue to Confirm
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div>
            <div style={{ padding: '20px', background: 'var(--bg)', borderRadius: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Withdrawal Summary</div>
              {[
                { label: 'Amount', value: `₦${Number(amount).toLocaleString()}` },
                { label: 'Bank', value: bankName },
                { label: 'Account Number', value: accountNumber },
                { label: 'Account Name', value: accountName },
                { label: 'Processing Time', value: 'Instant (1–5 minutes)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontWeight: 800 }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', fontSize: 15 }}>
                <span style={{ fontWeight: 700 }}>New Balance</span>
                <span style={{ fontWeight: 900, color: 'var(--green)' }}>₦{(balance - Number(amount)).toLocaleString()}</span>
              </div>
            </div>

            {error && <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, fontSize: 13, color: '#DC2626', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-alert-triangle" style={{ fontSize: 16 }} />{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('form')} style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 700, fontSize: 14, background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}>Go Back</button>
              <button onClick={confirmWithdraw} disabled={submitting} style={{ flex: 2, height: 52, borderRadius: 14, fontWeight: 800, fontSize: 15, background: '#191C6B', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} /> Processing...</> : <><i className="ti ti-send" /> Confirm Withdrawal</>}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(22,163,74,0.1)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <i className="ti ti-circle-check" style={{ fontSize: 36, color: 'var(--green)' }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Withdrawal Sent!</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 20 }}>
              ₦{Number(amount).toLocaleString()} is on its way to <strong>{accountName}</strong> at <strong>{bankName}</strong>. Usually arrives within 1–5 minutes.
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 10, fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>
              Reference: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)' }}>{reference}</span>
            </div>
            <button onClick={onClose} style={{ width: '100%', height: 52, borderRadius: 14, fontWeight: 800, fontSize: 15, background: '#191C6B', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
