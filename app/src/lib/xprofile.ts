// The X profile the server reads when someone connects X (or refreshes it):
// picture, name, bio, follower counts, banner and blue tick. The server only
// keeps picture and banner links on pbs.twimg.com.

/** GET /social/twitter/status, POST /social/twitter/verify-post and /refresh-profile */
export interface XProfile {
  name: string | null
  avatarUrl: string | null
  bio: string | null
  followers: number | null
  following: number | null
  bannerUrl: string | null
  location: string | null
  blue: boolean
  updatedAt: string | null
}

/** The smaller copy on public profiles (payload.x of GET /users/:username) */
export interface XPublic {
  handle: string
  name: string | null
  avatarUrl: string | null
  bio: string | null
  followers: number | null
  blue: boolean
}

/** What the summary shows: the public copy has no following count or banner */
export type XShown = Pick<XProfile, 'name' | 'avatarUrl' | 'bio' | 'followers' | 'blue'> & Partial<Pick<XProfile, 'following' | 'bannerUrl'>>

const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : null)

/** The X profile in GET /users/me: connections.twitter.profile, else the raw twitter* fields */
export function xProfileOf(me: any): XProfile | null {
  const p = me?.connections?.twitter?.profile
  if (p) return p
  if (!me || (!me.twitterProfileAt && !me.twitterAvatarUrl && !me.twitterName)) return null
  return {
    name: me.twitterName || null,
    avatarUrl: me.twitterAvatarUrl || null,
    bio: me.twitterBio || null,
    followers: num(me.twitterFollowers),
    following: null,
    bannerUrl: me.twitterBannerUrl || null,
    location: null,
    blue: !!me.twitterBlueVerified,
    updatedAt: me.twitterProfileAt || null,
  }
}

/** X keeps each profile picture in a few sizes and the saved link is often the
 *  48 px one ("..._normal.jpg"), blurry on a phone. `css` is the size shown at. */
export function xPic(url: string | null | undefined, css: number): string {
  if (!url) return ''
  const want = css * 2 > 200 ? '400x400' : '200x200'
  return url.replace(/(\/profile_images\/.+)_(normal|bigger|mini|200x200|400x400)(\.[a-z]+)?$/i, `$1_${want}$3`)
}

/** Banners come as ".../profile_banners/<id>/<time>" with no size; X makes 600x200 and 1080x360 */
export function xBanner(url: string | null | undefined, css: number): string {
  if (!url) return ''
  return /\/profile_banners\/\d+\/\d+$/.test(url) ? `${url}/${css * 2 > 600 ? '1080x360' : '600x200'}` : url
}

/** What's wrong with a pasted link, or '' when it's a link to a post (x.com/<name>/status/<id>) */
export function xPostLinkProblem(raw: string, handle: string): string {
  const s = raw.trim()
  if (/^(https?:\/\/)?(www\.|mobile\.)?(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status(es)?\/\d{5,25}/i.test(s)) return ''
  if (/^(https?:\/\/)?(www\.|mobile\.)?(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/?(\?.*)?$/i.test(s)) {
    return "That's the link to your profile, not a post. On X, open one of your posts, tap Share, then Copy link, and paste that here."
  }
  return `Paste the link to one of your posts, like https://x.com/${handle}/status/123…`
}

/** The server's message when it has one; "Request failed" and broken replies get a plain one */
export function xError(e: any, fallback: string): string {
  const m = String(e?.message || '')
  if (/timed out/i.test(m)) return 'That took too long. Wait a minute and try again.'
  // A server that doesn't have this yet (mid-update)
  if (/^route .* not found$/i.test(m)) return "This is still being switched on. Try again in a few minutes."
  if (!m || /^request failed$|json|unexpected token|failed to fetch|networkerror|load failed/i.test(m)) return fallback
  return m
}
