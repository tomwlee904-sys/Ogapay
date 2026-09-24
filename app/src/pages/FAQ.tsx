import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

/* Help centre. Answers describe how the platform actually behaves today
   (fees, limits and bonuses match the backend), so keep them in sync when
   those rules change. */

type QA = { q: string; a: string }
type Topic = { id: string; title: string; items: QA[] }

const TOPICS: Topic[] = [
  {
    id: 'basics', title: 'Platform basics', items: [
      { q: 'What is OgaPay?', a: 'OgaPay is a task marketplace. People and businesses post paid tasks and jobs; workers complete them, submit proof and get paid from escrow once the work is approved. You can hold your balance in Naira or USDC and withdraw to a Nigerian bank account or a Solana wallet.' },
      { q: 'How does it work end to end?', a: 'A poster funds a task, and the budget is locked in escrow. Workers apply and submit proof. The poster approves, rejects or disputes each submission. Approved work is paid straight from escrow into the worker\'s wallet, and any unused budget goes back to the poster.' },
      { q: 'What do I need to get started?', a: 'An OgaPay account (email or Google sign-in) is enough to browse and apply for most tasks. Some tasks ask for KYC, a minimum OgaScore, a connected wallet or a verified X account. To withdraw money you need at least Tier 1 KYC.' },
      { q: 'Can I earn and post jobs from the same account?', a: 'Yes. One account can do both. Your earnings, the jobs you post and your wallet all live in the same place.' },
      { q: 'Is OgaPay only for Nigeria?', a: 'Anyone can sign up and earn. Naira deposits and bank withdrawals work with Nigerian banks; everyone else can deposit and withdraw in USDC on Solana.' },
    ],
  },
  {
    id: 'earning', title: 'Earning and tasks', items: [
      { q: 'What kinds of tasks can I do?', a: 'Social tasks (follows, reposts, comments, community joins), app testing, surveys, research, data entry, writing, translation, design and video review. Each card shows the reward per worker, how many places are left, requirements and time left.' },
      { q: 'How do I complete a task?', a: 'Open the job, read the brief carefully, do the work, then press Apply and submit the proof it asks for, such as a screenshot, link or file. Check the requirements first: submissions that don\'t follow the brief are rejected.' },
      { q: 'What does "Available for me" show?', a: 'It hides jobs that are full, past their deadline, jobs you have already submitted to, and jobs whose requirements you don\'t meet.' },
      { q: 'When do I get paid?', a: 'As soon as the poster approves your submission, the reward moves from escrow into your OgaPay wallet. If every place on a task is filled, the poster has 24 hours to review; submissions still unreviewed after that cooldown are approved automatically.' },
      { q: 'What if a poster never reviews my work?', a: 'Submissions left unreviewed for 24 hours are flagged to the moderation team, and when a task\'s places are all filled the 24-hour cooldown approves pending work automatically.' },
      { q: 'My submission was rejected. What can I do?', a: 'Read the poster\'s note first. If you believe you followed the brief, open a dispute from the job page and an admin will review the evidence.' },
    ],
  },
  {
    id: 'kyc', title: 'KYC, OgaScore and trust', items: [
      { q: 'What are the KYC tiers?', a: 'Tier 1 is your NIN. Tier 2 adds your BVN. Tier 3 adds your address and supporting documents. Checks run through Dojah against official records, and each tier raises your limits.' },
      { q: 'Why do I need KYC?', a: 'It keeps the marketplace free of fake accounts. KYC is required to withdraw money and to post tasks, and some tasks are only open to verified workers.' },
      { q: 'What is OgaScore?', a: 'A reputation score out of 100. You gain points by connecting and verifying accounts: LinkedIn, NIN, BVN and Human Verified are worth 10 each, X and GitHub 8 each, Google and Telegram 5 each. Posters can require a minimum OgaScore, so a higher score opens better-paid work.' },
      { q: 'What is "Human Verified"?', a: 'A one-time check through Very that confirms you are a unique real person. It adds to your OgaScore and helps keep bots out.' },
      { q: 'How do I report a user or a task?', a: 'Use Report on the job page, profile or submission. Reports go to the moderation team for review.' },
    ],
  },
  {
    id: 'posting', title: 'Creating and managing jobs', items: [
      { q: 'How do I post a job?', a: 'Go to Create, pick Custom job, X campaign or Quick task, write the brief, set the reward and number of places, then fund it from your wallet. The job goes live as soon as it is funded.' },
      { q: 'What is the difference between Challenge and Selection mode?', a: 'Challenge pays every approved submission, up to the number of places you set. Selection is for one-off projects: people apply, and you choose one person to do the work and receive the full reward.' },
      { q: 'Can I limit who takes part?', a: 'Yes. You can require KYC, a minimum OgaScore, a minimum worker rank, a connected wallet or a verified X account, and you can post only to your own community.' },
      { q: 'How do I review submissions?', a: 'Open the job and choose View submissions (or use Manage jobs). Approve pays the worker immediately; Reject returns that place to the pool with your note.' },
      { q: 'Can I cancel a job?', a: 'Yes, as long as nobody has started on it. The escrowed budget is returned to your wallet. If people have already submitted, review their work first.' },
      { q: 'Can I edit a job after posting?', a: 'You can request edits to the description, requirements and deadline. The reward can\'t be lowered once people have started applying.' },
    ],
  },
  {
    id: 'fees', title: 'Escrow and fees', items: [
      { q: 'How does escrow protect me?', a: 'When a job is funded, reward × places is locked in escrow. Workers can see the money is there before they start, and posters only pay for work they approve.' },
      { q: 'What are the fees?', a: 'Posters pay a 10% platform fee on the task budget, charged once when the job is funded. Workers keep 100% of the reward shown. Withdrawals cost 1.5% (minimum ₦100) to a bank account and 1% to a crypto wallet. Transfers between OgaPay users are free.' },
      { q: 'Worked example', a: 'You want 100 people to follow and repost a launch at ₦200 each. Rewards come to ₦20,000, the fee is ₦2,000, so you fund ₦22,000. Each approved worker receives the full ₦200.' },
      { q: 'What happens to unused budget?', a: 'If a job expires or is cancelled, whatever is left in escrow goes back to your wallet.' },
    ],
  },
  {
    id: 'wallet', title: 'Deposits and wallet', items: [
      { q: 'How do I add money?', a: 'Pay in Naira by card or bank transfer (Paystack or Flutterwave), or use your personal virtual account number from the Wallet page. For crypto, send USDC from a connected Phantom, Backpack or Solflare wallet; SOL can be swapped to USDC as you deposit.' },
      { q: 'Which currencies does my wallet hold?', a: 'Naira (NGN) and USDC. You can choose which one to display in Settings.' },
      { q: 'How do I connect a crypto wallet?', a: 'Go to Settings, choose Connect wallet and sign a short message with your wallet. Signing proves ownership; OgaPay never asks for your seed phrase or private key.' },
      { q: 'Is my money safe?', a: 'Balances sit on OgaPay\'s ledger with every movement recorded. Withdrawals need KYC, you can add two-factor authentication and OTP confirmation, and you can see and remove paired devices in Settings.' },
    ],
  },
  {
    id: 'withdrawals', title: 'Withdrawals', items: [
      { q: 'How do I withdraw?', a: 'Open Wallet, choose Withdraw, pick a saved bank account (NGN) or enter a Solana address (USDC or SOL), enter the amount and confirm.' },
      { q: 'What are the limits?', a: 'The minimum is ₦5,000 or its equivalent. The maximum per withdrawal depends on your KYC tier: ₦10,000 at Tier 1, ₦20,000 at Tier 2 and ₦200,000 at Tier 3.' },
      { q: 'How long does it take?', a: 'Bank withdrawals are processed within 24 hours, and usually much sooner. Crypto withdrawals arrive once the Solana transaction confirms, typically within minutes.' },
      { q: 'My withdrawal failed. Where is my money?', a: 'Funds are only locked while a withdrawal is processing. If the payout fails, the lock is released and the money is available in your wallet again.' },
    ],
  },
  {
    id: 'referrals', title: 'Referrals and bonuses', items: [
      { q: 'How do referrals pay?', a: 'Share your referral link. You earn ₦1,000 when a friend you invited verifies their email or passes Tier 1 KYC, and another ₦500 when they complete their first approved task.' },
      { q: 'Is there a limit?', a: 'Referral bonuses are paid for up to 20 referrals per person. This stops people farming the programme with fake accounts.' },
      { q: 'Do new users get a bonus?', a: 'Yes. New users receive a ₦1,000 welcome bonus once they pass Tier 1 KYC.' },
    ],
  },
  {
    id: 'vault', title: 'Vault and $PAY', items: [
      { q: 'What is the Vault?', a: 'The Vault shares platform fees with $PAY holders. Every 12 hours, at 00:00 and 12:00 UTC, the Vault pool is split between holders according to how much $PAY they hold.' },
      { q: 'How do I claim Vault payouts?', a: 'Open Vault and choose Claim. You need a connected Solana wallet. Your pending payouts are added to your OgaPay USDC balance, and you can see every distribution in Vault history.' },
      { q: 'Are Vault payouts guaranteed?', a: 'No. They depend on the fees the platform actually earns, so they go up and down with activity. Nothing on OgaPay is financial advice.' },
    ],
  },
  {
    id: 'communities', title: 'Communities', items: [
      { q: 'What are communities?', a: 'Groups built around a niche or an audience, with members, a group chat, a leaderboard and a feed of open and completed jobs.' },
      { q: 'How do I join one?', a: 'Open Communities and choose Join. Open communities let you in straight away; private ones send your request to the admins.' },
      { q: 'Can I create my own and post jobs to it?', a: 'Yes. Create a community, invite people, and share paid jobs with your members first so your next task starts with people you already trust.' },
    ],
  },
  {
    id: 'developers', title: 'Developers and API', items: [
      { q: 'Can my app or AI agent use OgaPay?', a: 'Yes. The REST API lets you create tasks, collect submissions and approve work programmatically. See the Developer page and the Docs.' },
      { q: 'How do I get an API key?', a: 'Turn on Developer Mode in Settings, then create a key. Keys start with oga_ and are shown only once, so store yours safely. Each key can have its own rate limit and monthly spend cap.' },
      { q: 'I think my key leaked. What now?', a: 'Revoke it in Settings straight away and create a new one. Revoked keys stop working immediately.' },
    ],
  },
]

const TOTAL = TOPICS.reduce((n, t) => n + t.items.length, 0)
const pad = (n: number) => String(n).padStart(2, '0')

export default function FAQ() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [active, setActive] = useState(TOPICS[0].id)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const q = search.trim().toLowerCase()
  const shown = useMemo(() => TOPICS
    .map(t => ({ ...t, items: q ? t.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)) : t.items }))
    .filter(t => t.items.length > 0), [q])
  const shownCount = shown.reduce((n, t) => n + t.items.length, 0)

  // Highlight the topic currently in view
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) setActive(visible[0].target.id.replace('topic-', ''))
    }, { rootMargin: '-90px 0px -60% 0px' })
    Object.values(sectionRefs.current).forEach(el => el && io.observe(el))
    return () => io.disconnect()
  }, [shown])

  // Open a question from the URL hash, e.g. /faq#withdrawals
  useEffect(() => {
    const id = window.location.hash.replace('#', '')
    if (id && TOPICS.some(t => t.id === id)) setTimeout(() => jump(id), 200)
  }, [])

  const jump = (id: string) => {
    const el = sectionRefs.current[id]
    if (!el) return
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' })
    setActive(id)
  }

  return (
    <Layout>
      <style>{`
        .fq-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
        .fq-brand{display:flex;gap:16px;align-items:flex-start}
        .fq-icon{width:48px;height:48px;border-radius:14px;border:1px solid var(--border);background:var(--card2);display:grid;place-items:center;font-size:22px;color:var(--text2);flex-shrink:0}
        .fq-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:26px 0 22px;padding-bottom:22px;border-bottom:1px solid var(--border);flex-wrap:wrap}
        .fq-bar .ui-search{flex:1;max-width:440px}
        .fq-count{font:400 10px var(--font-mono);color:var(--text2);letter-spacing:.04em}
        .fq-layout{display:grid;grid-template-columns:230px minmax(0,1fr);gap:28px;align-items:start}
        .fq-side{position:sticky;top:calc(var(--nav-h,64px) + 20px)}
        .fq-side-head{display:flex;justify-content:space-between;padding:0 10px 10px;font:400 9px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--text2)}
        .fq-topic{width:100%;display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;border:0;background:none;cursor:pointer;font:400 12.5px 'Geist',system-ui,sans-serif;color:var(--text2);text-align:left}
        .fq-topic .n{font:400 10px var(--font-mono);color:var(--text3);width:18px}
        .fq-topic .c{margin-left:auto;font:400 10px var(--font-mono);color:var(--text3)}
        .fq-topic:hover{color:var(--text)}
        .fq-topic.on{background:var(--card2);color:var(--text);font-weight:500}
        .fq-sec{margin-bottom:30px;scroll-margin-top:90px}
        .fq-sec-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
        .fq-sec-head h2{margin:0;font-size:17px;font-weight:600;letter-spacing:-.02em}
        .fq-list{border:1px solid var(--border);border-radius:16px;background:var(--card);overflow:hidden}
        .fq-item+.fq-item{border-top:1px solid var(--border)}
        .fq-q{width:100%;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:15px 16px;border:0;background:none;cursor:pointer;font:500 13.5px 'Geist',system-ui,sans-serif;color:var(--text);text-align:left}
        .fq-q i{font-size:15px;color:var(--text3);transition:transform .2s ease;flex-shrink:0}
        .fq-item.open .fq-q i{transform:rotate(180deg)}
        .fq-q:focus-visible{outline:2px solid var(--text);outline-offset:-2px;border-radius:12px}
        .fq-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .25s ease}
        .fq-item.open .fq-a{grid-template-rows:1fr}
        .fq-a > div{overflow:hidden}
        .fq-a p{margin:0;padding:0 16px 16px;font-size:13.5px;line-height:1.7;color:var(--text2)}
        .fq-chips{display:none}
        .fq-help{margin-top:12px;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px;flex-wrap:wrap}
        @media(max-width:860px){
          .fq-layout{grid-template-columns:1fr}
          .fq-side{display:none}
          .fq-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:18px;scrollbar-width:none;position:sticky;top:var(--nav-h,64px);background:var(--bg);z-index:5;padding-top:8px}
          .fq-chips::-webkit-scrollbar{display:none}
          .fq-chips button{flex-shrink:0;height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--border);background:var(--card);font:500 12px 'Geist',system-ui,sans-serif;color:var(--text2);cursor:pointer}
          .fq-chips button.on{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
        }
        @media(prefers-reduced-motion:reduce){.fq-a{transition:none}.fq-q i{transition:none}}
      `}</style>

      <div className="ui-page" style={{ paddingTop: 28 }}>
        <header className="fq-head">
          <div className="fq-brand">
            <span className="fq-icon" aria-hidden="true"><i className="ti ti-help" /></span>
            <div>
              <span className="ui-eyebrow">Help center</span>
              <h1 className="ui-title" style={{ marginTop: 4 }}>Frequently asked questions</h1>
              <p className="ui-sub">Answers about jobs, payments, rewards and working with OgaPay.</p>
            </div>
          </div>
          <Link to="/support" className="ui-btn ui-btn-ghost"><i className="ti ti-headset" /> Contact support</Link>
        </header>

        <div className="fq-bar">
          <div className="ui-search">
            <i className="ti ti-search" />
            <input className="ui-input" type="search" placeholder="Search questions and answers..." aria-label="Search the FAQ"
              value={search} onChange={e => { setSearch(e.target.value); setOpen(null) }} />
          </div>
          <span className="fq-count">{q ? `${shownCount} of ${TOTAL} answers` : `${TOTAL} answers · ${TOPICS.length} topics`}</span>
        </div>

        <nav className="fq-chips" aria-label="Topics">
          {shown.map(t => <button key={t.id} className={active === t.id ? 'on' : ''} onClick={() => jump(t.id)}>{t.title}</button>)}
        </nav>

        <div className="fq-layout">
          <aside className="fq-side" aria-label="Browse topics">
            <div className="fq-side-head"><span>Browse topics</span><span>{pad(shown.length)}</span></div>
            {shown.map((t) => (
              <button key={t.id} className={`fq-topic${active === t.id ? ' on' : ''}`} onClick={() => jump(t.id)}>
                <span className="n">{pad(TOPICS.findIndex(x => x.id === t.id) + 1)}</span>
                {t.title}
                <span className="c">{t.items.length}</span>
              </button>
            ))}
          </aside>

          <div>
            {shown.length === 0 && (
              <div className="ui-empty">
                <b style={{ color: 'var(--text)' }}>No answers match “{search}”</b>
                <p style={{ margin: '6px 0 16px' }}>Try other words, or ask the team directly.</p>
                <Link to="/support" className="ui-btn ui-btn-dark">Contact support</Link>
              </div>
            )}
            {shown.map(t => (
              <section key={t.id} id={`topic-${t.id}`} className="fq-sec" ref={el => { sectionRefs.current[t.id] = el }}>
                <div className="fq-sec-head">
                  <h2>{t.title}</h2>
                  <span className="fq-count">{t.items.length} {t.items.length === 1 ? 'answer' : 'answers'}</span>
                </div>
                <div className="fq-list">
                  {t.items.map(item => {
                    const key = t.id + ':' + item.q
                    const isOpen = open === key || (!!q && t.items.length <= 3)
                    return (
                      <div key={key} className={`fq-item${isOpen ? ' open' : ''}`}>
                        <button className="fq-q" aria-expanded={isOpen} onClick={() => setOpen(open === key ? null : key)}>
                          {item.q}<i className="ti ti-chevron-down" />
                        </button>
                        <div className="fq-a" role="region"><div><p>{item.a}</p></div></div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}

            <div className="ui-card fq-help">
              <div>
                <b style={{ fontSize: 14 }}>Still stuck?</b>
                <p className="ui-sub" style={{ margin: '4px 0 0' }}>Message the team on Telegram or email support@ogapay.app.</p>
              </div>
              <div className="ui-actions">
                <a className="ui-btn ui-btn-ghost" href="https://t.me/ogapay" target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" /> Telegram</a>
                <a className="ui-btn ui-btn-dark" href="mailto:support@ogapay.app"><i className="ti ti-mail" /> Email us</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
