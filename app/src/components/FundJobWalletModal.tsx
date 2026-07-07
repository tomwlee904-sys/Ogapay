import { useState, useEffect, useRef } from 'react'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3'

const STYLES = {
  overlay: {
    position: 'fixed' as const, inset: 0, zIndex: 400,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center' as const, justifyContent: 'center' as const,
    padding: 20,
  },
  card: {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 16, maxWidth: 440, width: '100%' as const,
    padding: 28, maxHeight: '90vh', overflowY: 'auto' as const,
  },
  btn: {
    height: 44, padding: '0 20px', borderRadius: 12, fontWeight: 700 as const,
    fontSize: 14, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center' as const, gap: 8,
    fontFamily: 'inherit', justifyContent: 'center' as const,
    transition: 'opacity 0.14s', width: '100%' as const,
  },
}

interface FundJobWalletModalProps {
  currency: string
  shortfall: number
  totalToPay: number
  balance: number
  onClose: () => void
  onFunded: () => void
}

export default function FundJobWalletModal({
  currency, shortfall, totalToPay, balance,
  onClose, onFunded,
}: FundJobWalletModalProps) {
  const { user } = useAuth()
  const { refresh } = useWalletBalance()
  const [step, setStep] = useState<'info' | 'initiating' | 'paying' | 'confirming' | 'done' | 'error'>('info')
  const [error, setError] = useState('')
  const [txRef, setTxRef] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isNgn = currency === 'NGN'

  const handleSafeClose = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    onClose()
  }

  const formatAmount = (val: number) => {
    if (isNgn) return `₦${Math.round(val).toLocaleString('en-US')}`
    return `${val.toFixed(currency === 'SOL' ? 6 : 2)} ${currency}`
  }

  const fwPublicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || ''
  const customerEmail = user?.email || ''
  const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''
  const customerPhone = (user as any)?.phone || ''

  const fwConfig = {
    public_key: fwPublicKey,
    tx_ref: txRef,
    amount: shortfall,
    currency: 'NGN' as const,
    payment_options: 'card,ussd,mobilemoney,banktransfer' as const,
    customer: {
      email: customerEmail,
      phone_number: customerPhone,
      name: customerName || customerEmail,
    },
    customizations: {
      title: 'Fund OgaPay Wallet',
      description: `Deposit ₦${Math.round(shortfall).toLocaleString('en-US')} to post your job`,
      logo: 'https://ogapay.io/logo.png',
    },
  }

  const handleFlutterPayment = useFlutterwave(fwConfig)

  // When txRef is set, open the Flutterwave inline checkout
  useEffect(() => {
    if (txRef && step === 'paying' && !isProcessing) {
      setIsProcessing(true)
      const prePaymentBalance = balance
      let pollCount = 0

      handleFlutterPayment({
        callback: (response) => {
          closePaymentModal()
          setStep('confirming')

          const POLL_INTERVAL = 1500
          const POLL_LIMIT = 14

          pollTimerRef.current = setInterval(async () => {
            pollCount++
            if (pollCount > POLL_LIMIT) {
              if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
              setStep('error')
              setError('Payment is taking longer than expected to confirm. Your money is safe — check your wallet balance in a moment, then try posting again.')
              setIsProcessing(false)
              return
            }

            try {
              // Fetch fresh balance from API
              const txData = await apiRequest<any>('/wallet/balance')
              const newBalance = txData?.NGN?.balance || 0
              const expectedBalance = prePaymentBalance + shortfall
              if (newBalance >= expectedBalance) {
                if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
                // Update WalletBalanceContext cache
                await refresh()
                // confirmed
                setStep('done')
                setTimeout(() => { setIsProcessing(false); onFunded() }, 300)
              }
            } catch {
              // Network error — keep polling
            }
          }, POLL_INTERVAL)
        },
        onClose: () => {
          setStep('info')
          setTxRef('')
          setIsProcessing(false)
          setError('Payment was cancelled. Try again when ready.')
        },
      })
    }
  }, [txRef, step === 'paying'])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [])

  // ── Initiate deposit → triggers useEffect above ──
  const handlePay = async () => {
    setError('')
    setStep('initiating')

    try {
      const data = await apiRequest<any>('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: shortfall,
          currency: 'NGN',
          provider: 'FLUTTERWAVE',
        }),
      })

      const reference = data?.reference || data?.data?.reference || ''
      if (!reference) throw new Error('Failed to initiate deposit — no reference')

      setTxRef(reference)
      setStep('paying')
    } catch (e: any) {
      setError(e.message || 'Payment initiation failed')
      setStep('error')
    }
  }

  const handleRetry = () => {
    setError('')
    setStep('info')
    setIsProcessing(false)
    setTxRef('')
  }

  return (
    <div style={STYLES.overlay} onClick={handleSafeClose}>
      <div style={STYLES.card} onClick={e => e.stopPropagation()}>
        {/* ── Step: info ── */}
        {step === 'info' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
              Insufficient Balance
            </div>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20 }}>
              You need <strong style={{ color: 'var(--text)' }}>{formatAmount(totalToPay)}</strong> to post this job.
              Your {currency} balance is <strong style={{ color: 'var(--text)' }}>{formatAmount(balance)}</strong>.
            </p>

            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>
                Shortfall: {formatAmount(shortfall)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {isNgn
                  ? 'Pay with Flutterwave in the overlay. After successful payment, your job will be posted automatically.'
                  : 'Crypto funding is not available yet. Please fund your wallet from the Wallet page and come back.'}
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSafeClose} style={{
                ...STYLES.btn, background: 'transparent',
                border: '1.5px solid var(--border)', color: 'var(--text2)', flex: 1,
              }}>
                Cancel
              </button>
              <button onClick={handlePay} disabled={!fwPublicKey} style={{
                ...STYLES.btn,
                background: !fwPublicKey ? 'var(--border)' : '#191C6B',
                color: '#fff', flex: 1, opacity: !fwPublicKey ? 0.6 : 1,
              }}>
                {!fwPublicKey
                  ? 'Flutterwave not configured'
                  : `Pay ${formatAmount(shortfall)}`
                }
              </button>
            </div>
          </>
        )}

        {/* ── Step: initiating ── */}
        {step === 'initiating' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
              Initiating Payment...
            </div>
            <p style={{ fontSize: 14, color: 'var(--text2)' }}>
              Please wait while we set up your payment.
            </p>
          </>
        )}

        {/* ── Step: confirming ── */}
        {step === 'confirming' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
              Confirming Payment
            </div>
            <p style={{ fontSize: 14, color: 'var(--text2)' }}>
              Your payment was received! Finalising and posting your job...
            </p>
          </>
        )}

        {/* ── Step: done ── */}
        {step === 'done' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#16A34A', marginBottom: 12 }}>
              <i className="ti ti-circle-check" style={{color:"var(--green)"}} /> Payment Confirmed
            </div>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
              Your wallet has been funded. Posting your job now...
            </p>
          </>
        )}

        {/* ── Step: error ── */}
        {step === 'error' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#DC2626', marginBottom: 12 }}>
              Payment Failed
            </div>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
              {error || 'Something went wrong. Please try again.'}
            </p>
            <button onClick={handleRetry} style={{
              ...STYLES.btn, background: '#191C6B', color: '#fff',
            }}>
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
