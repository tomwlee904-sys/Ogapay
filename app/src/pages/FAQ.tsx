import { useState, useMemo } from 'react'
import Layout from '../components/Layout'

const ACCENT = '#191C6B'

interface Article { q: string; a: string }
interface Category { id: string; icon: string; label: string; count: number }
interface TabData { id: string; label: string; categories: Category[]; articles: Record<string, Article[]> }

const data: TabData[] = [
  {
    id: 'workers',
    label: 'For Workers',
    categories: [
      { id: 'getting-started', icon: 'ti ti-rocket', label: 'Getting Started', count: 5 },
      { id: 'earnings-workers', icon: 'ti ti-wallet', label: 'Earnings & Rewards', count: 4 },
      { id: 'tasks-submissions', icon: 'ti ti-clipboard-check', label: 'Tasks & Submissions', count: 3 },
      { id: 'withdrawals', icon: 'ti ti-credit-card', label: 'Withdrawals', count: 2 },
      { id: 'account-security-w', icon: 'ti ti-shield-check', label: 'Account & Security', count: 3 },
      { id: 'communities-w', icon: 'ti ti-users', label: 'Communities', count: 2 },
    ],
    articles: {
      'getting-started': [
        { q: 'How do I get started on OgaPay?', a: 'Simply sign up using your email or Google account, complete your profile, and you are ready to start earning. Head to the Tasks page to browse available jobs. No special skills needed for most tasks — just follow the instructions and submit proof.' },
        { q: 'Do I need a wallet to start?', a: 'Yes. You need a crypto wallet to receive payments. We support Phantom and Backpack wallets for USDC and SOL, and bank transfer for NGN withdrawals. Connect your wallet in your profile settings and you are good to go.' },
        { q: 'What kind of tasks can I do?', a: 'There are many types of tasks on OgaPay — social media engagements (follow, repost, comment), content creation, web research, app testing, design contests, video reviews, data entry, and more. Each task shows the reward, deadline, and requirements clearly.' },
        { q: 'Can I work from my phone?', a: 'Yes. OgaPay is fully mobile-friendly. You can browse tasks, submit work, withdraw earnings, and manage your account from any phone browser. No app download needed.' },
        { q: 'Is OgaPay available outside Nigeria?', a: 'Yes. OgaPay is global. Workers from any country can sign up and earn. However, NGN bank transfers are only available for Nigerian bank accounts. International users can withdraw in USDC or SOL.' },
      ],
      'earnings-workers': [
        { q: 'How do I earn on OgaPay?', a: 'You earn by completing tasks posted by creators. Browse available tasks, complete the required action (follow, comment, test, review, etc.), submit proof through the submission form, and once the creator approves it, the reward is credited to your wallet.' },
        { q: 'When do I receive rewards?', a: 'Rewards are credited to your wallet after the task creator approves your submission. Most approvals happen within 24 hours. Some tasks have auto-approval after a set time if the creator does not review it.' },
        { q: 'How are earnings calculated?', a: 'Each task shows its reward amount upfront. There are no hidden charges. You earn exactly what is displayed. Some tasks have bonuses for early submissions, high quality work, or referrals.' },
        { q: 'Can I track my earnings?', a: 'Yes. Your dashboard shows everything — total earned, pending payments, available balance, and a breakdown by task, referrals, and bonuses. You can also see your earnings history in your profile.' },
      ],
      'tasks-submissions': [
        { q: 'How do I complete a task?', a: 'Click on any task to open the details. Read the instructions carefully. Complete the required action (e.g. follow an X account, join a Telegram group, test an app). Then click "Apply" and submit proof like screenshots or links.' },
        { q: 'What happens after I submit?', a: 'Your submission goes to the task creator for review. They can approve it, request changes, or reject it. If approved, the reward is added to your wallet automatically.' },
        { q: 'Can I withdraw my submission?', a: 'Once submitted, you cannot withdraw or edit it. Make sure you have completed all requirements before clicking Submit. If you made a mistake, contact the creator through the task page.' },
      ],
      'withdrawals': [
        { q: 'How do withdrawals work?', a: 'Go to your Wallet, click Withdraw, choose your payment method (NGN bank transfer or USDC/SOL crypto), enter the amount, and confirm. NGN withdrawals go to your bank account. USDC withdrawals go to your Phantom or Backpack wallet.' },
        { q: 'How long do withdrawals take?', a: 'NGN bank transfers typically take 1 to 3 business days. Crypto withdrawals (USDC/SOL) are usually processed within a few hours, sometimes instantly depending on network conditions.' },
      ],
      'account-security-w': [
        { q: 'How do I verify my account?', a: 'Go to Settings > KYC Verification and submit a valid government ID (NIN, passport, driver license). Upload a clear photo of the ID and a selfie. Verification usually takes 24 to 48 hours.' },
        { q: 'Can I change my username?', a: 'Yes. You can change your username once every 30 days from your profile settings. Choose something professional — this is what creators and other users see.' },
        { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page. Enter your registered email. You will receive a reset link. Follow the link to set a new password. If you do not see the email, check your spam folder.' },
      ],
      'communities-w': [
        { q: 'How do I join a community?', a: 'Go to the Communities page, browse the list, and click Join on any community that interests you. Some communities are open and you join instantly. Others require admin approval.' },
        { q: 'Can I create my own community?', a: 'Yes. Any verified user can create a community. Go to Communities, click Create Community, set a name, description, and cover image. You can set rules and manage members.' },
      ],
    },
  },
  {
    id: 'posters',
    label: 'For Posters',
    categories: [
      { id: 'creating-tasks', icon: 'ti ti-file-plus', label: 'Creating Tasks', count: 4 },
      { id: 'managing-submissions', icon: 'ti ti-list-check', label: 'Managing Submissions', count: 3 },
      { id: 'payments-escrow', icon: 'ti ti-shield-lock', label: 'Payments & Escrow', count: 3 },
      { id: 'account-security-p', icon: 'ti ti-shield-check', label: 'Account & Security', count: 3 },
    ],
    articles: {
      'creating-tasks': [
        { q: 'How do I create a task?', a: 'Click "Create Job" from the sidebar or the Tasks page. Fill in the title, description, category, reward amount, number of slots, and requirements. Upload any reference files if needed. Click Submit and the task goes live immediately.' },
        { q: 'How do I set the right reward?', a: 'Research similar tasks on OgaPay to see what others are paying. Higher rewards attract more and better submissions. You can also set a smaller reward for simple actions like follows and likes, and higher rewards for skilled work like design or testing.' },
        { q: 'Can I edit a task after posting?', a: 'Yes. You can edit the description, requirements, and deadline from the Manage Jobs page. However, you cannot reduce the reward amount after workers have started applying.' },
        { q: 'How do I attract quality submissions?', a: 'Write clear instructions, set realistic deadlines, include examples of what good work looks like, and use the proof requirements field to specify exactly what you need (screenshot, link, file).' },
      ],
      'managing-submissions': [
        { q: 'How do I review submissions?', a: 'Go to the task from Manage Jobs and click "View Submissions". You will see each worker\'s proof, message, and timestamp. Click Approve to release payment or Reject with a reason.' },
        { q: 'What happens when I approve a submission?', a: 'The worker receives the reward in their wallet. The funds are deducted from the escrow balance you deposited when creating the task.' },
        { q: 'Can I request revisions?', a: 'Yes. Instead of rejecting, you can send a revision request telling the worker what to improve. They can resubmit within the task deadline.' },
      ],
      'payments-escrow': [
        { q: 'How does escrow work?', a: 'When you create a task, the total budget (reward × number of slots) is locked in escrow. This ensures workers that funds are available. When you approve a submission, the reward is released from escrow to the worker.' },
        { q: 'What happens to unclaimed escrow?', a: 'If a task expires or is cancelled, remaining escrow funds are returned to your wallet. Unclaimed rewards from rejected submissions also go back to you.' },
        { q: 'Can I cancel a task and get my money back?', a: 'Yes, but only if no slots have been filled. If workers have already submitted, you need to review and pay them before cancelling the remaining slots.' },
      ],
      'account-security-p': [
        { q: 'Do I need KYC to post tasks?', a: 'Yes. To create tasks you must complete KYC verification. This protects both posters and workers from fraud. Submit your ID and selfie from Settings > KYC.' },
        { q: 'How do I connect my wallet?', a: 'Go to Settings > Wallet and connect Phantom or Backpack wallet. You need a wallet to fund task escrows and receive refunds.' },
        { q: 'Can I have both worker and poster accounts?', a: 'Yes. You can switch between posting tasks and completing tasks from the same account. Your earnings and tasks are managed separately in your dashboard.' },
      ],
    },
  },
  {
    id: 'everyone',
    label: 'For Everyone',
    categories: [
      { id: 'referrals', icon: 'ti ti-affiliate', label: 'Referrals', count: 2 },
      { id: 'kyc-verification', icon: 'ti ti-id', label: 'KYC & Verification', count: 3 },
      { id: 'wallet-crypto', icon: 'ti ti-coin', label: 'Wallet & Crypto', count: 3 },
      { id: 'trust-safety', icon: 'ti ti-shield', label: 'Trust & Safety', count: 2 },
      { id: 'communities-e', icon: 'ti ti-users', label: 'Communities', count: 2 },
    ],
    articles: {
      'referrals': [
        { q: 'How do referrals work?', a: 'Share your unique referral link from your profile or wallet page. When someone signs up using your link and completes their first task, you earn a referral bonus. The bonus is credited automatically to your wallet.' },
        { q: 'How much can I earn from referrals?', a: 'You earn 10% of all rewards earned by your referred users in their first 30 days on the platform. There is no limit on how many people you can refer. Share your link on social media, WhatsApp, or Telegram.' },
      ],
      'kyc-verification': [
        { q: 'What is KYC?', a: 'KYC (Know Your Customer) is a verification process that confirms your identity. It helps us prevent fraud, comply with regulations, and keep the platform safe for everyone. You will need to upload a valid government ID and take a selfie.' },
        { q: 'How do I complete KYC?', a: 'Go to Settings > KYC Verification. Choose your ID type (NIN, International Passport, or Driver License). Upload a clear photo of the front and back, then take a selfie. Submit and wait for approval, usually within 24 to 48 hours.' },
        { q: 'Why is my KYC taking long?', a: 'Most verifications are processed within 48 hours. If yours is taking longer, ensure your ID photo is clear and not blurred. Make sure your full face is visible in the selfie. Contact support if it has been more than 3 days.' },
      ],
      'wallet-crypto': [
        { q: 'Which wallets does OgaPay support?', a: 'OgaPay supports Phantom and Backpack wallets for crypto transactions. You can connect your wallet from the Settings page. For NGN transactions, you can link your Nigerian bank account for withdrawals.' },
        { q: 'How do I connect my wallet?', a: 'Go to Settings > Wallet. Click "Connect Wallet" and choose Phantom or Backpack. Follow the prompts to authorize the connection. Your wallet address will be saved and displayed on your profile.' },
        { q: 'What cryptocurrencies does OgaPay use?', a: 'OgaPay primarily uses USDC (a stablecoin pegged to the US dollar) and SOL (Solana) for transactions. You can choose your preferred currency when making withdrawals.' },
      ],
      'trust-safety': [
        { q: 'Is OgaPay safe to use?', a: 'Yes. OgaPay uses escrow to protect both workers and posters. Funds are locked until work is approved. We also require KYC for posters and have a dispute resolution system. Your personal data is encrypted and never shared without your consent.' },
        { q: 'How do I report a problem?', a: 'If you encounter a suspicious user, incomplete payment, or any violation of terms, click "Report" on the relevant task, user profile, or submission. You can also contact support at support@ogapay.com or through our Telegram group.' },
      ],
      'communities-e': [
        { q: 'What are OgaPay communities?', a: 'Communities are groups where users with similar interests connect, share tips, and collaborate. You can join communities for Nigerian earners, designers, writers, crypto enthusiasts, and more. Each community has its own feed and activities.' },
        { q: 'How do I create a community?', a: 'Anyone verified can create a community. Go to the Communities page, click "Create Community", give it a name, short description, and a cover image. Set your community rules and start inviting members.' },
      ],
    },
  },
]

const popularArticles: { title: string; category: string }[] = [
  { title: 'How do I earn on OgaPay?', category: 'Earnings & Rewards' },
  { title: 'How do withdrawals work?', category: 'Withdrawals' },
  { title: 'How do referrals work?', category: 'Referrals' },
  { title: 'What is KYC and why do I need it?', category: 'KYC & Verification' },
  { title: 'How does escrow work?', category: 'Payments & Escrow' },
  { title: 'How do I create a task?', category: 'Creating Tasks' },
]

export default function FAQ() {
  const [search, setSearch] = useState('')
  const [activeTabId, setActiveTabId] = useState('workers')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [openQ, setOpenQ] = useState<string | null>(null)

  const activeTab = data.find(t => t.id === activeTabId) || data[0]

  // Search filtering across all tabs
  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const results: { tab: string; catId: string; catLabel: string; article: Article }[] = []
    data.forEach(tab => {
      Object.entries(tab.articles).forEach(([catId, articles]) => {
        const cat = tab.categories.find(c => c.id === catId)
        articles.forEach(article => {
          const match = article.q.toLowerCase().includes(search.toLowerCase()) ||
            article.a.toLowerCase().includes(search.toLowerCase())
          if (match) {
            results.push({ tab: tab.label, catId, catLabel: cat?.label || '', article })
          }
        })
      })
    })
    return results
  }, [search])

  const toggleCat = (catId: string) => {
    setExpandedCat(expandedCat === catId ? null : catId)
    setOpenQ(null)
  }

  const toggleQ = (q: string) => {
    setOpenQ(openQ === q ? null : q)
  }

  // Find article content for popular articles
  const findArticle = (title: string): Article | null => {
    for (const tab of data) {
      for (const catArticles of Object.values(tab.articles)) {
        const found = catArticles.find(a => a.q === title)
        if (found) return found
      }
    }
    return null
  }

  return (
    <Layout>
      <style>{`
        .faq-page{max-width:100%!important;padding:0}
        .faq-container{width:100%;max-width:900px;margin:0 auto;padding:0 16px 48px}

        /* ── Hero ── */
        .faq-hero{width:100%;background:linear-gradient(135deg,#f0f4ff,#e8ecf8);padding:48px 20px;text-align:center}
        [data-theme="dark"] .faq-hero{background:linear-gradient(135deg,rgba(25,28,107,.15),rgba(25,28,107,.08))}
        .faq-hero h1{font-family:Outfit;font-size:36px;font-weight:900;margin:0 0 8px;color:${ACCENT}}
        .faq-hero p{color:var(--text2);font-size:14px;margin:0 auto 24px;max-width:560px;line-height:1.5}
        .faq-search-wrap{max-width:500px;margin:0 auto;position:relative}
        .faq-search-wrap i{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:18px;pointer-events:none}
        .faq-search-wrap input{width:100%;height:50px;padding:0 20px 0 48px;border:none;border-radius:14px;background:#fff;font-size:14px;outline:none;box-shadow:0 4px 20px rgba(25,28,107,.08);box-sizing:border-box}
        [data-theme="dark"] .faq-search-wrap input{background:var(--card);color:var(--text);box-shadow:0 4px 20px rgba(0,0,0,.2)}
        .faq-search-wrap input:focus{box-shadow:0 4px 24px rgba(25,28,107,.15)}

        /* ── Tabs ── */
        .faq-tabs{display:flex;gap:6px;justify-content:center;margin:24px 0 28px;flex-wrap:wrap}
        .faq-tab{padding:10px 24px;border-radius:999px;border:1.5px solid var(--border);background:var(--card);color:var(--text2);font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit}
        .faq-tab:hover{border-color:${ACCENT};color:${ACCENT}}
        .faq-tab.active{background:${ACCENT};color:#fff;border-color:${ACCENT}}

        /* ── Search results ── */
        .faq-search-results{display:grid;gap:6px;margin-bottom:24px}
        .faq-sr-title{font-size:13px;font-weight:700;color:var(--text2);margin-bottom:8px}
        .faq-sr-item{border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden}
        .faq-sr-q{padding:14px 16px;cursor:pointer;border:0;background:transparent;color:var(--text);font-size:13px;font-weight:700;text-align:left;width:100%;display:flex;align-items:center;gap:8px;font-family:inherit}
        .faq-sr-q:hover{color:${ACCENT}}
        .faq-sr-q i{color:${ACCENT};font-size:16px;flex-shrink:0}
        .faq-sr-badge{font-size:10px;color:var(--text3);background:var(--bg2);padding:2px 8px;border-radius:4px;margin-left:auto;font-weight:600;flex-shrink:0}
        .faq-sr-a{padding:0 16px 14px 40px;font-size:13px;color:var(--text2);line-height:1.6;display:none}
        .faq-sr-item.open .faq-sr-a{display:block}

        /* ── Categories grid ── */
        .faq-cats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:0}
        @media(max-width:768px){.faq-cats{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:480px){.faq-cats{grid-template-columns:1fr}}
        .faq-cat-card{border:1px solid var(--border);border-radius:14px;background:var(--card);padding:18px 16px;cursor:pointer;transition:all .2s;text-align:left;font-family:inherit;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative}
        .faq-cat-card:hover{border-color:${ACCENT};box-shadow:0 4px 16px rgba(25,28,107,.06);transform:translateY(-1px)}
        .faq-cat-card.active{border-color:${ACCENT};background:rgba(25,28,107,.04)}
        .faq-cat-card i{font-size:28px;color:${ACCENT};margin-bottom:8px;display:block}
        .faq-cat-card .fc-label{font-weight:700;font-size:13px;margin-bottom:2px}
        .faq-cat-card .fc-count{font-size:11px;color:var(--text3)}

        /* ── Accordion category articles ── */
        .faq-cat-articles{overflow:hidden;max-height:0;transition:max-height .35s ease,opacity .25s ease;opacity:0;margin-bottom:0}
        .faq-cat-articles.open{max-height:2000px;opacity:1;margin-bottom:14px}
        .faq-cat-articles-inner{display:grid;gap:4px;padding:6px 0 0}
        .faq-article-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:var(--bg2);border:1px solid transparent;cursor:pointer;transition:all .15s;font-family:inherit;width:100%;text-align:left;font-size:13px;color:var(--text);font-weight:600}
        .faq-article-row:hover{border-color:${ACCENT};color:${ACCENT}}
        .faq-article-row i{color:${ACCENT};font-size:14px;flex-shrink:0}
        .faq-article-row .faq-arrow{margin-left:auto;color:var(--text3);font-size:14px;flex-shrink:0;transition:transform .2s}
        .faq-article-row.open .faq-arrow{transform:rotate(90deg)}
        .faq-article-answer{padding:4px 14px 12px 34px;font-size:13px;color:var(--text2);line-height:1.65;display:none}
        .faq-article-row.open + .faq-article-answer{display:block}

        /* ── Popular articles ── */
        .faq-section-title{font-family:Outfit;font-size:18px;font-weight:900;margin:32px 0 14px;display:flex;align-items:center;gap:8px}
        .faq-section-title i{color:${ACCENT};font-size:20px}
        .faq-pop-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
        @media(max-width:480px){.faq-pop-grid{grid-template-columns:1fr}}
        .faq-pop-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;transition:all .2s;cursor:pointer;display:flex;align-items:center;gap:10px}
        .faq-pop-card:hover{border-color:${ACCENT};box-shadow:0 4px 12px rgba(25,28,107,.06)}
        .faq-pop-card i{color:${ACCENT};font-size:18px;flex-shrink:0}
        .faq-pop-card .pop-title{font-size:13px;font-weight:700;flex:1}
        .faq-pop-card .pop-badge{font-size:9px;color:${ACCENT};background:rgba(25,28,107,.08);padding:2px 8px;border-radius:4px;font-weight:700;flex-shrink:0}

        /* ── Contact support ── */
        .faq-support{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:32px}
        @media(max-width:480px){.faq-support{grid-template-columns:1fr}}
        .faq-support-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;text-align:center;transition:all .2s}
        .faq-support-card:hover{border-color:${ACCENT};box-shadow:0 4px 16px rgba(25,28,107,.06)}
        .faq-support-card i{font-size:32px;color:${ACCENT};margin-bottom:8px;display:block}
        .faq-support-card h3{font-size:15px;font-weight:800;margin:0 0 4px}
        .faq-support-card p{font-size:12px;color:var(--text2);margin:0 0 12px;line-height:1.4}
        .faq-support-card a{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:8px;background:${ACCENT};color:#fff;font-size:12px;font-weight:700;text-decoration:none;transition:opacity .2s}
        .faq-support-card a:hover{opacity:.9}

        /* ── Empty search ── */
        .faq-empty{text-align:center;padding:40px 20px;color:var(--text2)}
        .faq-empty i{font-size:36px;color:var(--text3);margin-bottom:10px;display:block}
        .faq-empty h3{font-size:16px;font-weight:800;margin:0 0 4px;color:var(--text)}
        .faq-empty p{font-size:13px;margin:0}
        .faq-empty button{margin-top:12px;padding:8px 16px;border-radius:8px;border:1px solid ${ACCENT};background:transparent;color:${ACCENT};font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
        .faq-empty button:hover{background:${ACCENT};color:#fff}

        @media(max-width:480px){
          .faq-hero{padding:32px 16px}
          .faq-hero h1{font-size:26px}
          .faq-tab{padding:8px 18px;font-size:12px}
        }
      `}</style>

      <div className="faq-page">
        {/* ── Hero ── */}
        <div className="faq-hero">
          <h1>How can we help you?</h1>
          <p>Everything you need to know about tasks, earnings, referrals, communities, and more</p>
          <div className="faq-search-wrap">
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="faq-container">
          {/* ── Tab Switcher ── */}
          <div className="faq-tabs">
            {data.map(tab => (
              <button
                key={tab.id}
                className={`faq-tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTabId(tab.id); setExpandedCat(null); setOpenQ(null); setSearch('') }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Search Results ── */}
          {search.trim() && searchResults && (
            <div className="faq-search-results">
              <div className="faq-sr-title">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
              </div>
              {searchResults.length === 0 ? (
                <div className="faq-empty">
                  <i className="ti ti-search-off" />
                  <h3>No results found</h3>
                  <p>Try a different search term</p>
                  <button onClick={() => setSearch('')}>Clear search</button>
                </div>
              ) : (
                searchResults.map((r, i) => {
                  const key = r.article.q + '-' + i
                  return (
                    <div key={key} className={`faq-sr-item ${openQ === key ? 'open' : ''}`}>
                      <button className="faq-sr-q" onClick={() => toggleQ(key)}>
                        <i className="ti ti-help-circle" />
                        {r.article.q}
                        <span className="faq-sr-badge">{r.catLabel}</span>
                      </button>
                      <div className="faq-sr-a">{r.article.a}</div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ── Category Grid (hide when searching) ── */}
          {!search.trim() && (
            <>
              <div className="faq-cats">
                {activeTab.categories.map(c => (
                  <div key={c.id}>
                    <div
                      className={`faq-cat-card ${expandedCat === c.id ? 'active' : ''}`}
                      onClick={() => toggleCat(c.id)}
                    >
                      <i className={c.icon} />
                      <div className="fc-label">{c.label}</div>
                      <div className="fc-count">{c.count} articles</div>
                    </div>

                    {/* Accordion articles for this category */}
                    <div className={`faq-cat-articles ${expandedCat === c.id ? 'open' : ''}`}>
                      <div className="faq-cat-articles-inner">
                        {(activeTab.articles[c.id] || []).map((article, idx) => {
                          const aKey = c.id + '-' + idx
                          return (
                            <div key={aKey}>
                              <button
                                className={`faq-article-row ${openQ === aKey ? 'open' : ''}`}
                                onClick={() => toggleQ(aKey)}
                              >
                                <i className="ti ti-file-text" />
                                {article.q}
                                <i className="ti ti-chevron-right faq-arrow" />
                              </button>
                              <div className="faq-article-answer">{article.a}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Popular Articles ── */}
              <div className="faq-section-title">
                <i className="ti ti-star-filled" /> Popular Articles
              </div>
              <div className="faq-pop-grid">
                {popularArticles.map((pa, i) => {
                  const article = findArticle(pa.title)
                  return (
                    <div key={i} className="faq-pop-card" onClick={() => {
                      // Find which tab/category this article belongs to and switch to it
                      for (const tab of data) {
                        for (const [catId, articles] of Object.entries(tab.articles)) {
                          const found = articles.find(a => a.q === pa.title)
                          if (found) {
                            setActiveTabId(tab.id)
                            setExpandedCat(catId)
                            setOpenQ(catId + '-' + articles.indexOf(found))
                            setSearch('')
                            return
                          }
                        }
                      }
                    }}>
                      <i className="ti ti-file-text" />
                      <span className="pop-title">{pa.title}</span>
                      <span className="pop-badge">{pa.category}</span>
                    </div>
                  )
                })}
              </div>

              {/* ── Contact Support ── */}
              <div className="faq-section-title" style={{ marginTop: 40 }}>
                <i className="ti ti-headset" /> Still need help?
              </div>
              <div className="faq-support">
                <div className="faq-support-card">
                  <i className="ti ti-brand-telegram" />
                  <h3>Telegram Support</h3>
                  <p>Join our Telegram community for quick help from the team and other users.</p>
                  <a href="https://t.me/ogapay" target="_blank" rel="noopener noreferrer">
                    <i className="ti ti-send" /> Join Telegram
                  </a>
                </div>
                <div className="faq-support-card">
                  <i className="ti ti-mail" />
                  <h3>Email Support</h3>
                  <p>Send us an email and our support team will get back to you within 24 hours.</p>
                  <a href="mailto:support@ogapay.com">
                    <i className="ti ti-mail-forward" /> Email Us
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
