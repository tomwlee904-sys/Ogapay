import Layout from '../components/Layout'

// Keep this true: "done" means people can use it today. "upcoming" is what we
// plan next, without dates, and never something already listed as live.
const phases = [
  {
    title: "Marketplace",
    status: "done",
    items: [
      "Sign in with email or a Solana wallet",
      "Paid jobs: custom jobs, X campaigns and quick social tasks",
      "AI campaign builder",
      "Escrow on every job, with automatic approval after 72 hours",
      "Requirements for workers: KYC, OgaScore, rank or a connected X account",
      "Private direct hires",
      "Communities with members, chat and jobs",
      "Leaderboard, referrals and the blog",
    ],
  },
  {
    title: "Money and trust",
    status: "done",
    items: [
      "Wallet in Naira, USDC and SOL",
      "Deposits by card or bank transfer, and your own account number",
      "Withdrawals to Nigerian banks and crypto wallets",
      "Free transfers between OgaPay users",
      "Identity verification levels: NIN, ID with a selfie, documents",
      "Store with buyer protection: payment held until delivery is confirmed",
      "Vault: platform fees shared with $PAY holders every 12 hours",
      "Developer API for apps and AI agents: post jobs and pay for approved work",
      "Contests with prizes for the top entries",
      "Members-only community jobs",
      "Blog likes, comments and tips",
    ],
  },
  {
    title: "Next",
    status: "upcoming",
    items: [
      "More ways to sort and filter jobs",
    ],
    note: "More coming soon. Follow our channels to hear first.",
  },
]

export default function Roadmap() {
  return (
    <Layout>
      <style>{`
        .rm-timeline{position:relative;margin-top:32px}
        .rm-timeline::before{content:'';position:absolute;left:11px;top:4px;bottom:0;width:2px;background:var(--border)}
        .rm-phase{position:relative;padding-left:36px;margin-bottom:24px}
        .rm-dot{position:absolute;left:0;top:2px;width:24px;height:24px;border-radius:50%;border:2px solid var(--border);background:var(--card);display:grid;place-items:center;z-index:1;font-size:12px;color:var(--text3)}
        .rm-dot.done{border-color:var(--green);background:color-mix(in srgb,var(--green) 16%,var(--card));color:var(--green)}
        .rm-phase-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
        .rm-phase-header h2{margin:0;font-size:var(--fs-h2);font-weight:600;letter-spacing:-.02em;color:var(--text)}
        .rm-status{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:var(--r-pill);font-size:12px;font-weight:600}
        .rm-status.done{background:color-mix(in srgb,var(--green) 14%,transparent);color:var(--green)}
        .rm-status.upcoming{background:var(--card2);color:var(--text2);border:1px solid var(--border)}
        .rm-card{padding:14px 20px}
        .rm-item{display:flex;align-items:flex-start;gap:10px;padding:7px 0;font-size:14px;line-height:1.5;color:var(--text)}
        .rm-item i{font-size:16px;flex-shrink:0;margin-top:2px}
        .rm-item.done i{color:var(--green)}
        .rm-item.upcoming{color:var(--text2)}
        .rm-item.upcoming i{color:var(--text3)}
        .rm-note{margin:8px 0 2px;font-size:13px;color:var(--text2)}
        /* Desktop: the three phases side by side as a board */
        @media(min-width:1024px){
          .rm-timeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
          .rm-timeline::before,.rm-dot{display:none}
          .rm-phase{padding-left:0;margin:0}
        }
      `}</style>

      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-map-2" /> Roadmap</span>
          <h1 className="ui-title">What's live and what's next</h1>
          <p className="ui-sub">What you can use on OgaPay today, and what we plan to build next.</p>
        </header>

        <div className="rm-timeline">
          {phases.map((phase) => {
            const done = phase.status === "done"
            return (
              <section className="rm-phase" key={phase.title} aria-label={phase.title}>
                <div className={`rm-dot ${done ? "done" : "upcoming"}`} aria-hidden="true">
                  <i className={`ti ${done ? "ti-check" : "ti-clock"}`} />
                </div>
                <div className="rm-phase-header">
                  <h2>{phase.title}</h2>
                  <span className={`rm-status ${done ? "done" : "upcoming"}`}>{done ? "Live" : "Planned"}</span>
                </div>
                <div className="ui-card rm-card">
                  {phase.items.map((item) => (
                    <div className={`rm-item ${done ? "done" : "upcoming"}`} key={item}>
                      {/* a tick for live, an open circle for planned (they used to look the same) */}
                      <i className={`ti ${done ? "ti-circle-check" : "ti-circle-dashed"}`} aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                  {phase.note && <p className="rm-note">{phase.note}</p>}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
