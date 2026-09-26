import Layout from '../components/Layout'
import Content from '../components/ProfileReferralsTab'

// Real referral stats (this page used to show demo referrals)
export default function Referrals() {
  return (
    <Layout>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px 60px' }}>
        <Content />
      </div>
    </Layout>
  )
}
