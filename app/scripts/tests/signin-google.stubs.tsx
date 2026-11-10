// Stand-ins for signin-google.test.cjs: Supabase (Google's side of the
// sign-in), the homepage behind /login, and this device's push alerts.
// AuthCallback, LoginPage, SignInHost, SignInModal, AuthContext and lib/api are real.
const w = window as any

const oauthCalls = () => JSON.parse(sessionStorage.getItem('oauth') || '[]')

export const supabase = {
  auth: {
    // Coming back from Google: a Google session for the account in the case
    getSession: async () => ({ data: { session: w.__case && w.__case !== 'nosession' ? { access_token: 'google-session', refresh_token: 'google-refresh', user: { id: 'sb1', email: 'boss@gmail.com', user_metadata: { full_name: 'Amaka O' } } } : null }, error: null }),
    signInWithOAuth: async (opts: any) => {
      sessionStorage.setItem('oauth', JSON.stringify([...oauthCalls(), opts?.provider || '?']))
      return { error: null }
    },
    signOut: async () => { sessionStorage.setItem('sb_signed_out', '1'); return { error: null } },
  },
}

export default function HomePage() {
  return <p id="home">Home</p>
}

export const dropPushOnSignOut = async () => {}
