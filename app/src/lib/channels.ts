// OgaPay's official channels: the one list the footer, About and Socials all
// use, so they can't disagree. Anyone claiming to be OgaPay anywhere else isn't
// us. Only add a channel here once it's really ours (t.me/ogapay is another
// company; Instagram and Facebook pages aren't confirmed, so they stay out).

export type Channel = {
  id: 'x' | 'telegram' | 'tiktok' | 'email'
  icon: string // Tabler icon name, without "ti-"
  name: string
  handle: string
  href: string
  text: string
  cta: string
}

export const CHANNELS: Channel[] = [
  { id: 'x', icon: 'brand-x', name: 'X (Twitter)', handle: '@Ogapayhq', href: 'https://x.com/Ogapayhq', text: 'Platform updates, new jobs and highlights from the community.', cta: 'Follow on X' },
  { id: 'telegram', icon: 'brand-telegram', name: 'Telegram', handle: 't.me/ogapayhq', href: 'https://t.me/ogapayhq', text: 'Our channel: news, new jobs and updates first.', cta: 'Join the channel' },
  { id: 'tiktok', icon: 'brand-tiktok', name: 'TikTok', handle: '@ogapayhq', href: 'https://www.tiktok.com/@ogapayhq', text: 'Short videos from the OgaPay team.', cta: 'Follow on TikTok' },
  { id: 'email', icon: 'mail', name: 'Email', handle: 'support@ogapay.app', href: 'mailto:support@ogapay.app', text: 'Questions about your account, a payment or an order.', cta: 'Email support' },
]

/** Open web links in a new tab; mailto links in the mail app */
export const channelTarget = (href: string) => (href.startsWith('http') ? '_blank' : undefined)
