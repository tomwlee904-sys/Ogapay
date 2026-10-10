import Layout from '../components/Layout'
import Content from '../components/ProfileReferralsTab'

// Real referral stats (this page used to show demo referrals)
export default function Referrals() {
  return (
    <Layout>
      <div style={{ maxWidth: 'calc(1040px + 2 * var(--gutter))', margin: '0 auto', padding: '24px var(--gutter) 60px' }}>
        <Content />
      </div>
    </Layout>
  )
}
