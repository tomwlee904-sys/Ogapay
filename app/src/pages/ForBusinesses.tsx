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

// The worked cost example (in the hero on desktop, under the steps elsewhere)
function Example() {
  return (
    <div className="ui-card fb-example">
      <div><span>Rewards (100 × ₦200)</span><b>₦20,000</b></div>
      <div><span>Platform fee (10%)</span><b>₦2,000</b></div>
      <div><span>You fund</span><b>₦22,000</b></div>
      <div><span>Each approved worker receives</span><b>₦200</b></div>
    </div>
  )
}

export default function ForBusinesses() {
  return (
    <Layout>
      <style>{`
        .fb-hero{display:grid;grid-template-columns:minmax(0,1fr);gap:32px;align-items:center}
        .fb-hero-ex{display:none}
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
        .fb-card .ic{width:40px;height:40px;border-radius:11px;background:var(--card2);border:1px solid var(--border);display:grid;place-items:center;font-size:19px;color:var(--text);flex-shrink:0}
        .fb-card h3{margin:6px 0 0;font-size:15.5px;font-weight:600;color:var(--text)}
        .fb-card p{margin:0;font-size:13.5px;line-height:1.6;color:var(--text2)}
        /* the 3 steps: always 3 across from tablet up (no 2 + 1), a numbered timeline on phone */
        .fb-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0 0;padding:0;list-style:none}
        .fb-step .n{font:600 12px var(--font-mono);color:var(--text2);letter-spacing:.06em}
        .fb-example{margin-top:12px;padding:6px 20px;max-width:560px}
        .fb-example div{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--border);font-size:13.5px}
        .fb-example div:last-child{border-bottom:0}
        .fb-example span{color:var(--text2)}
        .fb-example b{color:var(--text);font-weight:600;text-align:right;white-space:nowrap}
        .fb-hero-ex .fb-example{margin-top:0;max-width:none}
        .fb-hero-ex p{margin:0 0 10px;font-size:13px;color:var(--text2)}
        /* requirements are information, not buttons: a plain checklist */
        .fb-reqs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 20px;margin:20px 0 0;padding:0;list-style:none}
        .fb-req{display:flex;align-items:flex-start;gap:8px;font-size:14px;line-height:1.45;color:var(--text)}
        .fb-req i{font-size:18px;color:var(--green);flex-shrink:0}
        .fb-foot{margin-top:56px;padding:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
        .fb-foot h2{margin:0;font-size:20px;font-weight:600;letter-spacing:-.02em;color:var(--text)}
        .fb-foot p{margin:6px 0 0;font-size:13.5px;color:var(--text2)}
        /* Desktop: the worked example fills the hero's right half */
        @media(min-width:1024px){
          .fb-hero{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:48px}
          .fb-hero-ex{display:block}
          .fb-steps-ex{display:none}
        }
        @media(max-width:1023.98px){.fb-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fb-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.fb-reqs{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:767.98px){
          .fb-sec{margin-top:40px}
          /* use cases as compact rows, icon on the left */
          .fb-grid{grid-template-columns:minmax(0,1fr);gap:8px}
          .fb-card{display:grid;grid-template-columns:36px minmax(0,1fr);column-gap:14px;row-gap:2px;padding:14px 16px}
          .fb-card .ic{grid-row:1 / span 2;width:36px;height:36px;font-size:17px}
          .fb-card h3{margin:0}
          .fb-steps{grid-template-columns:minmax(0,1fr);gap:0}
          .fb-step.ui-card{display:block;position:relative;padding:0 0 18px 44px;background:none;border:0;box-shadow:none;border-radius:0}
          .fb-step .n{position:absolute;left:0;top:0;width:32px;height:32px;border-radius:10px;border:1px solid var(--border);background:var(--card);display:grid;place-items:center;font-size:11px}
          .fb-step:not(:last-child)::before{content:"";position:absolute;left:16px;top:38px;bottom:4px;width:1px;background:var(--border)}
          .fb-step h3{margin:5px 0 4px;font-size:15px}
          .fb-reqs{grid-template-columns:minmax(0,1fr)}
        }
      `}</style>
      <div className="ui-page">
        <div className="fb-hero">
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
        <div className="fb-hero-ex">
          <p>For example, 100 people following and reposting your launch at ₦200 each:</p>
          <Example />
        </div>
        </div>

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
          <ol className="fb-steps">
            {STEPS.map((s) => (
              <li key={s.n} className="ui-card fb-card fb-step">
                <span className="n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="fb-steps-ex">
            <p style={{ marginTop: 20, fontSize: 14, color: 'var(--text2)' }}>For example, 100 people following and reposting your launch at ₦200 each:</p>
            <Example />
          </div>
          <p>Cancel a job before anyone has taken it and the budget and fee come back to your wallet.</p>
        </section>

        <section className="fb-sec">
          <h2>Choose who can take it</h2>
          <p>Open a job to everyone, or ask for any of these:</p>
          <ul className="fb-reqs">
            {REQS.map((r) => (
              <li key={r.label} className="fb-req"><i className="ti ti-circle-check" aria-hidden="true" />{r.label}</li>
            ))}
          </ul>
        </section>

        <section className="fb-sec">
          <h2>For developers</h2>
          <p>The developer API lets your own tools or AI agent post jobs, pay for approved work and read results. Keys can never withdraw or send money.</p>
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
