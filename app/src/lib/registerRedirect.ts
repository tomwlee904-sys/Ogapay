// Old sign-up links (/register?ref=CODE or /register?referral=CODE) go to the
// sign-up with the invite code kept: /join?ref=CODE saves it (LoginPage).
// Without a code, /register still opens the sign-up form.
export function registerTarget(search: string): string {
  const params = new URLSearchParams(search)
  const ref = (params.get('ref') || params.get('referral') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)
  const out = new URLSearchParams()
  if (ref) out.set('ref', ref)
  else out.set('mode', 'signup')
  const redirect = params.get('redirect')
  if (redirect) out.set('redirect', redirect)
  return (ref ? '/join?' : '/login?') + out.toString()
}
