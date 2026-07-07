import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

const VeryCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (!code) { navigate('/settings#kyc'); return }

    apiRequest<any>('/kyc/very/callback', {
      method: 'POST',
      body: JSON.stringify({ code, userId: state })
    }).then(async (json) => {
      if (json.success) {
        await refreshUser()
        navigate('/settings?verified=true#kyc')
      } else {
        navigate('/settings?error=' + encodeURIComponent(json.message || 'failed') + '#kyc')
      }
    })
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'inherit'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:48,height:48,border:'4px solid var(--accent)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 16px'}} />
        <div style={{fontWeight:700,fontSize:16}}>Completing verification...</div>
        <div style={{fontSize:13,color:'var(--text2)',marginTop:6}}>Please wait while we confirm your identity</div>
      </div>
    </div>
  )
}

export default VeryCallback
