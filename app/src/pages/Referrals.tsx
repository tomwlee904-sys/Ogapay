import Layout from '../components/Layout'
import Content from '../components/ProfileReferralsTab'

// Real referral stats (this page used to show demo referrals), in the shared page shell
export default function Referrals() {
  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head" style={{ marginBottom: 20 }}>
          <div>

            <h1 className="ui-title">Referrals</h1>
          </div>
        </div>
        <Content />
      </div>
    </Layout>
  )
}
