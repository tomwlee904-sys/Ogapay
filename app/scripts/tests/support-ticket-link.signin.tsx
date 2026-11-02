// Stand-in for the sign-in dialog in support-ticket-link.test.cjs. It ends a
// sign-in the way the real one does (SignInModal.tsx finish): login() with the
// session, then onSignedIn.
// @ts-ignore resolved by esbuild alias
import { useAuth } from 'auth-under-test'

const MEMBER = { id: 'u1', email: 'ada@test.io', firstName: 'Ada', username: 'ada', role: 'WORKER' }

export default function SignInModal({ redirect, onClose, onSignedIn }: { redirect?: string | null; onClose: () => void; onSignedIn: (isNew: boolean) => void }) {
  const { login } = useAuth()
  const go = () => {
    login({ user: MEMBER, tokens: { accessToken: 'tok-1', refreshToken: 'ref-1' } })
    onSignedIn(false)
  }
  return (
    <div id="fake-signin" data-redirect={redirect || ''}>
      <button id="fake-signin-go" type="button" onClick={go}>Sign in with email</button>
      <button id="fake-signin-close" type="button" onClick={onClose}>Close</button>
    </div>
  )
}
