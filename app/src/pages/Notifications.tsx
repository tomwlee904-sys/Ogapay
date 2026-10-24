import Layout from '../components/Layout'
import NotificationsList from '../components/ProfileNotificationsTab'

// Real notifications (this page used to show hard-coded demo items). The
// standard page frame with a narrow reading column on the same left edge.
export default function Notifications() {
  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-narrow">
          <NotificationsList page />
        </div>
      </div>
    </Layout>
  )
}
