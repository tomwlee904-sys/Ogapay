import type { Currency } from './currency'

// Lifetime earnings from GET /wallet/summary (2026-11-08). Each currency has
// { deposited, withdrawn, withdrawing, earned, lifetime: { jobs, referrals,
// bonuses, tips, vault, total } }, added up over every transaction on the server.
// Vault payouts are only in `vault` now, not in `jobs`/`earned` as well.
// An older server sends no `lifetime` (lifetimeIn gives null), and `earned` is
// then job pay with vault payouts mixed in.
export type EarnKind = 'jobs' | 'referrals' | 'bonuses' | 'tips' | 'vault'
export const EARN_CURRENCIES: Currency[] = ['NGN', 'USDC', 'USDT', 'SOL']

type Convert = (amount: number, from: Currency, to: Currency) => number

const toNgn = (amount: number, cur: Currency, convert: Convert) => {
  if (!amount) return 0
  const v = cur === 'NGN' ? amount : convert(amount, cur, 'NGN')
  return Number.isFinite(v) ? v : 0
}

/** True when the summary has the lifetime totals per kind. */
export function hasLifetime(summary: any): boolean {
  return !!summary && typeof summary === 'object' && EARN_CURRENCIES.some((c) => summary[c]?.lifetime && typeof summary[c].lifetime === 'object')
}

/** One kind of earning over every currency, in naira; null on an older server. */
export function lifetimeIn(summary: any, kind: EarnKind, convert: Convert): number | null {
  if (!hasLifetime(summary)) return null
  return EARN_CURRENCIES.reduce((t, c) => t + toNgn(Number(summary[c]?.lifetime?.[kind]) || 0, c, convert), 0)
}

/** Money earned from jobs in naira: lifetime.jobs, or `earned` on an older server. */
export function jobsEarnedIn(summary: any, convert: Convert): number | null {
  if (!summary || typeof summary !== 'object') return null
  const lt = lifetimeIn(summary, 'jobs', convert)
  if (lt !== null) return lt
  return EARN_CURRENCIES.reduce((t, c) => t + toNgn(Number(summary[c]?.earned) || 0, c, convert), 0)
}
