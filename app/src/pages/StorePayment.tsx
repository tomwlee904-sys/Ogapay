import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { apiRequest } from '../lib/api'
import { useCurrency } from '../context/CurrencyContext'
import { CURRENCY_SYMBOLS, Currency } from '../lib/currency'
import { useToast } from '../components/Toast'
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'

const PLATFORM_FEE_PCT = 0.05
const CURRENCIES: { key: Currency; label: string }[] = [
  { key: 'NGN', label: 'NGN' },
  { key: 'USDC', label: 'USDC' },
  { key: 'SOL', label: 'SOL' },
]

interface StoreItem {
  id: string; title: string; description: string
  price: number; currency: Currency
  seller: string; sellerId: string; sellerAvatar: string | null
  rating: number; reviewsCount: number; image: string
  category: string; stock: number | null
  metadata?: Record<string, any>
}

function fmt(price: number, currency: Currency): string {
  const sym = CURRENCY_SYMBOLS[currency] || ''
  if (currency === 'NGN') return `${sym}${Math.round(price).toLocaleString('en-US')}`
  if (currency === 'SOL') return `${sym}${price.toFixed(price < 1 ? 4 : 2)}`
  return `${sym}${price.toFixed(2)}`
}

export default function StorePayment() {
  useEffect(() => { injectSkeletonStyles() }, [])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { balances, refresh: refreshBalance } = useWalletBalance()
  const { rates } = useCurrency()
  const { toast: showToast } = useToast()

  const [item, setItem] = useState<StoreItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [payCurr, setPayCurr] = useState<Currency>('NGN')
  const [payMethod, setPayMethod] = useState<'wallet' | 'crypto' | 'manual' | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [copiedAmt, setCopiedAmt] = useState(false)
  const [fwTxRef, setFwTxRef] = useState('')
  const [fwOpened, setFwOpened] = useState(false)

  const fetchItem = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await apiRequest<StoreItem>('/store/' + id, { method: 'GET', auth: false })
      setItem(data)
      if (data?.currency) setPayCurr(data.currency)
    } catch {
      showToast('Failed to load product', 'error')
    } finally { setLoading(false) }
  }, [id])
  useEffect(() => { fetchItem() }, [fetchItem])

  if (loading || !item) return <SkeletonPage />

  const p = item
  const fee = Math.round(p.price * PLATFORM_FEE_PCT)
  const total = p.price + fee
  const ngnAvail = balances?.NGN?.available || 0
  const usdcAvail = balances?.USDC?.available || 0
  const solAvail = balances?.SOL?.available || 0
  const availMap: Record<string, number> = { NGN: ngnAvail, USDC: usdcAvail, SOL: solAvail }
  const hasBal = payCurr === 'NGN' ? ngnAvail >= total : (availMap[payCurr] || 0) >= p.price

  // Dummy data for manual payment
  const dummyAddr = 'SAT8g2x7Tb9Pf9qEz9kC' + p.id.slice(0, 6)
  const dummyAmt = payCurr === 'SOL' ? (p.price / (rates?.SOL || 190)).toFixed(6) : p.price.toFixed(2)

  // ── Flutterwave checkout config ──
  const fwConfig = {
    public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || "",
    tx_ref: fwTxRef,
    amount: total,
    currency: 'NGN' as const,
    payment_options: 'card,ussd,mobilemoney,banktransfer' as const,
    customer: {
      email: user?.email || "",
      phone_number: (user as any)?.phone || '',
      name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || '',
    },
    customizations: {
      title: 'OgaPay Store Purchase',
      description: `${p?.title || 'Store item'} — ${fmt(total, 'NGN')}`,
      logo: 'https://ogapay.app/logo.png',
    },
  }
  const handleFlutterPayment = useFlutterwave(fwConfig)
  useEffect(() => { if (fwTxRef && !fwOpened) {
    setFwOpened(true)
    handleFlutterPayment({
      callback: (response) => {
        const txId = response?.transaction_id || ''
        if (txId) {
          // Payment successful — now complete the purchase
          handlePayWithWallet()
        } else {
          setPurchaseError('Flutterwave payment was not completed. Please try again.')
        }
        closePaymentModal()
        setFwTxRef('')
        setFwOpened(false)
      },
      onClose: () => { setFwTxRef(''); setFwOpened(false) },
    })
  }}, [fwTxRef, fwOpened])

  const handleFlutterwavePay = () => {
    const ref = 'OGA-STR-' + Date.now()
    setFwTxRef(ref)
  }

  const handlePayWithWallet = async () => {
    setPurchasing(true)
    setPurchaseError('')
    try {
      const itemId = id || p?.id
      if (!itemId) { setPurchaseError('Invalid product'); setPurchasing(false); return }
      const res = await apiRequest<any>('/store/' + itemId + '/purchase', { method: 'POST' })
      await refreshBalance()
      const orderId = res?.id || res?.data?.id || 'order-' + Date.now()
      navigate('/orders/' + orderId, { replace: true })
    } catch (err: any) {
      setPurchaseError(err?.message || 'Payment failed')
    } finally { setPurchasing(false) }
  }

  const handlePay = async () => {
    if (!user) { navigate('/login?redirect=/store/pay/' + id); return }
    if (payMethod === 'flutterwave') { handleFlutterwavePay(); return }
    if (payMethod === 'crypto') { showToast('Crypto payment coming soon', 'info'); return }
    if (payMethod === 'manual') { showToast('Manual payment pending confirmation', 'info'); return }
    await handlePayWithWallet()
  }

  return (
    <Layout>
      <style>{`
        @media(max-width:768px){.spay-row{flex-direction:column}.spay-summary-desktop{display:none}.spay-summary-mobile{display:block}.spay-cta{position:fixed;bottom:0;left:0;right:0;z-index:50;padding:12px 16px;background:var(--card);border-top:1px solid var(--border);display:flex;gap:10px}.spay-cta>button{flex:1}}
        @media(min-width:769px){.spay-summary-mobile{display:none}.spay-cta{display:none!important}}
        .spay-row{display:flex;gap:32px;align-items:flex-start}
        .spay-col{flex:1;min-width:0}
        .spay-side{width:360px;flex-shrink:0}
      `}</style>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 100px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{ background:'none',border:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,color:'var(--text2)',padding:0,fontFamily:'inherit' }}>
            <i className="ti ti-arrow-left" /> Back
          </button>
          <span style={{ fontSize:14,fontWeight:700,color:'var(--text)' }}>Complete Payment</span>
          <div style={{ width:60 }} />
        </div>

        {/* Progress Bar */}
        <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:28,flexWrap:'wrap' }}>
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <div style={{ width:26,height:26,borderRadius:'50%',background:'var(--green)',color:'#fff',fontSize:11,fontWeight:800,display:'grid',placeItems:'center' }}><i className="ti ti-check" style={{fontSize:13}} /></div>
            <span style={{ fontSize:12,fontWeight:600,color:'var(--text)' }}>Order Summary</span>
          </div>
          <div style={{ width:32,height:1.5,background:'var(--green)' }} />
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <div style={{ width:26,height:26,borderRadius:'50%',background:'var(--green)',color:'#fff',fontSize:11,fontWeight:800,display:'grid',placeItems:'center' }}><i className="ti ti-check" style={{fontSize:13}} /></div>
            <span style={{ fontSize:12,fontWeight:600,color:'var(--text)' }}>Requirements</span>
          </div>
          <div style={{ width:32,height:1.5,background:'var(--border)' }} />
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <div style={{ width:26,height:26,borderRadius:'50%',background:'var(--accent)',color:'#fff',fontSize:11,fontWeight:800,display:'grid',placeItems:'center' }}>3</div>
            <span style={{ fontSize:12,fontWeight:700,color:'var(--text)' }}>Payment</span>
          </div>
        </div>

        {/* Mobile collapsible summary */}
        <div className="spay-summary-mobile" style={{ marginBottom:16 }}>
          <button onClick={() => setShowSummary(!showSummary)} style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,color:'var(--text)' }}>
            <span><i className="ti ti-receipt" style={{marginRight:6}} /> Order Summary</span>
            <i className={`ti ti-chevron-${showSummary?'up':'down'}`} />
          </button>
          {showSummary && <OrderSummaryCard p={p} fee={fee} total={total} rates={rates} />}
        </div>

        <div className="spay-row">
          {/* Left Column */}
          <div className="spay-col">
            {/* Currency Tabs */}
            <div style={{ display:'flex',gap:6,marginBottom:20 }}>
              {CURRENCIES.map(c => (
                <button key={c.key} onClick={() => { setPayCurr(c.key); setPayMethod(null); setPurchaseError('') }} style={{
                  flex:1,height:42,borderRadius:10,border:'1.5px solid',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,
                  background: payCurr === c.key ? 'var(--accent)' : 'transparent',
                  borderColor: payCurr === c.key ? 'var(--accent)' : 'var(--border)',
                  color: payCurr === c.key ? '#fff' : 'var(--text2)',
                  transition:'all .15s',
                }}>{c.label}</button>
              ))}
            </div>

            {/* Total Amount */}
            <div style={{ textAlign:'center',padding:'20px 16px',marginBottom:20,background:'var(--card)',border:'1px solid var(--border)',borderRadius:14 }}>
              <div style={{ fontSize:10,fontWeight:700,color:'var(--text3)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6 }}>Total Amount</div>
              <div style={{ fontFamily:'Outfit,sans-serif',fontSize:44,fontWeight:900,color:'var(--accent)',lineHeight:1.1,letterSpacing:-2 }}>
                {fmt(total, payCurr)}
              </div>
              {rates?.NGN && (
                <div style={{ fontSize:13,color:'var(--text3)',marginTop:4 }}>
                  ≈ ${(total * rates.NGN).toFixed(2)} USD
                </div>
              )}
            </div>

            {/* Payment Option 1: Wallet */}
            <div onClick={() => { setPayMethod('wallet'); setPurchaseError('') }} style={{
              padding:16,marginBottom:12,borderRadius:12,cursor:'pointer',
              border:`1.5px solid ${payMethod==='wallet'?'var(--accent)':'var(--border)'}`,
              background:payMethod==='wallet'?'rgba(var(--accent-rgb),0.04)':'var(--card)',
              transition:'all .2s',
            }}>
              <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:8 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:'rgba(var(--accent-rgb),0.1)',display:'grid',placeItems:'center',color:'var(--accent)',flexShrink:0 }}>
                  <i className="ti ti-wallet" style={{fontSize:20}} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:'var(--text)' }}>Pay from {payCurr} Wallet</div>
                  <div style={{ fontSize:12,color:hasBal?'var(--green)':'var(--text3)',marginTop:2 }}>
                    Available balance: {fmt(availMap[payCurr]||0, payCurr)}
                  </div>
                </div>
                <div style={{ width:20,height:20,borderRadius:'50%',border:`2px solid ${payMethod==='wallet'?'var(--accent)':'var(--border)'}`,display:'grid',placeItems:'center',flexShrink:0 }}>
                  {payMethod==='wallet' && <div style={{width:10,height:10,borderRadius:'50%',background:'var(--accent)'}} />}
                </div>
              </div>
              {!hasBal && payMethod==='wallet' && (
                <div style={{ fontSize:12,color:'#dc2626',display:'flex',alignItems:'center',gap:4,marginTop:4 }}>
                  <i className="ti ti-alert-triangle" style={{fontSize:13}} /> Insufficient balance.{' '}
                  <span onClick={(e) => { e.stopPropagation(); navigate('/wallet') }} style={{color:'var(--accent)',fontWeight:700,cursor:'pointer',textDecoration:'underline'}}>Top up wallet →</span>
                </div>
              )}
            </div>

            {/* Payment Option 2: Pay with Flutterwave */}
            <div onClick={() => { setPayMethod('flutterwave'); setPurchaseError('') }} style={{
              padding:16,marginBottom:12,borderRadius:12,cursor:'pointer',
              border:`1.5px solid ${payMethod==='flutterwave'?'var(--accent)':'var(--border)'}`,
              background:payMethod==='flutterwave'?'rgba(var(--accent-rgb),0.04)':'var(--card)',
              transition:'all .2s',
            }}>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:'#FFF1E6',display:'grid',placeItems:'center',color:'#F97316',flexShrink:0 }}>
                  <svg viewBox="0 0 24 24" fill="#F97316" width="20" height="20">
                    <path d="M17.5 2H6.5C4 2 2 4 2 6.5v11C2 20 4 22 6.5 22h11c2.5 0 4.5-2 4.5-4.5v-11C22 4 20 2 17.5 2zm-3 14.5h-5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5h5c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5zm1-5h-7c-.8 0-1.5-.7-1.5-1.5S7.7 8.5 8.5 8.5h7c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5z"/>
                  </svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:'var(--text)' }}>Pay with Flutterwave</div>
                  <div style={{ fontSize:12,color:'var(--text3)',marginTop:2 }}>Card, bank transfer, or mobile money</div>
                </div>
                <div style={{ width:20,height:20,borderRadius:'50%',border:`2px solid ${payMethod==='flutterwave'?'var(--accent)':'var(--border)'}`,display:'grid',placeItems:'center',flexShrink:0 }}>
                  {payMethod==='flutterwave' && <div style={{width:10,height:10,borderRadius:'50%',background:'var(--accent)'}} />}
                </div>
              </div>
            </div>
            {/* Payment Option 2: Crypto */}
            <div onClick={() => { setPayMethod('crypto'); setPurchaseError('') }} style={{
              padding:16,marginBottom:12,borderRadius:12,cursor:'pointer',
              border:`1.5px solid ${payMethod==='crypto'?'var(--accent)':'var(--border)'}`,
              background:payMethod==='crypto'?'rgba(var(--accent-rgb),0.04)':'var(--card)',
              transition:'all .2s',
            }}>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:'#F0E6FF',display:'grid',placeItems:'center',color:'#9333EA',flexShrink:0 }}>
                  <i className="ti ti-currency-solana" style={{fontSize:20}} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:'var(--text)' }}>Pay with Crypto</div>
                  <div style={{ fontSize:12,color:'var(--text3)',marginTop:2 }}>Connect a crypto wallet or send manually</div>
                </div>
                <div style={{ width:20,height:20,borderRadius:'50%',border:`2px solid ${payMethod==='crypto'?'var(--accent)':'var(--border)'}`,display:'grid',placeItems:'center',flexShrink:0 }}>
                  {payMethod==='crypto' && <div style={{width:10,height:10,borderRadius:'50%',background:'var(--accent)'}} />}
                </div>
              </div>
            </div>

            {/* Crypto sub-options */}
            {payMethod==='crypto' && (
              <div style={{ padding:'4px 0 12px 20px',display:'flex',flexDirection:'column',gap:10 }}>
                <button onClick={() => showToast('Connect your Phantom or Solflare wallet', 'info')} style={{
                  height:46,borderRadius:10,border:'1px solid var(--border)',
                  background:'var(--card)',cursor:'pointer',fontFamily:'inherit',
                  fontSize:13,fontWeight:700,color:'var(--text)',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                }}>
                  <i className="ti ti-plug-connected" style={{fontSize:16}} /> Connect Wallet
                </button>
                <div style={{ display:'flex',alignItems:'center',gap:12,fontSize:11,color:'var(--text3)' }}>
                  <div style={{ flex:1,height:1,background:'var(--border)' }} /> OR <div style={{ flex:1,height:1,background:'var(--border)' }} />
                </div>
                {/* Manual Payment */}
                <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:14 }}>
                  <div style={{ fontSize:11,fontWeight:800,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10 }}>Manual Payment</div>
                  <div style={{ fontSize:11,fontWeight:700,color:'var(--text2)',marginBottom:4 }}>RECIPIENT ADDRESS</div>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
                    <code style={{ flex:1,padding:'7px 10px',background:'var(--bg)',borderRadius:6,fontSize:11,color:'var(--text)',wordBreak:'break-all',fontFamily:'monospace' }}>{dummyAddr}</code>
                    <button onClick={() => { navigator.clipboard.writeText(dummyAddr); setCopiedAddr(true); setTimeout(()=>setCopiedAddr(false),2000) }} style={{ height:30,padding:'0 10px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:11,fontWeight:600,color:copiedAddr?'var(--green)':'var(--text2)',fontFamily:'inherit',whiteSpace:'nowrap' }}>
                      {copiedAddr ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ fontSize:11,fontWeight:700,color:'var(--text2)',marginBottom:4 }}>EXACT AMOUNT</div>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
                    <code style={{ flex:1,padding:'7px 10px',background:'var(--bg)',borderRadius:6,fontSize:11,color:'var(--text)',fontFamily:'monospace' }}>{dummyAmt} {payCurr}</code>
                    <button onClick={() => { navigator.clipboard.writeText(dummyAmt); setCopiedAmt(true); setTimeout(()=>setCopiedAmt(false),2000) }} style={{ height:30,padding:'0 10px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:11,fontWeight:600,color:copiedAmt?'var(--green)':'var(--text2)',fontFamily:'inherit',whiteSpace:'nowrap' }}>
                      {copiedAmt ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {/* QR placeholder */}
                  <div style={{ display:'flex',justifyContent:'center',marginBottom:14 }}>
                    <div style={{ width:96,height:96,borderRadius:10,background:'var(--bg)',border:'1px solid var(--border)',display:'grid',placeItems:'center',color:'var(--text3)',fontSize:10,fontWeight:600 }}>
                      <i className="ti ti-qrcode" style={{fontSize:32,marginBottom:4,display:'block'}} />
                      QR Code
                    </div>
                  </div>
                  <button onClick={() => showToast('Payment submitted for verification', 'success')} style={{
                    width:'100%',height:40,borderRadius:8,border:'1px solid var(--accent)',
                    background:'rgba(var(--accent-rgb),0.06)',cursor:'pointer',fontFamily:'inherit',
                    fontSize:12,fontWeight:700,color:'var(--accent)',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  }}>
                    <i className="ti ti-send" style={{fontSize:13}} /> I Have Made the Payment →
                  </button>
                </div>
              </div>
            )}

            {/* Payment Option 3: Manual (standalone) */}
            <div onClick={() => { setPayMethod('manual'); setPurchaseError('') }} style={{
              padding:16,marginBottom:12,borderRadius:12,cursor:'pointer',
              border:`1.5px solid ${payMethod==='manual'?'var(--accent)':'var(--border)'}`,
              background:payMethod==='manual'?'rgba(var(--accent-rgb),0.04)':'var(--card)',
              transition:'all .2s',
            }}>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:'#FEF3C7',display:'grid',placeItems:'center',color:'#D97706',flexShrink:0 }}>
                  <i className="ti ti-building-bank" style={{fontSize:20}} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:'var(--text)' }}>Manual Payment</div>
                  <div style={{ fontSize:12,color:'var(--text3)',marginTop:2 }}>Bank transfer or manual deposit</div>
                </div>
                <div style={{ width:20,height:20,borderRadius:'50%',border:`2px solid ${payMethod==='manual'?'var(--accent)':'var(--border)'}`,display:'grid',placeItems:'center',flexShrink:0 }}>
                  {payMethod==='manual' && <div style={{width:10,height:10,borderRadius:'50%',background:'var(--accent)'}} />}
                </div>
              </div>
            </div>

            {/* Error */}
            {purchaseError && (
              <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',color:'#dc2626',fontSize:12,marginBottom:12 }}>
                <i className="ti ti-alert-circle" style={{marginRight:6}} />{purchaseError}
              </div>
            )}

            {/* Terms */}
            <p style={{ fontSize:11,color:'var(--text3)',lineHeight:1.5,margin:'4px 0 0' }}>
              By completing this purchase you agree to our{' '}
              <a href="/terms" style={{color:'var(--accent)',fontWeight:600,textDecoration:'none'}}>Terms of Service</a>.
            </p>
          </div>

          {/* Right Column — Desktop Order Summary */}
          <div className="spay-side spay-summary-desktop">
            <OrderSummaryCard p={p} fee={fee} total={total} rates={rates} />
          </div>
        </div>

        {/* Desktop CTA */}
        <div className="spay-summary-desktop" style={{ display:'flex',justifyContent:'flex-end',gap:12,marginTop:24 }}>
          <button onClick={() => navigate('/store/' + p.id)} style={{ height:46,padding:'0 24px',borderRadius:10,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,color:'var(--text2)' }}>
            Cancel
          </button>
          <button onClick={handlePay} disabled={!payMethod || purchasing || (payMethod==='wallet' && !hasBal)} style={{
            height:46,padding:'0 28px',borderRadius:10,border:'none',
            background:(payMethod && (payMethod!=='wallet'||hasBal) && !purchasing) ? 'var(--accent)' : 'var(--border)',
            color:(payMethod && (payMethod!=='wallet'||hasBal) && !purchasing) ? '#fff' : 'var(--text3)',
            fontSize:13,fontWeight:700,cursor:(payMethod && (payMethod!=='wallet'||hasBal) && !purchasing) ? 'pointer' : 'not-allowed',
            fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6,
            transition:'all .15s',
          }}>
            {purchasing ? <><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} /> Processing...</> : payMethod==='wallet' ? <>Confirm & Pay</> : payMethod==='flutterwave' ? <><svg viewBox='0 0 24 24' fill='currentColor' width='16' height='16' style={{marginRight:4}}><path d='M17.5 2H6.5C4 2 2 4 2 6.5v11C2 20 4 22 6.5 22h11c2.5 0 4.5-2 4.5-4.5v-11C22 4 20 2 17.5 2z'/></svg> Pay with Flutterwave</> : payMethod==='crypto' ? <>Connect Wallet</> : <>Submit Payment</>}
          </button>
        </div>

        {/* Mobile CTA (fixed bottom) */}
        <div className="spay-cta">
          <button onClick={() => navigate('/store/' + p.id)} style={{ height:46,borderRadius:10,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,color:'var(--text2)' }}>
            Cancel
          </button>
          <button onClick={handlePay} disabled={!payMethod || purchasing || (payMethod==='wallet' && !hasBal)} style={{
            height:46,borderRadius:10,border:'none',
            background:(payMethod && (payMethod!=='wallet'||hasBal) && !purchasing) ? 'var(--accent)' : 'var(--border)',
            color:(payMethod && (payMethod!=='wallet'||hasBal) && !purchasing) ? '#fff' : 'var(--text3)',
            fontSize:13,fontWeight:700,cursor:(payMethod && (payMethod!=='wallet'||hasBal) && !purchasing) ? 'pointer' : 'not-allowed',
            fontFamily:'inherit',
          }}>
            {purchasing ? 'Processing...' : payMethod==='wallet' ? 'Confirm & Pay' : payMethod==='flutterwave' ? 'Pay with Flutterwave' : payMethod==='crypto' ? 'Connect Wallet' : 'Submit'}
          </button>
        </div>
      </div>
    </Layout>
  )
}

function OrderSummaryCard({ p, fee, total, rates }: { p: StoreItem; fee: number; total: number; rates: any }) {
  return (
    <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:20 }}>
      <h4 style={{ fontSize:13,fontWeight:800,color:'var(--text)',margin:'0 0 16px',display:'flex',alignItems:'center',gap:6 }}>
        <i className="ti ti-receipt" /> Order Summary
      </h4>
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',fontSize:13,color:'var(--text2)' }}>
          <span>Product</span>
          <span style={{ fontWeight:600,color:'var(--text)',textAlign:'right',maxWidth:'60%' }}>{p.title}</span>
        </div>
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--text2)' }}>
          <span>Seller</span>
          <span style={{ fontWeight:600,color:'var(--text)' }}>{p.seller}</span>
        </div>
        {p.metadata?.delivery && (
          <div style={{ display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--text2)' }}>
            <span>Delivery</span>
            <span style={{ fontWeight:600 }}>{p.metadata.delivery}</span>
          </div>
        )}
        {p.metadata?.revisions && (
          <div style={{ display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--text2)' }}>
            <span>Revisions</span>
            <span style={{ fontWeight:600 }}>{p.metadata.revisions}</span>
          </div>
        )}
      </div>
      <div style={{ height:1,background:'var(--border)',margin:'14px 0' }} />
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--text2)' }}>
          <span>Item price</span>
          <span style={{ fontWeight:600 }}>{fmt(p.price, p.currency)}</span>
        </div>
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--text2)' }}>
          <span>Platform fee ({(PLATFORM_FEE_PCT*100).toFixed(0)}%)</span>
          <span style={{ fontWeight:600,color:'var(--text3)' }}>{fmt(fee, p.currency)}</span>
        </div>
      </div>
      <div style={{ height:1,background:'var(--border)',margin:'14px 0' }} />
      <div style={{ display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:900,color:'var(--accent)' }}>
        <span>You pay</span>
        <span>{fmt(total, p.currency)}</span>
      </div>
      {rates?.NGN && (
        <div style={{ marginTop:8,fontSize:11,color:'var(--text3)',textAlign:'right' }}>
          ≈ ${(total * rates.NGN).toFixed(2)} USD
        </div>
      )}
    </div>
  )
}
