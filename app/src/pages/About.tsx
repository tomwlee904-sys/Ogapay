import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

// About OgaPay: what the product does today, how money is kept safe, and the
// official channels (so people can tell us from impersonators). Everything here
// should stay true; no user counts until there are numbers worth showing.

const DOES = [
  { icon: 'briefcase', title: 'Earn from tasks', text: 'Pick paid tasks that fit your time and skills: social, app testing, research, writing, design and more. Get paid when your work is approved.', to: '/tasks', cta: 'Browse jobs' },
  { icon: 'square-plus', title: 'Hire people', text: 'Post a job, set the reward per person and the proof you want, and review the work. You only pay for what you approve.', to: '/create', cta: 'Create a job' },
  { icon: 'building-store', title: 'Sell your services', text: 'List services and digital products in the store. Buyers pay through OgaPay and you get paid when they confirm delivery.', to: '/store', cta: 'Visit the store' },
  { icon: 'users', title: 'Work with your people', text: 'Join or start a community with its own chat, members and jobs from people you know.', to: '/communities', cta: 'Explore communities' },
]

const SAFE = [
  { icon: 'lock', title: 'Escrow on every job', text: 'A job’s budget is locked before anyone starts, so workers can see the money is there. Work nobody reviews within 72 hours is approved automatically.' },
  { icon: 'shield-check', title: 'Buyer protection in the store', text: 'Store payments are held until the buyer confirms delivery, or 3 days after the seller marks it delivered. Problems are reviewed by our team.' },
  { icon: 'id-badge-2', title: 'Identity checks', text: 'Verification levels (NIN, ID with a selfie, documents) unlock withdrawals and higher limits, and posters can require them for their jobs.' },
  { icon: 'flag', title: 'Reports and moderation', text: 'Report a job from its page, or tell support about a user or an order. Disputed work and store orders are settled by our team.' },
]

const LINKS = [
  { icon: 'world', label: 'Website', value: 'ogapay.app', href: 'https://ogapay.app' },
  { icon: 'brand-x', label: 'X (Twitter)', value: '@Ogapayhq', href: 'https://x.com/Ogapayhq' },
  { icon: 'brand-telegram', label: 'Telegram', value: 't.me/ogapay', href: 'https://t.me/ogapay' },
  { icon: 'mail', label: 'Email', value: 'support@ogapay.app', href: 'mailto:support@ogapay.app' },
]

export default function About() {
  return (
    <Layout>
      <style>{`
        .ab2-sec{margin-top:56px}
        .ab2-sec > h2{margin:0;font-size:22px;font-weight:600;letter-spacing:-.02em;color:var(--text)}
        .ab2-sec > p{margin:8px 0 0;font-size:14px;line-height:1.65;color:var(--text2);max-width:680px}
        .ab2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}
        .ab2-card{padding:20px;display:flex;flex-direction:column;gap:8px}
        .ab2-card .ic{width:40px;height:40px;border-radius:11px;background:var(--card2);border:1px solid var(--border);display:grid;place-items:center;font-size:19px;color:var(--text)}
        .ab2-card h3{margin:6px 0 0;font-size:15.5px;font-weight:600;color:var(--text)}
        .ab2-card p{margin:0;font-size:13.5px;line-height:1.6;color:var(--text2)}
        .ab2-card a{margin-top:auto;padding-top:6px;font-size:13px;font-weight:600;color:var(--text);text-decoration:none;display:inline-flex;align-items:center;gap:6px}
        .ab2-card a:hover{text-decoration:underline}
        .ab2-money{margin-top:20px;padding:6px 20px}
        .ab2-money div{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid var(--border);font-size:13.5px}
        .ab2-money div:last-child{border-bottom:0}
        .ab2-money span{color:var(--text2)}
        .ab2-money b{color:var(--text);font-weight:600;text-align:right}
        .ab2-links{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:20px}
        .ab2-link{padding:16px;display:flex;flex-direction:column;gap:4px;text-decoration:none;color:inherit;transition:border-color .15s ease}
        .ab2-link:hover{border-color:var(--text3)}
        .ab2-link i{font-size:20px;color:var(--text);margin-bottom:6px}
        .ab2-link span{font-size:12px;color:var(--text3)}
        .ab2-link b{font-size:13.5px;font-weight:600;color:var(--text);overflow-wrap:anywhere}
        .ab2-warn{margin-top:12px;padding:14px 16px;display:flex;gap:10px;font-size:13px;line-height:1.55;color:var(--text2)}
        .ab2-warn i{font-size:18px;color:#d97706;flex-shrink:0}
        .ab2-foot{margin-top:56px;padding:22px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
        .ab2-foot p{margin:0;font-size:13.5px;color:var(--text2)}
        @media(max-width:860px){.ab2-links{grid-template-columns:1fr 1fr}}
        @media(max-width:640px){.ab2-grid{grid-template-columns:1fr}.ab2-sec{margin-top:44px}}
      `}</style>
      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-info-circle" /> About OgaPay</span>
          <h1 className="ui-title">A task marketplace for Africa, paid in Naira or USDC.</h1>
          <p className="ui-sub">
            OgaPay connects people who need work done with people ready to do it. Post a job, do paid tasks, or sell your
            services, with the money held safely until the work is done.
          </p>
        </header>

        <section className="ab2-sec">
          <h2>What you can do</h2>
          <div className="ab2-grid">
            {DOES.map((d) => (
              <div key={d.title} className="ui-card ab2-card">
                <span className="ic"><i className={`ti ti-${d.icon}`} aria-hidden="true" /></span>
                <h3>{d.title}</h3>
                <p>{d.text}</p>
                <Link to={d.to}>{d.cta} <i className="ti ti-arrow-right" aria-hidden="true" /></Link>
              </div>
            ))}
          </div>
        </section>

        <section className="ab2-sec">
          <h2>How we keep it safe</h2>
          <div className="ab2-grid">
            {SAFE.map((d) => (
              <div key={d.title} className="ui-card ab2-card">
                <span className="ic"><i className={`ti ti-${d.icon}`} aria-hidden="true" /></span>
                <h3>{d.title}</h3>
                <p>{d.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ab2-sec">
          <h2>Your money</h2>
          <p>Your wallet holds Naira, USDC and SOL. USDC and SOL run on Solana.</p>
          <div className="ui-card ab2-money">
            <div><span>Add money</span><b>Card or bank transfer, or USDC</b></div>
            <div><span>Your own account number</span><b>After you verify your identity</b></div>
            <div><span>Withdraw</span><b>To a Nigerian bank (1.5%, min ₦100) or a crypto wallet (1%)</b></div>
            <div><span>Posting a job</span><b>10% fee on the budget; workers keep the full reward</b></div>
            <div><span>Sending to another OgaPay user</span><b>Free</b></div>
          </div>
        </section>

        <section className="ab2-sec">
          <h2>The vault and $PAY</h2>
          <p>
            Every 12 hours, at 00:00 and 12:00 UTC, the platform fees in the vault are shared with $PAY holders according to
            how much $PAY they hold. Payouts depend on the fees OgaPay actually earns, so they go up and down with activity.
            Nothing on OgaPay is financial advice.
          </p>
          <div className="ui-actions" style={{ marginTop: 16 }}>
            <Link className="ui-btn ui-btn-ghost" to="/vault">Open the vault <i className="ti ti-arrow-right" /></Link>
          </div>
        </section>

        <section className="ab2-sec">
          <h2>Official channels</h2>
          <p>These are the only places we post from. If someone contacts you from anywhere else claiming to be OgaPay, it isn't us.</p>
          <div className="ab2-links">
            {LINKS.map((l) => (
              <a key={l.label} className="ui-card ab2-link" href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                <i className={`ti ti-${l.icon}`} aria-hidden="true" />
                <span>{l.label}</span>
                <b>{l.value}</b>
              </a>
            ))}
          </div>
          <div className="ui-card ab2-warn">
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <span>OgaPay staff will never ask for your password, PIN or one-time codes, or ask you to send money to "unlock" a payout.</span>
          </div>
        </section>

        <div className="ui-card ab2-foot">
          <p>OgaPay is operated by OgaPay Technologies Ltd.</p>
          <div className="ui-actions">
            <Link className="ui-btn ui-btn-ghost" to="/terms">Terms</Link>
            <Link className="ui-btn ui-btn-ghost" to="/privacy">Privacy</Link>
            <Link className="ui-btn ui-btn-dark" to="/support">Contact support</Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
