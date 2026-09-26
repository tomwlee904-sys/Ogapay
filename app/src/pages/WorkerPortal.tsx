import Layout from '../components/Layout'
import Content from '../components/ProfileWorkerPortalTab'

// Real worker portal (this page used to show demo stats)
export default function WorkerPortal() {
  return (
    <Layout>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px 60px' }}>
        <Content />
      </div>
    </Layout>
  )
}
