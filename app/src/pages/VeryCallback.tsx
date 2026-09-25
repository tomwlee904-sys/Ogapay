import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

const VeryCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    const fail = (message: string) => navigate('/settings?human=error&message=' + encodeURIComponent(message), { replace: true })

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (searchParams.get('error')) { fail(searchParams.get('error_description') || 'Verification was cancelled'); return }
    if (!code || !state) { fail('Verification was not completed'); return }

    apiRequest<any>('/social/very/complete', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    }).then(async () => {
      await refreshUser()
      navigate('/settings?human=verified', { replace: true })
    }).catch((err: any) => fail(err?.message || 'Verification failed'))
  }, [])

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
