// Contest prizes: the rules the server checks when a contest is posted
// (contest.service.js prepare) and when its prizes are raised or places are
// added (escrow.service.js raisePrizes), so a page can say what is wrong and
// what it costs before anything is sent. The server checks it all again.
//   npm run test:contest-prizes

// The most places a contest can have, when posted and after places are added
// (server: contest.service MAX_PLACES, validate.js createTaskSchema prizes)
export const MAX_PLACES = 20
// The posting fee, on the prizes and on the extra when they are raised (server:
// PLATFORM_FEE_PERCENT). The job page's contest info says the server's own
// (feePercent, 2026-11-01); this is only for a server that doesn't say.
export const CONTEST_FEE_PERCENT = 10
// The most one contest's prizes can add up to (server: raisePrizes)
export const MAX_CONTEST_TOTAL = 10_000_000
// The smallest prize for a new place, and the smallest raise in all, by currency:
// about ₦50 each (server: utils/contestLimits.js MIN_RAISE, 2026-11-01)
export const MIN_RAISE: Record<string, number> = { NGN: 50, USDC: 0.03, SOL: 0.0002 }
const minRaise = (currency: string) => MIN_RAISE[String(currency || 'NGN').toUpperCase()] ?? 0

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`

// Kobo for naira, 6 places for USDC and SOL, as the server stores amounts (utils/money.js)
const DP: Record<string, number> = { NGN: 2, USDC: 6, SOL: 6 }
const dp = (currency: string) => DP[String(currency || 'NGN').toUpperCase()] ?? 6
export function roundMoney(value: number, currency = 'NGN') {
  const f = 10 ** dp(currency)
  return Math.round((Number(value) || 0) * f + Number.EPSILON) / f
}

// An amount as it moves: "₦7,000", "₦700.50", "2.50 USDC", "1.333333 USDC" (kobo
// and crypto places kept; at least 2 decimals for crypto, as lib/money formatMoney)
export function exactMoney(n: number, currency = 'NGN') {
  const v = roundMoney(n, currency)
  const num = v.toLocaleString('en-US', { minimumFractionDigits: currency === 'NGN' ? (v % 1 ? 2 : 0) : 2, maximumFractionDigits: dp(currency) })
  return currency === 'NGN' ? `₦${num}` : `${num} ${currency}`
}

// A prize typed in a box: "7,000" or "7000.5". Anything else is NaN.
export function parseAmount(s: string | number): number {
  const t = String(s ?? '').replace(/,/g, '').trim()
  return t === '' || !/^\d*\.?\d*$/.test(t) || t === '.' ? NaN : Number(t)
}

// Change the number of places to `count`. New places go at the end and start at
// the prize of the place above them; the places the contest already has
// (`existing`) are never taken away, and there are never more than MAX_PLACES.
export function resizePlaces(rows: string[], count: number, existing: number): string[] {
  const n = Math.max(existing, Math.min(MAX_PLACES, Math.floor(Number(count)) || 0))
  if (n <= rows.length) return rows.slice(0, n)
  const out = rows.slice()
  while (out.length < n) out.push(out[out.length - 1] ?? '')
  return out
}

export type RaiseCheck = {
  // The first rule broken, in plain words, or '' when none is
  error: string
  // True when nothing is broken and the prizes add up to more than now
  ready: boolean
  // The new prizes, 1st first, as they are sent (rounded like the server)
  prizes: number[]
  oldTotal: number
  newTotal: number
  // Held more for the prizes, the fee on it, and the two together (what leaves the wallet)
  extra: number
  fee: number
  pay: number
  // Places added at the end, and places already there whose prize goes up
  added: number
  raised: number
}

// Check new prizes against the ones the contest has now (`old`, 1st first).
// awarded: place numbers already awarded and paid; their prize stays as it is.
// feePercent: the server's fee (the contest info's feePercent).
// The same rules as the server: places are only added, never taken away (up to
// MAX_PLACES); no prize goes down; a lower place never pays more than the one
// above; a new place and the raise in all are at least MIN_RAISE; and the total
// has to go up.
export function checkRaise(old: number[], rows: (string | number)[], currency = 'NGN', awarded: number[] = [], feePercent = CONTEST_FEE_PERCENT): RaiseCheck {
  const before = old.map((p) => roundMoney(Number(p), currency))
  const parsed = rows.map((r) => parseAmount(r))
  const prizes = parsed.map((p) => (Number.isFinite(p) ? roundMoney(p, currency) : p))
  const oldTotal = roundMoney(before.reduce((s, p) => s + p, 0), currency)
  const sum = prizes.every(Number.isFinite) ? roundMoney(prizes.reduce((s, p) => s + p, 0), currency) : NaN
  const extra = Number.isFinite(sum) && sum > oldTotal ? roundMoney(sum - oldTotal, currency) : 0
  const fee = roundMoney((extra * feePercent) / 100, currency)
  const floor = minRaise(currency)
  const out = {
    prizes, oldTotal, newTotal: Number.isFinite(sum) ? sum : oldTotal, extra, fee, pay: roundMoney(extra + fee, currency),
    added: Math.max(0, prizes.length - before.length),
    raised: prizes.slice(0, before.length).filter((p, i) => Number.isFinite(p) && p > before[i]).length,
  }
  const fail = (error: string): RaiseCheck => ({ ...out, error, ready: false })
  const won = new Set(awarded)

  if (prizes.length < before.length) return fail(`This contest has ${before.length} places. Places can be added, not taken away.`)
  if (prizes.length > MAX_PLACES) return fail(`A contest can have up to ${MAX_PLACES} places.`)
  for (let i = 0; i < prizes.length; i++) {
    const p = prizes[i]
    const place = `${ordinal(i + 1)} place`
    if (!Number.isFinite(p) || p <= 0) return fail(`Give the ${place} a prize above 0.`)
    if (i < before.length && won.has(i + 1) && p !== before[i]) return fail(`The ${place} was already awarded, so its prize stays ${exactMoney(before[i], currency)}.`)
    if (i < before.length && p < before[i]) return fail(`The ${place} can't pay less than now (${exactMoney(before[i], currency)}).`)
    if (i >= before.length && p < floor) return fail(`Give the ${place} a prize of at least ${exactMoney(floor, currency)}.`)
    if (i > 0 && p > prizes[i - 1]) return fail(`The ${place} can't pay more than the ${ordinal(i)} place.`)
  }
  if (out.newTotal > MAX_CONTEST_TOTAL) return fail('That is too much for one contest.')
  if (extra > 0 && extra < floor) return fail(`Raise the prizes by at least ${exactMoney(floor, currency)} in total.`)
  return { ...out, error: '', ready: extra > 0 }
}

// What a contest has paid so far: each winning entry (approved, with the place it
// won) got that place's prize. A contest's reward is only its 1st prize, so
// approved x reward counts too much once a lower place pays less (Manage jobs
// "paid out", 2026-11-01). An approved entry with no place on record counts the reward.
export function contestPaidOut(prizes: unknown, subs: { status?: string; place?: number | null }[], reward = 0, currency = 'NGN'): number {
  const list = Array.isArray(prizes) ? prizes.map(Number) : []
  let sum = 0
  for (const s of subs) {
    if (s.status !== 'APPROVED') continue
    const p = s.place ? list[s.place - 1] : NaN
    sum += Number.isFinite(p) ? p : Number(reward) || 0
  }
  return roundMoney(sum, currency)
}

// Places next to each other that pay the same, as one run: 1st, 2nd, 3rd,
// 4th–12th (the referral contest board's prize line)
export function prizeRuns(prizes: number[]): { from: number; to: number; prize: number }[] {
  const runs: { from: number; to: number; prize: number }[] = []
  prizes.forEach((p, i) => {
    const last = runs[runs.length - 1]
    if (last && last.prize === Number(p)) last.to = i + 1
    else runs.push({ from: i + 1, to: i + 1, prize: Number(p) })
  })
  return runs
}
export const runLabel = (r: { from: number; to: number }) => (r.from === r.to ? ordinal(r.from) : `${ordinal(r.from)}–${ordinal(r.to)}`)
