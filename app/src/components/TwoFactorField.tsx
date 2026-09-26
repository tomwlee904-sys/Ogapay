// The 6-digit authenticator code asked for before money leaves the account
// when the user has two-factor authentication on (the API refuses without it).
export const is2FAError = (msg?: string) => /2FA|authenticator/i.test(msg || '')

export default function TwoFactorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor="otp-2fa" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>2FA code from your authenticator app</label>
      <input
        id="otp-2fa"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 18, fontWeight: 700, letterSpacing: '.2em', textAlign: 'center', fontFamily: 'var(--font-mono, ui-monospace, monospace)', outline: 'none' }}
      />
    </div>
  )
}
