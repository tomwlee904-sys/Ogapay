import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { CHANNELS, channelTarget } from '../lib/channels'

// The official OgaPay channels (lib/channels.ts: the same list as About and the
// footer). Anyone claiming to be OgaPay anywhere else isn't us.

export default function Socials() {
  return (
    <Layout>
      <style>{`
        .so-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:28px}
        .so-card{padding:22px;display:flex;flex-direction:column;gap:8px;text-decoration:none;color:inherit;transition:border-color .15s ease}
        .so-card:hover{border-color:var(--text3)}
        .so-card .ic{width:44px;height:44px;border-radius:12px;background:var(--card2);border:1px solid var(--border);display:grid;place-items:center;font-size:21px;color:var(--text);flex-shrink:0}
        .so-card h2{margin:8px 0 0;font-size:17px;font-weight:600;color:var(--text)}
        .so-card .h{font:500 12px var(--font-mono);color:var(--text2);letter-spacing:.02em;overflow-wrap:anywhere}
        .so-card p{margin:0;font-size:13.5px;line-height:1.6;color:var(--text2)}
        .so-card .ui-btn{margin-top:auto;align-self:flex-start}
        .so-go{display:none}
        .so-warn{margin-top:16px;padding:14px 16px;display:flex;gap:10px;font-size:13px;line-height:1.55;color:var(--text2)}
        .so-warn i{font-size:18px;color:var(--gold);flex-shrink:0}
        .so-warn a{color:var(--text);font-weight:600;text-decoration:underline;text-underline-offset:3px}
        @media(max-width:1023.98px){.so-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        /* Phone: one tappable row per channel, so all of them fit on one screen */
        @media(max-width:767.98px){
          .so-grid{grid-template-columns:minmax(0,1fr);gap:8px;margin-top:20px}
          .so-card{display:grid;grid-template-columns:44px minmax(0,1fr) 20px;column-gap:14px;row-gap:2px;align-items:center;padding:14px 16px;text-decoration:none;color:inherit}
          .so-card .ic{grid-row:1 / span 3}
          .so-card h2{margin:0;font-size:15.5px}
          .so-card .h,.so-card p{grid-column:2}
          .so-card p{font-size:13px}
          .so-card .ui-btn{display:none}
          .so-go{display:block;grid-column:3;grid-row:1 / span 3;font-size:18px;color:var(--text3)}
        }
      `}</style>
      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-users" /> Community</span>
          <h1 className="ui-title">Connect with OgaPay</h1>
          <p className="ui-sub">Follow the latest updates and join the conversation. These are the only places we post from.</p>
        </header>
        <div className="so-grid">
          {CHANNELS.map((c) => (
            <a key={c.id} className="ui-card so-card" href={c.href} target={channelTarget(c.href)} rel="noopener noreferrer" aria-label={`${c.cta}: ${c.handle}`}>
              <span className="ic"><i className={`ti ti-${c.icon}`} aria-hidden="true" /></span>
              <h2>{c.name}</h2>
              <span className="h">{c.handle}</span>
              <p>{c.text}</p>
              <span className="ui-btn ui-btn-ghost">{c.cta} <i className="ti ti-arrow-up-right" /></span>
              <i className="ti ti-arrow-up-right so-go" aria-hidden="true" />
            </a>
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
