import { apiRequest } from './api'

// Admins close an account (farms, duplicates): POST /admin/users/close. Same as
// "delete my account" (banned, records kept); any wallet balance stays frozen in
// it. The server refuses while money is moving, and says why.
const WHY: Record<string, string> = {
  OPEN_JOBS: 'they have open jobs (close those first)',
  FUNDS_ON_HOLD: 'they have money on hold',
  PENDING_WITHDRAWALS: 'they have a withdrawal waiting (reject or pay it first)',
  WORK_AWAITING_REVIEW: 'they have work waiting for review',
  OPEN_DISPUTES: 'they have an open dispute',
  STORE_ORDERS_SOLD: 'they have store orders still to deliver',
}
const explain = (why: string) => why.split(', ').map((c) => WHY[c] || c).join('; ')

// Asks for a reason and a confirmation; true if the account was closed
export async function closeAccount(userId: string, username: string): Promise<boolean> {
  const reason = window.prompt(`Close @${username}? Give a reason (kept in the audit log), e.g. "multiple accounts (bonus farm)":`, 'multiple accounts (bonus farm)')
  if (reason === null) return false
  if (!reason.trim()) { window.alert('A reason is needed.'); return false }
  if (!window.confirm(`Close @${username} for "${reason.trim()}"?\n\nThey can't sign in again. Any balance stays frozen in the account, not paid out. This can't be undone from the website.`)) return false
  try {
    const r = await apiRequest<{ results: { closed: boolean; why?: string; keptBalances?: string[] }[] }>('/admin/users/close', {
      method: 'POST',
      body: JSON.stringify({ userIds: [userId], reason: reason.trim() }),
    })
    const res = r?.results?.[0]
    if (res?.closed) {
      window.alert(`@${username} is closed.${res.keptBalances?.length ? ` Balance kept frozen: ${res.keptBalances.join(', ')}.` : ''}`)
      return true
    }
    window.alert(`@${username} wasn't closed: ${explain(res?.why || 'unknown reason')}.`)
  } catch (e: any) {
    window.alert(e?.message || "Couldn't close the account.")
  }
  return false
}
