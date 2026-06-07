import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { API_BASE } from "../lib/api";
import { useAuth } from "../context/AuthContext";

// ── MOCK DATA ──────────────────────────────────────────────────────────────
const JOBS = [
  {
    id: "OGA-2025-0842", customId: "launch-x-follow",
    title: "Follow & Repost OgaPay Launch on X",
    type: "social", platform: "X (Twitter)",
    status: "active", selectionType: "random",
    reward: 450, currency: "NGN", budget: 90000, spent: 68850, remaining: 21150,
    slots: 200, winners: 153, pending: 12, rejected: 8,
    approvalRate: 89, avgFillTime: "6h",
    deadline: "Jun 12, 2026", posted: "May 29, 2026",
    secret: "sk_oga_xf29ak92",
    submissions: [
      { id: "SUB-001", user: "Adaeze O.", handle: "@adaeze_og", time: "2m ago", status: "approved", proof: "screenshot.png", score: 94 },
      { id: "SUB-002", user: "Emeka K.", handle: "@emeka_k", time: "15m ago", status: "approved", proof: "proof.jpg", score: 88 },
      { id: "SUB-003", user: "Fatima B.", handle: "@fatimab_", time: "1h ago", status: "pending", proof: "img.png", score: 72 },
      { id: "SUB-004", user: "Tunde M.", handle: "@tunde_m", time: "2h ago", status: "pending", proof: "sc.jpg", score: 65 },
      { id: "SUB-005", user: "Ngozi A.", handle: "@ngozi_a", time: "3h ago", status: "rejected", proof: "fake.png", score: 22 },
    ],
  },
  {
    id: "OGA-2025-0839", customId: "ig-comment-boost",
    title: "Like & Comment on Instagram Post",
    type: "social", platform: "Instagram",
    status: "active", selectionType: "creator",
    reward: 350, currency: "NGN", budget: 35000, spent: 19250, remaining: 15750,
    slots: 100, winners: 55, pending: 8, rejected: 3,
    approvalRate: 92, avgFillTime: "4h",
    deadline: "Jun 10, 2026", posted: "May 28, 2026",
    secret: "sk_oga_ig38bx11",
    submissions: [
      { id: "SUB-011", user: "Kemi O.", handle: "@kemi_o_ng", time: "30m ago", status: "pending", proof: "insta.png", score: 80 },
      { id: "SUB-012", user: "Seun T.", handle: "@seun_t", time: "2h ago", status: "approved", proof: "ig_proof.jpg", score: 91 },
    ],
  },
  {
    id: "OGA-2025-0835", customId: "oga-airdrop-q2",
    title: "OGA Token Airdrop Task — Q2",
    type: "crypto", platform: "On-chain",
    status: "paused", selectionType: "random",
    reward: 2000, currency: "NGN", budget: 200000, spent: 46000, remaining: 154000,
    slots: 100, winners: 23, pending: 4, rejected: 1,
    approvalRate: 85, avgFillTime: "12h",
    deadline: "Jun 20, 2026", posted: "May 25, 2026",
    secret: "sk_oga_at55ck07",
    submissions: [
      { id: "SUB-021", user: "Biodun F.", handle: "@biodun_f", time: "5h ago", status: "pending", proof: "wallet.png", score: 78 },
    ],
  },
  {
    id: "OGA-2025-0820", customId: "tg-community-join",
    title: "Join OgaPay Telegram Community",
    type: "social", platform: "Telegram",
    status: "completed", selectionType: "random",
    reward: 300, currency: "NGN", budget: 60000, spent: 60000, remaining: 0,
    slots: 200, winners: 200, pending: 0, rejected: 14,
    approvalRate: 93, avgFillTime: "2h",
    deadline: "May 20, 2026", posted: "May 10, 2026",
    secret: "sk_oga_tg20yx44",
    submissions: [],
  },
];

const BLACKLIST_INIT = [
  { id: "BL-001", user: "Fake_Promo99", handle: "@fake_promo99", reason: "Submitted fake screenshot", blockedAt: "May 28, 2026", color: "#ef4444" },
  { id: "BL-002", user: "ScamBot22", handle: "@scambot22", reason: "Multiple accounts detected", blockedAt: "May 20, 2026", color: "#f59e0b" },
];

const TEMPLATES_INIT = {
  mine: [
    { id: "TPL-001", title: "Follow OgaPay on X", category: "Social Media", visibility: "private", updatedAt: "6/6/2026, 4:20 PM", description: "Follow our X account and repost the pinned tweet. Screenshot required.", platform: "X (Twitter)", reward: 450, slots: 200 },
  ],
  public: [
    { id: "TPL-P01", title: "X/Twitter Feedback", category: "Web & App Build / Website Design", visibility: "community", updatedAt: "6/1/2026, 10:23 PM", description: "Give honest feedback on our website UI via X post.", platform: "X (Twitter)", reward: 300, slots: 100 },
    { id: "TPL-P02", title: "Post About $OGA Token", category: "Writing & Translation / Blog Posts", visibility: "community", updatedAt: "5/29/2026, 2:50 AM", description: "Write and post a tweet about the OGA token launch.", platform: "X (Twitter)", reward: 500, slots: 50 },
    { id: "TPL-P03", title: "Twitter Article Writing", category: "Writing & Translation / Blog Posts", visibility: "community", updatedAt: "5/28/2026, 9:35 PM", description: "Write a thread article about our product on Twitter/X.", platform: "X (Twitter)", reward: 800, slots: 30 },
    { id: "TPL-P04", title: "Join Telegram & Stay Active", category: "Social & Community / Growth", visibility: "community", updatedAt: "5/27/2026, 3:10 PM", description: "Join our Telegram group and send at least 3 messages.", platform: "Telegram", reward: 250, slots: 500 },
    { id: "TPL-P05", title: "Instagram Story Mention", category: "Social Media / Content Creation", visibility: "community", updatedAt: "5/26/2026, 11:00 AM", description: "Post a story mentioning our brand on Instagram.", platform: "Instagram", reward: 600, slots: 150 },
    { id: "TPL-P06", title: "YouTube Comment & Like", category: "Social Media / Video", visibility: "community", updatedAt: "5/25/2026, 8:44 AM", description: "Like and leave a meaningful comment on our YouTube video.", platform: "YouTube", reward: 200, slots: 300 },
  ],
};

const statusColor = { active: "var(--green)", paused: "#f59e0b", completed: "var(--text3)" };
const statusBg = {
  active: "rgba(16,185,129,0.12)", paused: "rgba(245,158,11,0.12)",
  completed: "rgba(255,255,255,0.05)",
};
const subColor = { approved: "var(--green)", pending: "#f59e0b", rejected: "var(--red)" };
const subBg = {
  approved: "rgba(16,185,129,0.12)", pending: "rgba(245,158,11,0.12)",
  rejected: "rgba(239,68,68,0.12)",
};

function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

function Badge({ label, color, bg }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: bg || "rgba(255,255,255,0.07)", color: color || "var(--text2)", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {label}
    </span>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 12, padding: "12px 14px", flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: color || "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ProgressBar({ value, max, color }) {
  return (
    <div style={{ height: 5, background: "var(--bg2)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${pct(value, max)}%`, height: "100%", background: color || `linear-gradient(90deg,${"var(--accent)"},${"var(--green)"})`, borderRadius: 3, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ── CREATE JOB MODAL ───────────────────────────────────────────────────────
function CreateJobModal({ onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "", type: "social", platform: "X (Twitter)",
    description: "", reward: "", slots: "", selectionType: "random",
    selectionMins: "60", attachmentRequired: "yes", deadline: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const totalBudget = form.reward && form.slots ? (parseInt(form.reward) * parseInt(form.slots)).toLocaleString() : "—";

  const platforms = ["X (Twitter)", "Instagram", "Telegram", "Discord", "YouTube", "On-chain", "Survey", "Other"];
  const types = ["social", "crypto", "survey", "content", "referral"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 600, background: "var(--card)", border: `1px solid ${"var(--border2)"}`, borderRadius: "24px 24px 0 0", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ position: "sticky", top: 0, background: "var(--card)", borderBottom: `1px solid ${"var(--border)"}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Step {step} of 3</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
              {step === 1 ? "Job Details" : step === 2 ? "Budget & Slots" : "Review & Launch"}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, color: "var(--text3)", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Step indicator */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? "var(--accent)" : "var(--border)" }} />
            ))}
          </div>

          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Job Title *">
                <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Follow OgaPay on X" style={inputStyle} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Task Type">
                  <select value={form.type} onChange={e => set("type", e.target.value)} style={inputStyle}>
                    {types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </Field>
                <Field label="Platform">
                  <select value={form.platform} onChange={e => set("platform", e.target.value)} style={inputStyle}>
                    {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Task Description *">
                <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe what workers need to do, step by step..." rows={4} style={{ ...inputStyle, resize: "none" }} />
              </Field>
              <Field label="Proof Required">
                <select value={form.attachmentRequired} onChange={e => set("attachmentRequired", e.target.value)} style={inputStyle}>
                  <option value="yes">Yes — Screenshot required</option>
                  <option value="no">No — Text submission only</option>
                </select>
              </Field>
              <Field label="Deadline">
                <input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} style={inputStyle} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Reward per Worker (₦) *">
                  <input type="number" value={form.reward} onChange={e => set("reward", e.target.value)} placeholder="e.g. 450" style={inputStyle} />
                </Field>
                <Field label="Total Slots *">
                  <input type="number" value={form.slots} onChange={e => set("slots", e.target.value)} placeholder="e.g. 200" style={inputStyle} />
                </Field>
              </div>
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Budget Summary</div>
                {[
                  ["Reward per worker", form.reward ? `₦${parseInt(form.reward).toLocaleString()}` : "—"],
                  ["Total slots", form.slots || "—"],
                  ["Total budget required", `₦${totalBudget}`],
                  ["Platform fee (5%)", form.reward && form.slots ? `₦${Math.round(parseInt(form.reward) * parseInt(form.slots) * 0.05).toLocaleString()}` : "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--text2)" }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{v}</span>
                  </div>
                ))}
              </div>
              <Field label="Winner Selection Mode">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["random", "creator"].map(t => (
                    <div key={t} onClick={() => set("selectionType", t)}
                      style={{ padding: "12px", borderRadius: 12, border: `1px solid ${form.selectionType === t ? "var(--accent)" : "var(--border)"}`, background: form.selectionType === t ? "var(--bg2)" : "rgba(255,255,255,0.03)", cursor: "pointer" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: form.selectionType === t ? "var(--accent)" : "var(--text)" }}>{t === "random" ? "🎲 Random" : "👤 You Choose"}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                        {t === "random" ? "Winners auto-selected when timer closes" : "You manually pick winners from submissions"}
                      </div>
                    </div>
                  ))}
                </div>
              </Field>
              {form.selectionType === "creator" && (
                <Field label="Selection Window (minutes)">
                  <select value={form.selectionMins} onChange={e => set("selectionMins", e.target.value)} style={inputStyle}>
                    {["60", "120", "240", "480", "1440", "4320"].map(m => (
                      <option key={m} value={m}>{m === "60" ? "1 hour" : m === "120" ? "2 hours" : m === "240" ? "4 hours" : m === "480" ? "8 hours" : m === "1440" ? "1 day" : "3 days"}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Job Summary</div>
                {[
                  ["Title", form.title || "—"],
                  ["Type", form.type],
                  ["Platform", form.platform],
                  ["Reward", form.reward ? `₦${parseInt(form.reward).toLocaleString()}` : "—"],
                  ["Slots", form.slots || "—"],
                  ["Total Budget", form.reward && form.slots ? `₦${(parseInt(form.reward) * parseInt(form.slots)).toLocaleString()}` : "—"],
                  ["Selection", form.selectionType === "random" ? "Random (auto)" : "Creator (manual)"],
                  ["Proof Required", form.attachmentRequired === "yes" ? "Yes" : "No"],
                  ["Deadline", form.deadline || "Not set"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${"var(--border)"}` }}>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: "#f59e0b", lineHeight: 1.6 }}>
                  ⚠ Your wallet will be charged <strong>₦{form.reward && form.slots ? (parseInt(form.reward) * parseInt(form.slots) * 1.05).toLocaleString() : "—"}</strong> (budget + 5% platform fee) to launch this job.
                </div>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ flex: 1, background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 700, color: "var(--text2)", cursor: "pointer" }}>
                ← Back
              </button>
            )}
            <button
              onClick={() => {
                if (step < 3) { setStep(s => s + 1); }
                else { onCreate(form); onClose(); }
              }}
              style={{ flex: 2, background: "var(--accent)", border: "none", borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer" }}>
              {step < 3 ? "Continue →" : "🚀 Launch Job"}
            </button>
          </div>
          <div style={{ height: 8 }} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "var(--bg2)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#fff",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

// ── JOB DETAIL DRAWER ─────────────────────────────────────────────────────
function JobDrawer({ job, onClose, onStatusChange }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [manualWinners, setManualWinners] = useState([]);

  const copySecret = () => {
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const toggleWinner = (id) => {
    setManualWinners(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]);
  };

  const tabStyle = (t) => ({
    padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.06em", cursor: "pointer", background: "transparent",
    border: "none", fontFamily: "inherit", whiteSpace: "nowrap",
    color: activeTab === t ? "var(--accent)" : "var(--text3)",
    borderBottom: activeTab === t ? `2px solid ${"var(--accent)"}` : "2px solid transparent",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 600, background: "var(--card)", border: `1px solid ${"var(--border2)"}`, borderRadius: "24px 24px 0 0", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

        {/* Drag pill */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "0 20px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>{job.title}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge label={job.id} color={"var(--text3)"} />
                <Badge label={job.status.toUpperCase()} color={statusColor[job.status]} bg={statusBg[job.status]} />
                <Badge label={job.selectionType === "creator" ? "👤 Manual" : "🎲 Auto"} />
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, color: "var(--text3)", cursor: "pointer", flexShrink: 0, fontSize: 13 }}>✕</button>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", borderBottom: `1px solid ${"var(--border)"}`, overflowX: "auto", flexShrink: 0 }}>
          {["overview", "submissions", "analytics", "settings"].map(t => (
            <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <StatBox label="Winners" value={job.winners} color={"var(--green)"} />
                <StatBox label="Pending" value={job.pending} color={"#f59e0b"} />
                <StatBox label="Rejected" value={job.rejected} color={"var(--red)"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <StatBox label="Approval Rate" value={`${job.approvalRate}%`} color={"var(--green)"} />
                <StatBox label="Avg Fill Time" value={job.avgFillTime} />
              </div>

              {/* Budget */}
              <div style={{ background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Budget</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--text2)" }}>Total budget</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>₦{job.budget.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--text2)" }}>Spent</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>₦{job.spent.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text2)" }}>Remaining</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>₦{job.remaining.toLocaleString()}</span>
                </div>
                <ProgressBar value={job.spent} max={job.budget} />
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>{pct(job.spent, job.budget)}% of budget used</div>
              </div>

              {/* Slots */}
              <div style={{ background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Slots</span>
                  <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>{job.winners} / {job.slots} filled</span>
                </div>
                <ProgressBar value={job.winners} max={job.slots} />
              </div>

              {/* Secret */}
              <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid var(--bg2)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Job Secret (API)</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontFamily: "monospace", fontSize: 12, color: "var(--text2)", background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.secret}</span>
                  <button onClick={copySecret} style={{ flexShrink: 0, background: copiedSecret ? "rgba(16,185,129,0.2)" : "var(--bg2)", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, color: copiedSecret ? "var(--green)" : "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>
                    {copiedSecret ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8, lineHeight: 1.5 }}>Use this secret to view submissions via API or choose winners programmatically.</div>
              </div>

              {/* Info */}
              {[["Platform", job.platform], ["Reward/slot", `₦${job.reward.toLocaleString()}`], ["Selection", job.selectionType], ["Posted", job.posted], ["Deadline", job.deadline]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${"var(--border)"}` }}>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>{k}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* SUBMISSIONS */}
          {activeTab === "submissions" && (
            <div>
              {job.selectionType === "creator" && manualWinners.length > 0 && (
                <div style={{ background: "var(--bg2)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{manualWinners.length} winner(s) selected</span>
                  <button style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                    Confirm Winners →
                  </button>
                </div>
              )}

              {job.submissions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text3)", fontSize: 13 }}>No submissions yet</div>
              ) : (
                job.submissions.map(sub => (
                  <div key={sub.id} style={{ background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `hsl(${sub.id.charCodeAt(4) * 30},60%,45%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                        {sub.user[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{sub.user}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>{sub.handle} · {sub.time}</div>
                      </div>
                      <Badge label={sub.status.charAt(0).toUpperCase() + sub.status.slice(1)} color={subColor[sub.status]} bg={subBg[sub.status]} />
                    </div>

                    {/* Score bar */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600 }}>AI Score</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: sub.score >= 80 ? "var(--green)" : sub.score >= 60 ? "#f59e0b" : "var(--red)" }}>{sub.score}/100</span>
                      </div>
                      <ProgressBar value={sub.score} max={100} color={sub.score >= 80 ? "var(--green)" : sub.score >= 60 ? "#f59e0b" : "var(--red)"} />
                    </div>

                    {/* Proof + actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ flex: 1, background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 10, padding: "8px 0", fontSize: 11, fontWeight: 700, color: "var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>
                        📎 View Proof
                      </button>
                      {sub.status === "pending" && (
                        <>
                          <button style={{ flex: 1, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "8px 0", fontSize: 11, fontWeight: 700, color: "var(--green)", cursor: "pointer", fontFamily: "inherit" }}>✓ Approve</button>
                          <button style={{ flex: 1, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "8px 0", fontSize: 11, fontWeight: 700, color: "var(--red)", cursor: "pointer", fontFamily: "inherit" }}>✕ Reject</button>
                        </>
                      )}
                      {job.selectionType === "creator" && sub.status === "approved" && (
                        <button onClick={() => toggleWinner(sub.id)}
                          style={{ flex: 1, background: manualWinners.includes(sub.id) ? "var(--bg2)" : "rgba(255,255,255,0.04)", border: `1px solid ${manualWinners.includes(sub.id) ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, padding: "8px 0", fontSize: 11, fontWeight: 700, color: manualWinners.includes(sub.id) ? "var(--accent)" : "var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>
                          {manualWinners.includes(sub.id) ? "★ Winner" : "☆ Pick"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ANALYTICS */}
          {activeTab === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <StatBox label="Completion %" value={`${pct(job.winners, job.slots)}%`} color={"var(--accent)"} />
                <StatBox label="Approval %" value={`${job.approvalRate}%`} color={"var(--green)"} />
                <StatBox label="Avg Fill" value={job.avgFillTime} />
              </div>

              {/* Fake bar chart */}
              <div style={{ background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Submissions Per Day</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                  {[12, 28, 45, 33, 15, 22, 40].map((v, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ width: "100%", height: `${(v / 50) * 70}px`, borderRadius: "4px 4px 0 0", background: i === 6 ? "var(--accent)" : "var(--bg2)" }} />
                      <span style={{ fontSize: 9, color: "var(--text3)" }}>{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status breakdown */}
              <div style={{ background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Status Breakdown</div>
                {[
                  { label: "Approved", value: job.winners, total: job.slots, color: "var(--green)" },
                  { label: "Pending", value: job.pending, total: job.slots, color: "#f59e0b" },
                  { label: "Rejected", value: job.rejected, total: job.slots, color: "var(--red)" },
                  { label: "Remaining", value: job.slots - job.winners - job.pending - job.rejected, total: job.slots, color: "var(--text3)" },
                ].map(row => (
                  <div key={row.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text2)" }}>{row.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>{row.value}</span>
                    </div>
                    <ProgressBar value={row.value} max={job.slots} color={row.color} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {job.status !== "completed" && (
                <>
                  <button onClick={() => { onStatusChange(job.id, job.status === "active" ? "paused" : "active"); onClose(); }}
                    style={{ width: "100%", background: job.status === "active" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${job.status === "active" ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 700, color: job.status === "active" ? "#f59e0b" : "var(--green)", cursor: "pointer", fontFamily: "inherit" }}>
                    {job.status === "active" ? "⏸ Pause Job" : "▶ Resume Job"}
                  </button>
                  <button style={{ width: "100%", background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 700, color: "var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>
                    <i className="ti ti-coin" /> Top Up Budget
                  </button>
                  <button style={{ width: "100%", background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 700, color: "var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>
                    <i className="ti ti-edit" /> Edit Job Details
                  </button>
                  <button style={{ width: "100%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 700, color: "var(--red)", cursor: "pointer", fontFamily: "inherit" }}>
                    <i className="ti ti-trash" /> Close & Refund Remaining
                  </button>
                </>
              )}
              {job.status === "completed" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}><i className="ti ti-circle-check" style={{color:"var(--green)"}} /></div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Job Completed</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>All slots filled. Budget fully distributed.</div>
                  <button style={{ marginTop: 16, background: "var(--bg2)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>
                    <i className="ti ti-clipboard" /> Download Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── BLACKLIST PAGE ─────────────────────────────────────────────────────────
function BlacklistPage() {
  const [blocked, setBlocked] = useState(BLACKLIST_INIT);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleSearch = () => {
    setSearched(true);
    if (!search.trim()) { setSearchResult(null); return; }
    // Simulate finding a user
    if (search.toLowerCase().includes("scam") || blocked.find(b => b.handle.includes(search))) {
      setSearchResult({ user: search.replace("@",""), handle: search.startsWith("@") ? search : `@${search}`, alreadyBlocked: !!blocked.find(b => b.handle === (search.startsWith("@") ? search : `@${search}`)) });
    } else {
      setSearchResult({ user: search.replace("@",""), handle: search.startsWith("@") ? search : `@${search}`, alreadyBlocked: false });
    }
  };

  const blockUser = () => {
    if (!searchResult || searchResult.alreadyBlocked) return;
    const newEntry = { id: `BL-${Date.now()}`, user: searchResult.user, handle: searchResult.handle, reason: "Manually blocked by creator", blockedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), color: "#8b5cf6" };
    setBlocked(b => [newEntry, ...b]);
    setSearch(""); setSearchResult(null); setSearched(false);
    showToast("User blocked successfully");
  };

  const unblock = (id) => {
    setBlocked(b => b.filter(x => x.id !== id));
    showToast("User unblocked");
  };

  return (
    <div style={{ width: "100%" }}>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "var(--text)", zIndex: 200, whiteSpace: "nowrap" }}>{toast}</div>}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>Creator Blacklist</h2>
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.5 }}>Blocked users cannot participate in your future jobs.</p>
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99, background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, color: "var(--text2)" }}>
            {blocked.length} blocked
          </span>
        </div>
      </div>

      {/* Search box */}
      <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Search by OgaPay username or X handle</div>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setSearched(false); setSearchResult(null); }}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="nickname or @xhandle"
          style={{ width: "100%", background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "var(--text)", outline: "none", marginBottom: 10, boxSizing: "border-box", fontFamily: "inherit" }}
        />
        <button onClick={handleSearch}
          style={{ width: "100%", background: "var(--bg2)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>
          Search
        </button>

        {/* Search result */}
        {searched && searchResult && (
          <div style={{ marginTop: 12, background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
              {searchResult.user[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{searchResult.user}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{searchResult.handle}</div>
            </div>
            {searchResult.alreadyBlocked ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--red)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "4px 10px" }}>Already blocked</span>
            ) : (
              <button onClick={blockUser}
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "var(--red)", cursor: "pointer", fontFamily: "inherit" }}>
                Block
              </button>
            )}
          </div>
        )}
        {searched && !searchResult && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "12px 0" }}>No user found for "{search}"</div>
        )}
      </div>

      {/* Blocked list */}
      <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${"var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>Blocked users</span>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Page 1 of 1</span>
        </div>

        {blocked.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🚫</div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>You have not blocked anyone yet.</div>
          </div>
        ) : blocked.map((b, i) => (
          <div key={b.id} style={{ padding: "14px 16px", borderBottom: i < blocked.length - 1 ? `1px solid ${"var(--border)"}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: b.color || "var(--red)", opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
              {b.user[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{b.user}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{b.handle}</div>
              <div style={{ fontSize: 11, color: "var(--red)", marginTop: 3, opacity: 0.8 }}>{b.reason}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 6 }}>{b.blockedAt}</div>
              <button onClick={() => unblock(b.id)}
                style={{ background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: "var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>
                Unblock
              </button>
            </div>
          </div>
        ))}
      </div>

      {blocked.length > 0 && (
        <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
            ⛔ Blocked users are automatically excluded from all your current and future job listings on OgaPay.
          </div>
        </div>
      )}
    </div>
  );
}

// ── TEMPLATES PAGE ─────────────────────────────────────────────────────────
function TemplatesPage({ onUseTemplate }) {
  const [tab, setTab] = useState("mine");
  const [templates, setTemplates] = useState(TEMPLATES_INIT);
  const [showCreate, setShowCreate] = useState(false);
  const [newTpl, setNewTpl] = useState({ title: "", category: "", description: "", platform: "X (Twitter)", reward: "", slots: "", visibility: "private" });
  const [toast, setToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const saveTemplate = () => {
    if (!newTpl.title.trim()) return;
    const t = { id: `TPL-${Date.now()}`, ...newTpl, updatedAt: new Date().toLocaleString(), visibility: newTpl.visibility };
    setTemplates(prev => ({ ...prev, mine: [t, ...prev.mine] }));
    setNewTpl({ title: "", category: "", description: "", platform: "X (Twitter)", reward: "", slots: "", visibility: "private" });
    setShowCreate(false);
    showToast("Template saved!");
  };

  const deleteTemplate = (id) => {
    setTemplates(prev => ({ ...prev, mine: prev.mine.filter(t => t.id !== id) }));
    showToast("Template deleted");
  };

  const forkTemplate = (tpl) => {
    const forked = { ...tpl, id: `TPL-${Date.now()}`, title: `${tpl.title} (copy)`, visibility: "private", updatedAt: new Date().toLocaleString() };
    setTemplates(prev => ({ ...prev, mine: [forked, ...prev.mine] }));
    setTab("mine");
    showToast("Template forked to My Templates!");
  };

  const list = tab === "mine" ? templates.mine : templates.public;

  return (
    <div style={{ width: "100%" }}>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "var(--text)", zIndex: 200, whiteSpace: "nowrap" }}>{toast}</div>}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>Custom Job Templates</h2>
        <p style={{ fontSize: 13, color: "var(--text3)" }}>Review, update, delete, and fork templates in one place.</p>
      </div>

      {/* Tab toggle */}
      <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {[
            { id: "mine", label: `My templates (${templates.mine.length})` },
            { id: "public", label: `Public templates (${templates.public.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "13px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "inherit", background: tab === t.id ? "var(--text)" : "transparent", color: tab === t.id ? "var(--bg)" : "var(--text3)", borderBottom: tab !== t.id ? `1px solid ${"var(--border)"}` : "none", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Create button — only on mine tab */}
        {tab === "mine" && (
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${"var(--border)"}` }}>
            <button onClick={() => setShowCreate(!showCreate)}
              style={{ width: "100%", background: showCreate ? "rgba(255,255,255,0.05)" : "var(--text)", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 800, color: showCreate ? "var(--text2)" : "var(--bg)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {showCreate ? "✕ Cancel" : "+ Create template"}
            </button>

            {/* Inline create form */}
            {showCreate && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Template Title *", key: "title", placeholder: "e.g. Follow & Repost on X" },
                  { label: "Category", key: "category", placeholder: "e.g. Social Media" },
                  { label: "Description", key: "description", placeholder: "What should workers do?", multi: true },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 4 }}>{f.label}</label>
                    {f.multi ? (
                      <textarea value={newTpl[f.key]} onChange={e => setNewTpl(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3}
                        style={{ width: "100%", background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                    ) : (
                      <input value={newTpl[f.key]} onChange={e => setNewTpl(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                        style={{ width: "100%", background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                    )}
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 4 }}>Platform</label>
                    <select value={newTpl.platform} onChange={e => setNewTpl(p => ({ ...p, platform: e.target.value }))}
                      style={{ width: "100%", background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }}>
                      {["X (Twitter)", "Instagram", "Telegram", "Discord", "YouTube", "On-chain", "Other"].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 4 }}>Visibility</label>
                    <select value={newTpl.visibility} onChange={e => setNewTpl(p => ({ ...p, visibility: e.target.value }))}
                      style={{ width: "100%", background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }}>
                      <option value="private">🔒 Private</option>
                      <option value="community">🌍 Community</option>
                    </select>
                  </div>
                </div>
                <button onClick={saveTemplate}
                  style={{ width: "100%", background: "var(--accent)", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  Save Template
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template list */}
      <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${"var(--border)"}` }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
            {tab === "mine" ? "My templates" : "Public templates"}
          </span>
        </div>

        {list.length === 0 ? (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}><i className="ti ti-clipboard" /></div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>No templates yet. Create one above!</div>
          </div>
        ) : list.map((tpl, i) => (
          <div key={tpl.id} style={{ borderBottom: i < list.length - 1 ? `1px solid ${"var(--border)"}` : "none" }}>
            {/* Template row */}
            <div onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
              style={{ padding: "14px 16px", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tpl.title}</div>
              <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 2 }}>{tpl.category || "No category"}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>
                {tpl.visibility === "private" ? "🔒 Private" : "🌍 Community"} · {tpl.updatedAt}
              </div>
            </div>

            {/* Expanded actions */}
            {expandedId === tpl.id && (
              <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {tpl.description && (
                  <div style={{ background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                    {tpl.description}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { onUseTemplate(tpl); showToast("Template loaded into Create Job!"); }}
                    style={{ flex: 2, background: "var(--accent)", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 12, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                    Use Template →
                  </button>
                  <button onClick={() => forkTemplate(tpl)}
                    style={{ flex: 1, background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 10, padding: "10px 0", fontSize: 12, fontWeight: 700, color: "var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>
                    Fork
                  </button>
                  {tab === "mine" && (
                    <button onClick={() => deleteTemplate(tpl.id)}
                      style={{ flex: 1, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 0", fontSize: 12, fontWeight: 700, color: "var(--red)", cursor: "pointer", fontFamily: "inherit" }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {tab === "public" && (
        <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(139,92,246,0.06)", border: "1px solid var(--bg2)", borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
            🌍 Community templates are created and shared by other OgaPay job creators. Fork any template to customise it for your own jobs.
          </div>
        </div>
      )}
    </div>
  );
}

// ── JOBS LIST PAGE ─────────────────────────────────────────────────────────
function JobsListPage({ jobs, setJobs, showToast }) {
  const [filter, setFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [prefillForm, setPrefillForm] = useState(null);

  const handleStatusChange = (id, status) => {
    setJobs(j => j.map(job => job.id === id ? { ...job, status } : job));
    // Persist status change locally (backend PATCH not available yet)
    try {
      const stored = JSON.parse(localStorage.getItem('ogapay_job_statuses') || '{}');
      stored[id] = status;
      localStorage.setItem('ogapay_job_statuses', JSON.stringify(stored));
      // Attempt API call
      const token = localStorage.getItem('ogapay_access_token');
      if (token) {
        fetch(API_BASE + '/tasks/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ status: status.toUpperCase() }),
        }).catch(() => {});
      }
    } catch(e) {}
    showToast('Job ' + (status === 'active' ? 'resumed' : status === 'paused' ? 'paused' : 'closed') + ' successfully');
  };

  const handleCreate = (form) => {
    const newJob = {
      id: `OGA-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      title: form.title || "Untitled Job",
      type: form.type, platform: form.platform,
      status: "active", selectionType: form.selectionType,
      reward: parseInt(form.reward) || 0, currency: "NGN",
      budget: (parseInt(form.reward) || 0) * (parseInt(form.slots) || 0),
      spent: 0,
      remaining: (parseInt(form.reward) || 0) * (parseInt(form.slots) || 0),
      slots: parseInt(form.slots) || 0, winners: 0, pending: 0, rejected: 0,
      approvalRate: 0, avgFillTime: "—",
      deadline: form.deadline || "TBD", posted: "Just now",
      secret: `sk_oga_${Math.random().toString(36).slice(2, 10)}`,
      submissions: [],
    };
    setJobs(j => [newJob, ...j]);
    setPrefillForm(null);
    showToast("🚀 Job launched successfully!");
  };

  const openCreateWithTemplate = (tpl) => {
    setPrefillForm({
      title: tpl.title, type: tpl.type || "social",
      platform: tpl.platform || "X (Twitter)",
      description: tpl.description || "",
      reward: tpl.reward?.toString() || "",
      slots: tpl.slots?.toString() || "",
      selectionType: "random", selectionMins: "60",
      attachmentRequired: "yes", deadline: "",
    });
    setShowCreate(true);
  };

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);
  const totals = {
    active: jobs.filter(j => j.status === "active").length,
    paused: jobs.filter(j => j.status === "paused").length,
    completed: jobs.filter(j => j.status === "completed").length,
    totalSpent: jobs.reduce((a, j) => a + j.spent, 0),
    totalWinners: jobs.reduce((a, j) => a + j.winners, 0),
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Summary stats */}
      <div class="mj-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Active", value: totals.active, color: "var(--green)" },
          { label: "Paused", value: totals.paused, color: "#f59e0b" },
          { label: "Done", value: totals.completed, color: "var(--text3)" },
          { label: "Winners", value: totals.totalWinners, color: "var(--accent)" },
          { label: "Spent", value: `₦${(totals.totalSpent / 1000).toFixed(0)}k`, color: "var(--text)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 700, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div class="mj-filters" style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {["all", "active", "paused", "completed"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flexShrink: 0, padding: "8px 18px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer", border: `1px solid ${filter === f ? "var(--accent)" : "var(--border)"}`, background: filter === f ? "var(--text)" : "var(--card)", color: filter === f ? "var(--bg)" : "var(--text2)", fontFamily: "inherit" }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
              {f === "all" ? jobs.length : jobs.filter(j => j.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Job cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}><i className="ti ti-clipboard" /></div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No jobs found</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Create your first job to get started</div>
        </div>
      ) : filtered.map(job => (
        <div key={job.id} onClick={() => setSelectedJob(job)}
          style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: 18, padding: "20px 22px", marginBottom: 12, cursor: "pointer", transition: "border-color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>{job.title}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge label={job.platform} />
                <Badge label={job.selectionType === "creator" ? "👤 Manual" : "🎲 Auto"} />
                <Badge label={job.status.toUpperCase()} color={statusColor[job.status]} bg={statusBg[job.status]} />
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--green)" }}>₦{job.reward.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2, fontWeight: 600 }}>per slot</div>
            </div>
          </div>

          <div class="mj-job-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Winners", value: job.winners, color: "var(--green)" },
              { label: "Pending", value: job.pending, color: "#f59e0b" },
              { label: "Rejected", value: job.rejected, color: "var(--red)" },
              { label: "Left", value: job.slots - job.winners - job.pending, color: "var(--text3)" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--bg2)", border: `1px solid ${"var(--border)"}`, borderRadius: 10, padding: "8px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 700, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>{pct(job.winners, job.slots)}% complete</span>
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>₦{job.remaining.toLocaleString()} remaining</span>
            </div>
            <ProgressBar value={job.winners} max={job.slots} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "monospace", fontWeight: 600 }}>{job.id}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>Deadline: {job.deadline}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <span onClick={(e) => { e.stopPropagation(); 
                  try { sessionStorage.setItem('ogapay_edit_task', JSON.stringify(job)); } catch(e) {}
                  window.location.href = '/create?edit=' + job.id;
                }} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", height:40, padding:"0 14px", borderRadius:10, background:"var(--bg2)", border:"1px solid var(--border)", color:"var(--text2)", fontSize:12, fontWeight:700, gap:5, cursor:"pointer" }}><i className="ti ti-edit" style={{fontSize:14}} /> Edit</span>
                <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", height:40, padding:"0 18px", borderRadius:10, background:"var(--text)", color:"var(--bg)", fontSize:13, fontWeight:800, gap:6, cursor:"pointer" }}><i className="ti ti-eye" style={{fontSize:15}} /> View</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {jobs.length === 0 && (
        <button onClick={() => setShowCreate(true)}
          style={{ width: "100%", background: "transparent", border: `2px dashed ${"var(--border)"}`, borderRadius: 18, padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 32 }}>+</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)" }}>Create your first job</span>
        </button>
      )}

      {selectedJob && (
        <JobDrawer job={selectedJob} onClose={() => setSelectedJob(null)} onStatusChange={handleStatusChange} />
      )}
      {showCreate && (
        <CreateJobModal onClose={() => { setShowCreate(false); setPrefillForm(null); }} onCreate={handleCreate} prefill={prefillForm} />
      )}
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState("jobs");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAuthed } = useAuth();

  useEffect(() => {
    if (!isAuthed) { setLoading(false); return; }
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem("ogapay_access_token");
        if (!token) { setLoading(false); return; }
        // Fetch all tasks from the public endpoint, then filter by user
        const res = await fetch(API_BASE + "/tasks", {
          headers: { Authorization: "Bearer " + token },
        });
        const json = await res.json();
        if (json.success && json.data) {
          const tasks = Array.isArray(json.data) ? json.data : (json.data.tasks || []);
          // Get user ID from auth context
          const userId = user?.id || "";
          // Filter tasks created by this user, or show all if we can't determine the user
          const userTasks = userId ? tasks.filter(t => String(t.posterId) === String(userId)) : tasks;
          const mapped = userTasks.map(t => ({
            id: t.id || t._id,
            customId: t.customId || "",
            title: t.title || "Untitled Task",
            type: t.type || t.mode || (t.category || "").toLowerCase() || "custom",
            platform: Array.isArray(t.tags) ? t.tags[0] || "OgaPay" : t.platform || "OgaPay",
            status: (t.status || "active").toLowerCase(),
            selectionType: t.winnerMode || (t.type === "challenge" ? "random" : "creator"),
            reward: Number(t.reward) || 0,
            currency: t.currency || "NGN",
            budget: Number(t.reward) * (t.maxWorkers || 1) || 0,
            spent: Number(t.currentWorkers || 0) * Number(t.reward || 0),
            remaining: Number(t.reward) * (t.maxWorkers || 1) - Number(t.currentWorkers || 0) * Number(t.reward || 0),
            slots: t.maxWorkers || 1,
            winners: t.currentWorkers || 0,
            pending: 0,
            rejected: 0,
            approvalRate: t.maxWorkers > 0 ? Math.round((t.currentWorkers || 0) / t.maxWorkers * 100) : 0,
            avgFillTime: "N/A",
            deadline: t.deadline ? new Date(t.deadline).toLocaleDateString() : "N/A",
            posted: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "N/A",
            secret: t.escrowTxId || "",
            submissions: [],
          }));
          // Merge localStorage status overrides
          try {
            const stored = JSON.parse(localStorage.getItem('ogapay_job_statuses') || '{}');
            mapped.forEach(j => {
              if (stored[j.id]) j.status = stored[j.id];
            });
          } catch(e) {}
          setJobs(mapped);
        }
      } catch (e) {
        console.warn("Failed to fetch jobs:", e);
      }
      setLoading(false);
    };
    fetchJobs();
  }, [isAuthed, user]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const PAGE_TABS = [
    { id: "jobs", label: "My Jobs", icon: "briefcase" },
    { id: "templates", label: "Templates", icon: "files" },
    { id: "blacklist", label: "Blacklist", icon: "ban" },
  ];

  const navRightLabel = page === "jobs" ? "+ Create Job" : page === "templates" ? "+ New Template" : null;

  return (
    <Layout><div class="mj-page">
      <style>{`
        .mj-page { padding: 28px 24px 60px; width: 100%; max-width: 100%; }
        
        /* Summary stats grid - responsive */
        .mj-stats-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; margin-bottom: 16px; }
        
        /* Job stats grid */
        .mj-job-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 12px; }
        
        /* Filter pills scrollable */
        .mj-filters { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 2px; -webkit-overflow-scrolling: touch; }
        
        /* Mobile */
        @media(max-width:768px) {
          .mj-page { padding: 16px 12px 60px; }
          .mj-stats-grid { grid-template-columns: repeat(3,1fr); gap: 6px; }
          .mj-stats-grid > *:nth-child(n+4) { display: none; } /* hide last 2 on smallest screens */
          .mj-job-stats { grid-template-columns: repeat(2,1fr); gap: 6px; }
          .mj-filters { gap: 4px; }
        }
        
        @media(max-width:480px) {
          .mj-page { padding: 12px 10px 60px; }
          .mj-stats-grid { grid-template-columns: repeat(3,1fr); gap: 4px; }
          .mj-job-stats { grid-template-columns: repeat(2,1fr); gap: 4px; }
        }
        
        /* Tablet */
        @media(min-width:769px) and (max-width:1023px) {
          .mj-page { padding: 20px 20px 60px; }
        }
      `}</style>



      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "var(--text)", zIndex: 200, whiteSpace: "nowrap", boxShadow: "var(--shadow-md)" }}>
          {toast}
        </div>
      )}


      {/* Sub tab nav — full labels */}
      <div class="mj-tab-bar">
        {PAGE_TABS.map(t => (
          <button key={t.id} onClick={() => setPage(t.id)}
            style={{ flex: 1, padding: "12px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "inherit", background: "transparent", color: page === t.id ? "var(--accent)" : "var(--text3)", borderBottom: page === t.id ? `2px solid ${"var(--accent)"}` : "2px solid transparent", transition: "all 0.15s", whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <i className={`ti ti-${t.icon}`} style={{fontSize:16}} /> {t.label}
          </button>
        ))}
      </div>

      {/* Page content */}
      {page === "jobs" && <div class="mj-content"><JobsListPage jobs={jobs} setJobs={setJobs} showToast={showToast} /></div>}
      {page === "blacklist" && <div class="mj-content"><BlacklistPage /></div>}
      {page === "templates" && <div class="mj-content"><TemplatesPage onUseTemplate={(tpl) => {
          setPage("jobs");
          showToast("Template loaded — create your job below!");
        }} /></div>}
  </div>
</Layout>
  );
}

