import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const statusColor = {
  open: "var(--green)",
  in_progress: "#3b82f6",
  completed: "var(--text3)",
  draft: "#f59e0b",
  disputed: "var(--red)",
  cancelled: "var(--red)",
  expired: "var(--text3)",
};
const statusBg = {
  open: "rgba(16,185,129,0.12)",
  in_progress: "rgba(59,130,246,0.12)",
  completed: "rgba(255,255,255,0.05)",
  draft: "rgba(245,158,11,0.12)",
  disputed: "rgba(239,68,68,0.12)",
  cancelled: "rgba(239,68,68,0.12)",
  expired: "rgba(255,255,255,0.05)",
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
                <Badge label={job.status === "in_progress" ? "IN PROGRESS" : job.status.toUpperCase()} color={statusColor[job.status]} bg={statusBg[job.status]} />
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
              {(job.status === "open" || job.status === "in_progress" || job.status === "draft") && (
                <>
                  <button onClick={() => { onStatusChange(job.id, job.status === "open" ? "draft" : "open"); onClose(); }}
                    style={{ width: "100%", background: job.status === "open" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${job.status === "open" ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 700, color: job.status === "open" ? "#f59e0b" : "var(--green)", cursor: "pointer", fontFamily: "inherit" }}>
                    {job.status === "open" ? "⏸ Pause Job" : "▶ Resume Job"}
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
              {job.status === "cancelled" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}><i className="ti ti-circle-x" style={{color:"var(--red)"}} /></div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Job Cancelled</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>This job was cancelled. Remaining budget has been refunded.</div>
                </div>
              )}
              {job.status === "expired" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}><i className="ti ti-clock" style={{color:"var(--text3)"}} /></div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Job Expired</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>The deadline for this job has passed.</div>
                </div>
              )}
              {job.status === "disputed" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}><i className="ti ti-alert-triangle" style={{color:"var(--red)"}} /></div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Job Disputed</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>This job has been disputed and is under review.</div>
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
  const [blocked, setBlocked] = useState([]);
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
  const [templates, setTemplates] = useState({ mine: [], public: [] });
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

  const handleStatusChange = (id, status) => {
    setJobs(j => j.map(job => job.id === id ? { ...job, status } : job));
    try {
      const stored = JSON.parse(localStorage.getItem('ogapay_job_statuses') || '{}');
      stored[id] = status;
      localStorage.setItem('ogapay_job_statuses', JSON.stringify(stored));
      apiRequest('/tasks/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ status: status.toUpperCase() }),
      }).catch(() => {});
    } catch(e) {}
    showToast(status === 'open' ? 'Job resumed' : status === 'draft' ? 'Job paused' : 'Status updated');
  };

  const statusFilters = ["all", "open", "in_progress", "completed", "draft", "cancelled", "expired"];

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);
  const stats = {
    open: jobs.filter(j => j.status === "open").length,
    in_progress: jobs.filter(j => j.status === "in_progress").length,
    completed: jobs.filter(j => j.status === "completed").length,
    totalSpent: jobs.reduce((a, j) => a + (j.spent || 0), 0),
    totalWinners: jobs.reduce((a, j) => a + (j.winners || 0), 0),
  };

  const goToCreateJob = () => {
    showToast("Please use the Create Job page to create new jobs");
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Summary stats */}
      <div class="mj-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Open", value: stats.open, color: "var(--green)" },
          { label: "In Progress", value: stats.in_progress, color: "#3b82f6" },
          { label: "Completed", value: stats.completed, color: "var(--text3)" },
          { label: "Winners", value: stats.totalWinners, color: "var(--accent)" },
          { label: "Spent", value: `₦${(stats.totalSpent / 1000).toFixed(0)}k`, color: "var(--text)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 700, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div class="mj-filters" style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {statusFilters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flexShrink: 0, padding: "8px 18px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer", border: `1px solid ${filter === f ? "var(--accent)" : "var(--border)"}`, background: filter === f ? "var(--text)" : "var(--card)", color: filter === f ? "var(--bg)" : "var(--text2)", fontFamily: "inherit" }}>
            {f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
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
                <Badge label={job.status === "in_progress" ? "IN PROGRESS" : job.status.toUpperCase()} color={statusColor[job.status]} bg={statusBg[job.status]} />
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
        <button onClick={goToCreateJob}
          style={{ width: "100%", background: "transparent", border: `2px dashed ${"var(--border)"}`, borderRadius: 18, padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 32 }}>+</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)" }}>Create your first job</span>
        </button>
      )}

      {selectedJob && (
        <JobDrawer job={selectedJob} onClose={() => setSelectedJob(null)} onStatusChange={handleStatusChange} />
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

  const fetchJobs = useCallback(async () => {
    if (!isAuthed) { setLoading(false); return; }
    const mapTaskToJob = (t) => ({
      id: t.id || t._id,
      customId: t.customId || "",
      title: t.title || "Untitled Task",
      type: t.type || t.mode || (t.category || "").toLowerCase() || "custom",
      platform: Array.isArray(t.tags) ? t.tags[0] || "OgaPay" : t.platform || "OgaPay",
      status: (t.status || "open").toLowerCase(),
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
    });

    try {
      const tasks = await apiRequest('/tasks/my/created').catch(() => null) || [];
      const mapped = (Array.isArray(tasks) ? tasks : (tasks?.tasks || [])).map(mapTaskToJob);
      const stored = JSON.parse(localStorage.getItem('ogapay_job_statuses') || '{}');
      mapped.forEach(j => { if (stored[j.id]) j.status = stored[j.id]; });
      setJobs(mapped);
    } catch (e) {
      console.warn("Failed to fetch jobs:", e);
    }
    setLoading(false);
  }, [isAuthed]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    const onFocus = () => { setLoading(true); fetchJobs(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchJobs]);

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

