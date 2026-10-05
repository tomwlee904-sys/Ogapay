import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

// For businesses, brands and communities: what you can get done on OgaPay and
// how paying for it works. Like wurk.fun's /hire. Keep every line true: fees,
// approval times and requirements match the backend and the FAQ.

const FACTS = [
  { icon: 'calendar-off', title: 'No subscription', text: 'Fund each job when you need it.' },
  { icon: 'coins', title: 'Naira or USDC', text: 'Pay from your OgaPay wallet.' },
  { icon: 'lock', title: 'Held in escrow', text: 'The budget is locked before anyone starts.' },
  { icon: 'receipt', title: '10% fee', text: 'On the budget, once. Workers keep the full reward.' },
]

const USES = [
  { icon: 'brand-x', title: 'Social growth', text: 'Follows, reposts, comments and original posts around a launch. Build an X campaign in a few steps.' },
  { icon: 'device-mobile', title: 'App testing and feedback', text: 'Have real people install your app, go through a flow and tell you what was confusing or broken.' },
  { icon: 'clipboard-list', title: 'Surveys and research', text: 'Collect answers from people in Nigeria, or have them look things up and check information online.' },
  { icon: 'pencil', title: 'Writing and design', text: 'Articles, threads, translations and graphics, written to your brief.' },
  { icon: 'table', title: 'Data entry and checks', text: 'Split repetitive work across many people and post it in small batches.' },
  { icon: 'user-check', title: 'One person for a project', text: 'Hire someone directly from their profile, or buy a ready-made service in the store.' },
]

const STEPS = [
  { n: '01', title: 'Write the brief', text: 'Say what to do and what proof you want, then set the reward per person and how many people you need.' },
  { n: '02', title: 'Fund it', text: 'The budget plus the 10% fee is locked in escrow, so workers can see the money is there.' },
  { n: '03', title: 'Review and pay', text: 'Approve work to pay the worker, or reject it with a reason. Work you leave unreviewed is approved automatically after 3 days at most, so nobody is kept waiting.' },
]

const REQS = [
  { icon: 'id-badge-2', label: 'Verified identity (KYC level)' },
  { icon: 'chart-line', label: 'Minimum OgaScore' },
  { icon: 'trophy', label: 'Minimum rank' },
  { icon: 'brand-x', label: 'A connected X account' },
]

export default function ForBusinesses() {
  return (
    <Layout>
      <style>{`
        .fb-sec{margin-top:56px}
        .fb-sec > h2{margin:0;font-size:22px;font-weight:600;letter-spacing:-.02em;color:var(--text)}
        .fb-sec > p{margin:8px 0 0;font-size:14px;line-height:1.65;color:var(--text2);max-width:680px}
        .fb-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:28px}
        .fb-fact{padding:16px;display:flex;flex-direction:column;gap:4px}
        .fb-fact i{font-size:20px;color:var(--text);margin-bottom:6px}
        .fb-fact b{font-size:14px;font-weight:600;color:var(--text)}
        .fb-fact span{font-size:13px;line-height:1.5;color:var(--text2)}
        .fb-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:20px}
        .fb-card{padding:20px;display:flex;flex-direction:column;gap:8px}
        .fb-card .ic{width:40px;height:40px;border-radius:11px;background:var(--card2);border:1px solid var(--border);display:grid;place-items:center;font-size:19px;color:var(--text)}
        .fb-card h3{margin:6px 0 0;font-size:15.5px;font-weight:600;color:var(--text)}
        .fb-card p{margin:0;font-size:13.5px;line-height:1.6;color:var(--text2)}
        .fb-step .n{font:600 12px 'JetBrains Mono',ui-monospace,monospace;color:var(--text3);letter-spacing:.06em}
        .fb-example{margin-top:12px;padding:6px 20px}
        .fb-example div{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--border);font-size:13.5px}
        .fb-example div:last-child{border-bottom:0}
        .fb-example span{color:var(--text2)}
        .fb-example b{color:var(--text);font-weight:600;text-align:right}
        .fb-reqs{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
        .fb-req{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;font-size:13.5px;color:var(--text)}
        .fb-req i{font-size:17px;color:var(--text2)}
        .fb-foot{margin-top:56px;padding:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
        .fb-foot h2{margin:0;font-size:20px;font-weight:600;letter-spacing:-.02em;color:var(--text)}
        .fb-foot p{margin:6px 0 0;font-size:13.5px;color:var(--text2)}
        @media(max-width:900px){.fb-grid{grid-template-columns:1fr 1fr}.fb-facts{grid-template-columns:1fr 1fr}}
        @media(max-width:640px){.fb-grid{grid-template-columns:1fr}.fb-sec{margin-top:44px}}
      `}</style>
      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-building" /> For businesses, brands and communities</span>
          <h1 className="ui-title">Post a job. Get it done.</h1>
          <p className="ui-sub">
            Pay real people in Nigeria for tasks, campaigns and projects. Fund a job when you need it, and pay only for the
            work you approve.
          </p>
          <div className="ui-actions" style={{ marginTop: 20 }}>
            <Link className="ui-btn ui-btn-dark" to="/create">Create a job <i className="ti ti-arrow-right" /></Link>
            <Link className="ui-btn ui-btn-ghost" to="/tasks">See open jobs</Link>
          </div>
        </header>

        <div className="fb-facts">
          {FACTS.map((f) => (
            <div key={f.title} className="ui-card fb-fact">
              <i className={`ti ti-${f.icon}`} aria-hidden="true" />
              <b>{f.title}</b>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <section className="fb-sec">
          <h2>What do you need done?</h2>
          <p>Start with a small batch, see the results, and post more when you need it.</p>
          <div className="fb-grid">
            {USES.map((u) => (
              <div key={u.title} className="ui-card fb-card">
                <span className="ic"><i className={`ti ti-${u.icon}`} aria-hidden="true" /></span>
                <h3>{u.title}</h3>
                <p>{u.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fb-sec">
          <h2>How it works</h2>
          <div className="fb-grid">
            {STEPS.map((s) => (
              <div key={s.n} className="ui-card fb-card fb-step">
                <span className="n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 20 }}>For example, 100 people following and reposting your launch at ₦200 each:</p>
          <div className="ui-card fb-example">
            <div><span>Rewards (100 × ₦200)</span><b>₦20,000</b></div>
            <div><span>Platform fee (10%)</span><b>₦2,000</b></div>
            <div><span>You fund</span><b>₦22,000</b></div>
            <div><span>Each approved worker receives</span><b>₦200</b></div>
          </div>
          <p>Cancel a job before anyone has taken it and the budget and fee come back to your wallet.</p>
        </section>

        <section className="fb-sec">
          <h2>Choose who can take it</h2>
          <p>Open a job to everyone, or ask for any of these:</p>
          <div className="fb-reqs">
            {REQS.map((r) => (
              <span key={r.label} className="ui-card fb-req"><i className={`ti ti-${r.icon}`} aria-hidden="true" />{r.label}</span>
            ))}
          </div>
        </section>

        <section className="fb-sec">
          <h2>For developers</h2>
          <p>A read-only developer API lets you pull jobs and platform stats into your own tools.</p>
          <div className="ui-actions" style={{ marginTop: 16 }}>
            <Link className="ui-btn ui-btn-ghost" to="/developer">Developer docs <i className="ti ti-arrow-right" /></Link>
            <Link className="ui-btn ui-btn-ghost" to="/faq">FAQ</Link>
          </div>
        </section>

        <div className="ui-card fb-foot">
          <div>
            <h2>Put your next job on OgaPay</h2>
            <p>One job or a hundred: there's no subscription, and you only pay for approved work.</p>
          </div>
          <Link className="ui-btn ui-btn-dark" to="/create">Create a job <i className="ti ti-arrow-right" /></Link>
        </div>
      </div>
    </Layout>
  )
}
