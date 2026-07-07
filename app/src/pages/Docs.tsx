import Layout from '../components/Layout'

const DOCS_BASE = 'https://github.com/tomwlee904-sys/Ogapay/tree/main/docs'

const GUIDES = [
  { num: '01', file: '01-user-guide.md', title: 'OgaPay User Guide', desc: 'Complete platform walkthrough — getting started, account setup, worker & poster guides, wallet, communities, store, referrals, withdrawals, and FAQs.', icon: 'book' },
  { num: '02', file: '02-quick-start.md', title: 'Quick Start Guide', desc: 'Get up and running in under 10 minutes — create account, verify email, connect wallet, create your first task, submit your first task, withdraw earnings.', icon: 'rocket' },
  { num: '03', file: '03-beta-tester.md', title: 'Beta Tester Handbook', desc: 'How to test the platform, report bugs, earn rewards for finding issues, testing procedures, beta rules, and feedback submission.', icon: 'bug' },
  { num: '04', file: '04-community-guide.md', title: 'Community Guide', desc: 'Creating and managing communities, community roles and rules, official communities, best practices for admins and members.', icon: 'users' },
  { num: '05', file: '05-store-guide.md', title: 'Store Seller Guide', desc: 'Selling on the OgaPay Store — create products, set pricing, manage orders, deliver work, store analytics, and seller best practices.', icon: 'shopping-cart' },
  { num: '06', file: '06-jobs-hiring.md', title: 'Jobs & Hiring Guide', desc: 'Posting and applying for jobs, the hiring process, job categories, best practices for employers and applicants.', icon: 'briefcase' },
  { num: '07', file: '07-wallet-guide.md', title: 'Wallet & Payments Guide', desc: 'Deposits via Paystack, withdrawals to bank and crypto, escrow system, NGN wallet, USDC wallet, SOL wallet, troubleshooting.', icon: 'wallet' },
  { num: '08', file: '08-admin-handbook.md', title: 'Admin Handbook', desc: 'Platform administration — user management, task moderation, community moderation, store management, vault, analytics, platform settings.', icon: 'shield' },
  { num: '09', file: '09-api-docs.md', title: 'API Documentation', desc: 'Developer API reference — authentication, tasks, wallet, store, communities, referrals, notifications, AI services, webhooks, error codes.', icon: 'code' },
  { num: '10', file: '10-pulse-ai-guide.md', title: 'Pulse AI Guide', desc: 'OgaPay Pulse AI assistant — what it is, supported commands, task creation assistance, navigation, wallet help, campaign assistance.', icon: 'sparkles' },
]

export default function Docs() {
  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px 60px' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 900, margin: '0 0 4px' }}>
          Documentation
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 24px' }}>
          Complete guides for using the OgaPay platform.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {GUIDES.map(g => (
            <a
              key={g.num}
              href={`${DOCS_BASE}/${g.file}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '16px 18px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(var(--accent-rgb),0.08)',
                  display: 'grid', placeItems: 'center',
                  flexShrink: 0, fontSize: 16, color: 'var(--accent)'
                }}>
                  <i className={`ti ti-${g.icon}`} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    {g.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                    {g.desc}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, paddingTop: 2 }}>
                  #{g.num}
                </div>
              </div>
            </a>
          ))}
        </div>

        <div style={{
          marginTop: 32, padding: '16px 18px', borderRadius: 12,
          background: 'rgba(var(--accent-rgb),0.04)',
          border: '1px solid rgba(var(--accent-rgb),0.12)',
          fontSize: 12, color: 'var(--text2)', lineHeight: 1.6
        }}>
          <strong><i className="ti ti-book" style={{marginRight:4}} /> All guides are also available on GitHub:</strong>{' '}
          <a href={DOCS_BASE} target="_blank" rel="noopener noreferrer"
             style={{ color: 'var(--accent)', fontWeight: 600 }}>
            github.com/tomwlee904-sys/Ogapay/tree/main/docs
          </a>
        </div>
      </div>
    </Layout>
  )
}
