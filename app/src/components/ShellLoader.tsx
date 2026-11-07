import Layout from './Layout'
import { SkeletonPage } from './SkeletonLoader'

// While a page's code or the sign-in check loads (2026-11-07): the top bar, menu
// and bottom bar stay on screen with grey placeholders in the page, instead of a
// black full-screen "Loading OgaPay..." that hid everything
export default function ShellLoader() {
  return <Layout><SkeletonPage /></Layout>
}
