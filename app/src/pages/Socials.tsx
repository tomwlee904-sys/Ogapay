import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

// The official OgaPay channels (the same list as About). Anyone claiming to be
// OgaPay anywhere else isn't us.

const CHANNELS = [
  { icon: 'brand-x', name: 'X (Twitter)', handle: '@Ogapayhq', text: 'Platform updates, new jobs and highlights from the community.', href: 'https://x.com/Ogapayhq', cta: 'Follow on X' },
  { icon: 'brand-telegram', name: 'Telegram', handle: 't.me/ogapay', text: 'Meet other members, ask questions and stay in the loop.', href: 'https://t.me/ogapay', cta: 'Join Telegram' },
  { icon: 'mail', name: 'Email', handle: 'support@ogapay.app', text: 'Questions about your account, a payment or an order.', href: 'mailto:support@ogapay.app', cta: 'Email support' },
]

export default function Socials() {
  return (
    <Layout>
      <style>{`
        .so-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:28px}
        .so-card{padding:22px;display:flex;flex-direction:column;gap:8px}
        .so-card .ic{width:44px;height:44px;border-radius:12px;background:var(--card2);border:1px solid var(--border);display:grid;place-items:center;font-size:21px;color:var(--text)}
        .so-card h2{margin:8px 0 0;font-size:17px;font-weight:600;color:var(--text)}
        .so-card .h{font:500 12px var(--font-mono);color:var(--text3);letter-spacing:.02em}
        .so-card p{margin:0;font-size:13.5px;line-height:1.6;color:var(--text2)}
        .so-card .ui-btn{margin-top:auto;align-self:flex-start}
        .so-warn{margin-top:16px;padding:14px 16px;display:flex;gap:10px;font-size:13px;line-height:1.55;color:var(--text2)}
        .so-warn i{font-size:18px;color:#d97706;flex-shrink:0}
        @media(max-width:860px){.so-grid{grid-template-columns:1fr}}
      `}</style>
      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-users" /> Community</span>
          <h1 className="ui-title">Connect with OgaPay</h1>
          <p className="ui-sub">Follow the latest updates and join the conversation. These are the only places we post from.</p>
        </header>
        <div className="so-grid">
          {CHANNELS.map((c) => (
            <div key={c.name} className="ui-card so-card">
              <span className="ic"><i className={`ti ti-${c.icon}`} aria-hidden="true" /></span>
              <h2>{c.name}</h2>
              <span className="h">{c.handle}</span>
              <p>{c.text}</p>
              <a className="ui-btn ui-btn-ghost" href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                {c.cta} <i className="ti ti-arrow-up-right" />
              </a>
            </div>
          ))}
        </div>
        <div className="ui-card so-warn">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <span>OgaPay staff will never ask for your password, PIN or one-time codes, or ask you to send money to "unlock" a payout. See <Link to="/about">About OgaPay</Link> for who we are.</span>
        </div>
      </div>
    </Layout>
  )
}
