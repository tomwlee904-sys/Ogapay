import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

// Guides: where each topic is explained on the site. These used to link to
// markdown files in our GitHub repository, which is private, so every link
// was a 404 (and some guides described features we don't have).

type Guide = { icon: string; title: string; desc: string; to: string }

const SECTIONS: { title: string; guides: Guide[] }[] = [
  {
    title: 'Getting started',
    guides: [
      { icon: 'rocket', title: 'How OgaPay works', desc: 'What you can do here, what you need to start, and who can use it.', to: '/faq#basics' },
      { icon: 'id-badge-2', title: 'Verify your identity', desc: 'KYC levels, what each one unlocks, OgaScore and Human Verified.', to: '/faq#kyc' },
      { icon: 'wallet', title: 'Your wallet', desc: 'Adding money by card or bank transfer, and the currencies your wallet holds.', to: '/faq#wallet' },
    ],
  },
  {
    title: 'Earning',
    guides: [
      { icon: 'briefcase', title: 'Doing jobs', desc: 'Finding work, sending proof, and when you get paid.', to: '/faq#earning' },
      { icon: 'building-bank', title: 'Withdrawing', desc: 'Sending money to your bank or a crypto wallet, fees and timing.', to: '/faq#withdrawals' },
      { icon: 'users-plus', title: 'Referrals', desc: 'Invite links and bonuses.', to: '/faq#referrals' },
    ],
  },
  {
    title: 'Hiring and selling',
    guides: [
      { icon: 'square-plus', title: 'Posting a job', desc: 'Writing the brief, choosing who can take part, and reviewing work.', to: '/faq#posting' },
      { icon: 'shield-check', title: 'Escrow and fees', desc: 'How your budget is held, the 10% fee, and what happens to unused money.', to: '/faq#fees' },
      { icon: 'building-store', title: 'Buying and selling in the store', desc: 'Buyer protection, when sellers are paid, and reporting a problem.', to: '/faq#store' },
    ],
  },
  {
    title: 'More',
    guides: [
      { icon: 'users', title: 'Communities', desc: 'Joining, creating and running a community.', to: '/faq#communities' },
      { icon: 'shield-lock', title: 'Vault and $PAY', desc: 'How platform fees are shared with $PAY holders every 12 hours.', to: '/faq#vault' },
      { icon: 'code', title: 'Developer API', desc: 'Read-only API keys for your own apps: jobs, submissions and balances.', to: '/developer' },
    ],
  },
]

export default function Docs() {
  return (
    <Layout>
      <style>{`
        .dc-sec{margin-top:var(--sp-7,40px)}
        .dc-sec h2{margin:0 0 12px;font:500 11px/1.4 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--text3)}
        .dc-card{display:flex;gap:14px;align-items:flex-start;padding:16px;text-decoration:none;color:inherit;transition:border-color .15s ease,transform .15s ease}
        .dc-card:hover{border-color:var(--text3);transform:translateY(-1px)}
        .dc-card:focus-visible{outline:2px solid var(--text);outline-offset:2px}
        .dc-ic{width:38px;height:38px;border-radius:10px;background:var(--card2);border:1px solid var(--border);display:grid;place-items:center;font-size:18px;color:var(--text);flex-shrink:0}
        .dc-card b{display:block;font-size:14px;font-weight:600;color:var(--text)}
        .dc-card span{display:block;margin-top:4px;font-size:12.5px;line-height:1.55;color:var(--text2)}
        .dc-help{margin-top:var(--sp-7,40px);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px 20px}
        .dc-help p{margin:0;font-size:13.5px;color:var(--text2)}
        .dc-help b{color:var(--text)}
        @media(max-width:860px){.dc-grid{grid-template-columns:1fr}}
      `}</style>
      <div className="ui-page">
        <header className="ui-head">
          <div>
            <span className="ui-eyebrow"><i className="ti ti-book" /> Guides</span>
            <h1 className="ui-title">How to use OgaPay</h1>
            <p className="ui-sub">Short answers to how everything works, from your first job to withdrawing your earnings.</p>
          </div>
          <div className="ui-actions">
            <Link className="ui-btn ui-btn-ghost" to="/faq">All questions <i className="ti ti-arrow-right" /></Link>
          </div>
        </header>

        {SECTIONS.map((s) => (
          <section key={s.title} className="dc-sec" aria-label={s.title}>
            <h2>{s.title}</h2>
            <div className="ui-grid-3 dc-grid">
              {s.guides.map((g) => (
                <Link key={g.title} to={g.to} className="ui-card dc-card">
                  <span className="dc-ic"><i className={`ti ti-${g.icon}`} aria-hidden="true" /></span>
                  <span style={{ marginTop: 0 }}><b>{g.title}</b><span>{g.desc}</span></span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <div className="ui-card dc-help">
          <p><b>Can't find what you need?</b> Send us a ticket and we'll reply by email.</p>
          <Link className="ui-btn ui-btn-dark" to="/support"><i className="ti ti-lifebuoy" /> Contact support</Link>
        </div>
      </div>
    </Layout>
  )
}
