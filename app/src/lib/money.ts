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

// ── The display currency setting (Settings > Payments, and the menu) ──
// NGN: amounts in naira. USDC: amounts in dollars. GHS: amounts in cedis (the
// Ghana test; shown only, nothing is held in cedis). BOTH: the real currency plus
// a conversion line. Older saved values (SOL, USDT) count as dollars.
export type DisplayPref = 'NGN' | 'USDC' | 'GHS' | 'BOTH'
export const displayPref = (p?: string | null): DisplayPref => (p === 'BOTH' || p === 'GHS' ? p : p === 'NGN' || !p ? 'NGN' : 'USDC')

/** "GH₵0.85", "GH₵12.50", "GH₵1,240" */
export function formatCedi(n: number): string {
  const v = Number(n) || 0
  return `GH₵${v >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2)}`
}

/** The one currency a total or a stat is shown in for someone who chose `pref`:
 *  naira (also for "Both"), dollars or cedis. For figures made of several
 *  currencies (a wallet total, "paid out" stats), converted with `convert`. */
export type DisplayCode = 'NGN' | 'USDC' | 'GHS'
export const displayCode = (pref?: string | null): DisplayCode => {
  const p = displayPref(pref)
  return p === 'BOTH' ? 'NGN' : p
}

/** A value already in `code` written out: "₦1,240", "$12.50", "GH₵85.05";
 *  short: "₦1.2M", "$12.5K", "GH₵1.2K" for big figures */
export function formatIn(code: DisplayCode, v: number, opts: { short?: boolean } = {}): string {
  const n = Number.isFinite(v) ? v : 0
  const sym = code === 'NGN' ? '₦' : code === 'GHS' ? 'GH₵' : '$'
  if (opts.short) {
    if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(1).replace(/\.0$/, '')}B`
    if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`
    if (n >= 1e4) return `${sym}${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`
  }
  if (code === 'NGN') return `₦${Math.round(n).toLocaleString('en-US')}`
  return code === 'GHS' ? formatCedi(n) : formatUsd(n)
}

/** A naira (or other) amount in the display currency, for totals and stats:
 *  converted when it can be, else in naira. ("≈" is left to the caller.) */
export function inDisplay(amount: number, currency: string, pref: string | null | undefined, convert: Convert, opts: { short?: boolean } = {}): string {
  const code = displayCode(pref)
  const n = Number(amount) || 0
  if (currency === code || (code === 'USDC' && isDollar(currency))) return formatIn(code, n, opts)
  const v = convert(n, currency, code)
  if (Number.isFinite(v) && v >= 0 && (v > 0 || n === 0)) return formatIn(code, v, opts)
  return currency === 'NGN' ? formatIn('NGN', n, opts) : formatMoney(n, currency)
}

/** "$0.08", "$12.50", "$1,240" */
export function formatUsd(n: number): string {
  const v = Number(n) || 0
  return `$${v >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2)}`
}

const isDollar = (c: string) => c === 'USDC' || c === 'USDT'

/** How an amount shows for someone who chose `pref`.
 *  exact: where money actually moves (wallet, checkout, withdrawals) the real
 *  currency stays first and the preferred one is only the "≈" line. Elsewhere
 *  (cards, job pages) the amount is shown in the preferred currency, with the
 *  real one underneath. */
export function displayMoney(amount: number, currency: string, pref: string | null | undefined, convert: Convert, exact = false): { converted: string; alt: string } {
  const p = displayPref(pref)
  const n = Number(amount) || 0
  if (p === 'BOTH') return { converted: '', alt: formatConversion(n, currency, convert) }
  const home = p === 'NGN' ? currency === 'NGN' : p === 'GHS' ? currency === 'GHS' : isDollar(currency)
  if (home || !n) return { converted: '', alt: '' }
  const v = convert(n, currency, p)
  if (!Number.isFinite(v) || v <= 0) return { converted: '', alt: '' } // no rate yet: just the real amount
  const text = p === 'NGN' ? `₦${Math.round(v).toLocaleString('en-US')}` : p === 'GHS' ? formatCedi(v) : formatUsd(v)
  return exact ? { converted: '', alt: `≈ ${text}` } : { converted: text, alt: formatMoney(n, currency) }
}

const shortNum = (v: number, sym: string) =>
  v >= 1e6 ? `${sym}${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M` : v >= 1e4 ? `${sym}${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K` : ''

/** One line of text for stats and lists, following the display currency:
 *  "₦3,433", "≈ $2.59", "≈ ₦7,500". "Both" keeps the real amount here (cards
 *  show the conversion underneath). exact: the real currency, always.
 *  short: "₦1.2M", "$12.5K" for big figures. */
export function showMoney(amount: number, currency = 'NGN', pref: string | null | undefined, convert: Convert, opts: { exact?: boolean; short?: boolean } = {}): string {
  const p = displayPref(pref)
  const n = Number(amount) || 0
  const fmtNgn = (v: number) => (opts.short && shortNum(v, '₦')) || `₦${Math.round(v).toLocaleString('en-US')}`
  const fmtUsd = (v: number) => (opts.short && shortNum(v, '$')) || formatUsd(v)
  if (!opts.exact && p !== 'BOTH') {
    const home = p === 'NGN' ? currency === 'NGN' : p === 'GHS' ? currency === 'GHS' : isDollar(currency)
    if (!home && !n) return p === 'NGN' ? '₦0' : p === 'GHS' ? 'GH₵0.00' : '$0.00' // nothing yet: in the chosen currency
    if (!home) {
      const v = convert(n, currency, p)
      if (Number.isFinite(v) && v > 0) return `≈ ${p === 'NGN' ? fmtNgn(v) : p === 'GHS' ? ((opts.short && shortNum(v, 'GH₵')) || formatCedi(v)) : fmtUsd(v)}`
    }
  }
  return currency === 'NGN' ? fmtNgn(n) : formatMoney(n, currency)
}

/** For screen readers: "1,500 naira", "2.50 USDC" */
export function spokenMoney(amount: number, currency = 'NGN'): string {
  return currency === 'NGN' ? `${amountNumber(amount, 'NGN')} naira` : formatMoney(amount, currency)
}
