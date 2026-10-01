// One way to write an amount everywhere (cards, detail pages, summaries).
// The currency is part of the amount: "₦1,500" or "2.50 USDC", never "₦1,500 NGN".
// A conversion is a separate, quieter line: "≈ $1.13" or "≈ ₦3,400".

type Convert = (amount: number, from: any, to: any) => number

const SYMBOL: Record<string, string> = { NGN: '₦' }
const DECIMALS: Record<string, number> = { NGN: 0, USDC: 2, USDT: 2, SOL: 4 }

/** The number part, formatted for its currency (no symbol or code) */
export function amountNumber(amount: number, currency = 'NGN'): string {
  const n = Number(amount) || 0
  const d = DECIMALS[currency] ?? 2
  // naira below 1 (rare) keeps two decimals so it doesn't show as ₦0
  const digits = currency === 'NGN' && n > 0 && n < 1 ? 2 : d
  return n.toLocaleString('en-US', { minimumFractionDigits: currency === 'NGN' ? 0 : Math.min(2, digits), maximumFractionDigits: digits })
}

/** The full amount as one string: "₦1,500", "2.50 USDC" */
export function formatMoney(amount: number, currency = 'NGN'): string {
  const sym = SYMBOL[currency]
  return sym ? `${sym}${amountNumber(amount, currency)}` : `${amountNumber(amount, currency)} ${currency}`
}

/** The conversion line: naira amounts show dollars, crypto amounts show naira */
export function formatConversion(amount: number, currency: string, convert: Convert): string {
  const n = Number(amount) || 0
  if (!n) return ''
  if (currency === 'NGN') {
    const usd = convert(n, 'NGN', 'USDC')
    if (!Number.isFinite(usd) || usd <= 0) return ''
    return `≈ $${usd < 10 ? usd.toFixed(2) : Math.round(usd).toLocaleString('en-US')}`
  }
  const ngn = convert(n, currency, 'NGN')
  if (!Number.isFinite(ngn) || ngn <= 0) return ''
  return `≈ ₦${Math.round(ngn).toLocaleString('en-US')}`
}

/** For screen readers: "1,500 naira", "2.50 USDC" */
export function spokenMoney(amount: number, currency = 'NGN'): string {
  return currency === 'NGN' ? `${amountNumber(amount, 'NGN')} naira` : formatMoney(amount, currency)
}
