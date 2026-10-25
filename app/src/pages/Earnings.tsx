import Layout from '../components/Layout'
import Content from '../components/ProfileEarningsTab'

// Real earnings (this page used to show demo numbers)
export default function Earnings() {
  return (
    <Layout>
      <div className="ui-page" style={{ paddingBottom: 60 }}>
        <Content />
      </div>
    </Layout>
  )
}
