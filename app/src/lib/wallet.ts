// Wallet helpers shared by the wallet page, Add money and Withdraw.
// Limits and fees mirror the API so the numbers shown are the ones charged.

export type Balances = Record<string, { balance: number; lockedBalance: number; available: number; pendingBalance?: number }>
export type Summary = Record<string, { deposited: number; withdrawn: number; withdrawing: number; earned: number }>
export type Bank = { id: string; bankName: string; bankCode: string; accountNumber: string; accountName: string; isDefault: boolean }
export type Tx = {
  id: string
  type: string
  status: string
  amount: number | string
  fee?: number | string | null
  currency: string
  reference: string
  provider?: string | null
  description?: string | null
  balanceBefore?: number | string | null
  balanceAfter?: number | string | null
  metadata?: any
  createdAt: string
  completedAt?: string | null
}

export const MIN_DEPOSIT_NGN = 100

// KYC from the signed-in user (/auth/me sends kycStatus + kycTier, and kyc)
export function kycOf(user: any) {
  const status = String(user?.kycStatus || user?.kyc?.status || '').toUpperCase()
  const tier = status === 'APPROVED' ? Number(user?.kycTier ?? user?.kyc?.kycTier ?? 0) : 0
  return { approved: status === 'APPROVED', tier, verified: status === 'APPROVED' && tier >= 1 }
}
export const MIN_WITHDRAW_NGN = 5000
// The most you can take out in a day (the last 24 hours), by KYC level
// (backend services/withdrawLimits.service.js)
export const withdrawLimit = (tier: number) => (tier >= 3 ? 50000 : tier >= 2 ? 10000 : tier >= 1 ? 5000 : 0)
// Today's allowance, from GET /wallet/withdraw-limit; all in naira
export type Allowance = { level: number; dailyLimit: number; usedToday: number; leftToday: number; minimum: number; nextAt: string | null }
export const whenAgain = (iso: string) => new Date(iso).toLocaleString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short' })
// 1.5%, at least ₦100 (wallet.service calculateWithdrawalFee)
export const ngnWithdrawFee = (amount: number) => Math.max(100, amount * 0.015)

export const naira = (n: number, dp = 2) => '₦' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
export const money = (n: number, cur = 'NGN') => {
  if (cur === 'NGN') return naira(n)
  if (cur === 'SOL') return `${(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })} SOL`
  return `${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`
}
export const maskAcct = (n?: string) => (n ? '•••• ' + String(n).slice(-4) : '')
export const shortAddr = (a?: string) => (a && a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a || '')
export const newKey = () => (globalThis.crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)

// ── Transactions ──
const DEBIT_TYPES = ['WITHDRAWAL', 'TRANSFER', 'TASK_PAYMENT', 'PLATFORM_FEE', 'STORE_PURCHASE', 'ESCROW', 'SYSTEM_DEBIT']
const up = (s?: string | null) => String(s || '').toUpperCase()

export const isVoid = (t: Tx) => ['FAILED', 'CANCELLED', 'REJECTED', 'REVERSED'].includes(up(t.status))
// Money held for a live job (released to workers or refunded later)
export const isEscrowHeld = (t: Tx) => (String(t.reference || '').startsWith('OGA-ESCROW-') || isStoreHeld(t)) && up(t.status) === 'PENDING'
// A store purchase held until the buyer confirms delivery
export const isStoreHeld = (t: Tx) => up(t.type) === 'STORE_PURCHASE' && !!t.metadata?.held && up(t.status) === 'PENDING'
export const isPending = (t: Tx) => ['PENDING', 'PROCESSING'].includes(up(t.status)) && !isEscrowHeld(t)
// Descriptions that only repeat the title
export const usefulNote = (t: Tx) => (t.description && !/^(deposit via|withdrawal via|escrow for task|usdc deposit|sent to @)/i.test(t.description) ? t.description : '')

// Amounts are stored positive; the direction comes from the balance change, then
// the P2P metadata, then the type
export function isCredit(t: Tx) {
  if (t.balanceBefore != null && t.balanceAfter != null) {
    const delta = Number(t.balanceAfter) - Number(t.balanceBefore)
    if (delta !== 0) return delta > 0
  }
  const dir = t.metadata?.direction
  if (dir === 'credit' || dir === 'debit') return dir === 'credit'
  if (up(t.type) === 'DEPOSIT') return true
  return !DEBIT_TYPES.includes(up(t.type))
}

export function txTitle(t: Tx) {
  const cr = isCredit(t)
  const who = t.metadata?.counterparty ? ' @' + t.metadata.counterparty : ''
  switch (up(t.type)) {
    case 'DEPOSIT': return 'Added money'
    case 'WITHDRAWAL': return t.metadata?.toAddress || t.metadata?.walletAddress ? 'Withdrawal to crypto wallet' : 'Withdrawal to bank'
    case 'TRANSFER': return t.metadata?.p2p ? (cr ? `Received from${who || ' a user'}` : `Sent to${who || ' a user'}`) : 'Transfer'
    case 'TASK_PAYMENT': return cr ? 'Job payment' : 'Job funded'
    case 'TASK_REWARD': return 'Reward'
    case 'EARNING': return 'Earning'
    case 'REFERRAL_BONUS': return 'Referral bonus'
    case 'SIGNUP_BONUS': return 'Sign-up bonus'
    case 'TASK_REFUND': return 'Job refund'
    case 'REFUND': return 'Refund'
    case 'PLATFORM_FEE': return 'Fee'
    case 'STORE_PURCHASE': return cr ? 'Store sale' : 'Store purchase'
    case 'ESCROW': return cr ? 'Released from escrow' : 'Held in escrow'
    case 'SYSTEM_CREDIT': return 'Credit'
    case 'SYSTEM_DEBIT': return 'Debit'
    default: return up(t.type).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) || 'Transaction'
  }
}

// One line on how the money moved (bank, method, address)
export function txDetail(t: Tx) {
  const m = t.metadata || {}
  const d = String(t.description || '')
  if (up(t.type) === 'DEPOSIT') {
    if (/DVA/i.test(d)) return 'Bank transfer'
    if (up(t.provider) === 'FLUTTERWAVE' || up(t.provider) === 'PAYSTACK') return 'Card, USSD or bank app'
    if (t.currency === 'USDC') return 'USDC on Solana'
    return ''
  }
  if (up(t.type) === 'WITHDRAWAL') {
    if (m.toAddress || m.walletAddress) return shortAddr(m.toAddress || m.walletAddress)
    return [m.bankName, maskAcct(m.accountNumber)].filter(Boolean).join(' ')
  }
  if (m.note) return `“${m.note}”`
  return ''
}

export const statusLabel = (s: string) => {
  const v = up(s)
  if (v === 'PROCESSING') return 'Processing'
  if (v === 'PENDING') return 'Pending'
  if (v === 'COMPLETED') return 'Completed'
  return v.charAt(0) + v.slice(1).toLowerCase()
}

export const when = (d: string) => {
  const t = new Date(d)
  const mins = Math.floor((Date.now() - t.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const today = new Date(); const y = new Date(Date.now() - 86400e3)
  const time = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (t.toDateString() === today.toDateString()) return `Today, ${time}`
  if (t.toDateString() === y.toDateString()) return `Yesterday, ${time}`
  return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: t.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}
