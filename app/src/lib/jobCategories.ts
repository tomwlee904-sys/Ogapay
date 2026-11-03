// The least a job in each sub-category pays a person, in naira. The same numbers
// the server checks (backend utils/jobCategories.js): work that takes longer (a
// video, an article, testing an app, 10 referrals) can't be posted at the ₦50 of
// a follow. Naira jobs only; contests and quick X jobs have their own rules.
export const SUB_MIN_NGN: Record<string, number> = {
  'X / Twitter': 50, Instagram: 50, TikTok: 50, YouTube: 50, Facebook: 50, LinkedIn: 50, Snapchat: 50, Threads: 50,
  Writing: 300, Video: 500, Design: 500, Photography: 500,
  Frontend: 2000, Backend: 2000, 'Smart Contract': 2000, Mobile: 2000,
  SEO: 200, Email: 100, Ads: 200, Growth: 100,
  Moderation: 200, Support: 200, Events: 100, Outreach: 100, WhatsApp: 100, Telegram: 50, Discord: 50,
  Streaming: 50, Download: 50, 'Content Creation': 300, Sharing: 50, Podcast: 50,
  'Blog Posts': 500, Articles: 500, Copywriting: 300, 'Guest Posts': 1000,
  'App Reviews': 100, 'Website Reviews': 100, 'Video Reviews': 300,
  'Market Research': 100, 'Product Feedback': 100, 'Opinion Polls': 50,
  'Email Signups': 100, 'Form Submissions': 100, 'App Sign-ups': 100, Referrals: 500, 'App Invites': 500,
  'App Download': 100, 'Beta Testing': 300, 'Install & Review': 200,
  Miscellaneous: 50,
}

/** The minimum for this sub-category in this currency, or 0 when there's none */
export const subMinPay = (subcategory: string | undefined | null, currency = 'NGN') =>
  currency === 'NGN' && subcategory ? SUB_MIN_NGN[subcategory.trim()] || 0 : 0
