import { useEffect } from 'react'
import Layout from '../components/Layout'
import { Link } from 'react-router-dom'

export default function NotFound() {
  // The server answers 200 for every address (it's one app), so tell search
  // engines not to index a missing page as if it were real
  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'; m.content = 'noindex'
    document.head.appendChild(m)
    return () => { m.remove() }
  }, [])
  return (
    <Layout sidebar={false}>
      <div style={{textAlign:'center',padding:'80px 20px'}}>
        <i className="ti ti-mood-confuzed" style={{fontSize:64,color:'var(--text3)',marginBottom:16,display:'block'}} />
        <h1 style={{fontFamily:'Inter',fontSize:28}}>Page Not Found</h1>
        <p style={{color:'var(--text2)',fontSize:14,marginTop:8}}>This page doesn't exist yet.</p>
        <Link to="/" style={{marginTop:20,display:'inline-flex',height:44,padding:'0 22px',borderRadius:10,background:'var(--text)',color:'var(--bg)',fontSize:14,fontWeight:700,alignItems:'center',textDecoration:'none'}}>Go Home</Link>
      </div>
    </Layout>
  )
}
