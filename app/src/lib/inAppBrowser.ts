// Apps like Instagram, Facebook, X, Telegram and WhatsApp open links in their
// own built-in browser. Google refuses to sign anyone in there
// ("disallowed_useragent"), so the sign-in dialog says so before Google and
// offers to open the page in Chrome or Safari (2026-11-10).

const APPS: [RegExp, string][] = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS|FB4A|MessengerForiOS|\bOrca-Android\b/i, 'Facebook'],
  [/Twitter/i, 'X'],
  [/Telegram/i, 'Telegram'],
  [/WhatsApp/i, 'WhatsApp'],
  [/TikTok|musical_ly|BytedanceWebview|trill_/i, 'TikTok'],
  [/Snapchat/i, 'Snapchat'],
  [/\bLine\//i, 'LINE'],
  [/LinkedInApp/i, 'LinkedIn'],
]

/** The app whose built-in browser this is ("an app" when only the browser
 *  type shows it), or null in a normal browser. */
export function inAppBrowserName(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): string | null {
  if (!ua) return null
  for (const [re, name] of APPS) if (re.test(ua)) return name
  // Telegram's built-in browser adds this to the page
  if (typeof window !== 'undefined' && (window as any).TelegramWebviewProxy) return 'Telegram'
  // An Android app showing a page itself ("; wv)" in the browser name)
  if (/Android/i.test(ua) && /; wv\)/.test(ua)) return 'an app'
  return null
}

export const isAndroid = (ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') => /Android/i.test(ua)

/** Opens this page in Chrome on Android (an intent link Chrome picks up) */
export function chromeIntentUrl(href = window.location.href) {
  const u = new URL(href)
  return `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`
}

/** Copies text; false if the browser wouldn't let us */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
  } catch { /* fall back below */ }
  try {
    const t = document.createElement('textarea')
    t.value = text
    t.setAttribute('readonly', '')
    t.style.position = 'fixed'
    t.style.opacity = '0'
    document.body.appendChild(t)
    t.select()
    const done = document.execCommand('copy')
    t.remove()
    return done
  } catch { return false }
}
