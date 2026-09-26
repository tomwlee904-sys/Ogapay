import Layout from '../components/Layout'
import Content from '../components/ProfileEarningsTab'

// Real earnings (this page used to show demo numbers)
export default function Earnings() {
  return (
    <Layout>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px 60px' }}>
        <Content />
      </div>
    </Layout>
  )
}
