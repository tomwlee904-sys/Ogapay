// Creators (micro-influencers): verified audiences per platform. The server's
// rules are in services/audience.service.js; this file is the one place the
// site names platforms, tiers and follower counts.

export type AudiencePlatform = 'X' | 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'FACEBOOK'
export type AudienceStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface Audience {
  id: string
  platform: AudiencePlatform
  platformName: string
  handle: string
  followers: number
  tier: string | null
  source: 'OAUTH' | 'SCREENSHOT'
  status: AudienceStatus
  note: string | null
  verifiedAt: string | null
  updatedAt: string
}

export const AUDIENCE_PLATFORMS: { id: AudiencePlatform; label: string; icon: string; unit: string; url: (h: string) => string }[] = [
  { id: 'X', label: 'X', icon: 'ti-brand-x', unit: 'followers', url: (h) => `https://x.com/${h}` },
  { id: 'INSTAGRAM', label: 'Instagram', icon: 'ti-brand-instagram', unit: 'followers', url: (h) => `https://instagram.com/${h}` },
  { id: 'TIKTOK', label: 'TikTok', icon: 'ti-brand-tiktok', unit: 'followers', url: (h) => `https://www.tiktok.com/@${h}` },
  { id: 'YOUTUBE', label: 'YouTube', icon: 'ti-brand-youtube', unit: 'subscribers', url: (h) => `https://www.youtube.com/@${h}` },
  { id: 'FACEBOOK', label: 'Facebook', icon: 'ti-brand-facebook', unit: 'followers', url: (h) => `https://facebook.com/${h}` },
]

export const platformOf = (id: string) => AUDIENCE_PLATFORMS.find((p) => p.id === id) || AUDIENCE_PLATFORMS[0]

// Standard influencer tiers (under 1,000 has none)
export const TIERS = [
  { id: 'nano', label: 'Nano', min: 1_000, max: 9_999, range: '1k to 10k' },
  { id: 'micro', label: 'Micro', min: 10_000, max: 99_999, range: '10k to 100k' },
  { id: 'mid', label: 'Mid-tier', min: 100_000, max: 499_999, range: '100k to 500k' },
  { id: 'macro', label: 'Macro', min: 500_000, max: 0, range: '500k+' },
] as const

export function tierFor(n: number): string | null {
  if (n >= 500_000) return 'Macro'
  if (n >= 100_000) return 'Mid-tier'
  if (n >= 10_000) return 'Micro'
  if (n >= 1_000) return 'Nano'
  return null
}

/** 12400 -> "12.4k", 1250000 -> "1.3M" */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(n)
}

export const fullCount = (n: number) => n.toLocaleString('en-US')

/** "Instagram · 10,000+ followers" */
export function audienceRequirement(platform: string, min: number) {
  const p = platformOf(platform)
  return `${p.label} · ${fullCount(min)}+ ${p.unit}`
}
