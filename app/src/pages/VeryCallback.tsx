import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest, getAccessToken } from '../lib/api'

// VeryAI sends the person here after the palm scan, with ?code=&state=.
// On Android this page often opens in a different browser or tab from the one
// that started the check (VeryAI hands off from in-app browsers, and the VeryAI
// app opens the default browser), where the person may not be signed in. The
// server confirms the scan with VeryAI either way, but a signed-out browser
// only gets a one-time claim key: the account is verified once its owner signs
// in here (Settings, Verification hands the key over). That stops a VeryAI
// address passed to someone else from verifying the account.
const SETTINGS = '/settings/verification'
const SIGN_IN = `/login?redirect=${encodeURIComponent(SETTINGS)}`
// Settings, Verification reads the same key
const VERY_CLAIM_KEY = 'ogapay_very_claim'

const VeryCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const done = useRef(false)
  const [result, setResult] = useState<{ ok: boolean; text: string; waiting?: boolean } | null>(null)

  useEffect(() => {
    if (done.current) return
    done.current = true
    const signedIn = !!getAccessToken()
    const fail = (message: string) => {
      if (signedIn) navigate(`${SETTINGS}?human=error&message=` + encodeURIComponent(message), { replace: true })
      // An older server only finishes checks for a signed-in browser
      else if (/no token|invalid access token|unauthori[sz]ed/i.test(message)) setResult({ ok: false, text: 'Sign in to OgaPay in this browser, then start the check again from Settings.' })
      else setResult({ ok: false, text: message })
    }

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (searchParams.get('error')) { fail(searchParams.get('error_description') || 'Verification was cancelled'); return }
    if (!code || !state) { fail('Verification was not completed'); return }

    apiRequest<any>('/social/very/complete', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    }).then(async (r: any) => {
      if (!signedIn) {
        if (r?.claim) { try { localStorage.setItem(VERY_CLAIM_KEY, r.claim) } catch { /* private mode */ } }
        if (r?.verified) { setResult({ ok: true, text: "You're verified as a human." }); return }
        const who = r?.account ? ` (${r.account})` : ''
        setResult({ ok: true, waiting: true, text: (r?.message || 'To finish, sign in to OgaPay in this browser with the account that started this check.') + (who ? ` This check is for${who}.` : '') })
        return
      }
      if (r && r.verified === false) { fail(r.message || 'Verification was not completed'); return }
      await refreshUser()
      navigate(`${SETTINGS}?human=verified`, { replace: true })
    }).catch((err: any) => fail(err?.message || 'Verification failed'))
  }, [])

  if (result) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, fontFamily: 'inherit' }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <i className={`ti ${result.ok ? 'ti-circle-check' : 'ti-alert-circle'}`} style={{ fontSize: 44, color: result.ok ? 'var(--green)' : 'var(--red, #dc2626)' }} />
          <h1 style={{ fontWeight: 700, fontSize: 18, marginTop: 10 }}>{result.waiting ? 'Sign in to finish' : result.ok ? 'Scan confirmed' : "Verification didn't go through"}</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 8, lineHeight: 1.5 }}>{result.text}</p>
          {result.ok && !result.waiting && (
            <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 8, lineHeight: 1.5 }}>
              Go back to OgaPay where you started: it shows Verified (tap Check again if it doesn't yet). Or sign in here.
            </p>
          )}
          <div className="btn-row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Link className="btn btn-primary" to={SIGN_IN}>Sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'inherit'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:48,height:48,border:'4px solid var(--accent)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 16px'}} />
        <div style={{fontWeight:700,fontSize:16}}>Completing verification...</div>
        <div style={{fontSize:13,color:'var(--text2)',marginTop:6}}>Please wait while we confirm you're a real person</div>
      </div>
    </div>
  )
}

export default VeryCallback
