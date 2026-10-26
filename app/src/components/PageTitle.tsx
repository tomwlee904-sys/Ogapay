import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { seoPageFor } from '../lib/seoPages'

// Each page names itself in the browser tab, in history and in shared links
// (every page used to say "OgaPay: earn and hire in Nigeria"). Pages about one
// thing (a profile, a product, a job) set a more exact title once it loads.
const HOME = 'OgaPay: earn and hire in Nigeria'
const TITLES: Record<string, string> = {
  '/login': 'Sign in', '/register': 'Create your account', '/forgot-password': 'Reset your password',
  '/tasks': 'Jobs', '/jobs': 'Jobs', '/store': 'Store', '/store/orders': 'My orders', '/communities': 'Communities',
  '/communities/create': 'Create a community', '/communities/mine': 'My communities',
  '/blog': 'Blog', '/blog/write': 'Write a blog', '/blog/all': 'All blogs', '/blog/my': 'My blogs',
  '/brand-kit': 'Brand kit', '/join-test-team': 'Join the test team', '/faq': 'FAQ', '/docs': 'Docs', '/support': 'Support',
  '/vault': 'Vault', '/vault/history': 'Vault history', '/developer': 'Developer API', '/safe': 'Staying safe',
  '/privacy': 'Privacy policy', '/terms': 'Terms of service', '/leaderboard': 'Leaderboard',
  '/workers': 'Workers', '/creators': 'Creators', '/dashboard': 'Dashboard', '/profile': 'My profile',
  '/wallet': 'Wallet', '/deposit': 'Add money', '/earnings': 'Earnings', '/referrals': 'Referrals', '/rank': 'Ranks', '/warnings': 'Warnings',
  '/settings': 'Settings', '/notifications': 'Notifications', '/messages': 'Messages', '/my-tasks': 'My tasks', '/my-reviews': 'My reviews',
  '/my-store': 'My store', '/campaigns': 'Campaigns', '/my-jobs': 'My jobs', '/manage-jobs': 'Manage jobs', '/reviews-to-write': 'Reviews to write',
  '/edit-profile': 'Edit profile', '/task-history': 'Task history', '/bookmarks': 'Bookmarks',
  '/analytics': 'Analytics', '/create': 'Create a job', '/createcustom': 'Create a custom job',
  '/createsocial': 'Create an X campaign', '/tasks/new': 'Create a job', '/post-job': 'Create a job',
  '/roadmap': 'Roadmap', '/hire': 'Hire', '/socials': 'Socials', '/license': 'License', '/copyright': 'Copyright',
  '/use-cases': 'Use cases', '/about': 'About OgaPay', '/features': 'Features', '/admin': 'Admin',
  '/writer': 'Writer workspace', '/job-monitor': 'Job monitor', '/pair-device': 'Pair a device', '/link-wallet': 'Link a wallet',
  '/verify-email': 'Verify your email', '/reset-password': 'Choose a new password', '/communities/invitations': 'Community invitations',
  '/docs/api': 'API docs', '/ecosystem': 'About OgaPay', '/feature-grid': 'Features',
  // Admin pages each say which one they are
  '/admin/blog': 'Admin: Blog', '/admin/vault': 'Admin: Vault', '/admin/moderation': 'Admin: Moderation',
  '/admin/withdrawals': 'Admin: Withdrawals', '/admin/kyc': 'Admin: Identity checks', '/admin/creators': 'Admin: Creator checks',
  '/admin/highlights': 'Admin: Highlighted jobs', '/admin/updates': 'Admin: Platform updates', '/admin/ranks': 'Admin: Rank claims',
  '/admin/warnings': 'Admin: Warnings', '/admin/linked-accounts': 'Admin: Linked accounts', '/admin/brands': 'Admin: Business checks',
  '/admin/support': 'Admin: Support and reports',
}

// Pages with an id in the address. Pages about one thing (an article, a job, a
// product) replace this with its own name once it loads.
const PATTERNS: [RegExp, string][] = [
  [/^\/blog\/edit\/[^/]+$/, 'Edit your article'],
  [/^\/blog\/[^/]+$/, 'Blog'],
  [/^\/tasks\/[^/]+\/submit$/, 'Submit your work'],
  [/^\/tasks\/[^/]+\/submissions$/, 'Submissions'],
  [/^\/tasks\/[^/]+$/, 'Job'],
  [/^\/store\/pay\/[^/]+$/, 'Checkout'],
  [/^\/store\/[^/]+$/, 'Store'],
  [/^\/orders\/[^/]+$/, 'Your order'],
  [/^\/communities\/[^/]+\/request$/, 'Ask to join a community'],
  [/^\/communities\/[^/]+$/, 'Community'],
  [/^\/user\/[^/]+\/hire$/, 'Hire'],
  [/^\/user\/[^/]+$/, 'Profile'],
  [/^\/ref\/[^/]+$/, 'Join OgaPay'],
]

export default function PageTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/'
    // Landing pages set their full search title themselves
    if (seoPageFor(path)) return
    const name = TITLES[path] || PATTERNS.find(([re]) => re.test(path))?.[1]
      || (path.startsWith('/settings/') ? 'Settings' : path.startsWith('/admin/') ? 'Admin' : null)
    document.title = name ? `${name} | OgaPay` : HOME
  }, [pathname])
  return null
}
