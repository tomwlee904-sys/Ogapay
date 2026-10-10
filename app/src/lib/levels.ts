import { withdrawLimit } from './wallet'

// One description of the verification levels, used by the Wallet and Settings →
// Verification so the two never say different things. The rules are the
// server's: withdrawal limits (wallet.routes ngnWithdrawLimit), sending money
// (requireKyc) and the account number (flutterwave createVirtualAccount) all need
// Level 1 or above; adding money by card or USSD needs nothing.

export type Level = { tier: number; name: string; short: string; how: string; limit: number }

// ninInstant: a NIN is confirmed with NIMC on the spot (otherwise our team checks it)
// bank: Level 1 can also come from a bank account in your name (free, instant)
export const levelsFor = (didit: boolean, ninInstant = false, bank = false): Level[] => [
  { tier: 1, name: 'Level 1', short: bank ? 'Bank account or NIN' : 'NIN', how: bank ? 'A bank account in your name (instant), or your NIN' : ninInstant ? 'Your NIN, confirmed with NIMC in seconds' : 'Your NIN, checked by our team', limit: withdrawLimit(1) },
  { tier: 2, name: 'Level 2', short: 'ID + selfie', how: didit ? 'Scan an ID and take a selfie with Didit (about 2 minutes)' : 'An ID and selfie check, through support', limit: withdrawLimit(2) },
  { tier: 3, name: 'Level 3', short: 'ID documents', how: 'ID documents, checked by our team through support', limit: withdrawLimit(3) },
]

// What any level (1+) lets you do, on top of adding money by card or USSD
export const UNLOCKS = 'withdraw to your bank, send money to OgaPay users and get your own account number'

// The level someone at `tier` works towards: with Didit, one check goes straight to Level 2
export const nextTierFor = (tier: number, didit: boolean) => (didit && tier < 2 ? 2 : tier + 1)

// The next step for someone at `tier`, and where to take it
export const nextStep = (tier: number, didit: boolean): { to: string; label: string } | null => {
  if (tier <= 0) return { to: '/settings/verification', label: didit ? 'Verify with Didit' : 'Verify your identity' }
  if (tier === 1) return didit ? { to: '/settings/verification', label: 'Get Level 2 with an ID + selfie check' } : { to: '/support', label: 'Ask for Level 2' }
  if (tier === 2) return { to: '/support', label: 'Ask for Level 3' }
  return null
}
