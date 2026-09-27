import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout"
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { categoryLabel } from "../lib/categories";
import "../styles/manage-jobs.css";

// Manage jobs: the poster's jobs, their review queue and job actions.
// Counts come from each job's submissions (by status). The old page used
// currentWorkers (slots taken) as "winners" and every submission as "pending",
// and its drawer had a made-up AI score, a hard-coded chart and dead buttons.

type Sub = {
  id: string; status: string; createdAt: string; submittedAt?: string | null; reviewedAt?: string | null
  proof?: string | null; workerNotes?: string | null; posterNotes?: string | null; attachments?: any[]
  autoApproveAt?: string | null
  worker?: { id: string; username?: string | null; firstName?: string | null; lastName?: string | null; avatarUrl?: string | null }
}
type Task = {
  id: string; title: string; status: string; category?: string; reward: number | string; currency?: string
  maxWorkers?: number; deadline?: string | null; createdAt?: string; submissions?: Sub[]
}

function Icon({ n, s = 16, c, style }: { n: any; s?: number; c?: any; style?: any }) {
  return <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, ...style }} />;
}

const money = (n: number, cur = "NGN") =>
  cur === "NGN" ? `₦${Math.round(n).toLocaleString("en-US")}` : `${cur === "USDC" || cur === "USDT" ? "$" : ""}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur === "USDC" || cur === "USDT" ? "" : " " + cur}`;
const day = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
const ago = (d?: string | null) => {
  if (!d) return "";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return day(d);
};
const who = (w?: Sub["worker"]) => w?.username || [w?.firstName, w?.lastName].filter(Boolean).join(" ") || "Someone";

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "open" }, IN_PROGRESS: { label: "In progress", cls: "open" },
  COOLING_DOWN: { label: "All slots taken", cls: "open" }, DRAFT: { label: "Paused", cls: "paused" },
  COMPLETED: { label: "Completed", cls: "" }, CANCELLED: { label: "Cancelled", cls: "bad" },
  EXPIRED: { label: "Expired", cls: "" }, DISPUTED: { label: "Disputed", cls: "bad" },
};
const Pill = ({ status }: { status: string }) => {
  const s = STATUS[status] || { label: status.toLowerCase(), cls: "" };
  return <span className={`mj-pill ${s.cls}`}>{s.label}</span>;
};

// Per-job numbers from its submissions
function jobCounts(t: Task) {
  const c: Record<string, number> = {};
  for (const s of t.submissions || []) c[s.status] = (c[s.status] || 0) + 1;
  const approved = c.APPROVED || 0, review = c.SUBMITTED || 0, working = c.PENDING || 0, disputed = c.DISPUTED || 0;
  const slots = t.maxWorkers || 1;
  return { approved, review, working, disputed, rejected: c.REJECTED || 0, slots, left: Math.max(0, slots - approved - review - working - disputed), paid: approved * Number(t.reward || 0) };
}

const Avatar = ({ w }: { w?: Sub["worker"] }) => (
  <span className="mj-av">{w?.avatarUrl ? <img src={w.avatarUrl} alt="" /> : who(w).charAt(0).toUpperCase()}</span>
);
const WorkerLink = ({ w }: { w?: Sub["worker"] }) =>
  w?.username ? <Link to={`/user/${w.username}`}>@{w.username}</Link> : <a>{who(w)}</a>;

function Proof({ s }: { s: Sub }) {
  const isImg = (u: string) => /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u);
  const files = (Array.isArray(s.attachments) ? s.attachments : []).map((a: any) => typeof a === "string" ? a : a?.url || a?.path || "").filter(Boolean);
  const proof = typeof s.proof === "string" ? s.proof.trim() : "";
  if (!proof && !files.length) return null;
  return (
    <div className="mj-proof">
      {proof && (/^https?:\/\//.test(proof)
        ? (isImg(proof) ? <a href={proof} target="_blank" rel="noopener noreferrer"><img src={proof} alt="Proof" /></a> : <a href={proof} target="_blank" rel="noopener noreferrer"><Icon n="external-link" s={14} /> {proof}</a>)
        : <p className="mj-note">{proof}</p>)}
      {files.map((u: string, i: number) => isImg(u)
        ? <a key={i} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt={`Attachment ${i + 1}`} /></a>
        : <a key={i} href={u} target="_blank" rel="noopener noreferrer"><Icon n="paperclip" s={14} /> Attachment {i + 1}</a>)}
    </div>
  );
}

// ── Review drawer ─────────────────────────────────────────────────────────
function JobDrawer({ task, onClose, onChanged }: { task: Task; onClose: () => void; onChanged: () => void }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const cur = task.currency || "NGN";
  const reward = Number(task.reward || 0);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<Sub[]>(`/tasks/${task.id}/submissions`);
      setSubs(Array.isArray(data) ? data : []);
    } catch (e: any) { setSubs([]); toast(e?.message || "Couldn't load the submissions", "error"); }
  }, [task.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const review = async (s: Sub, status: "APPROVED" | "REJECTED") => {
    setBusy(s.id);
    try {
      await apiRequest(`/tasks/submissions/${s.id}/review`, { method: "PATCH", body: JSON.stringify({ status, ...(status === "REJECTED" && reason.trim() ? { posterNotes: reason.trim() } : {}) }) });
      toast(status === "APPROVED" ? `Approved. @${who(s.worker)} gets ${money(reward, cur)}.` : "Rejected. The slot is open again.", "success");
      setRejecting(null); setReason("");
      await load(); onChanged();
    } catch (e: any) { toast(e?.message || "That didn't work. Try again.", "error"); }
    setBusy(null);
  };

  const setPaused = async (paused: boolean) => {
    try {
      await apiRequest(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: paused ? "DRAFT" : "OPEN" }) });
      toast(paused ? "Job paused. Workers can't see it until you resume." : "Job resumed", "success");
      onChanged(); onClose();
    } catch (e: any) { toast(e?.message || "Couldn't change the job", "error"); }
  };
  const cancel = async () => {
    if (!window.confirm("Cancel this job? Money held for unfilled slots, including their share of the fee, goes back to your wallet.")) return;
    try {
      await apiRequest(`/escrow/refund/${task.id}`, { method: "POST" });
      toast("Job cancelled. The money is back in your wallet.", "success");
      onChanged(); onClose();
    } catch (e: any) { toast(e?.message || "Couldn't cancel this job", "error"); }
  };
  const edit = () => {
    try { sessionStorage.setItem("ogapay_edit_task", JSON.stringify({ id: task.id, title: task.title, reward, currency: cur, slots: task.maxWorkers, status: task.status.toLowerCase() })); } catch { /* storage off */ }
    navigate(`/create?edit=${task.id}`);
  };

  const list = subs || [];
  const by = (st: string) => list.filter((s) => s.status === st);
  const toReview = by("SUBMITTED"), working = by("PENDING"), approved = by("APPROVED"), rejected = by("REJECTED"), disputed = by("DISPUTED");
  const live = ["OPEN", "DRAFT", "IN_PROGRESS", "COOLING_DOWN"].includes(task.status);
  const counts = jobCounts({ ...task, submissions: subs || task.submissions });

  return (
    <>
      <div className="mj-scrim" onClick={onClose} />
      <aside className="mj-drawer" role="dialog" aria-modal="true" aria-label={task.title}>
        <div className="mj-dh">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{task.title}</h2>
            <div className="mj-meta"><Pill status={task.status} /><span>{categoryLabel(task.category)}</span><span>{money(reward, cur)} per person</span></div>
          </div>
          <button className="mj-x" onClick={onClose} aria-label="Close"><Icon n="x" /></button>
        </div>

        <div className="mj-db">
          <div className="mj-dgrid">
            <div><b>{counts.approved}/{counts.slots}</b><span>approved</span></div>
            <div><b>{counts.review}</b><span>to review</span></div>
            <div><b>{money(counts.paid, cur)}</b><span>paid out</span></div>
          </div>

          {subs === null ? <div className="ui-sk" style={{ height: 120 }} /> : (
            <>
              <section className="mj-sec">
                <h4>Waiting for your review ({toReview.length})</h4>
                {toReview.length === 0 ? <div className="mj-empty">Nothing to review right now.</div> : toReview.map((s) => (
                  <div key={s.id} className="mj-sub">
                    <div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>Sent {ago(s.submittedAt || s.createdAt)}</small></div></div>
                    {s.workerNotes && <p className="mj-note">{s.workerNotes}</p>}
                    <Proof s={s} />
                    {s.autoApproveAt && <p className="mj-auto"><Icon n="clock-check" s={14} /> If you don't review it, it's approved and paid automatically on {new Date(s.autoApproveAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.</p>}
                    {rejecting === s.id ? (
                      <div className="mj-reason">
                        <textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder={`Tell @${who(s.worker)} what was wrong (optional)`} autoFocus />
                        <div className="mj-acts">
                          <button className="ui-btn ui-btn-ghost" onClick={() => { setRejecting(null); setReason(""); }}>Back</button>
                          <button className="ui-btn ui-btn-dark" disabled={busy === s.id} onClick={() => review(s, "REJECTED")}>{busy === s.id ? "Rejecting…" : "Reject work"}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mj-acts">
                        <button className="ui-btn ui-btn-dark" disabled={busy === s.id} onClick={() => review(s, "APPROVED")}><Icon n="check" s={15} /> {busy === s.id ? "Approving…" : `Approve and pay ${money(reward, cur)}`}</button>
                        <button className="ui-btn ui-btn-ghost" disabled={busy === s.id} onClick={() => { setRejecting(s.id); setReason(""); }}>Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </section>

              {working.length > 0 && (
                <section className="mj-sec">
                  <h4>Working on it ({working.length})</h4>
                  <div className="mj-rows">{working.map((s) => (
                    <div key={s.id} className="mj-row"><div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>Took a slot {ago(s.createdAt)}</small></div></div></div>
                  ))}</div>
                </section>
              )}
              {disputed.length > 0 && (
                <section className="mj-sec">
                  <h4>In dispute ({disputed.length})</h4>
                  <div className="mj-rows">{disputed.map((s) => (
                    <div key={s.id} className="mj-row"><div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>Our team is reviewing this</small></div></div></div>
                  ))}</div>
                </section>
              )}
              {approved.length > 0 && (
                <section className="mj-sec">
                  <h4>Approved ({approved.length})</h4>
                  <div className="mj-rows">{approved.map((s) => (
                    <div key={s.id} className="mj-row"><div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>Paid {money(reward, cur)}{s.reviewedAt ? ` · ${day(s.reviewedAt)}` : ""}</small></div></div></div>
                  ))}</div>
                </section>
              )}
              {rejected.length > 0 && (
                <section className="mj-sec">
                  <h4>Rejected ({rejected.length})</h4>
                  <div className="mj-rows">{rejected.map((s) => (
                    <div key={s.id} className="mj-row"><div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>{s.reviewedAt ? day(s.reviewedAt) : "Rejected"}</small>{s.posterNotes && <p>“{s.posterNotes}”</p>}</div></div></div>
                  ))}</div>
                </section>
              )}
              {list.length === 0 && <div className="mj-empty">No one has taken this job yet.</div>}
            </>
          )}
        </div>

        <div className="mj-df">
          <Link className="ui-btn ui-btn-ghost" to={`/tasks/${task.id}`}><Icon n="eye" s={15} /> Public page</Link>
          {live && <button className="ui-btn ui-btn-ghost" onClick={edit}><Icon n="edit" s={15} /> Edit</button>}
          {(task.status === "OPEN" || task.status === "DRAFT") && (
            <button className="ui-btn ui-btn-ghost" onClick={() => setPaused(task.status === "OPEN")}>
              <Icon n={task.status === "OPEN" ? "player-pause" : "player-play"} s={15} /> {task.status === "OPEN" ? "Pause" : "Resume"}
            </button>
          )}
          {live && <button className="ui-btn ui-btn-ghost mj-danger" onClick={cancel}><Icon n="circle-x" s={15} /> Cancel job</button>}
        </div>
      </aside>
    </>
  );
}

// ── BLACKLIST PAGE ─────────────────────────────────────────────────────────
function BlacklistPage() {
  const { toast } = useToast();
  const [blocked, setBlocked] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);

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
    toast("User blocked successfully");
  };

  const unblock = (id: any) => {
    setBlocked(b => b.filter(x => x.id !== id));
    toast("User unblocked");
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>Creator Blacklist</h2>
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.5 }}>Blocked users cannot participate in your future jobs.</p>
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99, background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
            {blocked.length} blocked
          </span>
        </div>
      </div>

      {/* Search box */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Search by OgaPay username or X handle</div>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setSearched(false); setSearchResult(null); }}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="nickname or @xhandle"
          style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "var(--text)", outline: "none", marginBottom: 10, boxSizing: "border-box", fontFamily: "inherit" }}
        />
        <button onClick={handleSearch}
          style={{ width: "100%", background: "var(--bg2)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>
          Search
        </button>

        {/* Search result */}
        {searched && searchResult && (
          <div style={{ marginTop: 12, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
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
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${"var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>Blocked users</span>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Page 1 of 1</span>
        </div>

        {blocked.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}><Icon n="shield-off" s={28} c="var(--text3)" /></div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>You have not blocked anyone yet.</div>
          </div>
        ) : blocked.map((b, i) => (
          <div key={b.id} style={{ padding: "14px 16px", borderBottom: i < blocked.length - 1 ? `1px solid ${"var(--border)"}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: b.color || "var(--red)", opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-accent)", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
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
                style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: "var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>
                Unblock
              </button>
            </div>
          </div>
        ))}
      </div>

      {blocked.length > 0 && (
        <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 6 }}>
            <Icon n="alert-triangle" s={14} c="#f59e0b" style={{ marginTop: 1 }} /> Blocked users are automatically excluded from all your current and future job listings on OgaPay.
          </div>
        </div>
      )}
    </div>
  );
}

// ── TEMPLATES PAGE ─────────────────────────────────────────────────────────
function TemplatesPage({ onUseTemplate }: { onUseTemplate: any }) {
  const { toast } = useToast();
  const [tab, setTab] = useState("mine");
  const [templates, setTemplates] = useState<{ mine: any[]; public: any[] }>({ mine: [], public: [] });
  const [showCreate, setShowCreate] = useState(false);
  const [newTpl, setNewTpl] = useState({ title: "", category: "", description: "", platform: "X (Twitter)", reward: "", slots: "", visibility: "private" });
  const [expandedId, setExpandedId] = useState(null);

  const saveTemplate = () => {
    if (!newTpl.title.trim()) return;
    const t = { id: `TPL-${Date.now()}`, ...newTpl, updatedAt: new Date().toLocaleString(), visibility: newTpl.visibility };
    setTemplates(prev => ({ ...prev, mine: [t, ...prev.mine] }));
    setNewTpl({ title: "", category: "", description: "", platform: "X (Twitter)", reward: "", slots: "", visibility: "private" });
    setShowCreate(false);
    toast("Template saved!");
  };

  const deleteTemplate = (id: any) => {
    setTemplates(prev => ({ ...prev, mine: prev.mine.filter(t => t.id !== id) }));
    toast("Template deleted");
  };

  const forkTemplate = (tpl: any) => {
    const forked = { ...tpl, id: `TPL-${Date.now()}`, title: `${tpl.title} (copy)`, visibility: "private", updatedAt: new Date().toLocaleString() };
    setTemplates(prev => ({ ...prev, mine: [forked, ...prev.mine] }));
    setTab("mine");
    toast("Template forked to My Templates!");
  };

  const list = tab === "mine" ? templates.mine : templates.public;

  return (
    <div style={{ width: "100%" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>Custom Job Templates</h2>
        <p style={{ fontSize: 13, color: "var(--text3)" }}>Review, update, delete, and fork templates in one place.</p>
      </div>

      {/* Tab toggle */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
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
              {showCreate ? <><i className="ti ti-x" /> Cancel</> : "+ Create template"}
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
                      <textarea value={newTpl[f.key as keyof typeof newTpl]} onChange={e => setNewTpl(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3}
                        style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                    ) : (
                      <input value={newTpl[f.key as keyof typeof newTpl]} onChange={e => setNewTpl(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                        style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                    )}
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 4 }}>Platform</label>
                    <select value={newTpl.platform} onChange={e => setNewTpl(p => ({ ...p, platform: e.target.value }))}
                      style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }}>
                      {["X (Twitter)", "Instagram", "Telegram", "Discord", "YouTube", "On-chain", "Other"].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, display: "block", marginBottom: 4 }}>Visibility</label>
                    <select value={newTpl.visibility} onChange={e => setNewTpl(p => ({ ...p, visibility: e.target.value }))}
                      style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }}>
                      <option value="private"><i className="ti ti-lock" /> Private</option>
                      <option value="community"><i className="ti ti-world" /> Community</option>
                    </select>
                  </div>
                </div>
                <button onClick={saveTemplate}
                  style={{ width: "100%", background: "var(--accent)", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 800, color: "var(--on-accent)", cursor: "pointer", fontFamily: "inherit" }}>
                  Save Template
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template list */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
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
                {tpl.visibility === "private" ? <><i className="ti ti-lock" /> Private</> : <><i className="ti ti-world" /> Community</>} · {tpl.updatedAt}
              </div>
            </div>

            {/* Expanded actions */}
            {expandedId === tpl.id && (
              <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {tpl.description && (
                  <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                    {tpl.description}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { onUseTemplate(tpl); toast("Template loaded into Create Job!"); }}
                    style={{ flex: 2, background: "var(--accent)", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 12, fontWeight: 800, color: "var(--on-accent)", cursor: "pointer", fontFamily: "inherit" }}>
                    Use Template →
                  </button>
                  <button onClick={() => forkTemplate(tpl)}
                    style={{ flex: 1, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 0", fontSize: 12, fontWeight: 700, color: "var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>
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
            <i className="ti ti-world" /> Community templates are created and shared by other OgaPay job creators. Fork any template to customise it for your own jobs.
          </div>
        </div>
      )}
    </div>
  );
}

// ── JOBS LIST ───────────────────────────────────────────────────────────────
const FILTERS: { id: string; label: string; test: (t: Task) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "review", label: "Needs review", test: (t) => jobCounts(t).review > 0 },
  { id: "open", label: "Open", test: (t) => ["OPEN", "IN_PROGRESS", "COOLING_DOWN"].includes(t.status) },
  { id: "paused", label: "Paused", test: (t) => t.status === "DRAFT" },
  { id: "closed", label: "Closed", test: (t) => ["COMPLETED", "CANCELLED", "EXPIRED", "DISPUTED"].includes(t.status) },
];

function JobsListPage({ tasks, reload }: { tasks: Task[]; reload: () => void }) {
  const [filter, setFilter] = useState("all");
  // ?job=<id> opens that job's drawer (links from Profile and /tasks/:id/submissions)
  const [params, setParams] = useSearchParams();
  const [openId, setOpenIdState] = useState<string | null>(params.get("job"));
  const setOpenId = (v: string | null) => { setOpenIdState(v); if (!v && params.get("job")) { params.delete("job"); setParams(params, { replace: true }); } };
  const open = tasks.find((t) => t.id === openId) || null;

  const totals = useMemo(() => {
    const paid: Record<string, number> = {};
    let review = 0, approved = 0;
    for (const t of tasks) {
      const c = jobCounts(t);
      review += c.review; approved += c.approved;
      const cur = t.currency || "NGN";
      paid[cur] = (paid[cur] || 0) + c.paid;
    }
    const live = tasks.filter(FILTERS[2].test).length;
    const paidText = Object.entries(paid).filter(([, v]) => v > 0).map(([c, v]) => money(v, c)).join(" · ") || money(0);
    return { review, approved, live, paidText };
  }, [tasks]);

  const shown = tasks.filter((FILTERS.find((f) => f.id === filter) || FILTERS[0]).test);

  if (tasks.length === 0) {
    return (
      <div className="ui-empty" style={{ marginTop: 24 }}>
        <p style={{ margin: "0 0 14px" }}>You haven't posted a job yet.</p>
        <Link className="ui-btn ui-btn-dark" to="/create"><Icon n="plus" s={15} /> Post a job</Link>
      </div>
    );
  }

  return (
    <>
      <div className="mj-summary">
        <button className={`mj-sum${totals.review ? " hot" : ""}`} onClick={() => setFilter(totals.review ? "review" : "all")}><b>{totals.review}</b><span>waiting for your review</span></button>
        <div className="mj-sum"><b>{totals.live}</b><span>open jobs</span></div>
        <div className="mj-sum"><b>{totals.approved}</b><span>pieces of work approved</span></div>
        <div className="mj-sum"><b>{totals.paidText}</b><span>paid to workers</span></div>
      </div>

      <div className="mj-filters" role="tablist" aria-label="Filter jobs">
        {FILTERS.map((f) => {
          const n = tasks.filter(f.test).length;
          if (f.id !== "all" && n === 0) return null;
          return <button key={f.id} role="tab" aria-selected={filter === f.id} className={`ui-chip${filter === f.id ? " on" : ""}`} onClick={() => setFilter(f.id)}>{f.label}<em>{n}</em></button>;
        })}
      </div>

      <div className="mj-list">
        {shown.map((t) => {
          const c = jobCounts(t);
          const cur = t.currency || "NGN";
          return (
            <article key={t.id} className="ui-card mj-job" onClick={() => setOpenId(t.id)}>
              <div className="mj-job-top">
                <div style={{ minWidth: 0 }}>
                  <h3>{t.title}</h3>
                  <div className="mj-meta">
                    <Pill status={t.status} />
                    <span>{categoryLabel(t.category)}</span>
                    {t.createdAt && <span>Posted {day(t.createdAt)}</span>}
                    {t.deadline && <span>Closes {day(t.deadline)}</span>}
                  </div>
                </div>
                <div className="mj-reward"><b>{money(Number(t.reward || 0), cur)}</b><span>per person</span></div>
              </div>
              <div className="mj-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (c.approved / c.slots) * 100)}%` }} /></div>
              <div className="mj-job-foot">
                <div className="mj-counts">
                  <span><b>{c.approved}</b> of {c.slots} approved</span>
                  {c.review > 0 && <span className="warn"><b>{c.review}</b> to review</span>}
                  {c.working > 0 && <span><b>{c.working}</b> working</span>}
                  {["OPEN", "IN_PROGRESS", "DRAFT"].includes(t.status) && <span><b>{c.left}</b> {c.left === 1 ? "slot" : "slots"} left</span>}
                </div>
                <button className={`ui-btn ${c.review ? "ui-btn-dark" : "ui-btn-ghost"}`} onClick={(e) => { e.stopPropagation(); setOpenId(t.id); }}>
                  {c.review ? <>Review {c.review} <Icon n="arrow-right" s={15} /></> : "Details"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {open && <JobDrawer task={open} onClose={() => setOpenId(null)} onChanged={reload} />}
    </>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function MyJobs() {
  const { toast } = useToast();
  const { user, isAuthed } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [page, setPage] = useState("jobs");

  const load = useCallback(async () => {
    if (!isAuthed) { setTasks([]); return; }
    try {
      const data = await apiRequest<Task[] | { tasks: Task[] }>("/tasks/my/created?limit=100");
      setTasks(Array.isArray(data) ? data : data?.tasks || []);
    } catch (e: any) {
      setTasks((t) => t || []);
      toast(e?.message || "Couldn't load your jobs", "error");
    }
  }, [isAuthed]);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.id, load]);

  const TABS = [
    { id: "jobs", label: "My jobs", icon: "briefcase" },
    { id: "templates", label: "Templates", icon: "files" },
    { id: "blacklist", label: "Blacklist", icon: "ban" },
  ];

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">Posting</span>
            <h1 className="ui-title">Manage jobs</h1>
            <p className="ui-sub">Review work, pay people and keep track of what you've posted.</p>
          </div>
          <Link className="ui-btn ui-btn-dark" to="/create"><Icon n="plus" s={15} /> Post a job</Link>
        </div>

        <div className="mj-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={page === t.id} className={`mj-tab${page === t.id ? " on" : ""}`} onClick={() => setPage(t.id)}>
              <Icon n={t.icon} s={15} /> {t.label}
            </button>
          ))}
        </div>

        {page === "jobs" && (tasks === null
          ? <div style={{ display: "grid", gap: 10, marginTop: 20 }}>{[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 120 }} />)}</div>
          : <JobsListPage tasks={tasks} reload={load} />)}
        {page === "blacklist" && <div style={{ marginTop: 20 }}><BlacklistPage /></div>}
        {page === "templates" && <div style={{ marginTop: 20 }}><TemplatesPage onUseTemplate={() => { setPage("jobs"); toast("Template loaded"); }} /></div>}
      </div>
    </Layout>
  );
}
