// What to say after "Resend link" (POST /auth/resend-verification, auth.routes.js).
// It used to say "sent" even when the server answered "Email already verified",
// and hid why a resend failed (ver-14). The server's reasons are shown as it
// words them: "We just sent one. Check your inbox (and spam), or try again in a
// minute." (one a minute), "We couldn't send the email right now..." (provider down).
export type ResendOutcome = { tone: 'ok' | 'info' | 'err'; text: string; already: boolean }

export const RESEND_SENT = 'Link sent. Check your inbox, and your spam or promotions folder too.'
export const RESEND_ALREADY = 'Your email is already verified. Nothing more to do.'

// result: what apiRequest returned; error: what it threw (either, not both)
export function resendOutcome(result: unknown, error?: unknown): ResendOutcome {
  if (error) {
    const e = error as { message?: string; status?: number }
    const msg = String(e?.message || '').trim()
    if (e?.status === 429) return { tone: 'info', text: msg || 'We just sent one. Check your inbox (and spam), or try again in a minute.', already: false }
    return { tone: 'err', text: msg || "Couldn't send the email. Please try again.", already: false }
  }
  // "Email already verified" comes back as a success with no data
  const m = String((result as { message?: string } | null)?.message || '')
  if (/already verified/i.test(m)) return { tone: 'info', text: RESEND_ALREADY, already: true }
  return { tone: 'ok', text: RESEND_SENT, already: false }
}
