// Which part of the site a page belongs to, so the bottom dock (BottomNav) and
// the desktop top bar (Navbar) light the same tab, also on the pages under it:
// Saved jobs and Job monitor are Jobs, My jobs and Campaigns are Create, and
// so on. A path and everything below it (/tasks covers /tasks/123/submit).

export type NavSection = 'jobs' | 'store' | 'create' | 'alerts' | 'profile' | 'faq' | 'signin' | 'vault'

const SECTIONS: [NavSection, string[]][] = [
  // Finding and doing work
  ['jobs', ['/tasks', '/bookmarks', '/job-monitor', '/my-tasks', '/my-work', '/my-reviews', '/work', '/writer']],
  ['store', ['/store', '/my-store', '/orders']],
  // Posting work and following it up
  ['create', ['/create', '/manage-jobs', '/campaigns', '/analytics', '/reviews-to-write']],
  ['alerts', ['/notifications', '/messages']],
  // Your account and money
  ['profile', ['/profile', '/edit-profile', '/settings', '/dashboard', '/wallet', '/deposit', '/earnings', '/referrals', '/warnings', '/developer', '/pair-device']],
  ['vault', ['/vault']],
  // Help (the visitors' dock)
  ['faq', ['/faq', '/support', '/docs']],
  // Sign-in pages (the visitors' dock)
  ['signin', ['/login', '/pair', '/join', '/forgot-password', '/reset-password']],
]

const under = (pathname: string, p: string) => pathname === p || pathname.startsWith(p + '/')

/** The section a page is in, or null. ownProfile is "/user/<your username>" (lower case): your public page is Profile. */
export function navSection(pathname: string, ownProfile?: string | null): NavSection | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  for (const [key, paths] of SECTIONS) if (paths.some((p) => under(path, p))) return key
  if (ownProfile && under(path.toLowerCase(), ownProfile)) return 'profile'
  return null
}

/** "/user/<username>" in lower case, for navSection */
export const ownProfilePath = (username?: string | null) =>
  username ? `/user/${encodeURIComponent(username)}`.toLowerCase() : null
