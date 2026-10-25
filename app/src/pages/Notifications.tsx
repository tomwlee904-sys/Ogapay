import Layout from '../components/Layout'
import NotificationsList from '../components/ProfileNotificationsTab'

// Real notifications (this page used to show hard-coded demo items)
export default function Notifications() {
  return (
    <Layout>
      <div style={{ maxWidth: 'calc(820px + 2 * var(--gutter))', margin: '0 auto', padding: '24px var(--gutter) 60px' }}>
        <NotificationsList />
      </div>
    </Layout>
  )
}
