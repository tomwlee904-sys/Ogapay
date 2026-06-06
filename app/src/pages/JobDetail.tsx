import { useState, useEffect } from "react";
import Layout from "../components/Layout";

// ── MOCK DATA ──────────────────────────────────────────────────────────────
const JOB = {
  id: "OGA-2025-0842",
  title: "Follow & Repost OgaPay Launch Announcement on X",
  brand: "OgaPay Official",
  brandHandle: "@OgaPayHQ",
  brandAvatar: "OP",
  brandVerified: true,
  category: "Social Media",
  type: "Easy Task",
  platform: "X (Twitter)",
  reward: 450,
  currency: "NGN",
  usdEquiv: "$0.28",
  slots: 200,
  slotsLeft: 47,
  completions: 153,
  deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
  posted: "May 29, 2026",
  status: "open",
  difficulty: "Easy",
  estimatedTime: "2–4 mins",
  memberPlanRequired: "Free",
  description: `OgaPay is launching its official X presence and we need real engagement from our community to boost visibility.\n\nComplete the following steps and submit your proof to earn ₦450 instantly upon approval.`,
  steps: [
    "Follow the official OgaPay X account: @OgaPayHQ",
    "Repost the pinned announcement post on our profile",
    "Like the post and leave a genuine comment (minimum 10 words)",
    "Take a screenshot showing your follow, repost, like, and comment",
    "Submit the screenshot and your X username below",
  ],
  requirements: [
    "Your X account must be at least 30 days old",
    "Minimum 10 followers on your X account",
    "Account must be public (not private) at time of review",
    "One submission per OgaPay account",
    "Do not unfollow after submission — accounts are rechecked",
  ],
  proofRequired: ["Screenshot of completed actions", "Your X username / profile URL"],
  tags: ["Twitter", "Social", "Follow", "Repost", "Easy"],
  approvalTime: "Within 24 hours",
  payoutDay: "Thursday",
  totalPool: "₦90,000",
  applicants: [
    { initials: "AO", color: "#121566" },
    { initials: "EK", color: "#10b981" },
    { initials: "FB", color: "#f59e0b" },
    { initials: "TM", color: "#ef4444" },
    { initials: "NK", color: "#3b82f6" },
  ],
  similarJobs: [
    { id: "OGA-0840", title: "Join OgaPay Telegram Community", reward: 300, slots: 500, left: 212, type: "Social" },
    { id: "OGA-0839", title: "Like & Comment on Instagram Post", reward: 350, slots: 300, left: 88, type: "Social" },
    { id: "OGA-0835", title: "OGA Token Airdrop Task", reward: 2000, slots: 100, left: 23, type: "Crypto" },
  ],
};

// ── HELPERS ────────────────────────────────────────────────────────────────
function useCountdown(deadline) {
  const calc = () => {
    const diff = deadline - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return t;
}

const pad = (n) => String(n).padStart(2, "0");
const pct = (a, b) => Math.round((a / b) * 100);

// ── BADGE ──────────────────────────────────────────────────────────────────
function Badge({ children, color = "purple" }) {
  const map = {
    purple: "bg-[#121566]/15 text-[#121566] border-[#121566]/30",
    green:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    amber:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
    blue:   "bg-blue-500/15 text-blue-400 border-blue-500/30",
    red:    "bg-red-500/15 text-red-400 border-red-500/30",
    gray:   "bg-white/5 text-gray-400 border-white/10",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[color]}`}>
      {children}
    </span>
  );
}

// ── COUNTDOWN BLOCK ────────────────────────────────────────────────────────
function CountdownBlock({ deadline }) {
  const { d, h, m, s } = useCountdown(deadline);
  const units = [
    { v: d, l: "Days" },
    { v: h, l: "Hrs" },
    { v: m, l: "Min" },
    { v: s, l: "Sec" },
  ];
  return (
    <div className="flex gap-2">
      {units.map(({ v, l }) => (
        <div key={l} className="flex-1 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center py-2.5">
          <span className="text-xl font-black tabular-nums text-white">{pad(v)}</span>
          <span className="text-[10px] text-gray-500 font-semibold mt-0.5">{l}</span>
        </div>
      ))}
    </div>
  );
}

// ── APPLY MODAL ────────────────────────────────────────────────────────────
function ApplyModal({ job, onClose }) {
  const [step, setStep] = useState(1); // 1=form 2=success
  const [xHandle, setXHandle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!xHandle || !file) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(2); }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#13131f] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Apply for Job</p>
            <p className="text-sm font-bold text-white mt-0.5 line-clamp-1">{job.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {step === 1 ? (
          <div className="p-5 space-y-4">
            {/* Reward reminder */}
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-400">Reward on approval</span>
              <span className="text-lg font-black text-emerald-400">+₦{job.reward.toLocaleString()}</span>
            </div>

            {/* X handle */}
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">Your X (Twitter) Username *</label>
              <input
                value={xHandle}
                onChange={e => setXHandle(e.target.value)}
                placeholder="@yourusername"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Proof upload */}
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">Screenshot Proof *</label>
              <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-white/15 rounded-xl px-4 py-6 cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all">
                {file ? (
                  <>
                    <svg width="20" height="20" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span className="text-xs text-emerald-400 font-semibold">{file.name}</span>
                    <span className="text-xs text-gray-500">Click to change</span>
                  </>
                ) : (
                  <>
                    <svg width="24" height="24" fill="none" stroke="#6b7280" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-xs text-gray-500">Click to upload screenshot</span>
                    <span className="text-xs text-gray-600">PNG, JPG up to 10MB</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files[0])} />
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">Additional Notes <span className="text-gray-600">(optional)</span></label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any extra context for the reviewer..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            {/* Terms note */}
            <p className="text-xs text-gray-600 leading-relaxed">
              By submitting you confirm all proof is genuine. Fake submissions result in account suspension.
            </p>

            <button
              onClick={submit}
              disabled={!xHandle || !file || loading}
              className="w-full bg-[#121566] hover:bg-[#0D6EEB] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="30 70"/></svg>
                  Submitting...
                </>
              ) : "Submit Application →"}
            </button>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <svg width="28" height="28" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Submission Received!</h3>
              <p className="text-sm text-gray-400 mt-1">Your application is under review. You'll be notified within {job.approvalTime.toLowerCase()}.</p>
            </div>
            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Job ID</span>
                <span className="font-mono text-xs text-gray-300">{job.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reward</span>
                <span className="font-bold text-emerald-400">₦{job.reward.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payout day</span>
                <span className="text-white font-semibold">{job.payoutDay}</span>
              </div>
            </div>
            <button onClick={onClose} className="w-full border border-white/10 hover:border-purple-500/50 text-gray-300 font-bold py-3 rounded-xl text-sm transition-colors">
              Back to Job
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SHARE PANEL ────────────────────────────────────────────────────────────
function SharePanel({ job, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = `https://ogapay.net/jobs/${job.id}`;
  const copy = () => {
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const shares = [
    { label: "X (Twitter)", icon: "𝕏", href: `https://twitter.com/intent/tweet?text=Earn+₦${job.reward}+on+OgaPay!&url=${url}`, color: "hover:border-white/30" },
    { label: "WhatsApp", icon: "💬", href: `https://wa.me/?text=Earn+₦${job.reward}+completing+tasks+on+OgaPay:+${url}`, color: "hover:border-green-500/40" },
    { label: "Telegram", icon: "✈️", href: `https://t.me/share/url?url=${url}&text=Earn+₦${job.reward}+on+OgaPay`, color: "hover:border-blue-500/40" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-[#13131f] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-white">Share this Job</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {shares.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              className={`flex flex-col items-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl ${s.color} transition-colors`}>
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs text-gray-400 font-semibold">{s.label}</span>
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
          <span className="flex-1 text-xs text-gray-400 font-mono truncate">{url}</span>
          <button onClick={copy} className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-500/20 text-[#121566] hover:bg-purple-500/30 transition-colors">
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function JobDetail() {
  const [showApply, setShowApply]   = useState(false);
  const [showShare, setShowShare]   = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [activeTab, setActiveTab]   = useState("details"); // details | requirements | activity

  const filledPct = pct(JOB.completions, JOB.slots);
  const isAlmostFull = JOB.slotsLeft < 60;

  return (
    <Layout>
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }} className="min-h-screen bg-[#0a0a0f] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #121566; border-radius: 4px; }
        .line-clamp-1 { overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical; }
        .line-clamp-2 { overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical; }
        .tab-active { color:#fff; border-bottom: 2px solid #121566; }
        .tab-inactive { color:#6b7280; border-bottom: 2px solid transparent; }
        .tab-inactive:hover { color:#9ca3af; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.8s linear infinite; }
        .progress-bar { transition: width 0.8s cubic-bezier(.4,0,.2,1); }
        .card { background: #13131f; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; }
        .card-sm { background: #13131f; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; }
        .glow { box-shadow: 0 0 0 1px rgba(139,92,246,0.3), 0 8px 32px rgba(139,92,246,0.12); }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        className="sticky top-0 z-40 px-4 h-13 flex items-center justify-between gap-3"
        style2={{ height: 52 }}>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => window.history.back()}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <rect x="0" y="0" width="7" height="7" rx="1.5" fill="#0a0a0f"/>
                <rect x="9" y="0" width="7" height="7" rx="1.5" fill="#0a0a0f"/>
                <rect x="0" y="9" width="7" height="7" rx="1.5" fill="#0a0a0f"/>
                <rect x="9" y="9" width="7" height="7" rx="1.5" fill="#121566"/>
              </svg>
            </div>
            <span className="font-black text-sm tracking-tight">OgaPay</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBookmarked(b => !b)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${bookmarked ? "bg-[#121566]/15 border-purple-500/40 text-[#121566]" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
            <svg width="14" height="14" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </button>
          <button onClick={() => setShowShare(true)}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-5 pb-32 space-y-4">

        {/* ── JOB HEADER ── */}
        <div className="card p-5">
          {/* Brand row */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#121566,#4f46e5)" }}>
              {JOB.brandAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">{JOB.brand}</span>
                {JOB.brandVerified && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#121566"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                )}
              </div>
              <span className="text-xs text-gray-500">{JOB.brandHandle}</span>
            </div>
            <Badge color="green">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" style={{ animation: "pulse 1.5s infinite" }} />
              Open
            </Badge>
          </div>

          {/* Title */}
          <h1 className="text-xl font-black leading-tight mb-3">{JOB.title}</h1>

          {/* Tag row */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge color="purple">{JOB.category}</Badge>
            <Badge color="blue">{JOB.platform}</Badge>
            <Badge color="gray">{JOB.difficulty}</Badge>
            <Badge color="gray">⏱ {JOB.estimatedTime}</Badge>
            {JOB.memberPlanRequired === "Free" && <Badge color="green">✓ Free Plan</Badge>}
          </div>

          {/* Reward hero */}
          <div className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3 mb-4">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Reward per task</p>
              <p className="text-3xl font-black text-emerald-400">₦{JOB.reward.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">≈ {JOB.usdEquiv} USD</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Total Pool</p>
              <p className="text-xl font-black text-white">{JOB.totalPool}</p>
              <p className="text-xs text-gray-500 mt-0.5">{JOB.slots} slots total</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-semibold">{JOB.completions} completed</span>
            <span className={`font-bold ${isAlmostFull ? "text-amber-400" : "text-gray-400"}`}>
              {JOB.slotsLeft} slots left {isAlmostFull && "⚠️"}
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
            <div className="progress-bar h-full rounded-full" style={{ width: `${filledPct}%`, background: "linear-gradient(90deg,#121566,#10b981)" }} />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Job ID", value: JOB.id, mono: true },
              { label: "Posted", value: JOB.posted },
              { label: "Approval", value: JOB.approvalTime },
              { label: "Payout Day", value: JOB.payoutDay },
            ].map(m => (
              <div key={m.label} className="bg-white/3 border border-white/8 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-0.5">{m.label}</p>
                <p className={`text-sm font-bold text-white ${m.mono ? "font-mono text-xs" : ""}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">⏳ Time Remaining</p>
            <CountdownBlock deadline={JOB.deadline} />
          </div>

          {/* Applicants */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {JOB.applicants.map((a, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#13131f] flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                  style={{ background: a.color, zIndex: JOB.applicants.length - i }}>
                  {a.initials.charAt(0)}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              <span className="text-white font-bold">{JOB.completions}</span> people already completed this
            </p>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="card overflow-hidden">
          <div className="flex border-b border-white/7">
            {["details", "requirements", "activity"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? "tab-active" : "tab-inactive"}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="p-5">

            {/* DETAILS */}
            {activeTab === "details" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">About This Task</h3>
                  {JOB.description.split("\n\n").map((p, i) => (
                    <p key={i} className="text-sm text-gray-300 leading-relaxed mb-2">{p}</p>
                  ))}
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Steps to Complete</h3>
                  <div className="space-y-2.5">
                    {JOB.steps.map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-lg bg-[#121566]/15 border border-[#121566]/30 flex items-center justify-center text-xs font-black text-[#121566] flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Proof Required</h3>
                  <div className="space-y-2">
                    {JOB.proofRequired.map((p, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                        <svg width="14" height="14" fill="none" stroke="#121566" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {JOB.tags.map(t => <Badge key={t} color="gray">{t}</Badge>)}
                  </div>
                </div>
              </div>
            )}

            {/* REQUIREMENTS */}
            {activeTab === "requirements" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Eligibility Requirements</h3>
                  <div className="space-y-2.5">
                    {JOB.requirements.map((r, i) => (
                      <div key={i} className="flex gap-3 items-start p-3 bg-white/3 border border-white/7 rounded-xl">
                        <svg width="15" height="15" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <p className="text-sm text-gray-300 leading-relaxed">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="15" height="15" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Warning</p>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Submitting fake, edited, or borrowed screenshots will result in immediate rejection and may lead to account suspension. OgaPay's AI review system checks all submissions.
                  </p>
                </div>

                <div className="bg-purple-500/8 border border-[#121566]/20 rounded-xl p-4">
                  <p className="text-xs font-bold text-[#121566] uppercase tracking-wider mb-1">Plan Required</p>
                  <p className="text-sm text-gray-300">This job is available on the <span className="text-white font-bold">Free Plan</span> and above. No paid membership needed.</p>
                </div>
              </div>
            )}

            {/* ACTIVITY */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Completions</h3>
                  <Badge color="green">{JOB.completions} total</Badge>
                </div>
                <div className="space-y-2">
                  {[
                    { user: "Adaeze O.", time: "2 mins ago", status: "approved" },
                    { user: "Emeka K.", time: "15 mins ago", status: "approved" },
                    { user: "Fatima B.", time: "1 hr ago", status: "approved" },
                    { user: "Tunde M.", time: "2 hrs ago", status: "pending" },
                    { user: "Ngozi A.", time: "3 hrs ago", status: "approved" },
                    { user: "Seun T.", time: "4 hrs ago", status: "rejected" },
                    { user: "Kemi O.", time: "5 hrs ago", status: "approved" },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/3 border border-white/7 rounded-xl">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: ["#121566","#10b981","#f59e0b","#ef4444","#3b82f6","#ec4899","#14b8a6"][i] }}>
                        {a.user.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{a.user}</p>
                        <p className="text-xs text-gray-500">{a.time}</p>
                      </div>
                      <Badge color={a.status === "approved" ? "green" : a.status === "pending" ? "amber" : "red"}>
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[
                    { label: "Approval Rate", value: "89%", color: "text-emerald-400" },
                    { label: "Avg Review Time", value: "6h", color: "text-white" },
                    { label: "Rejection Rate", value: "11%", color: "text-red-400" },
                  ].map(s => (
                    <div key={s.label} className="bg-white/3 border border-white/7 rounded-xl p-3 text-center">
                      <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── SIMILAR JOBS ── */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Similar Jobs</h3>
          <div className="space-y-2">
            {JOB.similarJobs.map(j => (
              <div key={j.id} className="card p-4 flex items-center gap-3 hover:border-[#121566]/30 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-[#121566]/15 border border-[#121566]/20 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" fill="none" stroke="#121566" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white line-clamp-1">{j.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{j.left} slots left · {j.type}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-emerald-400">₦{j.reward.toLocaleString()}</p>
                  <p className="text-xs text-gray-600">{j.id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── REPORT ── */}
        <div className="flex items-center justify-center">
          <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors font-semibold py-2 px-4">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            Report this job
          </button>
        </div>
      </div>

      {/* ── STICKY BOTTOM CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4"
        style={{ background: "linear-gradient(to top, #0a0a0f 60%, transparent)" }}>
        <div className="max-w-3xl mx-auto">
          {JOB.slotsLeft > 0 ? (
            <div className="flex gap-3">
              <button
                onClick={() => setShowApply(true)}
                className="flex-1 glow bg-[#121566] hover:bg-[#0D6EEB] text-white font-black py-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Apply & Earn ₦{JOB.reward.toLocaleString()} →
              </button>
              <button onClick={() => setBookmarked(b => !b)}
                className={`w-14 rounded-2xl border flex items-center justify-center transition-all ${bookmarked ? "bg-[#121566]/15 border-purple-500/40 text-[#121566]" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
                <svg width="16" height="16" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </button>
            </div>
          ) : (
            <button disabled className="w-full bg-white/5 border border-white/10 text-gray-500 font-black py-4 rounded-2xl text-sm cursor-not-allowed">
              All Slots Filled — Job Closed
            </button>
          )}
          <p className="text-center text-xs text-gray-600 mt-2 font-semibold">
            {JOB.slotsLeft} slots remaining · Payout every {JOB.payoutDay}
          </p>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showApply && <ApplyModal job={JOB} onClose={() => setShowApply(false)} />}
      {showShare && <SharePanel job={JOB} onClose={() => setShowShare(false)} />}
    </div>
      </Layout>
    );
}
