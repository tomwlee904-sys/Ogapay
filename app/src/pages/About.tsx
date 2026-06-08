import Layout from '../components/Layout'

const NAVY = '#191C6B'
const GREEN = '#16a34a'

function TablerIcon({ name, size = 20 }: { name: string; size?: number }) {
  return <i className={`ti ti-${name}`} style={{ fontSize: size, lineHeight: 1 }} />
}

export default function About() {

  return (
    <Layout sidebar={false}>
      <style>{`
        .ab-page{max-width:100%!important;padding:0}

                        /* ---- Hero ---- */
        .ab-hero{position:relative;min-height:600px;display:flex;align-items:center;overflow:hidden;background:#191C6B}
        .ab-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
        .ab-hero-overlay{position:absolute;inset:0;background:linear-gradient(135deg,rgba(25,28,107,.85) 0%,rgba(25,28,107,.6) 50%,rgba(25,28,107,.4) 100%)}
        .ab-hero-inner{position:relative;z-index:2;width:100%;max-width:1100px;margin:0 auto;padding:80px 40px}
        .ab-hero-tag{color:#16a34a;font-size:13px;font-weight:800;letter-spacing:.14em;margin:0 0 12px;display:inline-block;background:rgba(22,163,74,.12);padding:4px 14px;border-radius:999px}
        .ab-hero-heading{font-family:Outfit,sans-serif;font-size:72px;font-weight:900;line-height:.92;color:#fff;margin:0}
        .ab-hero-heading .green{color:#16a34a;font-family:'DM Serif Display',Georgia,serif;font-style:italic;font-weight:400;font-size:72px}
        @media(max-width:768px){
          .ab-hero-heading{font-size:40px}
          .ab-hero-heading .green{font-size:40px}
        }
        .ab-hero-sub{color:rgba(255,255,255,.75);font-size:17px;line-height:1.7;margin:16px 0 0;max-width:520px}
        @media(max-width:600px){.ab-hero-sub{font-size:15px;max-width:none}}
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
                {/* ---- Hero ---- */}
        <section className="ab-hero">
          <img
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&auto=format&fit=crop"
            alt="Nigerian workers collaborating"
            className="ab-hero-bg"
          />
          <div className="ab-hero-overlay" />
          <div className="ab-hero-inner">
            <div className="ab-hero-tag">ABOUT US</div>
            <div className="ab-hero-heading">
              Work.<br />
              Earn.<br />
              Grow.<br />
              <span className="green">Change.</span>
            </div>
            <p className="ab-hero-sub">
              Join thousands of talented Nigerian workers and task creators building better futures together.
            </p>
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
