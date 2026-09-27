import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout"
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { categoryLabel } from "../lib/categories";
import { listTemplates, saveTemplate, taskToTemplateData, type JobTemplate, type TemplateData } from "../components/create/shared";
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
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [tpl, setTpl] = useState<"" | "saving" | "saved">("");
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
    apiRequest<{ worker: { id: string } }[]>("/poster/blocked")
      .then((d) => setBlocked(new Set((Array.isArray(d) ? d : []).map((b) => b.worker.id)))).catch(() => {});
  }, []);
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

  const toggleBlock = async (w?: Sub["worker"]) => {
    if (!w?.id) return;
    const on = !blocked.has(w.id);
    if (on && !window.confirm(`Block @${who(w)}? They won't be able to take any of your jobs. Work they've already sent isn't affected.`)) return;
    try {
      if (on) await apiRequest("/poster/blocked", { method: "POST", body: JSON.stringify({ workerId: w.id }) });
      else await apiRequest(`/poster/blocked/${w.id}`, { method: "DELETE" });
      setBlocked((b) => { const n = new Set(b); on ? n.add(w.id) : n.delete(w.id); return n; });
      toast(on ? `@${who(w)} is blocked` : `@${who(w)} is unblocked`, "success");
    } catch (e: any) { toast(e?.message || "That didn't work", "error"); }
  };
  const BlockBtn = ({ w }: { w?: Sub["worker"] }) => w?.id ? (
    <button className="mj-block" onClick={() => toggleBlock(w)}>{blocked.has(w.id) ? "Unblock" : "Block"}</button>
  ) : null;

  const saveAsTemplate = async () => {
    setTpl("saving");
    try { await saveTemplate(taskToTemplateData(task), task.title); setTpl("saved"); toast("Saved to Templates", "success"); }
    catch (e: any) { setTpl(""); toast(e?.message || "Couldn't save the template", "error"); }
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
                    <div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>Sent {ago(s.submittedAt || s.createdAt)}</small></div><BlockBtn w={s.worker} /></div>
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
                    <div key={s.id} className="mj-row"><div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>Took a slot {ago(s.createdAt)}</small></div></div><BlockBtn w={s.worker} /></div>
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
                    <div key={s.id} className="mj-row"><div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>{s.reviewedAt ? day(s.reviewedAt) : "Rejected"}</small>{s.posterNotes && <p>“{s.posterNotes}”</p>}</div></div><BlockBtn w={s.worker} /></div>
                  ))}</div>
                </section>
              )}
              {list.length === 0 && <div className="mj-empty">No one has taken this job yet.</div>}
            </>
          )}
        </div>

        <div className="mj-df">
          <Link className="ui-btn ui-btn-ghost" to={`/tasks/${task.id}`}><Icon n="eye" s={15} /> Public page</Link>
          <button className="ui-btn ui-btn-ghost" disabled={tpl !== ""} onClick={saveAsTemplate}><Icon n={tpl === "saved" ? "check" : "device-floppy"} s={15} /> {tpl === "saving" ? "Saving…" : tpl === "saved" ? "Saved" : "Save as template"}</button>
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

// ── BLACKLIST ───────────────────────────────────────────────────────────────
// People you've blocked can't take your jobs (checked by the server when they
// apply) and you can't hire them directly. Work they already sent isn't affected.
type Blocked = { id: string; reason?: string | null; createdAt: string; worker: NonNullable<Sub["worker"]> };

function BlacklistPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Blocked[] | null>(null);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => apiRequest<Blocked[]>("/poster/blocked").then((d) => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([])), []);
  useEffect(() => { load(); }, [load]);

  const block = async () => {
    const username = name.trim().replace(/^@/, "");
    if (!username) return;
    setBusy(true); setError("");
    try {
      await apiRequest("/poster/blocked", { method: "POST", body: JSON.stringify({ username, ...(reason.trim() && { reason: reason.trim() }) }) });
      toast(`@${username} can no longer take your jobs`, "success");
      setName(""); setReason(""); load();
    } catch (e: any) { setError(e?.message || "Couldn't block them"); }
    setBusy(false);
  };
  const unblock = async (b: Blocked) => {
    try {
      await apiRequest(`/poster/blocked/${b.worker.id}`, { method: "DELETE" });
      toast(`@${who(b.worker)} is unblocked`, "success");
      setRows((r) => (r || []).filter((x) => x.id !== b.id));
    } catch (e: any) { toast(e?.message || "Couldn't unblock", "error"); }
  };

  return (
    <div className="mj-tool">
      <section className="ui-card ui-card-pad">
        <h3 className="mj-tool-h">Block someone</h3>
        <p className="mj-tool-p">They won't be able to take any of your jobs, and you won't be able to hire them until you unblock them. Work they've already sent isn't affected. They aren't told.</p>
        <form className="mj-tool-form" onSubmit={(e) => { e.preventDefault(); block(); }}>
          <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="@username" aria-label="Username" autoComplete="off" />
          <input className="ui-input" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Why (optional, only you see this)" aria-label="Reason" />
          <button className="ui-btn ui-btn-dark" disabled={busy || !name.trim()}>{busy ? "Blocking…" : "Block"}</button>
        </form>
        {error && <p className="mj-tool-err" role="alert">{error}</p>}
      </section>

      <section className="mj-sec">
        <h4>Blocked ({rows?.length ?? 0})</h4>
        {rows === null ? <div className="ui-sk" style={{ height: 80 }} /> : rows.length === 0 ? (
          <div className="mj-empty">You haven't blocked anyone. You can also block someone from the review panel of any job.</div>
        ) : (
          <div className="mj-rows">
            {rows.map((b) => (
              <div key={b.id} className="mj-row">
                <div className="mj-who"><Avatar w={b.worker} /><div><WorkerLink w={b.worker} /><small>Blocked {day(b.createdAt)}</small>{b.reason && <p>“{b.reason}”</p>}</div></div>
                <button className="ui-btn ui-btn-ghost" onClick={() => unblock(b)}>Unblock</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── TEMPLATES ───────────────────────────────────────────────────────────────
// Saved job forms. "Use" opens Create with the form filled in.
function TemplatesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<JobTemplate[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const load = useCallback(() => listTemplates().then((d) => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([])), []);
  useEffect(() => { load(); }, [load]);

  const rename = async (t: JobTemplate) => {
    const name = draftName.trim();
    if (!name || name === t.name) { setEditing(null); return; }
    try {
      await apiRequest(`/poster/templates/${t.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      setRows((r) => (r || []).map((x) => x.id === t.id ? { ...x, name } : x));
      setEditing(null);
    } catch (e: any) { toast(e?.message || "Couldn't rename it", "error"); }
  };
  const remove = async (t: JobTemplate) => {
    if (!window.confirm(`Delete the template "${t.name}"?`)) return;
    try {
      await apiRequest(`/poster/templates/${t.id}`, { method: "DELETE" });
      setRows((r) => (r || []).filter((x) => x.id !== t.id));
      toast("Template deleted", "success");
    } catch (e: any) { toast(e?.message || "Couldn't delete it", "error"); }
  };
  const summary = (d: TemplateData) => [
    d.bounty && Number(d.bounty) > 0 ? `Budget ${money(Number(d.bounty), d.currency || "NGN")}` : null,
    d.winners ? `${d.winners} ${d.winners === "1" ? "person" : "people"}` : null,
    d.category || null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="mj-tool">
      <p className="mj-tool-p" style={{ margin: 0 }}>Post similar jobs faster. Save a template from the Create page (<b>Save as template</b>) or from any job's details here, then use it to start a new job with everything filled in.</p>
      {rows === null ? <div className="ui-sk" style={{ height: 120 }} /> : rows.length === 0 ? (
        <div className="ui-empty">
          <p style={{ margin: "0 0 14px" }}>No templates yet.</p>
          <Link className="ui-btn ui-btn-dark" to="/create?type=custom"><Icon n="plus" s={15} /> Create a job</Link>
        </div>
      ) : (
        <div className="mj-list">
          {rows.map((t) => (
            <article key={t.id} className="ui-card mj-tpl">
              <div className="mj-tpl-t">
                {editing === t.id ? (
                  <form onSubmit={(e) => { e.preventDefault(); rename(t); }} className="mj-tpl-rename">
                    <input className="ui-input" value={draftName} maxLength={80} autoFocus onChange={(e) => setDraftName(e.target.value)} aria-label="Template name" />
                    <button className="ui-btn ui-btn-dark">Save</button>
                    <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                ) : <h3>{t.name}</h3>}
                <span className="mj-tpl-meta">{summary(t.data) || "Saved job"} · updated {day(t.updatedAt)}</span>
                {t.data.description && <p>{t.data.description}</p>}
              </div>
              <div className="mj-tpl-acts">
                <button className="ui-btn ui-btn-dark" onClick={() => navigate(`/create?template=${t.id}`)}>Use</button>
                <button className="ui-btn ui-btn-ghost" onClick={() => { setEditing(t.id); setDraftName(t.name); }}>Rename</button>
                <button className="ui-btn ui-btn-ghost mj-danger" onClick={() => remove(t)} aria-label={`Delete ${t.name}`}><Icon n="trash" s={15} /></button>
              </div>
            </article>
          ))}
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
        {page === "templates" && <div style={{ marginTop: 20 }}><TemplatesPage /></div>}
      </div>
    </Layout>
  );
}
