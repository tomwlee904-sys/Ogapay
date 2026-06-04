// @ts-nocheck
import { useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const ACCENT = "#1F8CFF";

const navItems = [
  { id: "home", label: "Home", icon: "ti ti-home" },
  { id: "tasks", label: "Tasks", icon: "ti ti-checklist" },
  { id: "wallet", label: "Wallet", icon: "ti ti-wallet" },
  { id: "referrals", label: "Referrals", icon: "ti ti-affiliate" },
  { id: "analytics", label: "Analytics", icon: "ti ti-chart-bar" },
  { id: "settings", label: "Settings", icon: "ti ti-settings" },
];

const STAT_CARDS = [
  { icon: "ti ti-coin", label: "Total Earned", value: "₦45,200", change: "+12%", up: true },
  { icon: "ti ti-wallet", label: "Withdrawable", value: "₦12,450", change: "Available", up: true },
  { icon: "ti ti-checklist", label: "Tasks Done", value: "47", change: "+8 this week", up: true },
  { icon: "ti ti-percentage", label: "Success Rate", value: "94%", change: "+2%", up: true },
];

const STEPS = [
  { key: "role", num: "1", label: "Choose your role", sub: "Worker or creator" },
  { key: "wallet", num: "2", label: "Connect wallet", sub: "Link your wallet" },
  { key: "kyc", num: "3", label: "Complete KYC", sub: "Verify identity" },
  { key: "task", num: "4", label: "Complete first task", sub: "Start earning" },
];

const ACTIVE_TASKS = [
  { title: "Social Media Engagement", reward: 500, progress: 60 },
  { title: "Content Review", reward: 1200, progress: 20 },
  { title: "UI Feedback", reward: 800, progress: 0 },
];

const RESOURCE_LINKS = [
  { label: "Our X (Twitter)", icon: "ti ti-brand-x", href: "#" },
  { label: "Support", icon: "ti ti-headset", href: "#" },
  { label: "Back to homepage", icon: "ti ti-home", href: "/" },
];

export default function Dashboard() {
  const { isAuthed } = useAuth();
  const [activeNav, setActiveNav] = useState("home");
  const [steps, setSteps] = useState({ role: false, wallet: false, kyc: false, task: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthed) {
    return (
      <Layout sidebar={false}>
        <div className="loading"><div className="spinner" /> Sign in to view your dashboard</div>
      </Layout>
    );
  }

  const pendingCount = Object.values(steps).filter(v => !v).length;
  const completedCount = Object.values(steps).filter(v => v).length;
  const completeStep = (key) => setSteps(prev => ({ ...prev, [key]: true }));

  return (
    <Layout sidebar={false}>
      <style>{`
        .db-wrap { max-width: 1100px; margin: 0 auto; padding: 24px 0; }
        .db-grid { display: grid; grid-template-columns: 1fr 320px; gap: 28px; align-items: start; }

        /* Left panel */
        .db-left { min-width: 0; }
        .db-greeting { margin-bottom: 20px; }
        .db-greeting h1 { font-family: "Outfit", sans-serif; font-size: 24px; font-weight: 800; color: var(--text); margin: 0 0 4px; }
        .db-greeting p { font-size: 14px; color: var(--text2); margin: 0; }

        /* Stat cards */
        .db-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
        .db-stat { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .db-stat-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .db-stat-icon { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; background: rgba(31,140,255,.08); color: var(--accent); font-size: 16px; }
        .db-stat-change { font-size: 11px; font-weight: 700; color: var(--green); }
        .db-stat-val { font-family: "Outfit", sans-serif; font-size: 22px; font-weight: 900; color: var(--text); margin-bottom: 2px; }
        .db-stat-lbl { font-size: 12px; color: var(--text3); }

        /* Section title */
        .db-section-title { font-family: "Outfit", sans-serif; font-size: 15px; font-weight: 800; color: var(--text); margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
        .db-section-title i { color: var(--accent); font-size: 18px; }

        /* Active tasks */
        .db-tasks { display: grid; gap: 10px; margin-bottom: 28px; }
        .db-task { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .db-task-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .db-task-title { font-size: 14px; font-weight: 700; color: var(--text); }
        .db-task-reward { font-size: 14px; font-weight: 800; color: var(--green); }
        .db-task-bar { height: 6px; background: var(--bg2); border-radius: 999px; overflow: hidden; margin-bottom: 6px; }
        .db-task-fill { height: 100%; border-radius: inherit; background: var(--accent); transition: width .5s; }
        .db-task-meta { font-size: 11px; color: var(--text3); }

        /* Earnings chart placeholder */
        .db-chart-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 28px; }
        .db-chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .db-chart-bars { display: flex; align-items: flex-end; gap: 6px; height: 120px; }
        .db-chart-bar { flex: 1; border-radius: 4px 4px 0 0; background: var(--accent); opacity: .7; min-height: 4px; transition: height .4s; position: relative; }
        .db-chart-bar:hover { opacity: 1; }
        .db-chart-bar .bar-val { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 9px; font-weight: 700; color: var(--text2); white-space: nowrap; }

        /* Right panel */
        .db-right { position: sticky; top: 84px; }
        .db-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
        .db-card h2 { font-family: "Outfit", sans-serif; font-size: 15px; font-weight: 800; color: var(--text); margin: 0 0 4px; }
        .db-card p { font-size: 12px; color: var(--text3); margin: 0 0 16px; line-height: 1.5; }

        /* Steps */
        .step-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; cursor: pointer; border-bottom: 1px solid var(--border); }
        .step-row:last-child { border-bottom: none; }
        .step-badge { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 700; }
        .step-badge.done { background: #ECFDF5; color: #10B981; }
        .step-badge.pending { background: var(--bg2); color: var(--text3); }
        .step-label { font-size: 12.5px; font-weight: 600; color: var(--text); }
        .step-sub { font-size: 11px; color: var(--text3); }

        /* Progress widget */
        .pw-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .pw-track { height: 6px; background: var(--bg2); border-radius: 999px; overflow: hidden; }
        .pw-fill { height: 100%; border-radius: inherit; background: var(--accent); transition: width .6s; }
        .pw-done { margin-top: 8px; font-size: 12px; color: var(--green); font-weight: 700; display: flex; align-items: center; gap: 6px; }

        /* Resource card */
        .res-card { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); cursor: pointer; text-decoration: none; color: inherit; }
        .res-card:last-child { border-bottom: none; }
        .res-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
        .res-card h4 { font-size: 13px; font-weight: 700; color: var(--text); margin: 0 0 2px; }
        .res-card p { font-size: 12px; color: var(--text3); margin: 0; }
        .rp-links-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text3); margin-bottom: 8px; padding-top: 12px; }
        .rp-link { display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 13px; color: var(--text2); text-decoration: none; cursor: pointer; border-bottom: 1px solid var(--border); }
        .rp-link:last-child { border-bottom: none; }

        /* Status banner */
        .status-banner { margin-top: 16px; background: linear-gradient(135deg, #1F8CFF, #0f5db8); border-radius: 12px; padding: 16px; }
        .status-banner .sb-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,.6); margin-bottom: 6px; }
        .status-banner .sb-title { font-size: 13.5px; font-weight: 600; color: #fff; margin-bottom: 4px; line-height: 1.5; }
        .status-banner .sb-title span { color: #F5B301; }
        .status-banner .sb-sub { font-size: 12px; color: rgba(255,255,255,.65); margin-bottom: 12px; }
        .sb-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 8px 16px; border: 0; border-radius: 999px; background: #F5B301; color: #000; font-family: "DM Sans", sans-serif; font-size: 12.5px; font-weight: 700; cursor: pointer; text-decoration: none; }

        /* Video card */
        .video-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 8px; }
        .video-thumb { height: 60px; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--card); }
        .video-play { width: 28px; height: 28px; border-radius: 50%; background: var(--bg2); display: grid; place-items: center; }
        .video-meta { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; }
        .video-meta h4 { font-size: 12px; font-weight: 700; color: var(--text); margin: 0; }
        .video-meta small { font-size: 10px; color: var(--text3); }
        .db-section-title { font-family: "Outfit", sans-serif; font-size: 15px; font-weight: 800; color: var(--text); margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
        .db-section-title i { color: var(--accent); font-size: 18px; }

        @media (max-width: 768px) {
          .db-grid { grid-template-columns: 1fr; }
          .db-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .db-right { position: static; }
        }
      `}</style>

      <div className="db-wrap">
        {/* Greeting */}
        <div className="db-greeting">
          <h1>👋 Welcome back!</h1>
          <p>Here's what's happening with your account today.</p>
        </div>

        <div className="db-grid">
          {/* ── LEFT PANEL ── */}
          <div className="db-left">
            {/* Stats */}
            <div className="db-stats">
              {STAT_CARDS.map(s => (
                <div key={s.label} className="db-stat">
                  <div className="db-stat-head">
                    <div className="db-stat-icon"><i className={s.icon} /></div>
                    <span className="db-stat-change">{s.change}</span>
                  </div>
                  <div className="db-stat-val">{s.value}</div>
                  <div className="db-stat-lbl">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Active Tasks */}
            <div className="db-section-title"><i className="ti ti-player-play" /> Active Tasks</div>
            <div className="db-tasks">
              {ACTIVE_TASKS.map((t, i) => (
                <div key={i} className="db-task">
                  <div className="db-task-head">
                    <span className="db-task-title">{t.title}</span>
                    <span className="db-task-reward">₦{t.reward.toLocaleString()}</span>
                  </div>
                  <div className="db-task-bar">
                    <div className="db-task-fill" style={{ width: `${t.progress}%` }} />
                  </div>
                  <div className="db-task-meta">{t.progress}% complete</div>
                </div>
              ))}
            </div>

            {/* Earnings Chart Placeholder */}
            <div className="db-section-title"><i className="ti ti-chart-area" /> Earnings Overview</div>
            <div className="db-chart-wrap">
              <div className="db-chart-head">
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>This Week</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: "var(--accent)" }}>₦8,900</span>
              </div>
              <div className="db-chart-bars">
                {[35, 55, 42, 70, 48, 62, 85].map((v, i) => (
                  <div key={i} className="db-chart-bar" style={{ height: `${v}%` }}>
                    <span className="bar-val">₦{v * 10}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="db-right">
            {/* Onboarding */}
            <div className="db-card">
              <h2>Get Started</h2>
              <p>Complete these steps to start earning.</p>
              {STEPS.map(item => (
                <div key={item.key} className="step-row" onClick={() => completeStep(item.key)}>
                  <div className={`step-badge ${steps[item.key] ? 'done' : 'pending'}`}>
                    {steps[item.key] ? <i className="ti ti-check" style={{ fontSize: 14 }} /> : item.num}
                  </div>
                  <div>
                    <div className="step-label" style={{ color: steps[item.key] ? 'var(--green)' : 'var(--text)' }}>
                      {item.label}
                    </div>
                    <div className="step-sub">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="db-card">
              <div className="pw-row">
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em" }}>Your Progress</span>
                <span style={{ color: completedCount === 4 ? "var(--green)" : "var(--text)" }}>{Math.round(completedCount / 4 * 100)}%</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>{completedCount}/4 steps done</div>
              <div className="pw-track">
                <div className="pw-fill" style={{ width: `${completedCount / 4 * 100}%` }} />
              </div>
              {completedCount === 4 && (
                <div className="pw-done"><i className="ti ti-check" /> All steps complete!</div>
              )}
            </div>

            {/* Resources */}
            <div className="db-card">
              <h2>Resources</h2>
              <p>Guides, support, and community links.</p>
              {[
                { icon: "ti ti-message", bg: "#5865F2", iconC: "#fff", title: "Discord support", desc: "Join the OgaPay community ↗" },
                { icon: "ti ti-book", bg: "var(--bg2)", iconC: "var(--text)", title: "Documentation", desc: "Learn how OgaPay works ↗" },
                { icon: "ti ti-users", bg: "#f59e0b", iconC: "#fff", title: "Community", desc: "Nigerian Earners Hub ↗" },
              ].map(r => (
                <a key={r.title} href="#" className="res-card">
                  <div className="res-icon" style={{ background: r.bg, color: r.iconC }}><i className={r.icon} style={{ fontSize: 18 }} /></div>
                  <div>
                    <h4>{r.title}</h4>
                    <p>{r.desc}</p>
                  </div>
                </a>
              ))}

              <div className="rp-links-title">VIDEO TUTORIALS</div>
              <div className="video-card">
                <div className="video-thumb">
                  <div className="video-play"><i className="ti ti-player-play" style={{ fontSize: 14, color: "var(--text3)" }} /></div>
                  <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700 }}>Coming soon</span>
                </div>
                <div className="video-meta">
                  <div>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: 0 }}>Intro to OgaPay</h4>
                    <small style={{ fontSize: 10, color: "var(--text3)" }}>2 minute video</small>
                  </div>
                  <i className="ti ti-arrow-up-right" style={{ fontSize: 14, color: "var(--text3)" }} />
                </div>
              </div>

              <div className="rp-links-title">RESOURCE LINKS</div>
              {RESOURCE_LINKS.map(l => (
                <a key={l.label} href={l.href} className="rp-link">
                  <i className={l.icon} style={{ fontSize: 14, color: "var(--text3)" }} />
                  {l.label}
                  <i className="ti ti-arrow-up-right" style={{ fontSize: 12, color: "var(--text3)", marginLeft: "auto" }} />
                </a>
              ))}

              <div className="status-banner">
                <div className="sb-lbl">OgaPay is live</div>
                <div className="sb-title"><span>312 tasks</span> available now</div>
                <div className="sb-sub">Complete tasks. Get paid in Naira or USDC.</div>
                <a href="/tasks" className="sb-btn">
                  <i className="ti ti-briefcase" style={{ fontSize: 14 }} /> Browse Tasks →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
