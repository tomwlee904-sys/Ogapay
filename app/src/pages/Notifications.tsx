import Layout from '../components/Layout'
import NotificationsList from '../components/ProfileNotificationsTab'

// Real notifications (this page used to show hard-coded demo items)
export default function Notifications() {
  return (
    <Layout>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 60px' }}>
        <NotificationsList />
      </div>
    </Layout>
  )
}
