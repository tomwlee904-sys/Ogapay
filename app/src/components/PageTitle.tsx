import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Each page names itself in the browser tab, in history and in shared links
// (every page used to say "OgaPay: earn and hire in Nigeria"). Pages about one
// thing (a profile, a product, a job) set a more exact title once it loads.
const HOME = 'OgaPay: earn and hire in Nigeria'
const TITLES: Record<string, string> = {
  '/login': 'Sign in', '/register': 'Create your account', '/forgot-password': 'Reset your password',
  '/tasks': 'Jobs', '/jobs': 'Jobs', '/store': 'Store', '/store/orders': 'My orders', '/communities': 'Communities',
  '/communities/create': 'Create a community', '/communities/mine': 'My communities',
  '/blog': 'Blog', '/blog/write': 'Write a blog', '/faq': 'FAQ', '/docs': 'Docs', '/support': 'Support',
  '/vault': 'Vault', '/vault/history': 'Vault history', '/developer': 'Developer API', '/safe': 'Staying safe',
  '/privacy': 'Privacy policy', '/terms': 'Terms of service', '/leaderboard': 'Leaderboard',
  '/workers': 'Workers', '/creators': 'Creators', '/dashboard': 'Dashboard', '/profile': 'My profile',
  '/wallet': 'Wallet', '/deposit': 'Add money', '/earnings': 'Earnings', '/referrals': 'Referrals',
  '/settings': 'Settings', '/notifications': 'Notifications', '/messages': 'Messages', '/my-tasks': 'My tasks',
  '/my-store': 'My store', '/campaigns': 'Campaigns', '/my-jobs': 'My jobs', '/manage-jobs': 'Manage jobs',
  '/edit-profile': 'Edit profile', '/task-history': 'Task history', '/bookmarks': 'Bookmarks',
  '/analytics': 'Analytics', '/create': 'Create a job', '/createcustom': 'Create a custom job',
  '/createsocial': 'Create an X campaign', '/tasks/new': 'Create a job', '/post-job': 'Create a job',
  '/roadmap': 'Roadmap', '/hire': 'Hire', '/socials': 'Socials', '/license': 'License', '/copyright': 'Copyright',
  '/use-cases': 'Use cases', '/about': 'About OgaPay', '/features': 'Features', '/admin': 'Admin',
}

export default function PageTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/'
    const name = TITLES[path] || (path.startsWith('/settings/') ? 'Settings' : path.startsWith('/admin/') ? 'Admin' : null)
    document.title = name ? `${name} | OgaPay` : HOME
  }, [pathname])
  return null
}
