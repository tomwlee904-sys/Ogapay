import { useEffect } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { openSignIn, safeRedirect } from '../lib/signin'
import HomePage from './HomePage'

const ERRORS: Record<string, string> = {
  no_session: "Google sign-in didn't finish. Please try again.",
  callback_error: "Google sign-in didn't finish. Please try again.",
  auth_init_failed: "Couldn't start Google sign-in. Please try again.",
  google_auth_failed: 'Google sign-in failed. Please try again.',
}

/* /login and /pair open the sign-in dialog over the homepage, like wurk.fun.
   Closing it leaves you on the homepage. */
export default function LoginPage() {
  const { isAuthed, isLoading } = useAuth()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const redirect = safeRedirect(params.get('redirect'))

  useEffect(() => {
    const ref = params.get('ref')
    if (ref) localStorage.setItem('ogapay_referral', ref)
  }, [])

  useEffect(() => {
    if (isLoading || isAuthed) return
    openSignIn({
      view: pathname === '/pair' ? 'pair' : params.get('mode') === 'signup' ? 'signup' : 'options',
      code: params.get('code') || '',
      notice: ERRORS[params.get('error') || ''] || '',
      redirect,
      closeTo: '/',
    })
  }, [isLoading, isAuthed, pathname])

  if (!isLoading && isAuthed) return <Navigate to={redirect || '/dashboard'} replace />
  return <HomePage />
}
