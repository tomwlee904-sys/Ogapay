import { useLocation } from 'react-router-dom'
import Layout from './Layout'
import PageLoader from './PageLoader'
import { SkeletonPage } from './SkeletonLoader'

// Full-screen pages with their own centred card (no top bar): they keep the plain
// spinner, so the app shell doesn't flash before them
const FULL_SCREEN = /^\/(auth\/callback|verify\/callback|reset-password|verify-email)\/?$/

// While a page's code or the sign-in check loads (2026-11-07): the top bar, menu
// and bottom bar stay on screen with grey placeholders in the page, instead of a
// black full-screen "Loading OgaPay..." that hid everything
export default function ShellLoader() {
  const { pathname } = useLocation()
  if (FULL_SCREEN.test(pathname)) return <PageLoader />
  return <Layout><SkeletonPage /></Layout>
}
