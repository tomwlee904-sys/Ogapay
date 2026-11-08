import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout"
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { categoryLabel } from "../lib/categories";
import { listTemplates, saveTemplate, taskToTemplateData, isUnsure, MONEY_TIMEOUT_MS, type JobTemplate, type TemplateData } from "../components/create/shared";
import { newKey } from "../lib/wallet";
import "../styles/manage-jobs.css";
import InfoTip from '../components/InfoTip'
import { missingLink, missingLinkText } from "../lib/jobText";
import RateWork, { RatedStars, ratedByTeam } from '../components/RateWork'
import CopyFlag from '../components/CopyFlag'
import { PayoutCheckStatus, checkBlocksApprove, anyWaiting, useNow } from '../components/PayoutCheck'
import TransferModal from '../components/TransferModal'
import { isXFollowJob } from "../lib/followJobs";
import { HANDLE_PLATFORMS, handlePlatformName, profileUrl, UNFOLLOW_BLOCK_DAYS } from "../lib/followHandles";
import LoadError from "../components/LoadError";
import { jobDeadline } from "../lib/deadline";
import { deliveryText, pickedDueAt } from "../lib/delivery";
import { contestPaidOut } from "../lib/contestPrizes";
import { useMoney } from "../lib/useMoney";
import { useCurrency } from "../context/CurrencyContext";
import { displayCode, formatIn, inDisplay } from "../lib/money";
import type { Currency } from "../lib/currency";

// Work can be sent back for changes this many times (server: task.service SEND_BACK_LIMIT)
const SEND_BACK_LIMIT = 2;

// Manage jobs: the poster's jobs, their review queue and job actions.
// Counts come from each job's submissions (by status). The old page used
// currentWorkers (slots taken) as "winners" and every submission as "pending",
// and its drawer had a made-up AI score, a hard-coded chart and dead buttons.

type Sub = {
  id: string; status: string; createdAt: string; submittedAt?: string | null; reviewedAt?: string | null
  startedAt?: string | null
  proof?: string | null; workerNotes?: string | null; posterNotes?: string | null; attachments?: any[]
  autoApproveAt?: string | null
  // Sent back for changes (at most SEND_BACK_LIMIT times); the note is in posterNotes
  sentBackAt?: string | null; sentBackCount?: number
  // Social jobs with a payout check: WAITING until payoutCheckDueAt, then PASSED,
  // SKIPPED, FAILED or UNKNOWN with a plain reason (Approve waits for the window)
  payoutCheck?: string | null; payoutCheckDueAt?: string | null; payoutCheckReason?: string | null
  // Set by the server when the entry looks copied from another one on this job, or only says "done"
  spamReason?: string | null; similarToId?: string | null
  rating?: number | null; feedback?: string | null
  // Contest entries: the place this entry won (1 = first)
  place?: number | null
  // Who rated it (an admin can rate flagged work) and who moderated it
  ratedById?: string | null; moderatedById?: string | null
  worker?: { id: string; username?: string | null; firstName?: string | null; lastName?: string | null; avatarUrl?: string | null }
  // Follow jobs (task.askHandle): the username they typed, and when you reported an unfollow
  workerHandle?: string | null; unfollowedAt?: string | null
  // What they were really paid (a raised pay doesn't change it); null if nothing was paid
  paidAmount?: number | string | null
}
type Task = {
  id: string; title: string; status: string; category?: string; reward: number | string; currency?: string
  maxWorkers?: number; deadline?: string | null; expiresAt?: string | null; createdAt?: string; submissions?: Sub[]
  description?: string | null; instructions?: string | null; tags?: string[]
  excludesTaskIds?: string[]
  // "Member of community": a public job only that community's members can take
  requiredCommunityId?: string | null; communityId?: string | null
  // Where workers must live (NG, GH); empty = anyone
  targetCountries?: string[]
  // Only women (F) or only men (M); null = anyone
  targetGender?: string | null
  // Follow jobs: the platform whose username workers type (INSTAGRAM, TIKTOK...); null = none
  askHandle?: string | null
  // A contest: entries aren't approved one by one, places are awarded on the job page.
  // prizes: one per place, 1st first (the reward is only the 1st prize)
  isContest?: boolean; randomDraw?: boolean; prizes?: (number | string)[] | null
  // Quick social jobs use set prices; private hires: neither can have the pay raised
  socialAction?: string | null
  // Selection jobs: people apply with a note and the poster picks one (hiredWorkerId)
  isSelection?: boolean; hiredWorkerId?: string | null
  // Selection jobs: days the picked person has to send the work (null = 24 hours),
  // counted from the pick (cooldownStartedAt)
  deliveryDays?: number | null; cooldownStartedAt?: string | null
  posterId?: string
  _count?: { submissions?: number; applications?: number }
}
type Application = {
  id: string; workerId?: string; status: "WAITING" | "PICKED" | "NOT_PICKED"; pitch: string; createdAt: string
  worker?: Sub["worker"] & { workerProfile?: { tasksCompleted?: number; avgRating?: number; totalRatings?: number } | null }
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

// What approved work was really paid: the server's paidAmount, so raising the pay
// doesn't re-price earlier approvals (2026-11-08); the job's pay if it isn't known
const paidFor = (s: Sub, reward: number) => s.paidAmount != null && Number.isFinite(Number(s.paidAmount)) ? Number(s.paidAmount) : reward;

// Per-job numbers from its submissions. A contest's winners were paid the prize
// of the place each won, not its reward (the 1st prize) each (2026-11-01).
function jobCounts(t: Task) {
  const c: Record<string, number> = {};
  for (const s of t.submissions || []) c[s.status] = (c[s.status] || 0) + 1;
  const approved = c.APPROVED || 0, review = c.SUBMITTED || 0, working = c.PENDING || 0, disputed = c.DISPUTED || 0;
  const slots = t.maxWorkers || 1;
  const paid = t.isContest ? contestPaidOut(t.prizes, t.submissions || [], Number(t.reward || 0), t.currency || "NGN")
    : (t.submissions || []).filter((s) => s.status === "APPROVED").reduce((sum, s) => sum + paidFor(s, Number(t.reward || 0)), 0);
  return { approved, review, working, disputed, rejected: c.REJECTED || 0, slots, left: Math.max(0, slots - approved - review - working - disputed), paid };
}

const Avatar = ({ w }: { w?: Sub["worker"] }) => (
  <span className="mj-av">{w?.avatarUrl ? <img src={w.avatarUrl} alt="" /> : who(w).charAt(0).toUpperCase()}</span>
);
// Follow jobs: "Instagram: @ada.k", opening their profile to check the follow
const HandleLine = ({ code, s }: { code?: string | null; s: Sub }) => !code || !s.workerHandle ? null : (
  <p className="mj-auto"><Icon n="at" s={14} /> {handlePlatformName(code)}: <a href={profileUrl(code, s.workerHandle)} target="_blank" rel="noopener noreferrer">@{s.workerHandle}</a></p>
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
// focusId: an entry to scroll to and mark (the Read link on a contest's job page)
// onChanged: the job changed (only it is loaded again, not every job); onSubs: its
// submissions as the drawer has them, so the job's card counts stay right (2026-11-08)
function JobDrawer({ task, allTasks, focusId, onClose, onChanged, onSubs }: { task: Task; allTasks: Task[]; focusId?: string | null; onClose: () => void; onChanged: (o?: { subs?: boolean }) => void; onSubs?: (taskId: string, subs: Sub[]) => void }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  // These are the signed-in person's own jobs, so they are the poster
  const { user } = useAuth();
  const [subs, setSubs] = useState<Sub[] | null>(null);
  // Re-render while a payout check runs, so Approve opens when its window ends
  const clock = useNow(anyWaiting(subs));
  const [busy, setBusy] = useState<string | null>(null);
  // The open note box: rejecting (final for that person) or sending back for changes
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [action, setAction] = useState<"reject" | "back" | "fake">("reject");
  const [reason, setReason] = useState("");
  // Stars and a note for each piece of work, sent with "Approve and pay" (optional)
  const [stars, setStars] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [tpl, setTpl] = useState<"" | "saving" | "saved">("");
  // Approved work the poster is tipping (opens the send window as a tip)
  const [tipFor, setTipFor] = useState<Sub | null>(null);
  const cur = task.currency || "NGN";
  const reward = Number(task.reward || 0);
  const contest = !!task.isContest;
  // Figures people read (the reward in the header, "paid out") follow the display
  // currency; where money moves (approve, raise pay) it stays in the job's own
  const show = useMoney();

  const load = useCallback(async () => {
    try {
      // The server sends 50 by default (newest first, people still working count
      // too): ask for up to 500 so every entry waiting for review is listed, the
      // same as the contest's award list on the job page
      const data = await apiRequest<Sub[]>(`/tasks/${task.id}/submissions?limit=500`);
      setSubs(Array.isArray(data) ? data : []);
    } catch (e: any) { setSubs([]); toast(e?.message || "Couldn't load the submissions", "error"); }
  }, [task.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (subs && onSubs) onSubs(task.id, subs); }, [subs]); // eslint-disable-line react-hooks/exhaustive-deps
  // Once the entries are in, scroll to the one asked for (only the first time)
  const focused = useRef(false);
  useEffect(() => {
    if (!subs || !focusId || focused.current) return;
    focused.current = true;
    window.requestAnimationFrame(() => document.getElementById(`mj-sub-${focusId}`)?.scrollIntoView({ block: "start" }));
  }, [subs, focusId]);
  // Selection job: the applications, oldest first
  const [apps, setApps] = useState<Application[] | null>(null);
  const loadApps = useCallback(async () => {
    if (!task.isSelection) return;
    try {
      const data = await apiRequest<Application[]>(`/tasks/${task.id}/applications`);
      setApps(Array.isArray(data) ? data : []);
    } catch (e: any) { setApps([]); toast(e?.message || "Couldn't load the applications", "error"); }
  }, [task.id, task.isSelection]);
  useEffect(() => { loadApps(); }, [loadApps]);
  const pick = async (a: Application) => {
    if (!window.confirm(`Pick @${who(a.worker)} for this job? They get ${deliveryText(task)} to send the work. Everyone else who applied is told they weren't picked.`)) return;
    setBusy(a.id);
    try {
      const r = await apiRequest<{ deliveryText?: string }>(`/tasks/${task.id}/applications/${a.id}/pick`, { method: "POST" });
      toast(`You picked @${who(a.worker)}. They have ${r?.deliveryText || deliveryText(task)} to send the work.`, "success");
      await Promise.all([loadApps(), load()]); onChanged();
    } catch (e: any) { toast(e?.message || "That didn't work. Try again.", "error"); }
    setBusy(null);
  };
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
    const rating = status === "APPROVED" ? stars[s.id] || 0 : 0;
    const note = (notes[s.id] || "").trim();
    try {
      await apiRequest(`/tasks/submissions/${s.id}/review`, { method: "PATCH", body: JSON.stringify({
        status,
        ...(status === "REJECTED" ? { posterNotes: reason.trim() } : {}),
        ...(rating ? { rating, ...(note ? { feedback: note } : {}) } : {}),
      }) });
      toast(status === "APPROVED" ? `Approved. @${who(s.worker)} gets ${money(reward, cur)}${rating ? ` and your ${rating}/5 rating` : ""}.` : contest ? "Rejected. This entry can't win a place." : "Rejected. The slot is open again.", "success");
      setRejecting(null); setReason("");
      await load(); onChanged();
    } catch (e: any) { toast(e?.message || "That didn't work. Try again.", "error"); }
    setBusy(null);
  };

  // Back to the worker with a note: they keep their place, edit it and send it again
  const sendBack = async (s: Sub) => {
    setBusy(s.id);
    try {
      await apiRequest(`/tasks/submissions/${s.id}/send-back`, { method: "POST", body: JSON.stringify({ note: reason.trim() }) });
      toast(`Sent back. @${who(s.worker)} can edit it and send it again.`, "success");
      setRejecting(null); setReason("");
      await load(); onChanged();
    } catch (e: any) { toast(e?.message || "That didn't work. Try again.", "error"); }
    setBusy(null);
  };

  // Report as fake: rejected (final), counted on their account, the OgaPay team told
  const reportFake = async (s: Sub) => {
    setBusy(s.id);
    try {
      await apiRequest(`/tasks/submissions/${s.id}/report-fake`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) });
      toast(`Reported. @${who(s.worker)}'s work was rejected and the OgaPay team was told.`, "success");
      setRejecting(null); setReason("");
      await load(); onChanged();
    } catch (e: any) { toast(e?.message || "That didn't work. Try again.", "error"); }
    setBusy(null);
  };

  // Follow jobs: they unfollowed after being paid. A warning, and no follow jobs for
  // 90 days; the pay isn't taken back.
  const reportUnfollow = async (s: Sub) => {
    if (!window.confirm(`Report that @${who(s.worker)} unfollowed?

They get a warning on their account and can't take follow jobs for ${UNFOLLOW_BLOCK_DAYS} days. The money they were paid isn't taken back.`)) return;
    setBusy(s.id);
    try {
      await apiRequest(`/tasks/submissions/${s.id}/report-unfollow`, { method: "POST", body: JSON.stringify({}) });
      toast(`Reported. @${who(s.worker)} got a warning and can't take follow jobs for ${UNFOLLOW_BLOCK_DAYS} days.`, "success");
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
      // Pausing only stops new people taking places (2026-11-08): anyone already
      // working on it keeps the place and can still send their work
      toast(paused ? "Job paused. New people can't take it until you resume. People already working on it can still send their work." : "Job resumed", "success");
      onChanged(); onClose();
    } catch (e: any) { toast(e?.message || "Couldn't change the job", "error"); }
  };
  const cancel = async () => {
    if (!window.confirm("Cancel this job? Money held for unfilled slots, including their share of the fee, goes back to your wallet.")) return;
    try {
      await apiRequest(`/escrow/refund/${task.id}`, { method: "POST" });
      toast("Job cancelled. The money is back in your wallet.", "success");
      onChanged({ subs: true }); onClose();
    } catch (e: any) { toast(e?.message || "Couldn't cancel this job", "error"); }
  };
  // Raise the pay per person: the extra for every place (plus the 10% fee) is held
  // from the wallet now; work approved from now on is paid the new amount
  const canRaise = (task.status === "OPEN" || task.status === "IN_PROGRESS") && !task.isContest && !task.socialAction && !task.hiredWorkerId;
  // A contest raises its prizes or adds places on its job page, while entries are open
  const canRaisePrizes = !!task.isContest && ["OPEN", "IN_PROGRESS", "COOLING_DOWN"].includes(task.status) && jobDeadline(task).state !== "ended";
  const raisePay = async () => {
    const input = window.prompt(`New pay per person (now ${money(reward, cur)}):`, String(cur === "NGN" ? Math.ceil((reward * 1.5) / 50) * 50 : +(reward * 1.5).toFixed(2)));
    if (input === null) return;
    const to = Number(String(input).replace(/[^\d.]/g, ""));
    if (!Number.isFinite(to) || to <= reward) { toast(`Enter more than ${money(reward, cur)}`, "error"); return; }
    const places = Number(task.maxWorkers) || 1;
    const extra = (to - reward) * places;
    const fee = Math.round(extra * 10) / 100; // 10%, to the kobo
    if (!window.confirm(`Raise the pay to ${money(to, cur)} per person?\n\n${money(extra, cur)} more is held for the ${places} places, plus a ${money(fee, cur)} fee: ${money(extra + fee, cur)} from your wallet.\n\nWork you approve from now on is paid ${money(to, cur)}. Money for places nobody uses comes back when the job closes.`)) return;
    try {
      await apiRequest(`/tasks/${task.id}/raise-pay`, { method: "POST", body: JSON.stringify({ reward: to }), timeoutMs: MONEY_TIMEOUT_MS });
      toast(`Pay raised to ${money(to, cur)} per person`, "success");
      onChanged(); onClose();
    } catch (e: any) {
      // No answer: it may have gone through. Load the job again rather than invite a second try
      if (isUnsure(e)) { toast("We couldn't confirm the pay was raised. Check the job's pay before you try again.", "error"); onChanged(); return; }
      toast(e?.message || "Couldn't raise the pay", "error");
    }
  };
  // Add places to an open job instead of posting it again (backend escrow.service addPlaces)
  const canAddPlaces = ["OPEN", "IN_PROGRESS", "COOLING_DOWN", "DRAFT"].includes(task.status) && !task.isContest && !task.isSelection && !task.hiredWorkerId && task.socialAction !== "RAID";
  // One key per visit to this job's panel: Add places pressed again after a timeout
  // returns the places already added instead of charging again (2026-11-08)
  const placesKey = useRef(newKey());
  const addPlaces = async () => {
    const input = window.prompt(`How many places to add? (it has ${Number(task.maxWorkers) || 1} now, each pays ${money(reward, cur)})`, "10");
    if (input === null) return;
    const n = Number(String(input).replace(/[^\d]/g, ""));
    if (!Number.isInteger(n) || n < 1) { toast("Enter how many places to add", "error"); return; }
    const extra = reward * n;
    const fee = Math.round(extra * 10) / 100; // 10%, to the kobo
    if (!window.confirm(`Add ${n} place${n === 1 ? "" : "s"} at ${money(reward, cur)} each?\n\n${money(extra, cur)} is held for them, plus a ${money(fee, cur)} fee: ${money(extra + fee, cur)} from your wallet.\n\nMoney for places nobody uses comes back when the job closes.`)) return;
    const before = Number(task.maxWorkers) || 0;
    try {
      const r = await apiRequest<{ places: number; added?: number; reopened?: boolean }>(`/tasks/${task.id}/add-places`, { method: "POST", body: JSON.stringify({ places: n, idempotencyKey: placesKey.current }), timeoutMs: MONEY_TIMEOUT_MS });
      placesKey.current = newKey();
      // A repeat of an earlier try answers with what that try added (2026-11-08)
      const added = Number(r?.added) > 0 ? Number(r?.added) : n;
      toast(`${added} place${added === 1 ? "" : "s"} added. The job now has ${r?.places ?? before + n}${r?.reopened ? " and is taking people again" : ""}.`, "success");
      onChanged(); onClose();
    } catch (e: any) {
      if (!isUnsure(e)) { toast(e?.message || "Couldn't add places", "error"); return; }
      // No answer: look at the job before saying anything
      const now = await apiRequest<any>(`/tasks/${task.id}`, { fresh: true }).then((d) => Number((d?.task || d)?.maxWorkers)).catch(() => NaN);
      if (Number.isFinite(now) && now > before) {
        placesKey.current = newKey();
        toast(`The places were added. The job now has ${now}.`, "success");
        onChanged(); onClose();
      } else if (Number.isFinite(now)) {
        toast("The connection dropped before the places were added. Try again: you won't be charged twice.", "error");
      } else {
        toast("We couldn't confirm the places were added. Check the job's places before you try again. Trying again from here won't charge you twice.", "error");
        onChanged();
      }
    }
  };
  // Stop job: pay the work waiting, release unused places and close (backend stopJob)
  const canStop = ["OPEN", "IN_PROGRESS", "COOLING_DOWN", "DRAFT"].includes(task.status) && !task.isContest;
  const stopJob = async () => {
    const subs = task.submissions || [];
    const waiting = subs.filter((s) => s.status === "SUBMITTED").length;
    // Work you sent back for changes is paid as it was last sent (2026-11-08): it
    // used to be released as an unused place, so the worker got nothing
    const backOut = subs.filter((s) => s.status === "PENDING" && s.sentBackAt && !s.submittedAt).length;
    const holding = subs.filter((s) => s.status === "PENDING").length - backOut;
    const lines = [
      waiting ? `${waiting} piece${waiting === 1 ? "" : "s"} of work waiting for review will be approved and paid (${money(reward * waiting, cur)}). Check them first if you haven't.` : "No work is waiting for review.",
      backOut ? `${backOut} piece${backOut === 1 ? "" : "s"} of work you sent back for changes will be approved and paid as last sent (${money(reward * backOut, cur)}).` : "",
      holding ? `${holding} ${holding === 1 ? "person holding a place" : "people holding places"} without sending work will lose ${holding === 1 ? "it" : "them"}.` : "",
      "The money for places nobody used comes back to your wallet. This can't be undone.",
    ].filter(Boolean);
    if (!window.confirm(`Stop "${task.title}"?\n\n${lines.join("\n")}`)) return;
    try {
      const r = await apiRequest<{ approved: number; released: number }>(`/tasks/${task.id}/stop`, { method: "POST" });
      toast(`Job stopped.${r?.approved ? ` ${r.approved} paid.` : ""} The unused money is back in your wallet.`, "success");
      onChanged({ subs: true }); onClose();
    } catch (e: any) { toast(e?.message || "Couldn't stop the job", "error"); }
  };
  const [editing, setEditing] = useState(false);
  const [ed, setEd] = useState({ title: task.title, brief: "", deadline: "" });
  // The closing date as the form first showed it (your own date, not the UTC one):
  // the date is only sent when you change it (2026-11-08)
  const shownDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-CA") : "";
  const [edGender, setEdGender] = useState<string>(task.targetGender || "");
  // Follow jobs: the platform whose username workers type ("" = don't ask)
  const [edHandle, setEdHandle] = useState<string>(task.askHandle || "");
  // Where workers must live: "" anyone, or one country (backend targetCountries)
  const [edCountry, setEdCountry] = useState<string>(task.targetCountries?.[0] || "");
  // Similar jobs: people who took part in any of them can't take this one (and the other way round)
  const others = allTasks.filter((t) => t.id !== task.id);
  const [similar, setSimilar] = useState<string[]>(task.excludesTaskIds || []);
  const [edBusy, setEdBusy] = useState(false);
  const [edErr, setEdErr] = useState("");
  // Member of community: communities this poster leads, plus OgaPay's own
  const canNeedCommunity = !task.communityId && !task.hiredWorkerId;
  const [reqCommunity, setReqCommunity] = useState<string>(task.requiredCommunityId || "");
  const [requirable, setRequirable] = useState<{ id: string; name: string; mine: boolean }[]>([]);
  useEffect(() => {
    if (!editing || !canNeedCommunity) return;
    apiRequest<any[]>("/communities/mine/requirable").then((l) => setRequirable(Array.isArray(l) ? l : [])).catch(() => {});
  }, [editing, canNeedCommunity]);
  const startEdit = () => {
    setEd({ title: task.title, brief: (task.description || "").split("\n\n**Attachments**")[0], deadline: shownDate(task.deadline) });
    setSimilar(task.excludesTaskIds || []);
    setReqCommunity(task.requiredCommunityId || "");
    setEdCountry(task.targetCountries?.[0] || "");
    setEdGender(task.targetGender || "");
    setEdHandle(task.askHandle || "");
    setEdErr(""); setEditing(true);
  };
  // Same check as Create job: a job that sends people to a survey, form, site or
  // app can't be saved without its link (files on the job count when the brief
  // points to them)
  const hasFiles = (task.description || "").includes("\n\n**Attachments**");
  const linkNeeded = editing ? missingLink(`${ed.title}\n${ed.brief}`, hasFiles) : "";
  const saveEdit = async () => {
    const title = ed.title.trim(), brief = ed.brief.trim();
    if (title.length < 5) { setEdErr("Give the job a title of at least 5 characters."); return; }
    if (brief.length < 20) { setEdErr("Describe the job in at least 20 characters."); return; }
    if (linkNeeded) { setEdErr(missingLinkText(linkNeeded)); return; }
    const attachments = (task.description || "").includes("\n\n**Attachments**") ? (task.description || "").slice((task.description || "").indexOf("\n\n**Attachments**")) : "";
    const body: Record<string, any> = { title, description: brief + attachments, instructions: brief + attachments, excludesTaskIds: similar };
    // Only a changed date is sent, keeping the job's time of day (it was always sent
    // as 23:59, which moved the end on every save and failed once it had passed)
    if (ed.deadline && ed.deadline !== shownDate(task.deadline)) {
      const was = task.deadline ? new Date(task.deadline) : null;
      const [y, m, d] = ed.deadline.split("-").map(Number);
      const next = was ? new Date(was) : new Date(ed.deadline + "T23:59:00");
      if (was) next.setFullYear(y, m - 1, d);
      body.deadline = next.toISOString();
    }
    if (canNeedCommunity && reqCommunity !== (task.requiredCommunityId || "")) body.requiredCommunityId = reqCommunity || null;
    if (edCountry !== (task.targetCountries?.[0] || "")) body.targetCountries = edCountry ? [edCountry] : [];
    if (edGender !== (task.targetGender || "")) body.targetGender = edGender || null;
    if (edHandle !== (task.askHandle || "")) body.askHandle = edHandle || null;
    setEdBusy(true); setEdErr("");
    try {
      await apiRequest(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast("Job updated", "success");
      setEditing(false); onChanged();
    } catch (e: any) { setEdErr(e?.message || "Couldn't save the changes"); }
    setEdBusy(false);
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
            <div className="mj-meta"><Pill status={task.status} /><span>{categoryLabel(task.category)}</span><span>{show(reward, cur)} {contest ? "1st place prize" : "per person"}</span></div>
          </div>
          <button className="mj-x" onClick={onClose} aria-label="Close"><Icon n="x" /></button>
        </div>

        <div className="mj-db">
          {editing && (
            <section className="mj-sec mj-edit">
              <h4>Edit job</h4>
              <label className="ui-label" htmlFor="mj-ed-title">Title</label>
              <input id="mj-ed-title" className="ui-input" maxLength={200} value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} />
              <label className="ui-label" htmlFor="mj-ed-brief">Brief</label>
              <textarea id="mj-ed-brief" className="ui-input mj-edit-brief" maxLength={10000} value={ed.brief} onChange={(e) => setEd({ ...ed, brief: e.target.value })} />
              {linkNeeded && <p className="mj-edit-warn" role="status"><Icon n="link-off" s={15} /> {missingLinkText(linkNeeded)} Paste the full address (https://...) in the brief.</p>}
              <label className="ui-label" htmlFor="mj-ed-country">Where they live</label>
              <select id="mj-ed-country" className="ui-input" value={edCountry} onChange={(e) => setEdCountry(e.target.value)}>
                <option value="">Anyone, anywhere</option>
                <option value="NG">Only people in Nigeria</option>
                <option value="GH">Only people in Ghana</option>
              </select>
              <label className="ui-label" htmlFor="mj-ed-gender">Women or men only</label>
              <select id="mj-ed-gender" className="ui-input" value={edGender} onChange={(e) => setEdGender(e.target.value)}>
                <option value="">Anyone</option>
                <option value="F">Only women</option>
                <option value="M">Only men</option>
              </select>
              <p className="mj-edit-note">Only affects people who haven't taken it yet.</p>
              <label className="ui-label" htmlFor="mj-ed-handle">Ask for their username on</label>
              <select id="mj-ed-handle" className="ui-input" value={edHandle} onChange={(e) => setEdHandle(e.target.value)}>
                <option value="">None</option>
                {HANDLE_PLATFORMS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
              <p className="mj-edit-note">Workers must type it to send their work. If someone unfollows after being paid, report it here: they get a warning and can't take follow jobs for {UNFOLLOW_BLOCK_DAYS} days.</p>
              <label className="ui-label" htmlFor="mj-ed-deadline">Closes on (optional)</label>
              <input id="mj-ed-deadline" className="ui-input" type="date" min={new Date(Date.now() + 86400e3).toLocaleDateString("en-CA")} value={ed.deadline} onChange={(e) => setEd({ ...ed, deadline: e.target.value })} />
              {canNeedCommunity && (requirable.length > 0 || reqCommunity) && (
                <>
                  <label className="ui-label" htmlFor="mj-ed-community">Community members only (optional)</label>
                  <select id="mj-ed-community" className="ui-input" value={reqCommunity} onChange={(e) => setReqCommunity(e.target.value)}>
                    <option value="">Anyone who meets the requirements</option>
                    {reqCommunity && !requirable.some((c) => c.id === reqCommunity) && <option value={reqCommunity}>The community set now</option>}
                    {requirable.map((c) => <option key={c.id} value={c.id}>Members of {c.name}{c.mine ? "" : " (OgaPay)"}</option>)}
                  </select>
                  <p className="mj-edit-note">The job stays on the jobs page; only members can take it. People already working on it keep their place.</p>
                </>
              )}
              {others.length > 0 && (
                <fieldset className="mj-similar">
                  <legend className="ui-label">Not for people who did these jobs <InfoTip label="What are similar jobs?" title="Similar jobs">
                    <p>Tick your jobs that ask for the same thing (for example two jobs that both ask people to follow you on X). Anyone who took part in one of them can't take this job, and the other way round, so nobody is paid twice for the same action.</p>
                  </InfoTip></legend>
                  {others.slice(0, 40).map((t) => (
                    <label key={t.id} className="mj-similar-row">
                      <input type="checkbox" checked={similar.includes(t.id)} onChange={(e) => setSimilar((s) => e.target.checked ? [...s, t.id] : s.filter((x) => x !== t.id))} />
                      <span>{t.title}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              <p className="mj-edit-note">{task.isContest
                ? "Prizes can't be lowered once the contest is funded. While entries are open you can raise them or add places with Raise prizes."
                : "The reward and number of people can't change once the job is funded. To change them, cancel the job and post a new one."}</p>
              {edErr && <p className="mj-tool-err" role="alert">{edErr}</p>}
              <div className="mj-acts">
                <button className="ui-btn ui-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                <button className="ui-btn ui-btn-dark" disabled={edBusy} onClick={saveEdit}>{edBusy ? "Saving…" : "Save changes"}</button>
              </div>
            </section>
          )}
          <div className="mj-dgrid">
            <div><b>{counts.approved}/{counts.slots}</b><span>approved</span></div>
            <div><b>{counts.review}</b><span>to review</span></div>
            <div><b>{show(counts.paid, cur)}</b><span>paid out</span></div>
          </div>

          {subs === null ? <div className="ui-sk" style={{ height: 120 }} /> : (
            <>
              {task.isSelection && (
                <section className="mj-sec">
                  <h4>Applications ({apps?.length ?? 0})</h4>
                  {["OPEN", "COOLING_DOWN", "IN_PROGRESS"].includes(task.status) && task.hiredWorkerId && (() => {
                    // The picked person's work: in already, or the time it is due by
                    const work = list.find((s) => s.worker?.id === task.hiredWorkerId && s.status !== "EXPIRED");
                    if (work?.submittedAt) return <p className="mj-auto"><Icon n="clock-check" s={14} /> You picked someone and their work is in. Review it below. If you reject it, you can pick again.</p>;
                    const due = pickedDueAt(task, work);
                    return <p className="mj-auto"><Icon n="clock-check" s={14} /> You picked someone. They have {due ? `until ${due.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : deliveryText(task)} to send the work. Review it below when it comes in. If you reject it, or their time runs out with no work, you can pick again.</p>;
                  })()}
                  {task.hiredWorkerId && <Link className="ui-btn ui-btn-ghost" to={`/work/${task.id}`} style={{ alignSelf: "flex-start" }}><Icon n="messages" s={14} /> Open the job chat and workspace</Link>}
                  {task.status === "OPEN" && !task.hiredWorkerId && <p className="mj-auto"><Icon n="user-check" s={14} /> Read the notes and pick one person. They get {deliveryText(task)} to send the work, and you pay {money(reward, cur)} only when you approve it.</p>}
                  {apps === null ? <div className="ui-sk" style={{ height: 80 }} /> : apps.length === 0 ? <div className="mj-empty">No one has applied yet.</div> : apps.map((a) => {
                    const p = a.worker?.workerProfile;
                    return (
                      <div key={a.id} className="mj-sub">
                        <div className="mj-who">
                          <Avatar w={a.worker} />
                          <div><WorkerLink w={a.worker} /><small>Applied {ago(a.createdAt)}{p ? ` · ${p.tasksCompleted || 0} ${p.tasksCompleted === 1 ? "job" : "jobs"} done` : ""}{p?.totalRatings ? ` · ${Number(p.avgRating || 0).toFixed(1)} rating` : ""}</small></div>
                          {a.status === "PICKED" && <span className="mj-pill open">{task.hiredWorkerId === a.workerId ? "Picked" : "Was picked"}</span>}
                          {a.status === "NOT_PICKED" && <span className="mj-pill">Not picked</span>}
                        </div>
                        <p className="mj-note">{a.pitch}</p>
                        {task.status === "OPEN" && !task.hiredWorkerId && a.status !== "PICKED" && (
                          <div className="mj-acts">
                            <button className="ui-btn ui-btn-dark" disabled={!!busy} onClick={() => pick(a)}><Icon n="user-check" s={15} /> {busy === a.id ? "Picking…" : `Pick @${who(a.worker)}`}</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              )}
              <section className="mj-sec">
                <h4>Waiting for your review ({toReview.length})</h4>
                {contest && toReview.length > 0 && (
                  <p className="mj-contest">
                    <Icon n="award" s={14} /> <span>This is a contest, so entries aren't approved one by one. Reject any that break your brief here,
                    then award places on the <Link to={`/tasks/${task.id}`}>job page</Link>.</span>
                  </p>
                )}
                {toReview.length === 0 ? <div className="mj-empty">Nothing to review right now.</div> : toReview.map((s) => (
                  <div key={s.id} id={`mj-sub-${s.id}`} className={`mj-sub${s.id === focusId ? " is-focus" : ""}`}>
                    <div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>Sent {ago(s.submittedAt || s.createdAt)}</small></div><BlockBtn w={s.worker} /></div>
                    <CopyFlag reason={s.spamReason} copy={!!s.similarToId} />
                    <PayoutCheckStatus sub={s} who="poster" />
                    <HandleLine code={task.askHandle} s={s} />
                    {s.workerNotes && <p className="mj-note">{s.workerNotes}</p>}
                    <Proof s={s} />
                    {/* Contest entries are never approved automatically */}
                    {!contest && s.autoApproveAt && <p className="mj-auto"><Icon n="clock-check" s={14} /> If you don't review it, it's approved and paid automatically on {new Date(s.autoApproveAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.</p>}
                    {rejecting === s.id ? (
                      <div className="mj-reason">
                        <label htmlFor={`mj-note-${s.id}`}>{action === "back" ? `What should @${who(s.worker)} change?` : `Why are you rejecting it?`}</label>
                        <textarea id={`mj-note-${s.id}`} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)}
                          placeholder={action === "back" ? "e.g. Add a screenshot that shows your username" : action === "fake" ? "e.g. The screenshot is edited / it's another person's account" : "e.g. The screenshot is from a different post"} autoFocus />
                        <p className="mj-reason-hint">{action === "back"
                          ? `@${who(s.worker)} sees this, keeps their place and sends it again.${(s.sentBackCount || 0) === 1 ? " This is the last time it can be sent back." : ""}`
                          : action === "fake"
                          ? `For work that's faked (edited screenshots, someone else's account, copied proof). @${who(s.worker)} sees this, the work is rejected for good, it's counted on their account and the OgaPay team is told.`
                          : `@${who(s.worker)} sees this. A rejection is final: they can't send work for this job again. If it only needs a fix, send it back instead.`}</p>
                        <div className="mj-acts">
                          <button className="ui-btn ui-btn-ghost" onClick={() => { setRejecting(null); setReason(""); }}>Cancel</button>
                          {action === "back"
                            ? <button className="ui-btn ui-btn-dark" disabled={busy === s.id || reason.trim().length < 5} onClick={() => sendBack(s)}>{busy === s.id ? "Sending back…" : "Send back"}</button>
                            : action === "fake"
                            ? <button className="ui-btn ui-btn-dark" disabled={busy === s.id || reason.trim().length < 5} onClick={() => reportFake(s)}>{busy === s.id ? "Reporting…" : "Report as fake"}</button>
                            : <button className="ui-btn ui-btn-dark" disabled={busy === s.id || reason.trim().length < 5} onClick={() => review(s, "REJECTED")}>{busy === s.id ? "Rejecting…" : "Reject work"}</button>}
                        </div>
                      </div>
                    ) : (
                      <>
                      {/* Stars go with "Approve and pay", which a contest entry doesn't have */}
                      {!contest && <RateWork who={`@${who(s.worker)}`} rating={stars[s.id] || 0} note={notes[s.id] || ""} disabled={busy === s.id}
                        onRating={(v) => setStars((m) => ({ ...m, [s.id]: v }))} onNote={(v) => setNotes((m) => ({ ...m, [s.id]: v }))} />}
                      <div className="mj-acts">
                        {!contest && <button className="ui-btn ui-btn-dark" disabled={busy === s.id || checkBlocksApprove(s, clock)} title={checkBlocksApprove(s, clock) ? "Payout check still running" : undefined} onClick={() => review(s, "APPROVED")}><Icon n="check" s={15} /> {busy === s.id ? "Approving…" : `Approve and pay ${money(reward, cur)}`}</button>}
                        {(task.status === "OPEN" || task.status === "COOLING_DOWN") && jobDeadline(task).state !== "ended" && !(task.isContest && task.randomDraw) && (s.sentBackCount || 0) < SEND_BACK_LIMIT && (
                          <button className="ui-btn ui-btn-ghost" disabled={busy === s.id} onClick={() => { setRejecting(s.id); setAction("back"); setReason(""); }}><Icon n="arrow-back-up" s={15} /> Send back for changes</button>
                        )}
                        <button className="ui-btn ui-btn-ghost" disabled={busy === s.id} onClick={() => { setRejecting(s.id); setAction("reject"); setReason(""); }}>Reject</button>
                        {!contest && <button className="ui-btn ui-btn-ghost mj-danger" disabled={busy === s.id} onClick={() => { setRejecting(s.id); setAction("fake"); setReason(""); }}><Icon n="flag" s={15} /> Report as fake</button>}
                      </div>
                      </>
                    )}
                  </div>
                ))}
              </section>

              {working.length > 0 && (
                <section className="mj-sec">
                  <h4>Working on it ({working.length})</h4>
                  <div className="mj-rows">{working.map((s) => (
                    <div key={s.id} className="mj-row"><div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} />{s.sentBackAt
                      ? <><small>You sent it back for changes {ago(s.sentBackAt)}</small>{s.posterNotes && <p>“{s.posterNotes}”</p>}</>
                      : <small>Took a slot {ago(s.createdAt)}</small>}</div></div><BlockBtn w={s.worker} /></div>
                  ))}</div>
                </section>
              )}
              {disputed.length > 0 && (
                <section className="mj-sec">
                  <h4>In dispute ({disputed.length})</h4>
                  <div className="mj-rows">{disputed.map((s) => (
                    <div key={s.id} className="mj-row"><div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>They asked OgaPay for a second look at your rejection. Our team decides and tells you both.</small></div></div></div>
                  ))}</div>
                </section>
              )}
              {approved.length > 0 && (
                <section className="mj-sec">
                  <h4>Approved ({approved.length})</h4>
                  <div className="mj-rows">{approved.map((s) => (
                    <div key={s.id} className="mj-row"><div className="mj-who"><Avatar w={s.worker} /><div><WorkerLink w={s.worker} /><small>Paid {money(contest && s.place && s.paidAmount == null && Number.isFinite(Number(task.prizes?.[s.place - 1])) ? Number(task.prizes![s.place - 1]) : paidFor(s, reward), cur)}{s.reviewedAt ? ` · ${day(s.reviewedAt)}` : ""}</small>{s.rating ? <p>{ratedByTeam(s, user?.id) ? "Rated by the OgaPay team: " : ""}<RatedStars value={s.rating} /> {s.rating}/5{s.feedback ? ` · “${s.feedback}”` : ""}</p> : null}<HandleLine code={task.askHandle} s={s} /></div></div>{task.askHandle && (s.unfollowedAt
                      ? <span className="mj-pill bad">Unfollow reported</span>
                      : <button className="ui-btn ui-btn-ghost mj-danger" disabled={busy === s.id} onClick={() => reportUnfollow(s)}><Icon n="user-minus" s={15} /> {busy === s.id ? "Reporting…" : "Report unfollow"}</button>)}{s.worker?.username && <button className="ui-btn ui-btn-ghost" onClick={() => setTipFor(s)}><Icon n="heart-handshake" s={15} /> Tip</button>}</div>
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
              {list.length === 0 && !task.isSelection && <div className="mj-empty">No one has taken this job yet.</div>}
            </>
          )}
        </div>

        <div className="mj-df">
          <Link className="ui-btn ui-btn-ghost" to={`/tasks/${task.id}`}><Icon n="eye" s={15} /> Public page</Link>
          {isXFollowJob(task) && <Link className="ui-btn ui-btn-ghost" to={`/manage-jobs/${task.id}/followers`}><Icon n="chart-line" s={15} /> Follower analytics</Link>}
          <button className="ui-btn ui-btn-ghost" disabled={tpl !== ""} onClick={saveAsTemplate}><Icon n={tpl === "saved" ? "check" : "device-floppy"} s={15} /> {tpl === "saving" ? "Saving…" : tpl === "saved" ? "Saved" : "Save as template"}</button>
          {live && !editing && <button className="ui-btn ui-btn-ghost" onClick={startEdit}><Icon n="edit" s={15} /> Edit</button>}
          {canRaise && !editing && <button className="ui-btn ui-btn-ghost" onClick={raisePay}><Icon n="trending-up" s={15} /> Raise pay</button>}
          {canAddPlaces && !editing && <button className="ui-btn ui-btn-ghost" onClick={addPlaces}><Icon n="users-plus" s={15} /> Add places</button>}
          <Link className="ui-btn ui-btn-ghost" to={`/support?job=${task.id}&title=${encodeURIComponent(task.title.slice(0, 80))}`}><Icon n="message-question" s={15} /> Ask OgaPay about this job</Link>
          {canRaisePrizes && !editing && <Link className="ui-btn ui-btn-ghost" to={`/tasks/${task.id}?raise=1`}><Icon n="trending-up" s={15} /> Raise prizes</Link>}
          {(task.status === "OPEN" || task.status === "DRAFT") && (
            <button className="ui-btn ui-btn-ghost" onClick={() => setPaused(task.status === "OPEN")}>
              <Icon n={task.status === "OPEN" ? "player-pause" : "player-play"} s={15} /> {task.status === "OPEN" ? "Pause" : "Resume"}
            </button>
          )}
          {canStop && !editing && <button className="ui-btn ui-btn-ghost mj-danger" onClick={stopJob} title="Pay the work waiting for review, release unused places and close the job"><Icon n="player-stop" s={15} /> Stop job</button>}
          {live && <button className="ui-btn ui-btn-ghost mj-danger" onClick={cancel}><Icon n="circle-x" s={15} /> Cancel job</button>}
        </div>
      </aside>
      {tipFor?.worker?.username && (
        <TransferModal tip submissionId={tipFor.id} forLabel={`For their work on "${task.title}"`}
          to={{ id: tipFor.worker.id, username: tipFor.worker.username, firstName: tipFor.worker.firstName || undefined, lastName: tipFor.worker.lastName || undefined, avatarUrl: tipFor.worker.avatarUrl }}
          onClose={() => setTipFor(null)} />
      )}
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

type ListProps = {
  tasks: Task[]; refreshJob: (id: string, o?: { subs?: boolean }) => void; onSubs: (id: string, subs: Sub[]) => void
  // Older jobs come a page at a time (2026-11-08): only the newest 100 used to load
  hasMore: boolean; loadingMore: boolean; loadMore: () => void
  // A ?job= link to a job that isn't loaded yet: load just that job
  ensureJob: (id: string) => void
}
function JobsListPage({ tasks, refreshJob, onSubs, hasMore, loadingMore, loadMore, ensureJob }: ListProps) {
  const [filter, setFilter] = useState("all");
  // ?job=<id> opens that job's drawer (links from Profile and /tasks/:id/submissions);
  // &entry=<id> also scrolls to that entry (the Read link on a contest's job page)
  const [params, setParams] = useSearchParams();
  const [openId, setOpenIdState] = useState<string | null>(params.get("job"));
  const setOpenId = (v: string | null) => {
    setOpenIdState(v);
    if (!v && (params.get("job") || params.get("entry"))) { params.delete("job"); params.delete("entry"); setParams(params, { replace: true }); }
  };
  const open = tasks.find((t) => t.id === openId) || null;
  useEffect(() => { if (openId && !open) ensureJob(openId); }, [openId, open]); // eslint-disable-line react-hooks/exhaustive-deps
  // Rewards and "paid to workers" follow the display currency (naira, dollars or cedis)
  const show = useMoney();
  const { preferredCurrency, convert } = useCurrency();

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
    // Every currency added up in the display currency at today's rates. Until a
    // rate is known, each currency on its own: "₦3,200 · 1.50 USDC"
    const paidBy = Object.entries(paid).filter(([, v]) => v > 0);
    const code = displayCode(preferredCurrency);
    const paidIn = paidBy.map(([c, v]) => (c === code ? v : convert(v, c as Currency, code)));
    const paidText = paidIn.every((v) => Number.isFinite(v) && v > 0)
      ? formatIn(code, paidIn.reduce((a, b) => a + b, 0))
      : paidBy.map(([c, v]) => inDisplay(v, c, preferredCurrency, convert)).join(" · ");
    return { review, approved, live, paidText };
  }, [tasks, preferredCurrency, convert]);

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
      {hasMore && <p className="mj-tool-p" style={{ margin: "0 0 12px" }}>These numbers count the {tasks.length} jobs loaded. Load older jobs at the bottom to count them too.</p>}

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
          // Selection job waiting for the poster to pick someone
          const applied = t._count?.applications || 0;
          const toPick = !!t.isSelection && t.status === "OPEN" && !c.working && !c.review && !c.approved && applied > 0;
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
                <div className="mj-reward"><b>{show(Number(t.reward || 0), cur)}</b><span>{t.isContest ? "1st place prize" : "per person"}</span></div>
              </div>
              <div className="mj-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (c.approved / c.slots) * 100)}%` }} /></div>
              <div className="mj-job-foot">
                <div className="mj-counts">
                  <span><b>{c.approved}</b> of {c.slots} approved</span>
                  {c.review > 0 && <span className="warn"><b>{c.review}</b> to review</span>}
                  {c.working > 0 && <span><b>{c.working}</b> working</span>}
                  {t.isSelection
                    ? <span className={toPick ? "warn" : ""}><b>{applied}</b> applied</span>
                    : ["OPEN", "IN_PROGRESS", "DRAFT"].includes(t.status) && <span><b>{c.left}</b> {c.left === 1 ? "slot" : "slots"} left</span>}
                </div>
                <button className={`ui-btn ${c.review || toPick ? "ui-btn-dark" : "ui-btn-ghost"}`} onClick={(e) => { e.stopPropagation(); setOpenId(t.id); }}>
                  {c.review ? <>Review {c.review} <Icon n="arrow-right" s={15} /></> : toPick ? <>Pick someone <Icon n="arrow-right" s={15} /></> : "Details"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button className="ui-btn ui-btn-ghost" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "Loading…" : "Load older jobs"}</button>
        </div>
      )}

      {open && <JobDrawer task={open} allTasks={tasks} focusId={open.id === params.get("job") ? params.get("entry") : null} onClose={() => setOpenId(null)} onChanged={(o) => refreshJob(open.id, o)} onSubs={onSubs} />}
    </>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
// GET /tasks/:id calls an open job past its end "Expired"; Manage jobs keeps the
// stored status (the one already shown, else Open), as the list does
const listStatus = (fresh: string, shown?: string) => fresh === "EXPIRED" ? (shown && shown !== "EXPIRED" ? shown : "OPEN") : fresh;
const JOBS_PAGE = 100;
export default function MyJobs() {
  const { toast } = useToast();
  const { user, isAuthed } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [page, setPage] = useState("jobs");
  // Jobs load a page at a time, newest first (2026-11-08)
  const [pages, setPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastLoad = useRef(0);
  const pagesRef = useRef(1);
  pagesRef.current = pages;

  // The newest page. On a refresh it replaces those jobs and keeps the older pages
  // already loaded.
  const load = useCallback(async () => {
    if (!isAuthed) { setTasks([]); return; }
    lastLoad.current = Date.now();
    try {
      const data = await apiRequest<Task[] | { tasks: Task[] }>(`/tasks/my/created?limit=${JOBS_PAGE}&page=1`);
      const rows = Array.isArray(data) ? data : data?.tasks || [];
      setTasks((prev) => {
        const ids = new Set(rows.map((t) => t.id));
        return [...rows, ...(prev || []).filter((t) => !ids.has(t.id))];
      });
      // Once older pages are loaded, Load older jobs follows the last of them
      setHasMore((h) => (pagesRef.current > 1 ? h : rows.length >= JOBS_PAGE));
      setLoadFailed(false);
    } catch {
      // Keep what's shown; never turn a failed load into "You haven't posted a job yet"
      setLoadFailed(true);
    }
  }, [isAuthed]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await apiRequest<Task[] | { tasks: Task[] }>(`/tasks/my/created?limit=${JOBS_PAGE}&page=${pages + 1}`);
      const rows = Array.isArray(data) ? data : data?.tasks || [];
      setTasks((prev) => {
        const ids = new Set((prev || []).map((t) => t.id));
        return [...(prev || []), ...rows.filter((t) => !ids.has(t.id))];
      });
      setPages((n) => n + 1);
      setHasMore(rows.length >= JOBS_PAGE);
    } catch (e: any) { toast(e?.message || "Couldn't load older jobs", "error"); }
    setLoadingMore(false);
  };

  // One job loaded again after a change in its panel (review, pause, edit...):
  // the whole list with every job's submissions used to download again each time
  // subs: its work too, after Stop job or Cancel (the drawer closes at once, so
  // the card kept "waiting for review" and the old totals, 2026-11-08)
  const refreshJob = useCallback(async (id: string, o?: { subs?: boolean }) => {
    try {
      const [d, subs] = await Promise.all([
        apiRequest<any>(`/tasks/${id}`, { fresh: true }),
        o?.subs ? apiRequest<Sub[]>(`/tasks/${id}/submissions?limit=500`, { fresh: true }).catch(() => null) : Promise.resolve(null),
      ]);
      const fresh = d?.task || d;
      if (!fresh?.id) return;
      setTasks((prev) => (prev || []).map((t) => {
        if (t.id !== id) return t;
        return { ...t, ...fresh, status: listStatus(fresh.status, t.status), submissions: Array.isArray(subs) ? subs : t.submissions, _count: t._count };
      }));
    } catch { /* the job shown stays as it was */ }
  }, []);
  // The drawer's submissions keep the job's card counts right without a reload
  const onSubs = useCallback((id: string, subs: Sub[]) => {
    setTasks((prev) => (prev || []).map((t) => (t.id === id ? { ...t, submissions: subs } : t)));
  }, []);
  // A ?job= link to one of your jobs that isn't loaded yet
  const ensureJob = useCallback(async (id: string) => {
    try {
      const d = await apiRequest<any>(`/tasks/${id}`);
      const t = d?.task || d;
      if (!t?.id || t.posterId !== user?.id) return;
      // An open job past its end comes back "Expired" from the job page: shown as Open, as in the list (2026-11-08)
      setTasks((prev) => (prev || []).some((x) => x.id === t.id) ? prev : [...(prev || []), { ...t, status: listStatus(t.status), submissions: [] }]);
    } catch { /* gone or not yours: nothing opens */ }
  }, [user?.id]);

  useEffect(() => {
    // Another account's jobs never stay on screen
    setTasks(null); setPages(1); setHasMore(false);
    load();
    // Back on the tab: the newest jobs again, at most every 2 minutes
    const onFocus = () => { if (Date.now() - lastLoad.current > 120000) load(); };
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
          ? loadFailed ? <div style={{ marginTop: 20 }}><LoadError what="your jobs" onRetry={() => { setLoadFailed(false); load(); }} /></div>
          : <div style={{ display: "grid", gap: 10, marginTop: 20 }}>{[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 120 }} />)}</div>
          : <JobsListPage tasks={tasks} refreshJob={refreshJob} onSubs={onSubs} hasMore={hasMore} loadingMore={loadingMore} loadMore={loadMore} ensureJob={ensureJob} />)}
        {page === "blacklist" && <div style={{ marginTop: 20 }}><BlacklistPage /></div>}
        {page === "templates" && <div style={{ marginTop: 20 }}><TemplatesPage /></div>}
      </div>
    </Layout>
  );
}
