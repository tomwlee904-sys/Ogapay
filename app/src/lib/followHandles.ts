/* Follow jobs: a job can ask for the worker's username on one platform
   (askHandle), so the poster can check the follow and report an unfollow.
   The same list and username rule as the server (utils/followHandles.js). */

export const HANDLE_PLATFORMS: { code: string; name: string }[] = [
  { code: 'INSTAGRAM', name: 'Instagram' },
  { code: 'TIKTOK', name: 'TikTok' },
  { code: 'X', name: 'X' },
  { code: 'FACEBOOK', name: 'Facebook' },
  { code: 'LINKEDIN', name: 'LinkedIn' },
  { code: 'THREADS', name: 'Threads' },
  { code: 'YOUTUBE', name: 'YouTube' },
  { code: 'SNAPCHAT', name: 'Snapchat' },
  { code: 'TELEGRAM', name: 'Telegram' },
]

/** Days a worker reported for unfollowing can't take follow jobs */
export const UNFOLLOW_BLOCK_DAYS = 90

export const handlePlatformName = (code?: string | null) => HANDLE_PLATFORMS.find((p) => p.code === code)?.name || code || ''

const PROFILE_LINK = /^(https?:\/\/)?((www|m|mobile)\.)?(instagram\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|fb\.com|linkedin\.com|threads\.net|threads\.com|youtube\.com|snapchat\.com|t\.me|telegram\.me)\//i

/** The username from what they typed (a pasted profile link works too), or null */
export function cleanHandle(raw: string): string | null {
  let h = String(raw || '').trim().replace(PROFILE_LINK, '')
  h = h.replace(/[?#].*$/, '').replace(/\/+$/, '')
  h = h.replace(/^(in|add)\//i, '').replace(/^@/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h : null
}

/** The worker's profile on that platform, for the poster to check the follow */
export function profileUrl(code: string | null | undefined, handle: string): string {
  const h = encodeURIComponent(handle)
  switch (code) {
    case 'INSTAGRAM': return `https://instagram.com/${h}`
    case 'TIKTOK': return `https://tiktok.com/@${h}`
    case 'X': return `https://x.com/${h}`
    case 'FACEBOOK': return `https://facebook.com/${h}`
    case 'LINKEDIN': return `https://linkedin.com/in/${h}`
    case 'THREADS': return `https://threads.net/@${h}`
    case 'YOUTUBE': return `https://youtube.com/@${h}`
    case 'SNAPCHAT': return `https://snapchat.com/add/${h}`
    case 'TELEGRAM': return `https://t.me/${h}`
    default: return ''
  }
}
