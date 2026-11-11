import { withdrawLimit } from './wallet'

// One description of the verification levels, used by the Wallet and Settings →
// Verification so the two never say different things. The rules are the
// server's: withdrawal limits (wallet.routes ngnWithdrawLimit) and the account
// number (flutterwave createVirtualAccount) need Level 1 or above; sending money
// and the first job bonus need it by NIN or ID, not only the bank check
// (wallet.service verifiedById); adding money by card or USSD needs nothing.

export type Level = { tier: number; name: string; short: string; how: string; limit: number }

// The IDs our team checks for Level 2 (backend kycManual.service ID_TYPES)
export const ANY_ID = "any government ID (NIN slip or card, international passport, driver's licence or voter's card; Ghana Card in Ghana)"
// The daily limit next to the Thursday payout, so "₦5,000 a day" doesn't read
// as "paid every day" (ver-17)
export const LIMIT_AND_PAYDAY = 'The daily limit is how much you can ask to withdraw in a day. Bank withdrawals are then paid out together every Thursday.'

// ninInstant: a NIN is confirmed with NIMC on the spot (otherwise our team checks it)
// bank: Level 1 can also come from a bank account in your name (free, instant)
export const levelsFor = (didit: boolean, ninInstant = false, bank = false): Level[] => [
  { tier: 1, name: 'Level 1', short: bank ? 'Bank account or NIN' : 'NIN', how: bank ? 'Your bank account (free, lets you withdraw) or your NIN' : ninInstant ? 'Your NIN, confirmed with NIMC in seconds' : 'Your NIN, checked by our team', limit: withdrawLimit(1) },
  // Any government ID kycManual.service accepts (ID_TYPES), not only the NIN slip (ver-17)
  { tier: 2, name: 'Level 2', short: didit ? 'ID + selfie' : 'ID photo', how: didit ? 'Take a photo of your ID card and a selfie (about 2 minutes)' : `A photo of ${ANY_ID}, checked by our team`, limit: withdrawLimit(2) },
  { tier: 3, name: 'Level 3', short: 'Approved by our team', how: 'Ask our team through support. No documents needed', limit: withdrawLimit(3) },
]

// What any level (1+) lets you do, on top of adding money by card or USSD
export const UNLOCKS = 'withdraw to your bank and get your own account number'
// What needs Level 1 by NIN or ID (Level 2 by an ID photo counts too), not only
// the bank check. Said the same way everywhere (Dashboard, Verification, Send).
export const SEND_RULE = 'Sending money to other members needs your NIN or ID (Level 1 by NIN, or Level 2). The bank account check lets you withdraw, but not send.'
export const BONUS_RULE = 'The ₦1,000 first job bonus needs your NIN or ID (Level 1 by NIN, or Level 2) plus your first paid job.'
// For someone verified by the bank check only: the way on is an ID photo (Level 2)
export const BANK_ONLY_NEXT = 'Your bank account verified you, so you can withdraw. For the ₦1,000 first job bonus and to send money, send a photo of your ID (Level 2).'

// The level someone at `tier` works towards: with Didit, one check goes straight to Level 2
export const nextTierFor = (tier: number, didit: boolean) => (didit && tier < 2 ? 2 : tier + 1)

// The next step for someone at `tier`, and where to take it
export const nextStep = (tier: number, didit: boolean): { to: string; label: string } | null => {
  if (tier <= 0) return { to: '/settings/verification', label: didit ? 'Verify with Didit' : 'Verify your identity' }
  if (tier === 1) return didit ? { to: '/settings/verification', label: 'Get Level 2 with an ID + selfie check' } : { to: '/settings/verification', label: 'Get Level 2: send your ID to our team' }
  if (tier === 2) return { to: '/support', label: 'Ask for Level 3' }
  return null
}
