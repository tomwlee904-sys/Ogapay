import { useCurrency } from '../context/CurrencyContext'
import { displayMoney, formatUsd } from '../lib/money'

/* The quiet "≈ $9.00 USDC" / "≈ ₦13,500" line under a reward, like wurk.fun's
   "≈ $9.00 USD". Naira shows the USDC value, USDC shows naira, at the app's
   rate. Hidden when there's no rate, or when <Money> already shows a second
   line (the "Both" display setting, or a converted amount). */
export default function MoneyApprox({ amount, currency, className = '' }: { amount: number; currency: string; className?: string }) {
  const { preferredCurrency, convert } = useCurrency()
  const n = Number(amount) || 0
  if (!n || (currency !== 'NGN' && currency !== 'USDC')) return null
  if (displayMoney(n, currency, preferredCurrency, convert).alt) return null
  const to = currency === 'NGN' ? 'USDC' : 'NGN'
  const v = convert(n, currency as any, to as any)
  if (!Number.isFinite(v) || v <= 0) return null
  const text = to === 'USDC' ? `≈ ${formatUsd(v)} USDC` : `≈ ₦${Math.round(v).toLocaleString('en-US')}`
  return <span className={`o-money-approx-line${className ? ' ' + className : ''}`}>{text}</span>
}
