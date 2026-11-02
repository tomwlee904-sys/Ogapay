// Google Ads conversion tracking (2026-11-02). The Google tag itself loads once
// in index.html; this sends the sign-up conversion.

// The sign-up conversion action in Google Ads (Goals > Conversions)
export const ADS_SIGNUP_SEND_TO = 'AW-18550967605/wIGqCO-TqbAdELWa5Y1F'

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

// A brand-new account was just created. Called only when the server says so
// (isNewUser), which it does only on the request that created the account: a
// normal login, a second Google sign-in or a refresh never gets it. The marker per
// account also stops a repeat if the same answer is handled twice in this browser.
export function trackSignUpConversion(userId?: string | null) {
  const key = `ogapay_ads_signup_${userId || 'new'}`
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch { /* storage blocked: the server's isNewUser still limits it to one */ }
  try {
    window.gtag?.('event', 'conversion', { send_to: ADS_SIGNUP_SEND_TO })
  } catch { /* the tag failed to load (e.g. an ad blocker): never break sign-up */ }
}
