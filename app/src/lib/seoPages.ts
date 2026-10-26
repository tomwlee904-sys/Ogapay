// Landing pages for the searches people make ("earn money online in Nigeria",
// "content writing jobs Nigeria"): a title, plain-English text, the open jobs
// that match, a short FAQ and links on. Shown by pages/SeoLanding.tsx. Crawlers
// get the same title and description from api/page-meta.js (keep both in sync).

export type SeoPage = {
  path: string
  tab: string // browser tab name (PageTitle adds " | OgaPay")
  title: string // the full <title>
  description: string
  eyebrow: string
  h1: string
  intro: string[]
  category?: string // API category code: only these jobs are listed
  faqs: [string, string][]
}

const PAY = 'Approved work is paid into your OgaPay wallet in Naira or USDC. To move it to your bank, verify your identity and withdraw from ₦5,000; bank withdrawals are paid every Thursday.'
const FREE = 'No. OgaPay is free to join, and no real job asks you to pay to start. If anyone asks you for a fee to unlock work or a withdrawal, it is a scam.'

export const SEO_PAGES: SeoPage[] = [
  {
    path: '/earn-money-online-nigeria',
    tab: 'Earn money online in Nigeria',
    title: 'Earn money online in Nigeria with your phone | OgaPay',
    description: 'Earn money online in Nigeria by doing simple paid jobs on your phone: social media, writing, testing and surveys. Free to join, paid in Naira.',
    eyebrow: 'Earn on OgaPay',
    h1: 'Earn money online in Nigeria',
    intro: [
      'OgaPay is a Nigerian marketplace where people and businesses post small paid jobs, and you do them from your phone. Follow a page, test an app, answer a survey, write a short review or translate a line into Pidgin, Yoruba, Igbo or Hausa.',
      'Every job shows the pay before you start, and the poster’s money is already held by OgaPay, so you know it is there. You send your proof, the poster checks it, and approved work is paid into your wallet.',
      'It is not a get-rich-quick scheme. Most jobs pay ₦50 to ₦1,000, and bigger writing or design jobs pay more. What you earn depends on the work you do.',
    ],
    faqs: [
      ['How do I start earning?', 'Create a free account, verify your identity with your NIN, then take any open job below. Each job says exactly what to do and what proof to send.'],
      ['Do I need to pay anything to start?', FREE],
      ['How do I get my money?', PAY],
      ['Can I earn with just a phone?', 'Yes. Every job on OgaPay can be done on a phone with data. You don’t need a laptop.'],
    ],
  },
  {
    path: '/paid-tasks-nigeria',
    tab: 'Paid tasks in Nigeria',
    title: 'Paid tasks in Nigeria: small jobs that pay in Naira | OgaPay',
    description: 'Real paid tasks in Nigeria: follow, review, test apps, answer surveys and write. See the pay first, send proof, get paid when it is approved.',
    eyebrow: 'Paid tasks',
    h1: 'Paid tasks in Nigeria',
    intro: [
      'Paid tasks are small online jobs you finish in minutes: follow a business on X or TikTok, share a post on your WhatsApp status, test a website and report a problem, or answer a few questions.',
      'On OgaPay the pay is shown on every task, and the money is held before you start. Take a place, do the task the way the description asks, and send your proof. The poster approves it, or it is approved automatically if they don’t review it within 3 days.',
      'Some tasks need you to be verified or to have a connected X account. The requirements are listed on each task, so you know before you start.',
    ],
    faqs: [
      ['How much do paid tasks pay?', 'Simple social tasks usually pay ₦50 to ₦200. Reviews, testing and writing pay more, from ₦300 to several thousand naira. The pay is always shown on the task.'],
      ['What happens if my work is rejected?', 'You see the reason, and the place opens up again for someone else. Read the description carefully and send exactly the proof it asks for.'],
      ['Are these tasks free to take?', FREE],
      ['When do I get paid?', PAY],
    ],
  },
  {
    path: '/jobs/social-media',
    tab: 'Social media jobs',
    title: 'Social media jobs in Nigeria: get paid to follow, like and share | OgaPay',
    description: 'Paid social media jobs in Nigeria: follow, like, repost, comment and share on X, TikTok, Instagram and WhatsApp. See the pay first, get paid when approved.',
    eyebrow: 'Social media jobs',
    h1: 'Social media jobs in Nigeria',
    category: 'SOCIAL_MEDIA',
    intro: [
      'Businesses and creators pay people on OgaPay to follow their pages, like and repost their posts, leave honest comments and share on WhatsApp status.',
      'Some X jobs have a payout check: your post must still be up after the time the poster chose (for example 1 hour or 24 hours) before it can be approved. The job page says if it has one.',
    ],
    faqs: [
      ['Do I need an X account?', 'For X jobs, yes: connect it in your OgaPay settings so your proof can be checked. TikTok, Instagram and WhatsApp jobs ask for a screenshot instead.'],
      ['Can I unfollow after I am paid?', 'No. Posters can see it, and removing your follow or post breaks the job’s rules and can get you warned.'],
      ['How do I get paid?', PAY],
    ],
  },
  {
    path: '/jobs/content-writing',
    tab: 'Writing jobs',
    title: 'Content writing jobs in Nigeria: paid reviews, articles and posts | OgaPay',
    description: 'Content writing jobs in Nigeria on OgaPay: honest reviews, blog articles and short posts, paid in Naira. Original work only.',
    eyebrow: 'Writing jobs',
    h1: 'Content writing jobs in Nigeria',
    category: 'CONTENT_WRITING',
    intro: [
      'Writing jobs on OgaPay range from a 100-word honest review to full blog articles. Some are contests, where the poster picks the best entries and only the winners are paid.',
      'Write in your own words. Copied text and articles mostly written by AI are rejected. Long articles are usually sent as a Google Doc link, as the job describes.',
    ],
    faqs: [
      ['Can I use AI to write?', 'AI may help with ideas or grammar, but the final text must be your own, with real details. Work that is mostly AI-written is not paid.'],
      ['What is a writing contest?', 'You send one entry before it closes. The poster ranks the best entries and pays a prize for each place. If yours isn’t chosen, it stays yours.'],
      ['How do I get paid?', PAY],
    ],
  },
  {
    path: '/jobs/app-testing',
    tab: 'App testing jobs',
    title: 'App testing jobs in Nigeria: get paid to test apps and websites | OgaPay',
    description: 'Get paid to test apps and websites in Nigeria. Try the app on your phone, report what confused you or broke, and get paid in Naira when approved.',
    eyebrow: 'Testing jobs',
    h1: 'App and website testing jobs in Nigeria',
    category: 'APP_TESTING',
    intro: [
      'Startups and businesses pay testers on OgaPay to try their app or website on a real phone and say what confused them or broke.',
      'A good test report says what you tapped, what you expected and what happened, with a screenshot. Clear reports are what get approved.',
    ],
    faqs: [
      ['Do I need a special phone?', 'No. Most testing jobs want ordinary Android phones, the way real customers use them.'],
      ['What should my report include?', 'The steps you took, what you expected, what actually happened, and a screenshot of the problem.'],
      ['How do I get paid?', PAY],
    ],
  },
  {
    path: '/jobs/surveys',
    tab: 'Paid surveys',
    title: 'Paid surveys in Nigeria: answer questions and earn | OgaPay',
    description: 'Paid surveys in Nigeria on OgaPay: answer short questions for businesses and earn Naira. Honest answers only, paid when approved.',
    eyebrow: 'Surveys',
    h1: 'Paid surveys in Nigeria',
    category: 'SURVEY',
    intro: [
      'Businesses use OgaPay surveys to hear from real Nigerians: what you buy, what you would pay for, and what you think of their product.',
      'Answer honestly and in full sentences. Short or copied answers are rejected.',
    ],
    faqs: [
      ['How long do surveys take?', 'Most take 2 to 10 minutes. The job page says what is asked.'],
      ['Do I need to pay for a survey?', FREE],
      ['How do I get paid?', PAY],
    ],
  },
  {
    path: '/jobs/design',
    tab: 'Design jobs',
    title: 'Graphic design jobs in Nigeria: logos, flyers and more | OgaPay',
    description: 'Graphic design jobs in Nigeria on OgaPay: logos, flyers and social media designs for real businesses, paid in Naira or USDC through escrow.',
    eyebrow: 'Design jobs',
    h1: 'Graphic design jobs in Nigeria',
    category: 'DESIGN',
    intro: [
      'Businesses post design work on OgaPay: logos, flyers, product photos and social media graphics. Some are contests where the best design wins.',
      'The money is held before you start, so you are paid when your design is approved. Use only images you made or are free to use.',
    ],
    faqs: [
      ['Can I sell my design services too?', 'Yes. You can list a service in the OgaPay Store, and buyers pay through escrow.'],
      ['How do I get paid?', PAY],
    ],
  },
]

export const seoPageFor = (path: string) => SEO_PAGES.find((p) => p.path === path.replace(/\/+$/, ''))
