import { useState, useCallback } from 'react'
import Layout from '../components/Layout'

const NAVY = '#191C6B'
const GREEN = '#16a34a'

function TablerIcon({ name, size = 20 }: { name: string; size?: number }) {
  return <i className={`ti ti-${name}`} style={{ fontSize: size, lineHeight: 1 }} />
}

export default function About() {
  const [bouncing, setBouncing] = useState<string | null>(null)

  const handleCardClick = useCallback((id: string) => {
    setBouncing(id)
    setTimeout(() => setBouncing(null), 500)
  }, [])

  return (
    <Layout sidebar={false}>
      <style>{`
        .ab-page{max-width:100%!important;padding:0}

        /* ── Hero ── */
        .ab-hero{background:${NAVY};min-height:580px;display:flex;align-items:center}
        .ab-hero-inner{width:100%;max-width:1200px;margin:0 auto;padding:60px 40px;display:grid;grid-template-columns:4fr 6fr;gap:40px;align-items:center}
        @media(max-width:900px){.ab-hero-inner{grid-template-columns:1fr;padding:48px 24px;text-align:center}}
        .ab-hero-left{display:flex;flex-direction:column;gap:4px;z-index:2}
        .ab-hero-tag{color:${GREEN};font-size:12px;font-weight:800;letter-spacing:.12em;margin:0 0 8px}
        .ab-hero-stack{font-family:Outfit,sans-serif;font-size:72px;font-weight:900;line-height:1;color:#fff;margin:0}
        .ab-hero-stack .green{color:${GREEN};font-family:'DM Serif Display',Georgia,serif;font-style:italic;font-weight:400;font-size:72px;display:inline}
        @media(max-width:768px){
          .ab-hero-stack{font-size:48px}
          .ab-hero-stack .green{font-size:48px}
        }
        .ab-hero-sub{color:rgba(255,255,255,.7);font-size:16px;line-height:1.5;margin:14px 0 0;max-width:280px}
        @media(max-width:768px){.ab-hero-sub{max-width:none;margin-left:auto;margin-right:auto}}
        .ab-hero-right{position:relative;height:500px;display:flex;align-items:center;justify-content:center;border-radius:12px;overflow:hidden}
        @media(max-width:900px){.ab-hero-right{display:none}}
        .ab-hero-right img{width:100%;height:100%;object-fit:cover;object-position:center top;border-radius:12px}

        /* ── Floating cards ── */
        .ab-card{position:absolute;width:160px;border-radius:12px;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.2);overflow:hidden;cursor:pointer;transition:transform .3s ease,box-shadow .3s ease;z-index:3}
        .ab-card:hover{transform:translateY(-8px) scale(1.04)!important;box-shadow:0 16px 40px rgba(0,0,0,.25)!important}
        .ab-card-top{height:60px;border-radius:8px 8px 0 0}
        .ab-card-bottom{padding:10px 12px 12px}
        .ab-card-avatar{width:24px;height:24px;border-radius:50%;display:inline-block;vertical-align:middle;margin-right:6px}
        .ab-card-name{font-size:12px;font-weight:700;color:#222;display:inline;vertical-align:middle}
        .ab-card-rating{font-size:10px;color:${GREEN};margin:4px 0 6px}
        .ab-card-lines{display:flex;flex-direction:column;gap:3px}
        .ab-card-line{height:6px;border-radius:3px;background:#eee;width:100%}
        .ab-card-line:nth-child(2){width:65%}

        @keyframes cardBounce {
          0%{transform:scale(1)} 40%{transform:scale(1.08)} 70%{transform:scale(.96)} 100%{transform:scale(1)}
        }
        .ab-card.bouncing{animation:cardBounce .5s ease}

        @media(max-width:900px){.ab-card{display:none}}

        /* ── Mission ── */
        .ab-mission{padding:80px 0;background:#fff}
        .ab-mission-inner{max-width:1100px;margin:0 auto;padding:0 40px;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
        @media(max-width:768px){.ab-mission-inner{grid-template-columns:1fr;gap:30px;padding:0 24px}}
        .ab-mission-heading{font-family:Outfit;font-size:40px;font-weight:900;color:${NAVY};margin:0;line-height:1.2}
        .ab-mission-right p{font-size:15px;color:#555;line-height:1.7;margin:0 0 32px}
        .ab-mission-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .ab-mission-stat{text-align:center}
        .ab-mission-stat .num{font-family:Outfit;font-size:32px;font-weight:900;color:${NAVY};display:block}
        .ab-mission-stat .lbl{font-size:13px;color:#888;font-weight:600;margin-top:2px}

        /* ── How it works ── */
        .ab-how{background:#f7f7f7;padding:80px 0}
        .ab-how-inner{max-width:900px;margin:0 auto;padding:0 40px;text-align:center}
        .ab-how-heading{font-family:Outfit;font-size:36px;font-weight:900;color:${NAVY};margin:0 0 40px}
        .ab-how-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
        @media(max-width:768px){.ab-how-steps{grid-template-columns:1fr;max-width:400px;margin:0 auto}}
        .ab-how-step{text-align:center}
        .ab-how-icon{width:64px;height:64px;border-radius:50%;background:${NAVY};display:flex;align-items:center;justify-content:center;margin:0 auto 14px;color:#fff;font-size:28px}
        .ab-how-step h3{font-size:17px;font-weight:800;color:#222;margin:0 0 6px}
        .ab-how-step p{font-size:13px;color:#777;line-height:1.5;margin:0;max-width:240px;margin-left:auto;margin-right:auto}

        /* ── Why OgaPay ── */
        .ab-why{background:${NAVY};padding:80px 0}
        .ab-why-inner{max-width:900px;margin:0 auto;padding:0 40px;text-align:center}
        .ab-why-heading{font-family:Outfit;font-size:36px;font-weight:900;color:#fff;margin:0 0 40px}
        .ab-why-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        @media(max-width:600px){.ab-why-grid{grid-template-columns:1fr}}
        .ab-why-card{border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:28px 24px;text-align:left;transition:all .2s}
        .ab-why-card:hover{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.03)}
        .ab-why-card .ab-icon{font-size:28px;margin-bottom:10px;display:block;color:#fff}
        .ab-why-card h3{font-size:16px;font-weight:800;color:#fff;margin:0 0 6px}
        .ab-why-card p{font-size:13px;color:rgba(255,255,255,.6);line-height:1.5;margin:0}

        /* ── Values ── */
        .ab-values{padding:80px 0;background:#fff}
        .ab-values-inner{max-width:900px;margin:0 auto;padding:0 40px;text-align:center}
        .ab-values-heading{font-family:Outfit;font-size:36px;font-weight:900;color:${NAVY};margin:0 0 40px}
        .ab-values-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        @media(max-width:600px){.ab-values-grid{grid-template-columns:1fr;max-width:360px;margin:0 auto}}
        .ab-values-card{border:1px solid #eee;border-radius:16px;padding:32px 24px;text-align:center;transition:all .2s}
        .ab-values-card:hover{box-shadow:0 8px 24px rgba(25,28,107,.06);border-color:${NAVY}}
        .ab-values-card .ab-icon{font-size:40px;margin-bottom:12px;display:block;color:${NAVY}}
        .ab-values-card h3{font-size:17px;font-weight:800;color:#222;margin:0 0 6px}
        .ab-values-card p{font-size:13px;color:#888;line-height:1.5;margin:0}

        /* ── CTA ── */
        .ab-cta{background:${NAVY};padding:64px 20px;text-align:center}
        .ab-cta h2{font-family:Outfit;font-size:36px;font-weight:900;color:#fff;margin:0 0 24px}
        .ab-cta-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .ab-cta-primary,.ab-cta-outline{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:999px;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;text-decoration:none;font-family:inherit}
        .ab-cta-primary{background:#fff;color:${NAVY};border:2px solid #fff}
        .ab-cta-primary:hover{background:rgba(255,255,255,.9)}
        .ab-cta-outline{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.4)}
        .ab-cta-outline:hover{border-color:#fff;background:rgba(255,255,255,.05)}
      `}</style>

      <div className="ab-page">
        {/* ── Hero ── */}
        <section className="ab-hero">
          <div className="ab-hero-inner">
            <div className="ab-hero-left">
              <div className="ab-hero-tag">ABOUT US</div>
              <div className="ab-hero-stack">
                Work.<br />
                Earn.<br />
                Grow.
              </div>
              <div className="ab-hero-stack" style={{ color: GREEN, fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic', fontWeight: 400, fontSize: 72 }}>Change.</div>
              <p className="ab-hero-sub">
                Join thousands of talented Nigerian workers and task creators building better futures together.
              </p>
            </div>

            <div className="ab-hero-right">
              <img
                src="/about-hero.svg"
                alt="OgaPay worker"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />

          {/* Card 1 — chidi */}
          <div
            className={`ab-card ${bouncing === 'chidi' ? 'bouncing' : ''}`}
            style={{ left: '30%', bottom: '120px', transform: 'rotate(-5deg)' }}
            onClick={() => handleCardClick('chidi')}
          >
            <div className="ab-card-top" style={{ background: '#f4a0b5' }} />
            <div className="ab-card-bottom">
              <span className="ab-card-avatar" style={{ background: '#f97316' }} />
              <span className="ab-card-name">chidi</span>
              <div className="ab-card-rating">★★★★★</div>
              <div className="ab-card-lines">
                <div className="ab-card-line" />
                <div className="ab-card-line" />
              </div>
            </div>
          </div>

          {/* Card 2 — amaka */}
          <div
            className={`ab-card ${bouncing === 'amaka' ? 'bouncing' : ''}`}
            style={{ right: '5%', top: '60px', transform: 'rotate(3deg)' }}
            onClick={() => handleCardClick('amaka')}
          >
            <div className="ab-card-top" style={{ background: '#8b7355' }} />
            <div className="ab-card-bottom">
              <span className="ab-card-avatar" style={{ background: '#7c3aed' }} />
              <span className="ab-card-name">amaka</span>
              <div className="ab-card-rating">★★★★★</div>
              <div className="ab-card-lines">
                <div className="ab-card-line" />
                <div className="ab-card-line" />
              </div>
            </div>
          </div>

          {/* Card 3 — tunde */}
          <div
            className={`ab-card ${bouncing === 'tunde' ? 'bouncing' : ''}`}
            style={{ right: '8%', bottom: '80px', transform: 'rotate(-3deg)' }}
            onClick={() => handleCardClick('tunde')}
          >
            <div className="ab-card-top" style={{ background: '#c8e86b' }} />
            <div className="ab-card-bottom">
              <span className="ab-card-avatar" style={{ background: '#14b8a6' }} />
              <span className="ab-card-name">tunde</span>
              <div className="ab-card-rating">★★★★★</div>
              <div className="ab-card-lines">
                <div className="ab-card-line" />
                <div className="ab-card-line" />
              </div>
            </div>
          </div>
            </div>
          </div>
        </section>

        {/* ── Mission ── */}
        <section className="ab-mission">
          <div className="ab-mission-inner">
            <h2 className="ab-mission-heading">Nigeria&rsquo;s platform for everyday earners</h2>
            <div className="ab-mission-right">
              <p>
                OgaPay connects talented Nigerians with earning opportunities through microtasks, 
                freelance projects, and community activities. Whether you are a student looking for 
                side income, a professional offering your skills, or a business needing tasks done, 
                OgaPay makes it simple to earn, grow, and get paid.
              </p>
              <div className="ab-mission-stats">
                <div className="ab-mission-stat">
                  <span className="num">10,000+</span>
                  <span className="lbl">Workers</span>
                </div>
                <div className="ab-mission-stat">
                  <span className="num">500+</span>
                  <span className="lbl">Task Creators</span>
                </div>
                <div className="ab-mission-stat">
                  <span className="num">&#x20A6;50M+</span>
                  <span className="lbl">Paid Out</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it Works ── */}
        <section className="ab-how">
          <div className="ab-how-inner">
            <h2 className="ab-how-heading">Simple. Fast. Rewarding.</h2>
            <div className="ab-how-steps">
              <div className="ab-how-step">
                <div className="ab-how-icon"><TablerIcon name="search" size={24} /></div>
                <h3>Browse Tasks</h3>
                <p>Explore hundreds of tasks from social media engagement to design, research, and testing.</p>
              </div>
              <div className="ab-how-step">
                <div className="ab-how-icon"><TablerIcon name="circle-check" size={24} /></div>
                <h3>Complete &amp; Submit</h3>
                <p>Follow instructions, complete the work, and submit your proof through the platform.</p>
              </div>
              <div className="ab-how-step">
                <div className="ab-how-icon"><TablerIcon name="coins" size={24} /></div>
                <h3>Get Paid in NGN or USDC</h3>
                <p>Receive payments directly to your bank account or crypto wallet. Fast, secure, reliable.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Why OgaPay ── */}
        <section className="ab-why">
          <div className="ab-why-inner">
            <h2 className="ab-why-heading">Built different. Built for you.</h2>
            <div className="ab-why-grid">
              <div className="ab-why-card">
                <span className="ab-icon"><TablerIcon name="flag" size={28} /></span>
                <h3>Made for Nigeria</h3>
                <p>Bank transfers, NGN support, local payment processors. Built with Nigerian workers and creators in mind from day one.</p>
              </div>
              <div className="ab-why-card">
                <span className="ab-icon"><TablerIcon name="bolt" size={28} /></span>
                <h3>Instant Payments</h3>
                <p>Get paid in NGN or USDC as soon as your work is approved. No delays, no hidden fees, no unnecessary waiting.</p>
              </div>
              <div className="ab-why-card">
                <span className="ab-icon"><TablerIcon name="lock" size={28} /></span>
                <h3>Secure &amp; Trusted</h3>
                <p>Escrow-protected payments ensure both workers and task creators are protected. KYC verified for safety.</p>
              </div>
              <div className="ab-why-card">
                <span className="ab-icon"><TablerIcon name="world" size={28} /></span>
                <h3>Earn in Crypto</h3>
                <p>Receive USDC or SOL directly to your Solana wallet. Access global earnings without traditional banking barriers.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="ab-values">
          <div className="ab-values-inner">
            <h2 className="ab-values-heading">Our Values</h2>
            <div className="ab-values-grid">
              <div className="ab-values-card">
                <span className="ab-icon"><TablerIcon name="handshake" size={40} /></span>
                <h3>Fairness</h3>
                <p>Every task, every reward, every review is handled with transparency and fairness. No exploitation, no shortcuts.</p>
              </div>
              <div className="ab-values-card">
                <span className="ab-icon"><TablerIcon name="rocket" size={40} /></span>
                <h3>Opportunity</h3>
                <p>We believe every Nigerian deserves access to earning opportunities. We lower the barrier so anyone can participate.</p>
              </div>
              <div className="ab-values-card">
                <span className="ab-icon"><TablerIcon name="shield" size={40} /></span>
                <h3>Trust</h3>
                <p>Trust is the currency of our platform. Escrow, KYC, transparent reviews — everything we build starts with trust.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="ab-cta">
          <h2>Ready to start earning?</h2>
          <div className="ab-cta-actions">
            <a href="/register" className="ab-cta-primary">Start Earning <TablerIcon name="arrow-right" size={16} /></a>
            <a href="/create" className="ab-cta-outline">Create a Task <TablerIcon name="arrow-right" size={16} /></a>
          </div>
        </section>
      </div>
    </Layout>
  )
}
