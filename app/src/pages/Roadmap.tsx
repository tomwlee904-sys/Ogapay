// @ts-nocheck
import Layout from '../components/Layout'

const Icon = ({ n, s = 18, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
)

const phases = [
  {
    title: "Phase 1 — Launch",
    status: "done",
    items: [
      "User registration & login (email + Google OAuth)",
      "Task browsing, applying & submitting proof",
      "Job creation (social & custom tasks)",
      "Community pages with join/request flow",
      "Profile with wallet & bank account details",
      "Basic wallet & NG Naira support",
    ],
  },
  {
    title: "Phase 2 — Growth",
    status: "active",
    items: [
      "KYC/BVN verification for enhanced trust",
      "Real-time wallet balance & transaction history",
      "Earnings dashboard with charts & breakdowns",
      "Referral program with tracking & rewards",
      "Task history & submission tracking",
      "Mobile responsive improvements",
    ],
  },
  {
    title: "Phase 3 — Marketplace",
    status: "upcoming",
    items: [
      "Store / Service marketplace launch",
      "Escrow payment system for task rewards",
      "Multi-currency support (NGN, USDC, SOL)",
      "Seller verification & rating system",
      "Dispute resolution system",
      "Advanced analytics for posters",
    ],
  },
  {
    title: "Phase 4 — AI & Automation",
    status: "upcoming",
    items: [
      "AI agent integration via REST API",
      "Automated task assignment & matching",
      "AI-powered content verification",
      "Smart contract-based escrow on Solana",
      "Mobile app (iOS & Android)",
      "Web3 wallet integration (Phantom, Backpack)",
    ],
  },
  {
    title: "Phase 5 — Scale",
    status: "upcoming",
    items: [
      "International expansion (Ghana, Kenya, South Africa)",
      "B2B enterprise task management",
      "Advanced fraud detection & prevention",
      "Community DAO governance",
      "Open source SDK for developers",
      "Bug bounty & security audit program",
    ],
  },
]

const statusStyles = {
  done: { bg: "#16a34a18", color: "#16a34a", label: "Complete" },
  active: { bg: "#191C6B18", color: "#191C6B", label: "In Progress" },
  upcoming: { bg: "var(--bg2)", color: "var(--text3)", label: "Upcoming" },
}

export default function Roadmap() {
  return (
    <Layout>
      <style>{`
        .rm-page{max-width:800px;margin:0 auto;padding:0 0 60px}
        .rm-hero{text-align:center;padding:40px 20px 32px}
        .rm-hero h1{font-family:Outfit;font-size:32px;font-weight:900;margin:0 0 8px}
        .rm-hero p{color:var(--text2);font-size:14px;margin:0;max-width:500px;margin:0 auto;line-height:1.6}
        .rm-timeline{position:relative}
        .rm-timeline::before{content:'';position:absolute;left:28px;top:0;bottom:0;width:2px;background:var(--border)}
        .rm-phase{position:relative;padding-left:68px;margin-bottom:28px}
        .rm-dot{position:absolute;left:18px;top:6px;width:22px;height:22px;border-radius:50%;border:2px solid var(--border);background:var(--card);display:grid;place-items:center;z-index:1;font-size:10px}
        .rm-dot.done{border-color:#16a34a;background:#16a34a;color:#fff}
        .rm-dot.active{border-color:#191C6B;background:#191C6B;color:#fff;animation:pulse 2s infinite}
        .rm-dot.upcoming{background:var(--card);color:var(--text3)}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(31,140,255,.4)}50%{box-shadow:0 0 0 6px rgba(31,140,255,0)}}
        .rm-phase-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
        .rm-phase-header h2{font-family:Outfit;font-size:17px;font-weight:800;margin:0}
        .rm-status{display:inline-flex;align-items:center;height:22px;padding:0 10px;border-radius:99px;font-size:10px;font-weight:700}
        .rm-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px 20px}
        .rm-item{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:13px;color:var(--text2)}
        .rm-item.done{color:var(--text)}
        .rm-item.done i{color:#16a34a}
        .rm-item.active i{color:#191C6B}
      `}</style>

      <div className="rm-page">
        <div className="rm-hero">
          <h1><Icon n="map-pin" s={28} /> Roadmap</h1>
          <p>OgaPay is evolving. Here's what we've shipped and what's coming next on our journey to build Africa's leading task marketplace.</p>
        </div>

        <div className="rm-timeline">
          {phases.map((phase, i) => {
            const st = statusStyles[phase.status]
            const dotClass = phase.status === "done" ? "done" : phase.status === "active" ? "active" : "upcoming"
            return (
              <div className="rm-phase" key={i}>
                <div className={`rm-dot ${dotClass}`}>
                  {phase.status === "done" ? <i className="ti ti-check" style={{fontSize:10}} /> : 
                   phase.status === "active" ? <i className="ti ti-loader" style={{fontSize:9,animation:'spin 1s linear infinite'}} /> : i+1}
                </div>
                <div className="rm-phase-header">
                  <h2>{phase.title}</h2>
                  <span className="rm-status" style={{background:st.bg,color:st.color}}>{st.label}</span>
                </div>
                <div className="rm-card">
                  {phase.items.map((item, j) => (
                    <div className={`rm-item ${phase.status === "done" ? "done" : phase.status === "active" ? "active" : ""}`} key={j}>
                      <i className="ti ti-checkbox" style={{fontSize:14,flexShrink:0}} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
