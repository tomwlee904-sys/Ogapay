// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1';

function getToken() {
  try { return localStorage.getItem('ogapay_access_token'); } catch { return null; }
}

// Tabler Icon helper
const I = ({ n, s = 16, c = "currentColor" }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0 }} />
);

function mapTask(t) {
  return {
    id: t.id,
    title: t.title,
    platform: t.category || 'OTHER',
    status: (t.status === 'OPEN' || t.status === 'IN_PROGRESS') ? 'active' : t.status === 'DRAFT' ? 'paused' : 'completed',
    reward: parseFloat(t.reward),
    currency: t.currency,
    budget: parseFloat(t.reward) * t.maxWorkers,
    spent: (t.currentWorkers || 0) * parseFloat(t.reward),
    remaining: (t.maxWorkers - (t.currentWorkers || 0)) * parseFloat(t.reward),
    slots: t.maxWorkers,
    winners: t.currentWorkers || 0,
    pending: 0,
    rejected: 0,
    approvalRate: 0,
    avgFillTime: '—',
    deadline: t.deadline ? new Date(t.deadline).toLocaleDateString() : '—',
    posted: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—',
    submissions: [],  // separate fetch needed for submissions
    _count: t._count,
  };
}

// ── THEME-AWARE COLORS (Uses CSS variables for Light/Dark mode) ────────────
const S = {
  bg: "var(--bg)",
  card: "var(--card)",
  border: "var(--border)",
  border2: "var(--border2)",
  text: "var(--text)",
  text2: "var(--text2)",
  text3: "var(--text3)",
  blue: "#121566", // OgaPay Blue (Replaces Purple)
  green: "#16a34a",
  amber: "#f59e0b",
  red: "#ef4444",
};

const statusColor = { active: S.green, paused: S.amber, completed: S.text3 };
const statusBg = {
  active: "rgba(22,163,74,0.12)", paused: "rgba(245,158,11,0.12)",
  completed: "var(--bg2)",
};
const subColor = { approved: S.green, pending: S.amber, rejected: S.red };
const subBg = {
  approved: "rgba(22,163,74,0.12)", pending: "rgba(245,158,11,0.12)",
  rejected: "rgba(239,68,68,0.12)",
};

function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

function Badge({ label, color, bg }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: bg || "var(--bg2)", color: color || S.text2, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {label}
    </span>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: "var(--bg2)", border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 14px", flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: color || S.text }}>{value}</div>
      <div style={{ fontSize: 11, color: S.text3, marginTop: 3, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ProgressBar({ value, max, color }) {
  return (
    <div style={{ height: 5, background: "var(--bg2)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${pct(value, max)}%`, height: "100%", background: color || `linear-gradient(90deg,${S.blue},${S.green})`, borderRadius: 3, transition: "width 0.6s ease" }} />
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
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 520, background: S.card, border: `1px solid ${S.border2}`, borderRadius: 24, maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ position: "sticky", top: 0, background: S.card, borderBottom: `1px solid ${S.border}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: S.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Step {step} of 3</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: S.text, marginTop: 2 }}>
              {step === 1 ? "Job Details" : step === 2 ? "Budget & Slots" : "Review & Launch"}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: "var(--bg2)", border: `1px solid ${S.border}`, color: S.text3, cursor: "pointer", fontSize: 14 }}>
            <I n="x" s={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Step indicator */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? S.blue : "var(--bg2)" }} />
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
                <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe what workers need to do..." rows={4} style={{ ...inputStyle, resize: "none" }} />
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
              <div style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: S.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Budget Summary</div>
                {[
                  ["Reward per worker", form.reward ? `₦${parseInt(form.reward).toLocaleString()}` : "—"],
                  ["Total slots", form.slots || "—"],
                  ["Total budget required", `₦${totalBudget}`],
                  ["Platform fee (5%)", form.reward && form.slots ? `₦${Math.round(parseInt(form.reward) * parseInt(form.slots) * 0.05).toLocaleString()}` : "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: S.text2 }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: S.text }}>{v}</span>
                  </div>
                ))}
              </div>
              <Field label="Winner Selection Mode">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["random", "creator"].map(t => (
                    <div key={t} onClick={() => set("selectionType", t)}
                      style={{ padding: "12px", borderRadius: 12, border: `1px solid ${form.selectionType === t ? S.blue : S.border}`, background: form.selectionType === t ? "rgba(18,21,102,0.1)" : "var(--bg2)", cursor: "pointer" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: form.selectionType === t ? S.blue : S.text }}>
                        {t === "random" ? <><I n="dice-1" s={14} /> Random</> : <><I n="user-check" s={14} /> You Choose</>}
                      </div>
                      <div style={{ fontSize: 11, color: S.text3, marginTop: 4 }}>
                        {t === "random" ? "Auto-selected when timer closes" : "You manually pick winners"}
                      </div>
                    </div>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "var(--bg2)", border: `1px solid ${S.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, color: S.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Job Summary</div>
                {[
                  ["Title", form.title || "—"],
                  ["Type", form.type],
                  ["Platform", form.platform],
                  ["Reward", form.reward ? `₦${parseInt(form.reward).toLocaleString()}` : "—"],
                  ["Slots", form.slots || "—"],
                  ["Total Budget", form.reward && form.slots ? `₦${(parseInt(form.reward) * parseInt(form.slots)).toLocaleString()}` : "—"],
                  ["Selection", form.selectionType === "random" ? "Random (auto)" : "Creator (manual)"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${S.border}` }}>
                    <span style={{ fontSize: 12, color: S.text3 }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: S.text }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: S.amber, lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <I n="alert-triangle" s={16} c={S.amber} style={{ marginTop: 2 }} />
                  <span>Your wallet will be charged <strong>₦{form.reward && form.slots ? (parseInt(form.reward) * parseInt(form.slots) * 1.05).toLocaleString() : "—"}</strong> (budget + 5% fee) to launch.</span>
                </div>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ flex: 1, background: "var(--bg2)", border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 700, color: S.text2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <I n="arrow-left" s={14} /> Back
              </button>
            )}
            <button
              onClick={() => {
                if (step < 3) { setStep(s => s + 1); }
                else { onCreate(form); onClose(); }
              }}
              style={{ flex: 2, background: S.blue, border: "none", borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {step < 3 ? <><I n="arrow-right" s={14} c="#fff" /> Continue</> : <><I n="rocket" s={14} c="#fff" /> Launch Job</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: S.text3, fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "var(--bg2)", border: `1px solid var(--border)`,
  borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

// ── JOB DETAIL DRAWER ─────────────────────────────────────────────────────
function JobDrawer({ job, onClose, onStatusChange }) {
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const tabStyle = (t) => ({
    padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.06em", cursor: "pointer", background: "transparent",
    border: "none", fontFamily: "inherit", whiteSpace: "nowrap",
    color: activeTab === t ? S.blue : S.text3,
    borderBottom: activeTab === t ? `2px solid ${S.blue}` : "2px solid transparent",
  });

  const fmt = (v) => job.currency === 'NGN'
    ? `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
    : `${v.toFixed(4)} ${job.currency}`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 520, background: S.card, border: `1px solid ${S.border2}`, borderRadius: 24, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        <div style={{ padding: "0 20px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: S.text, marginBottom: 4 }}>{job.title}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge label={job.id.slice(0, 8) + '...'} color={S.text3} />
                <Badge label={job.status.toUpperCase()} color={statusColor[job.status]} bg={statusBg[job.status]} />
                <Badge label={<><I n="dice-1" s={10} /> Auto</>} />
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: "var(--bg2)", border: `1px solid ${S.border}`, color: S.text3, cursor: "pointer", flexShrink: 0, fontSize: 13 }}>
              <I n="x" s={16} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, overflowX: "auto", flexShrink: 0 }}>
          {["overview", "submissions", "settings"].map(t => (
            <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <StatBox label="Winners" value={job.winners} color={S.green} />
                <StatBox label="Slots" value={job.slots} color={S.blue} />
                <StatBox label="Submitted" value={job._count?.submissions || 0} color={S.amber} />
              </div>
              <div style={{ background: "var(--bg2)", border: `1px solid ${S.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: S.text3, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Budget</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: S.text2 }}>Total budget</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{fmt(job.budget)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: S.text2 }}>Spent</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: S.green }}>{fmt(job.spent)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: S.text2 }}>Remaining</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{fmt(job.remaining)}</span>
                </div>
                <ProgressBar value={job.spent} max={job.budget} />
              </div>
              <div style={{ background: "var(--bg2)", border: `1px solid ${S.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: S.text3, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Details</div>
                <div style={{ fontSize: 12, color: S.text2, lineHeight: 1.7 }}>
                  <div>Posted: {job.posted}</div>
                  <div>Deadline: {job.deadline}</div>
                  <div>Reward per slot: {fmt(job.reward)}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "submissions" && (
            <div>
              {(!job.submissions || job.submissions.length === 0) ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: S.text3, fontSize: 13 }}>No submissions yet</div>
              ) : (
                job.submissions.map(sub => (
                  <div key={sub.id} style={{ background: "var(--bg2)", border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: S.blue, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                        {sub.user ? sub.user[0] : '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{sub.user || 'Anonymous'}</div>
                        <div style={{ fontSize: 11, color: S.text3 }}>{sub.handle || ''} · {sub.time || ''}</div>
                      </div>
                      <Badge label={sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'PENDING'} color={subColor[sub.status] || S.amber} bg={subBg[sub.status] || subBg.pending} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {job.status !== "completed" && (
                <button onClick={() => { onStatusChange(job.id, job.status === "active" ? "paused" : "active"); onClose(); }}
                  style={{ width: "100%", background: job.status === "active" ? "rgba(245,158,11,0.1)" : "rgba(22,163,74,0.1)", border: `1px solid ${job.status === "active" ? "rgba(245,158,11,0.3)" : "rgba(22,163,74,0.3)"}`, borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 700, color: job.status === "active" ? S.amber : S.green, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {job.status === "active" ? <><I n="player-pause" s={14} /> Pause Job</> : <><I n="player-play" s={14} /> Resume Job</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function ManageJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        if (!token) { setError('Please log in first'); setLoading(false); return; }
        const res = await fetch(API_BASE + '/tasks/my/created', {
          headers: { 'Authorization': 'Bearer ' + token },
        });
        if (!res.ok) {
          if (res.status === 403) { setError('Poster account required. Please upgrade to create and manage jobs.'); }
          else { setError('Failed to load jobs'); }
          setLoading(false);
          return;
        }
        const json = await res.json();
        const tasks = (json.data || []).map(mapTask);
        setJobs(tasks);
      } catch(e) {
        setError('Network error loading jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [refreshKey]);

  const handleStatusChange = (id, status) => {
    setJobs(j => j.map(job => job.id === id ? { ...job, status } : job));
    showToast(`Job ${status === "active" ? "resumed" : "paused"} successfully`);
  };

  const handleCreate = async (form) => {
    try {
      const token = getToken();
      if (!token) { showToast('Please log in first'); return; }
      const reward = parseInt(form.reward) || 0;
      const maxWorkers = parseInt(form.slots) || 1;
      const res = await fetch(API_BASE + '/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          title: form.title || 'Untitled Job',
          description: form.description || 'Task description',
          category: form.type === 'social' ? 'SOCIAL_MEDIA' : 'OTHER',
          reward,
          currency: 'NGN',
          maxWorkers,
          instructions: form.description,
          proofRequired: form.attachmentRequired === 'yes' ? 'Screenshot proof required' : undefined,
          status: 'OPEN',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to create job');
      }
      showToast('Job launched successfully!');
      setRefreshKey(k => k + 1);
      setShowCreate(false);
    } catch(e) {
      showToast(e.message || 'Failed to create job');
    }
  };

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);
  const totals = {
    active: jobs.filter(j => j.status === 'active').length,
    paused: jobs.filter(j => j.status === 'paused').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    totalSpent: jobs.reduce((a, j) => a + j.spent, 0),
    totalWinners: jobs.reduce((a, j) => a + j.winners, 0),
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      <Layout>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 14px 80px" }}>
          {/* Page Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: S.text }}>Manage Jobs</h1>
              <p style={{ fontSize: 13, color: S.text3, margin: "4px 0 0" }}>Track and manage tasks you've posted</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              style={{ background: S.blue, border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 800, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
              <I n="plus" s={16} c="#fff" /> Create Job
            </button>
          </div>

          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Active", value: totals.active, color: S.green },
              { label: "Paused", value: totals.paused, color: S.amber },
              { label: "Done", value: totals.completed, color: S.text3 },
              { label: "Winners", value: totals.totalWinners, color: S.blue },
              { label: "Spent", value: `₦${(totals.totalSpent / 1000).toFixed(0)}k`, color: S.text },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--card)", border: `1px solid var(--border)`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: S.text3, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
            {["all", "active", "paused", "completed"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${filter === f ? S.blue : S.border}`, background: filter === f ? "rgba(18,21,102,0.1)" : "var(--card)", color: filter === f ? S.blue : S.text3, fontFamily: "inherit" }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: S.text3 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Loading jobs...</div>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div style={{ textAlign: "center", padding: "40px 0", color: S.red }}>
              <I n="alert-triangle" s={36} c={S.red} />
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>{error}</div>
            </div>
          )}

          {/* Job cards */}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: S.text3 }}>
              <I n="briefcase-off" s={48} c="var(--text3)" />
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No jobs found</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Create your first job to get started</div>
            </div>
          )}
          {!loading && !error && filtered.map(job => (
            <div key={job.id} onClick={() => setSelectedJob(job)}
              style={{ background: "var(--card)", border: `1px solid var(--border)`, borderRadius: 18, padding: 16, marginBottom: 10, cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(18,21,102,0.4)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 6, lineHeight: 1.3 }}>{job.title}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Badge label={job.platform} />
                    <Badge label={job.status.toUpperCase()} color={statusColor[job.status]} bg={statusBg[job.status]} />
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: S.green }}>
                    {job.currency === 'NGN' ? `₦${job.reward.toLocaleString()}` : `${job.reward.toFixed(4)} ${job.currency}`}
                  </div>
                  <div style={{ fontSize: 10, color: S.text3, marginTop: 2 }}>per slot</div>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: S.text3 }}>{pct(job.winners, job.slots)}% complete</span>
                  <span style={{ fontSize: 11, color: S.text3 }}>{job.winners}/{job.slots} slots</span>
                </div>
                <ProgressBar value={job.winners} max={job.slots} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: S.text3, fontFamily: "monospace" }}>{job.id.slice(0, 8)}...</span>
                <span style={{ fontSize: 11, color: S.blue, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  View Details <I n="arrow-right" s={12} c={S.blue} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </Layout>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid rgba(18,21,102,0.4)", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "var(--text)", zIndex: 200, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      {/* Modals */}
      {selectedJob && (
        <JobDrawer
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onStatusChange={handleStatusChange}
        />
      )}
      {showCreate && (
        <CreateJobModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </>
  );
}
