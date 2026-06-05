// @ts-nocheck
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
 
/* ─── ICON HELPER ─────────────────────────────────────────────── */
const Icon = ({ n, s = 18, c = "currentColor", style = {} }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0, ...style }} />
);
 
/* ─── LOCAL STORAGE HELPERS ───────────────────────────────────── */
function getUser() {
  try { return JSON.parse(localStorage.getItem("ogapay_user")) || {}; } catch { return {}; }
}
function getStep(key) { return localStorage.getItem(key) === "true"; }
function setStep(key) { localStorage.setItem(key, "true"); }
 
/* ─── SPARKLINE MINI CHART ────────────────────────────────────── */
const Sparkline = ({ data = [], color = "#16a34a", height = 36 }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 100, h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, display: "block" }} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
    </svg>
  );
};
 
/* ─── CIRCULAR PROGRESS ───────────────────────────────────────── */
const CircleProgress = ({ pct = 0, size = 56, stroke = 5, color = "#16a34a" }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset .5s ease" }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fontSize: 12, fontWeight: 800, fill: "var(--text)", fontFamily: "Outfit,sans-serif" }}>
        {pct}%
      </text>
    </svg>
  );
};
 
/* ─── CSS ─────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
 
  /* ── Layout ── */
  .dw { padding: 24px 20px 80px; width: 100%; box-sizing: border-box; }
  .d-grid { display: grid; grid-template-columns: 1fr 300px; gap: 20px; }
 
  /* ── Welcome banner ── */
  .d-banner { display:flex; align-items:center; gap:14px; padding:16px 20px; background:var(--card);
    border:1px solid var(--border); border-radius:14px; margin-bottom:20px; }
  .d-banner-icon { width:44px; height:44px; border-radius:12px; display:grid; place-items:center; flex-shrink:0; }
  .d-banner h2 { font-family:"Outfit",sans-serif; font-size:17px; font-weight:800; margin:0 0 2px; }
  .d-banner p { font-size:13px; color:var(--text2); margin:0; line-height:1.5; }
  .d-banner.complete { background:#052e16; border-color:#166534; }
  .d-banner.complete h2,.d-banner.complete p { color:#fff; }
 
  /* ── Announce ── */
  .d-announce { background:#111; border:1px solid #282828; border-radius:12px;
    padding:14px 18px; margin-bottom:20px; display:flex; align-items:center; gap:12px; color:#fff; }
  .d-announce p { font-size:12.5px; margin:0; line-height:1.5; flex:1; }
  .d-announce a { color:#a1a1aa; font-size:12px; font-weight:700; text-decoration:none;
    display:inline-flex; align-items:center; gap:5px; white-space:nowrap; }
  .d-announce a:hover { color:#fff; }
 
  /* ── Stat cards row ── */
  .d-stats4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
  .d-stat { background:var(--card); border:1px solid var(--border); border-radius:13px;
    padding:16px 18px; display:flex; flex-direction:column; gap:10px; }
  .d-stat-top { display:flex; align-items:center; justify-content:space-between; }
  .d-stat-icon { width:36px; height:36px; border-radius:9px; background:var(--bg2);
    display:grid; place-items:center; flex-shrink:0; }
  .d-stat-badge { font-size:10px; font-weight:700; padding:3px 8px; border-radius:20px; }
  .d-stat-badge.up { background:#dcfce7; color:#16a34a; }
  .d-stat-badge.neutral { background:var(--bg2); color:var(--text2); }
  .d-stat-val { font-family:"Outfit",sans-serif; font-size:22px; font-weight:900; color:var(--text); }
  .d-stat-lbl { font-size:11px; font-weight:700; text-transform:uppercase;
    letter-spacing:.06em; color:var(--text2); margin-top:-4px; }
 
  /* ── Section title ── */
  .d-stitle { font-family:"Outfit",sans-serif; font-size:12px; font-weight:800;
    letter-spacing:.05em; text-transform:uppercase; color:var(--text2);
    display:flex; align-items:center; gap:8px; margin-bottom:12px; }
 
  /* ── Progress bar ── */
  .d-prog-row { display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:6px; }
  .d-prog-bar { height:6px; background:var(--border); border-radius:99px; overflow:hidden; margin-bottom:20px; }
  .d-prog-fill { height:100%; border-radius:99px; background:#111; transition:width .4s ease; }
  .d-prog-fill.done { background:#16a34a; }
 
  /* ── Step cards ── */
  .d-step-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px; }
  .d-step-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:18px 20px; }
  .d-step-card.full { grid-column:1/-1; }
  .d-step-badge { display:inline-flex; align-items:center; justify-content:center;
    width:22px; height:22px; border-radius:6px; background:var(--bg2);
    color:var(--text2); font-size:10px; font-weight:800; margin-bottom:10px; }
  .d-step-card h4 { font-family:"Outfit",sans-serif; font-size:14px; font-weight:800; margin:0 0 4px; }
  .d-step-card p { font-size:12px; color:var(--text2); margin:0 0 14px; line-height:1.5; }
 
  /* ── Buttons ── */
  .d-btn { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 18px;
    border-radius:9px; font-size:13px; font-weight:700; border:none; cursor:pointer;
    background:#111; color:#fff; transition:opacity .14s; font-family:inherit; }
  .d-btn:hover { opacity:.82; }
  .d-btn.green { background:#16a34a; }
  .d-btn.outline { background:transparent; border:1.5px solid var(--border); color:var(--text); }
  .d-btn.outline:hover { border-color:var(--text2); }
  .d-btn.sm { height:34px; padding:0 14px; font-size:12px; }
  .d-btn.accent { background:#1F8CFF; }
  .d-input { width:100%; height:38px; padding:0 12px; border:1.5px solid var(--border);
    border-radius:9px; font-size:13px; font-family:inherit; background:var(--bg2);
    color:var(--text); outline:none; box-sizing:border-box; }
  .d-input:focus { border-color:#111; }
  .d-success { font-size:12px; color:#16a34a; font-weight:700; margin-top:8px;
    display:flex; align-items:center; gap:6px; }
 
  /* ── Provider grid ── */
  .d-prov-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:14px; }
  .d-prov { display:flex; flex-direction:column; align-items:center; gap:6px;
    padding:14px 8px; border:1.5px solid var(--border); border-radius:10px;
    cursor:pointer; transition:border-color .14s,background .14s;
    font-size:11px; font-weight:700; background:var(--card); text-decoration:none; color:inherit; }
  .d-prov:hover { border-color:var(--text2); }
  .d-prov.selected { border-color:#111; background:var(--bg2); }
 
  /* ── Mini list ── */
  .d-mini-list { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
  .d-mini-row { display:flex; align-items:center; gap:8px; padding:6px 0; font-size:12px; color:var(--text2); }
 
  /* ── Locked ── */
  .d-locked { opacity:.35; pointer-events:none; filter:grayscale(.8); }
 
  /* ── Activity feed ── */
  .d-activity { background:var(--card); border:1px solid var(--border); border-radius:13px;
    padding:18px 20px; margin-bottom:20px; }
  .d-activity-row { display:flex; align-items:center; gap:12px; padding:10px 0;
    border-bottom:1px solid var(--border); }
  .d-activity-row:last-child { border-bottom:none; padding-bottom:0; }
  .d-activity-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .d-activity-label { font-size:13px; flex:1; }
  .d-activity-label span { font-weight:700; }
  .d-activity-time { font-size:11px; color:var(--text2); white-space:nowrap; }
 
  /* ── Earnings chart card ── */
  .d-chart-card { background:var(--card); border:1px solid var(--border);
    border-radius:13px; padding:18px 20px; margin-bottom:20px; }
  .d-chart-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
  .d-chart-head h3 { font-family:"Outfit",sans-serif; font-size:15px; font-weight:800; margin:0; }
  .d-chart-tabs { display:flex; gap:4px; }
  .d-chart-tab { height:28px; padding:0 12px; border-radius:7px; font-size:12px; font-weight:700;
    border:1.5px solid var(--border); cursor:pointer; background:transparent; color:var(--text2); font-family:inherit; }
  .d-chart-tab.active { background:#111; color:#fff; border-color:#111; }
  .d-chart-total { font-family:"Outfit",sans-serif; font-size:24px; font-weight:900; margin:2px 0 12px; }
  .d-chart-legend { display:flex; gap:14px; margin-top:10px; }
  .d-chart-legend-item { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--text2); }
  .d-chart-legend-dot { width:8px; height:8px; border-radius:50%; }
 
  /* ── Quick links ── */
  .d-ql-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
  .d-ql { background:var(--card); border:1px solid var(--border); border-radius:12px;
    padding:18px 14px; display:flex; flex-direction:column; align-items:center;
    gap:8px; text-decoration:none; color:var(--text); cursor:pointer;
    transition:background .14s,border-color .14s; }
  .d-ql:hover { background:var(--bg2); border-color:var(--text2); }
  .d-ql span { font-size:12px; font-weight:700; text-align:center; }
 
  /* ── Right panel ── */
  .d-right { display:flex; flex-direction:column; gap:14px; }
  .d-rcard { background:var(--card); border:1px solid var(--border); border-radius:13px; padding:18px 20px; }
  .d-rcard h3 { font-family:"Outfit",sans-serif; font-size:15px; font-weight:800; margin:0 0 4px; }
  .d-rcard-sub { font-size:12px; color:var(--text2); margin:0 0 14px; line-height:1.5; }
  .d-res-link { display:flex; align-items:center; gap:12px; padding:11px; border:1.5px solid var(--border);
    border-radius:10px; cursor:pointer; transition:border-color .14s,background .14s;
    text-decoration:none; color:inherit; margin-bottom:8px; }
  .d-res-link:last-of-type { margin-bottom:0; }
  .d-res-link:hover { border-color:#a1a1aa; background:var(--bg2); }
  .d-res-icon { width:34px; height:34px; border-radius:9px; display:grid; place-items:center; flex-shrink:0; }
  .d-res-link h4 { font-size:13px; font-weight:700; margin:0 0 1px; }
  .d-res-link p { font-size:11px; color:var(--text2); margin:0; }
  .d-divider { border-top:1px solid var(--border); margin:14px 0; }
  .d-rlink { display:flex; align-items:center; gap:10px; font-size:12px; font-weight:600;
    color:var(--text2); text-decoration:none; padding:8px 0;
    border-bottom:1px solid var(--border); }
  .d-rlink:last-child { border-bottom:none; }
  .d-rlink:hover { color:var(--text); }
  .d-prog-widget { background:var(--bg2); border:1.5px solid var(--border); border-radius:10px; padding:14px; }
 
  /* ── Task preview card ── */
  .d-task-card { display:flex; align-items:center; gap:12px; padding:12px;
    border:1.5px solid var(--border); border-radius:10px; margin-bottom:8px;
    cursor:pointer; transition:background .14s; text-decoration:none; color:inherit; }
  .d-task-card:last-child { margin-bottom:0; }
  .d-task-card:hover { background:var(--bg2); }
  .d-task-icon { width:34px; height:34px; border-radius:9px; display:grid; place-items:center; flex-shrink:0; }
  .d-task-info { flex:1; }
  .d-task-info h4 { font-size:13px; font-weight:700; margin:0 0 2px; }
  .d-task-info p { font-size:11px; color:var(--text2); margin:0; }
  .d-task-pay { font-family:"Outfit",sans-serif; font-size:13px; font-weight:800; color:#16a34a; white-space:nowrap; }
 
  /* ── Referral card ── */
  .d-ref-box { background:var(--bg2); border:1.5px dashed var(--border); border-radius:10px;
    padding:12px 14px; display:flex; align-items:center; gap:10px; }
  .d-ref-link { font-size:11px; color:var(--text2); font-family:monospace; flex:1;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .d-ref-copy { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px;
    border-radius:8px; border:1.5px solid var(--border); background:var(--card);
    cursor:pointer; flex-shrink:0; }
  .d-ref-copy:hover { border-color:var(--text2); }
 
  /* ── Checklist ── */
  .d-chk-item { display:flex; align-items:center; gap:10px; padding:7px 0;
    font-size:13px; color:var(--text2); border-bottom:1px solid var(--border); }
  .d-chk-item:last-child { border-bottom:none; }
  .d-chk-item.done { color:#9ca3af; text-decoration:line-through; }
  .d-chk-bul { width:18px; height:18px; border-radius:50%; border:2px solid var(--border);
    display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .d-chk-bul.done { background:#111; border-color:#111; color:#fff; }
 
  /* ── Mobile ── */
  @media(max-width:768px) {
    .dw { padding:16px 14px 80px; }
    .d-grid { display:flex; flex-direction:column; gap:0; }
    .d-stats4 { grid-template-columns:1fr 1fr; }
    .d-step-grid { grid-template-columns:1fr; }
    .d-prov-grid { grid-template-columns:1fr 1fr; }
    .d-ql-grid { grid-template-columns:repeat(3,1fr); }
    .d-right { margin-top:0; }
    .d-rcard { margin-bottom:14px; }
    .d-main { display:flex; flex-direction:column; gap:0; }
  }
  @media(min-width:769px) {
    .d-main { display:flex; flex-direction:column; }
  }
`;
 
/* ─── MOCK DATA ───────────────────────────────────────────────── */
const earningsData7d  = [0, 0, 2, 1, 5, 3, 0];
const earningsData30d = [0, 0, 0, 2, 1, 5, 3, 0, 0, 1, 4, 0, 0, 0, 2, 5, 1, 0, 0, 0, 0, 3, 1, 0, 0, 0, 2, 5, 3, 0];
 
const ACTIVITY = [
  { dot: "#16a34a", label: <><span>Profile updated</span> — display name set</>, time: "2 min ago" },
  { dot: "#1F8CFF", label: <><span>Wallet linked</span> — F48N...jemX</>, time: "5 min ago" },
  { dot: "#f59e0b", label: <><span>Task viewed</span> — Twitter engagement</>, time: "1 hr ago" },
  { dot: "#a855f7", label: <><span>Referral link</span> copied</>, time: "3 hr ago" },
];
 
const TASKS_PREVIEW = [
  { icon: "brand-x", bg: "#111", label: "Twitter Follow + RT", pay: "₦200", meta: "Quick • Open" },
  { icon: "brand-telegram", bg: "#0088cc", label: "Join Telegram Channel", pay: "₦150", meta: "Easy • Open" },
  { icon: "users", bg: "#7c3aed", label: "Discord Invite Task", pay: "₦300", meta: "Medium • Open" },
];
 
export default function OgaPayDashboard() {
  const { user, isAuthed } = useAuth();
  const [step1, setStep1] = useState(getStep("ogapay_step_profile"));
  const [step2, setStep2] = useState(getStep("ogapay_step_wallet"));
  const [step3, setStep3] = useState(getStep("ogapay_step_community"));
  const [step4, setStep4] = useState(getStep("ogapay_step_task"));
  const [verifSent, setVerifSent] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [selProvider, setSelProvider] = useState(null);
  const [chartTab, setChartTab] = useState("7d");
  const [refCopied, setRefCopied] = useState(false);
  const [isNew] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("ogapay_user")) || {};
      let ts = u.createdAt || u.created_at || null;
      if (ts) {
        const t = typeof ts === "number" ? ts * 1000 : new Date(ts).getTime();
        if (!isNaN(t) && Date.now() - t < 5 * 60 * 1000) return true;
      }
    } catch {}
    return localStorage.getItem("ogapay_is_new_user") === "true";
  });
 
  const fname = user?.firstName || getUser().firstName || "there";
  const lname = user?.lastName || getUser().lastName || "";
  const email  = user?.email    || getUser().email    || "";
  const initials = `${(fname[0] || "").toUpperCase()}${(lname[0] || "").toUpperCase()}`;
 
  const stepsDone = [step1, step2, step3, step4];
  const completed = stepsDone.filter(Boolean).length;
  const total = 4;
  const pct = Math.round((completed / total) * 100);
  const allDone = completed === total;
 
  const doStep = (idx, key) => {
    setStep(key);
    if (idx === 0) setStep1(true);
    if (idx === 1) setStep2(true);
    if (idx === 2) setStep3(true);
    if (idx === 3) setStep4(true);
  };
 
  const copyRef = () => {
    navigator.clipboard?.writeText("https://ogapay.ng/?ref=AMR6CGX");
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  };
 
  if (!isAuthed) return (
    <Layout sidebar={false}>
      <div className="loading"><div className="spinner" /> Sign in to view your dashboard</div>
    </Layout>
  );
 
  const checklist = [
    { label: "Complete your profile & verify email", done: step1 },
    { label: "Connect a Solana wallet",              done: step2 },
    { label: "Join OgaPay community",                done: step3 },
    { label: "Complete your first task",             done: step4 },
  ];
 
  const chartData = chartTab === "7d" ? earningsData7d : earningsData30d;
 
  return (
    <Layout sidebar={false}>
      <style>{CSS}</style>
      <div className="dw">
 
        {/* ── WELCOME BANNER ── */}
        {allDone ? (
          <div className="d-banner complete">
            <div className="d-banner-icon" style={{ background: "#16a34a" }}>
              <Icon n="check" s={20} c="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <h2>You're all set, {fname}!</h2>
              <p>Your OgaPay account is fully configured. Browse jobs to start earning.</p>
            </div>
            <a href="/tasks" className="d-btn" style={{ flexShrink: 0 }}><Icon n="briefcase" s={14} /> Browse Jobs</a>
          </div>
        ) : isNew ? (
          <div className="d-banner">
            <div className="d-banner-icon" style={{ background: "#dbeafe" }}>
              <Icon n="hand-wave" s={22} c="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
              <h2>Welcome to OgaPay, {fname}! 👋</h2>
              <p>Your account is ready. Complete the 4 steps below to start earning.</p>
            </div>
          </div>
        ) : (
          <div className="d-banner">
            <div className="d-banner-icon" style={{ background: "#dcfce7" }}>
              <Icon n="check-circle" s={22} c="#16a34a" />
            </div>
            <div style={{ flex: 1 }}>
              <h2>Welcome back, {fname} 👋</h2>
              <p>Pick up where you left off. {total - completed} setup step{total - completed !== 1 ? "s" : ""} remaining.</p>
            </div>
          </div>
        )}
 
        {/* ── ANNOUNCEMENT ── */}
        <div className="d-announce">
          <Icon n="megaphone" s={17} c="#60a5fa" />
          <p>OgaPay tasks are now available in Nigeria, Ghana, Kenya and more African countries.</p>
          <a href="#"><Icon n="file-text" s={12} /> Getting started guide ↗</a>
        </div>
 
        {/* ── 4 STAT CARDS ── */}
        <div className="d-stats4">
          <div className="d-stat">
            <div className="d-stat-top">
              <div className="d-stat-icon"><Icon n="briefcase" s={16} /></div>
              <span className="d-stat-badge neutral">Live</span>
            </div>
            <div className="d-stat-val">0</div>
            <div className="d-stat-lbl">Available Tasks</div>
          </div>
          <div className="d-stat">
            <div className="d-stat-top">
              <div className="d-stat-icon"><Icon n="currency-naira" s={16} /></div>
              <span className="d-stat-badge up">↑ 0%</span>
            </div>
            <div className="d-stat-val">₦0.00</div>
            <div className="d-stat-lbl">Total Earned</div>
          </div>
          <div className="d-stat">
            <div className="d-stat-top">
              <div className="d-stat-icon"><Icon n="users" s={16} /></div>
              <span className="d-stat-badge neutral">—</span>
            </div>
            <div className="d-stat-val">0</div>
            <div className="d-stat-lbl">Referrals</div>
          </div>
          <div className="d-stat">
            <div className="d-stat-top">
              <CircleProgress pct={pct} size={52} />
            </div>
            <div className="d-stat-val" style={{ fontSize: 18 }}>{completed}/{total}</div>
            <div className="d-stat-lbl">Setup Steps</div>
          </div>
        </div>
 
        {/* ── TWO COLUMN GRID ── */}
        <div className="d-grid">
 
          {/* ── LEFT COLUMN ── */}
          <div className="d-main">
 
            {/* PROGRESS BAR */}
            <div>
              <div className="d-prog-row">
                <span>{completed} of {total} steps complete</span>
                <span style={{ color: allDone ? "#16a34a" : "inherit" }}>{pct}%</span>
              </div>
              <div className="d-prog-bar">
                <div className={`d-prog-fill${allDone ? " done" : ""}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
 
            {/* STEP 1 */}
            <div className="d-stitle"><Icon n="circle-filled" s={8} /> STEP 1: COMPLETE YOUR PROFILE</div>
            <div className="d-step-grid">
              <div className="d-step-card">
                <div className="d-step-badge">1A</div>
                <h4>Add Profile Photo & Display Name</h4>
                <p>Set up your OgaPay identity so task creators can find and trust you.</p>
                <button className="d-btn" onClick={() => { window.location.href = "/profile"; doStep(0, "ogapay_step_profile"); }}>
                  <Icon n="user" s={14} /> Go to Profile
                </button>
              </div>
              <div className="d-step-card">
                <div className="d-step-badge">1B</div>
                <h4>Verify Your Email Address</h4>
                <p>Confirm your email to unlock withdrawals and receive task notifications.</p>
                <input className="d-input" value={email} readOnly style={{ marginBottom: 10 }} />
                <button className={`d-btn${verifSent ? " green" : ""}`} onClick={() => setVerifSent(true)}>
                  <Icon n="mail" s={14} /> {verifSent ? "✓ Sent" : "Send Verification Email"}
                </button>
                {verifSent && <div className="d-success"><Icon n="check" s={12} /> Verification email sent!</div>}
              </div>
            </div>
 
            {/* STEP 2 */}
            {step1 && (
              <div className={step2 ? "" : "d-locked"}>
                <div className="d-stitle"><Icon n="circle-filled" s={8} /> STEP 2: CONNECT YOUR WALLET</div>
                <div className="d-step-card full" style={{ marginBottom: 18 }}>
                  <div className="d-step-badge">2</div>
                  <h4>Connect a Solana Wallet</h4>
                  <p>Link your wallet to receive USDC payouts directly. Supports Phantom, Backpack, and Solflare.</p>
                  <div className="d-prov-grid">
                    {[
                      { id: "phantom",  label: "Phantom",  icon: "brand-figma" },
                      { id: "backpack", label: "Backpack", icon: "backpack"     },
                      { id: "solflare", label: "Solflare", icon: "flare"        },
                    ].map(p => (
                      <div key={p.id} className={`d-prov${selProvider === p.id ? " selected" : ""}`} onClick={() => setSelProvider(p.id)}>
                        <Icon n={p.icon} s={20} />
                        <span>{p.label}</span>
                      </div>
                    ))}
                  </div>
                  <button className={`d-btn${walletConnected ? " green" : ""}`} onClick={() => { setWalletConnected(true); setStep2(true); doStep(1, "ogapay_step_wallet"); }}>
                    <Icon n="wallet" s={14} /> {walletConnected ? "✓ Wallet Connected" : "Connect Wallet"}
                  </button>
                  {walletConnected && <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 700, marginTop: 6, fontFamily: "monospace" }}>F48N...jemX</div>}
                </div>
              </div>
            )}
 
            {/* STEP 3 */}
            {step2 && (
              <div className={step3 ? "" : "d-locked"}>
                <div className="d-stitle"><Icon n="circle-filled" s={8} /> STEP 3: JOIN THE COMMUNITY</div>
                <div className="d-step-card full" style={{ marginBottom: 18 }}>
                  <div className="d-step-badge">3</div>
                  <h4>Join OgaPay Communities</h4>
                  <p>Stay updated on new tasks, tips, and announcements from other earners.</p>
                  <div className="d-prov-grid">
                    {[
                      { id: "telegram", label: "Telegram",   icon: "brand-telegram", href: "https://t.me/ogapay",            bg: "#0088cc" },
                      { id: "x",        label: "X (Twitter)",icon: "brand-x",         href: "https://x.com/ogapay_ng",        bg: "#111"    },
                      { id: "discord",  label: "Discord",    icon: "brand-discord",   href: "https://discord.gg/ogapay",      bg: "#5865f2" },
                    ].map(p => (
                      <a key={p.id} href={p.href} target="_blank" rel="noopener noreferrer" className="d-prov">
                        <Icon n={p.icon} s={20} c={p.bg} />
                        <span>{p.label}</span>
                      </a>
                    ))}
                  </div>
                  <button className={`d-btn${step3 ? " green" : ""}`} onClick={() => doStep(2, "ogapay_step_community")}>
                    <Icon n="users" s={14} /> {step3 ? "✓ Community Joined" : "I've Joined — Mark as Done"}
                  </button>
                </div>
              </div>
            )}
 
            {/* STEP 4 */}
            {step3 && (
              <div className={step4 ? "" : "d-locked"}>
                <div className="d-stitle"><Icon n="circle-filled" s={8} /> STEP 4: COMPLETE YOUR FIRST TASK</div>
                <div className="d-step-card full" style={{ marginBottom: 18 }}>
                  <div className="d-step-badge">4</div>
                  <h4>Complete Your First Task</h4>
                  <p>Browse available tasks, apply for one, submit your proof, and receive your first OGA reward.</p>
                  <div className="d-mini-list">
                    {["Browse tasks", "Apply & complete", "Submit proof"].map((label, i) => (
                      <div key={i} className="d-mini-row">
                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--bg2)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                        <strong style={{ color: "var(--text)" }}>{label}</strong>
                        <Icon n="arrow-right" s={12} style={{ marginLeft: "auto" }} />
                      </div>
                    ))}
                  </div>
                  <a href="/tasks" className="d-btn"><Icon n="briefcase" s={14} /> Browse Available Tasks</a>
                </div>
              </div>
            )}
 
            {/* ── EARNINGS CHART ── */}
            <div className="d-chart-card">
              <div className="d-chart-head">
                <h3>Earnings</h3>
                <div className="d-chart-tabs">
                  <button className={`d-chart-tab${chartTab === "7d" ? " active" : ""}`} onClick={() => setChartTab("7d")}>7 days</button>
                  <button className={`d-chart-tab${chartTab === "30d" ? " active" : ""}`} onClick={() => setChartTab("30d")}>30 days</button>
                </div>
              </div>
              <div className="d-chart-total">0 <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text2)" }}>₦WURK</span></div>
              <Sparkline data={chartData} color="#16a34a" height={52} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                {["Tasks", "Referrals", "Tips"].map(l => (
                  <span key={l} style={{ fontSize: 11, color: "var(--text2)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: l === "Tasks" ? "#16a34a" : l === "Referrals" ? "#1F8CFF" : "#f59e0b", display: "inline-block" }} />
                    {l}: <strong style={{ color: "var(--text)" }}>0 ₦WURK</strong>
                  </span>
                ))}
              </div>
            </div>
 
            {/* ── QUICK LINKS ── */}
            <div className="d-stitle"><Icon n="bolt" s={14} /> QUICK LINKS</div>
            <div className="d-ql-grid">
              {[
                { icon: "layout-dashboard", label: "Job Monitor",      href: "/jobs/monitor" },
                { icon: "safe",             label: "Vault",             href: "/vault"         },
                { icon: "article",          label: "Blogs",             href: "/blog"          },
                { icon: "briefcase",        label: "Available Jobs",    href: "/tasks"         },
                { icon: "bookmark",         label: "Bookmarks",         href: "/bookmarks"     },
                { icon: "circle-plus",      label: "Create Job",        href: "/jobs/create"   },
              ].map(({ icon, label, href }) => (
                <a key={label} href={href} className="d-ql">
                  <Icon n={icon} s={22} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
 
            {/* ── TASK PREVIEWS ── */}
            <div className="d-chart-card">
              <div className="d-chart-head" style={{ marginBottom: 12 }}>
                <h3>Available Tasks</h3>
                <a href="/tasks" className="d-btn sm outline"><Icon n="arrow-right" s={12} /> View All</a>
              </div>
              {TASKS_PREVIEW.map((t, i) => (
                <a key={i} href="/tasks" className="d-task-card">
                  <div className="d-task-icon" style={{ background: t.bg }}>
                    <Icon n={t.icon} s={16} c="#fff" />
                  </div>
                  <div className="d-task-info">
                    <h4>{t.label}</h4>
                    <p>{t.meta}</p>
                  </div>
                  <div className="d-task-pay">{t.pay}</div>
                </a>
              ))}
            </div>
 
            {/* ── ACTIVITY FEED ── */}
            <div className="d-activity" style={{ marginTop: 0 }}>
              <div className="d-stitle" style={{ marginBottom: 6 }}><Icon n="activity" s={14} /> RECENT ACTIVITY</div>
              {ACTIVITY.map((a, i) => (
                <div key={i} className="d-activity-row">
                  <div className="d-activity-dot" style={{ background: a.dot }} />
                  <div className="d-activity-label">{a.label}</div>
                  <div className="d-activity-time">{a.time}</div>
                </div>
              ))}
            </div>
 
          </div>{/* end left column */}
 
          {/* ── RIGHT PANEL ── */}
          <div className="d-right">
 
            {/* Profile card */}
            <div className="d-rcard">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#111", color: "#fff",
                  display: "grid", placeItems: "center", fontFamily: "Outfit,sans-serif", fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                  {initials || "U"}
                </div>
                <div>
                  <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 15, fontWeight: 800 }}>{fname} {lname}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>{email}</div>
                </div>
              </div>
 
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Rank",        value: "Level 1" },
                  { label: "X Metric",    value: "0.00"    },
                  { label: "Sorsa Score", value: "0"       },
                  { label: "Human",       value: "Unverified" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--bg2)", borderRadius: 9, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text2)", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 14, fontWeight: 800 }}>{value}</div>
                  </div>
                ))}
              </div>
 
              <a href="/profile" className="d-btn outline" style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}>
                <Icon n="edit" s={14} /> Edit Profile
              </a>
            </div>
 
            {/* Referral card */}
            <div className="d-rcard">
              <h3>Your Referral Link</h3>
              <p className="d-rcard-sub">Share and earn ₦100 for every verified signup.</p>
              <div className="d-ref-box">
                <div className="d-ref-link">ogapay.ng/?ref=AMR6CGX</div>
                <button className="d-ref-copy" onClick={copyRef} title="Copy link">
                  <Icon n={refCopied ? "check" : "copy"} s={14} c={refCopied ? "#16a34a" : "var(--text2)"} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <a href="https://x.com/intent/tweet?text=https://ogapay.ng/?ref=AMR6CGX" target="_blank" rel="noopener noreferrer"
                  className="d-btn sm" style={{ flex: 1, justifyContent: "center", background: "#111" }}>
                  <Icon n="brand-x" s={13} /> Post on X
                </a>
                <button className="d-btn sm outline" style={{ flex: 1, justifyContent: "center" }} onClick={copyRef}>
                  <Icon n="copy" s={13} /> {refCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
 
            {/* Resources card */}
            <div className="d-rcard">
              <h3>Resources</h3>
              <p className="d-rcard-sub">Get help, watch guides, and connect with our community.</p>
              <a href="https://t.me/ogapay" target="_blank" rel="noopener noreferrer" className="d-res-link">
                <div className="d-res-icon" style={{ background: "#0088cc" }}><Icon n="brand-telegram" s={16} c="#fff" /></div>
                <div><h4>Telegram Support</h4><p>Where the talk happens ↗</p></div>
              </a>
              <a href="/docs" className="d-res-link">
                <div className="d-res-icon" style={{ background: "var(--bg2)" }}><Icon n="book" s={16} /></div>
                <div><h4>Documentation</h4><p>Learn how to earn on OgaPay ↗</p></div>
              </a>
              <a href="/communities" className="d-res-link">
                <div className="d-res-icon" style={{ background: "#f59e0b" }}><Icon n="users" s={16} c="#fff" /></div>
                <div><h4>Community</h4><p>Join Nigerian Earners Hub ↗</p></div>
              </a>
              <div className="d-divider" />
              <div className="d-rlink-title" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text2)", marginBottom: 4 }}>LINKS</div>
              <a href="https://x.com/ogapay_ng" target="_blank" rel="noopener noreferrer" className="d-rlink">
                <Icon n="brand-x" s={14} /> Twitter <Icon n="arrow-up-right" s={12} style={{ marginLeft: "auto" }} />
              </a>
              <a href="/support" className="d-rlink">
                <Icon n="headset" s={14} /> Support <Icon n="arrow-up-right" s={12} style={{ marginLeft: "auto" }} />
              </a>
              <a href="/" className="d-rlink">
                <Icon n="home" s={14} /> Back to Home <Icon n="arrow-up-right" s={12} style={{ marginLeft: "auto" }} />
              </a>
            </div>
 
            {/* Progress widget */}
            <div className="d-rcard">
              <h3>Setup Progress</h3>
              <p className="d-rcard-sub">{completed} of {total} steps complete</p>
              <div className="d-prog-widget">
                <div className="d-prog-row">
                  <span>{completed}/{total} steps done</span>
                  <span style={{ color: allDone ? "#16a34a" : "inherit" }}>{pct}%</span>
                </div>
                <div className="d-prog-bar" style={{ margin: "0 0 10px" }}>
                  <div className={`d-prog-fill${allDone ? " done" : ""}`} style={{ width: `${pct}%` }} />
                </div>
                {checklist.map((item, i) => (
                  <div key={i} className={`d-chk-item${item.done ? " done" : ""}`}>
                    <div className={`d-chk-bul${item.done ? " done" : ""}`}>
                      {item.done && <Icon n="check" s={10} c="#fff" />}
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>
              {allDone && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon n="check" s={14} c="#16a34a" /> All steps complete!
                </div>
              )}
            </div>
 
          </div>{/* end right panel */}
 
        </div>{/* end two-column grid */}
      </div>
    </Layout>
  );
}
