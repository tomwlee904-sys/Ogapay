import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <Layout>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(22,163,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--green)' }}>
          <i className="ti ti-circle-check" style={{fontSize:36}} />
        </div>
        <h1 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 24, fontWeight: 900, margin: '0 0 8px', color: 'var(--text)' }}>Order Confirmed!</h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 6px' }}>Your order <strong style={{color:'var(--text)'}}>#{id}</strong> has been placed successfully.</p>
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 32px' }}>The seller will start working on it shortly. You'll get a notification when it's ready.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/my-tasks')} style={{ height: 46, padding: '0 28px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <i className="ti ti-briefcase" style={{marginRight:6}} /> My Tasks
          </button>
          <button onClick={() => navigate('/store')} style={{ height: 46, padding: '0 28px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <i className="ti ti-building-store" style={{marginRight:6}} /> Continue Shopping
          </button>
        </div>
      </div>
    </Layout>
  )
}
