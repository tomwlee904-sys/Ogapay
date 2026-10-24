import { ReactNode } from "react";
import { rankName } from "../../lib/requirements";
import { AUDIENCE_PLATFORMS, audienceRequirement } from "../../lib/creators";
import { API_BASE, apiRequest, getAccessToken } from "../../lib/api";
import { useProviders } from "../../lib/providers";

/* Shared building blocks for the Create flows (custom job, X campaign,
   quick task). Everything here maps to fields the task API actually stores. */

export type Currency = "NGN" | "USDC" | "SOL";

// ── Requirements ───────────────────────────────────────────────────────────
// Three parts, like wurk's "Audience & requirements": a minimum rank (always
// set, 1 = anyone), one identity check, and one optional extra requirement.
export type Reqs = { rank: number; id: string; extra: string; value: string };
export const NO_REQS: Reqs = { rank: 1, id: "none", extra: "none", value: "" };

export const ID_OPTIONS: [string, string][] = [
  ["none", "No identity check"],
  ["kyc", "ID verified (NIN)"],
  ["kyc2", "ID + selfie verified"],
  ["human", "Human verified (VeryAI)"],
];
const ID_FIELD: Record<string, string> = { kyc: "KYC", kyc2: "KYC2", human: "HUMAN" };

// The extra requirement, grouped as on the form
export const EXTRA_GROUPS: [string, [string, string][]][] = [
  ["X account", [["x", "Connected X account"], ["xblue", "Blue tick on X"], ["xscore", "Minimum X score"]]],
  ["Experience on OgaPay", [["ogascore", "Minimum OgaScore"], ["jobs", "Jobs finished on OgaPay"]]],
  ["Creators", [["audience", "Minimum followers"]]],
];
const EXTRA_TYPES = EXTRA_GROUPS.flatMap(([, opts]) => opts.map(([v]) => v));

/** Reqs from a saved draft or template. Older ones kept a single choice in
    reqType/reqValue (rank, kyc or human included), which still loads. */
export function reqsFrom(d: { reqType?: string; reqValue?: string; reqRank?: number | string; reqId?: string } | undefined): Reqs {
  const type = d?.reqType || "none";
  const r: Reqs = { ...NO_REQS };
  r.rank = Math.min(5, Math.max(1, Number(d?.reqRank) || 1));
  r.id = d?.reqId && ID_FIELD[d.reqId] ? d.reqId : "none";
  if (type === "rank") r.rank = Math.min(5, Math.max(2, parseInt(d?.reqValue || "") || 2));
  else if (ID_FIELD[type]) r.id = type;
  else if (EXTRA_TYPES.includes(type)) { r.extra = type; r.value = d?.reqValue || ""; }
  return r;
}

/** What a draft or template keeps */
export const reqsToSaved = (r: Reqs) => ({ reqType: r.extra, reqValue: r.value, reqRank: r.rank, reqId: r.id });

export const reqsAny = (r: Reqs) => r.rank > 1 || r.id !== "none" || r.extra !== "none";

// "INSTAGRAM:10000" <-> { platform, min }
export function parseAudience(value: string): { platform: string; min: number } {
  const m = /^([A-Z]+):(\d+)$/.exec(value || "");
  const platform = m && AUDIENCE_PLATFORMS.some((p) => p.id === m[1]) ? m[1] : "INSTAGRAM";
  return { platform, min: Math.max(1, Math.min(500000000, parseInt(m?.[2] || "", 10) || 1000)) };
}

function extraFields(type: string, value: string): Record<string, any> {
  const n = Math.max(1, parseInt(value) || 1);
  switch (type) {
    case "x": return { requiresX: true };
    case "xblue": return { requiresXBlue: true };
    case "ogascore": return { minSorsaScore: Math.min(100, n) };
    case "xscore": return { minXScore: Math.min(100, n) };
    case "jobs": return { minJobsDone: Math.min(1000, n) };
    case "audience": { const a = parseAudience(value); return { audiencePlatform: a.platform, minFollowers: a.min }; }
    default: return {};
  }
}

/** The task API fields for these requirements */
export function reqFields(r: Reqs): Record<string, any> {
  return {
    ...(r.rank > 1 && { minRank: Math.min(5, r.rank) }), // 2 Intermediate … 5 Legend
    ...(ID_FIELD[r.id] && { workerRequirement: ID_FIELD[r.id] }),
    ...extraFields(r.extra, r.value),
  };
}

function extraLabel(type: string, value: string) {
  if (type === "ogascore") return `OgaScore ${Math.max(1, parseInt(value) || 1)}+`;
  if (type === "xscore") return `X score ${Math.max(1, parseInt(value) || 1)}+`;
  if (type === "jobs") { const n = Math.max(1, parseInt(value) || 1); return `${n}+ ${n === 1 ? "job" : "jobs"} done on OgaPay`; }
  if (type === "audience") { const a = parseAudience(value); return `Creators: ${audienceRequirement(a.platform, a.min)}`; }
  return EXTRA_GROUPS.flatMap(([, o]) => o).find(([v]) => v === type)?.[1] || "";
}

/** In words, e.g. "Advanced rank or higher · ID verified (NIN) · Blue tick on X" */
export function reqLabel(r: Reqs) {
  const parts = [
    r.rank > 1 ? `${rankName(r.rank)} rank or higher` : "",
    r.id !== "none" ? ID_OPTIONS.find(([v]) => v === r.id)?.[1] || "" : "",
    r.extra !== "none" ? extraLabel(r.extra, r.value) : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Anyone can take part";
}

export function RequirementPicker({ reqs, onChange }: { reqs: Reqs; onChange: (r: Reqs) => void }) {
  const { extra: type, value } = reqs;
  const set = (patch: Partial<Reqs>) => onChange({ ...reqs, ...patch });
  const setValue = (_t: string, v: string) => set({ value: v });
  // "Human verified" only while VeryAI is set up (nobody could take the job otherwise)
  const providers = useProviders();
  const ids = ID_OPTIONS.filter(([v]) => v !== "human" || providers?.very || reqs.id === "human");
  return (
    <div className="cf-reqs">
      <div className="cf-row">
        <div className="cf-field">
          <label htmlFor="cf-rank">Minimum rank</label>
          <select id="cf-rank" className="ui-select" value={String(reqs.rank)} onChange={e => set({ rank: Number(e.target.value) })}>
            <option value="1">Any rank</option>
            {[2, 3, 4, 5].map(n => <option key={n} value={n}>{rankName(n)} or higher</option>)}
          </select>
        </div>
        <div className="cf-field">
          <label htmlFor="cf-id">Identity check</label>
          <select id="cf-id" className="ui-select" value={reqs.id} onChange={e => set({ id: e.target.value })}>
            {ids.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className={type !== "none" && type !== "x" && type !== "xblue" ? "cf-row" : undefined}>
      <div className="cf-field">
        <label htmlFor="cf-extra">Extra requirement (optional)</label>
        <select id="cf-extra" className="ui-select" value={type} onChange={e => set({ extra: e.target.value, value: "" })}>
          <option value="none">None</option>
          {EXTRA_GROUPS.map(([g, opts]) => (
            <optgroup key={g} label={g}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</optgroup>
          ))}
        </select>
        <p className="cf-hint">Stricter requirements mean better work, but fewer people can take the job.</p>
      </div>
      {type === "audience" && (() => {
        const a = parseAudience(value);
        const unit = AUDIENCE_PLATFORMS.find((p) => p.id === a.platform)?.unit || "followers";
        return (
          <>
            <div className="cf-field">
              <label htmlFor="cf-aud-platform">Platform</label>
              <select id="cf-aud-platform" className="ui-select" value={a.platform} onChange={e => setValue(type, `${e.target.value}:${a.min}`)}>
                {AUDIENCE_PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="cf-field">
              <label htmlFor="cf-aud-min">Minimum {unit}</label>
              <input id="cf-aud-min" className="ui-input" type="number" min={1} step={100} value={a.min} placeholder="e.g. 1000"
                onChange={e => setValue(type, `${a.platform}:${Math.max(1, parseInt(e.target.value, 10) || 1)}`)} />
              <p className="cf-hint">Only creators with a verified audience this size can take it. Nano is 1,000+, Micro 10,000+.</p>
            </div>
          </>
        );
      })()}
      {type === "xscore" && (
        <div className="cf-field">
          <label htmlFor="cf-xscore">Minimum X score</label>
          <input id="cf-xscore" className="ui-input" type="number" min={1} max={100} value={value} placeholder="e.g. 40"
            onChange={e => setValue(type, e.target.value)} />
          <p className="cf-hint">0–100, from X connected, checked followers, a blue tick and their record on social jobs. 40+ is a solid account.</p>
        </div>
      )}
      {type === "jobs" && (
        <div className="cf-field">
          <label htmlFor="cf-jobs">Jobs they've finished</label>
          <input id="cf-jobs" className="ui-input" type="number" min={1} max={1000} value={value} placeholder="e.g. 1"
            onChange={e => setValue(type, e.target.value)} />
          <p className="cf-hint">Only people with this many approved jobs on OgaPay can take it. New members see it once they get there.</p>
        </div>
      )}
      {type === "ogascore" && (
        <div className="cf-field">
          <label htmlFor="cf-score">Minimum OgaScore</label>
          <input id="cf-score" className="ui-input" type="number" min={1} max={100} value={value} placeholder="e.g. 40"
            onChange={e => setValue(type, e.target.value)} />
        </div>
      )}
      </div>
    </div>
  );
}

// ── Job duration → deadline ──────────────────────────────────────────────────
export const DURATIONS: [string, number][] = [["1 day", 1], ["3 days", 3], ["7 days", 7], ["14 days", 14], ["30 days", 30], ["No deadline", 0]];
export function deadlineFor(label: string): Date | null {
  const days = DURATIONS.find(([l]) => l === label)?.[1] ?? 7;
  return days ? new Date(Date.now() + days * 86400000) : null;
}

// ── Money ────────────────────────────────────────────────────────────────────
export function money(n: number, cur: string) {
  if (!isFinite(n)) n = 0;
  if (cur === "NGN") return `₦${Math.round(n).toLocaleString("en-US")}`;
  if (cur === "USDC") return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${cur}`;
}
/** Smallest reward per person the API accepts (NGN) or that makes sense (crypto). */
export function minReward(cur: string) {
  return cur === "NGN" ? 50 : cur === "USDC" ? 0.05 : 0.0005;
}

// ── Uploads ──────────────────────────────────────────────────────────────────
export async function uploadJobFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/uploads/proof`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAccessToken() || ""}` },
    body: fd,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.url) throw new Error(json?.message || `Upload failed for ${file.name}`);
  return json.data.url as string;
}

// ── Task creation ────────────────────────────────────────────────────────────
export async function createTask(body: Record<string, any>): Promise<string> {
  const result = await apiRequest<any>("/tasks", { method: "POST", body: JSON.stringify(body) });
  const task = result?.data || result?.task || result;
  return task?.id || "";
}

export function apiErrorText(err: any) {
  if (Array.isArray(err?.errors)) return err.errors.map((e: any) => `${e.field}: ${e.message}`).join("; ");
  if (Array.isArray(err?.data?.errors)) return err.data.errors.map((e: any) => `${e.field}: ${e.message}`).join("; ");
  return err?.message || "Something went wrong. Please try again.";
}

// ── UI pieces ────────────────────────────────────────────────────────────────
export function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="cw-steps" aria-label="Progress">
      {labels.map((l, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "on" : "";
        return (
          <li key={l} className={state} aria-current={n === current ? "step" : undefined}>
            <span>{n < current ? <i className="ti ti-check" /> : n}</span>{l}
          </li>
        );
      })}
    </ol>
  );
}

export function Fold({ title, sub, open, onToggle, children }: { title: string; sub: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className={`cf-fold${open ? " open" : ""}`}>
      <button type="button" onClick={onToggle} aria-expanded={open}>
        <span><b>{title}</b><span>{sub}</span></span>
        <i className="ti ti-chevron-down" />
      </button>
      {open && <div className="cf-fold-body">{children}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <label className="cf-toggle">
      <span><b>{label}</b><span className="d">{desc}</span></span>
      <span className="ui-switch">
        <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} />
        <span className="ui-switch-track" aria-hidden="true" />
      </span>
    </label>
  );
}

export function OverviewCard({ rows, total, currency, alt, checklist, primaryLabel, onPrimary, busy, note }: {
  rows: [string, string, string?][]; total: number; currency: string; alt?: string;
  checklist: { ok: boolean; label: string }[]; primaryLabel: string; onPrimary: () => void; busy?: boolean; note?: ReactNode;
}) {
  return (
    <aside className="cw-side">
      <div className="ui-card cw-ov">
        <div className="cw-ov-head"><i className="ti ti-receipt" /> Overview</div>
        {rows.map(([k, v, sub]) => (
          <div className="cw-ov-row" key={k}><span>{k}</span><b>{v}{sub && <small>{sub}</small>}</b></div>
        ))}
        <div className="cw-ov-total">
          <span>You pay</span>
          <b>{money(total, currency)}{alt && <small>{alt}</small>}</b>
        </div>
      </div>
      <div className="ui-card cw-check">
        {checklist.length > 0 && (checklist.every(c => c.ok)
          ? <ul><li className="ok"><i className="ti ti-circle-check" />Ready. Review the total, then continue.</li></ul>
          : <ul>{checklist.filter(c => !c.ok).map(c => <li key={c.label}><i className="ti ti-circle" />{c.label}</li>)}</ul>
        )}
        <button className="ui-btn ui-btn-dark ui-btn-lg" style={{ width: "100%" }} onClick={onPrimary} disabled={busy}>
          {primaryLabel} {!busy && <i className="ti ti-arrow-right" />}
        </button>
        {note}
        <p className="cw-terms">By continuing with payment, you agree to our <a href="/terms">terms</a>.</p>
      </div>
    </aside>
  );
}

// Phone and tablet: the total and the next step stay on screen above the bottom
// bar while the long form scrolls (the Overview card only comes after the form).
// Desktop hides it: the Overview column stays in view there. Same button as
// the Overview's primary, so nothing about paying changes.
export function PayBar({ total, currency, note, label, onAction, busy }: {
  total: number; currency: string; note: string; label: string; onAction: () => void; busy?: boolean;
}) {
  return (
    <div className="ui-actionbar ui-actionbar-mobile-only cw-bar">
      <div className="ui-actionbar-text">
        <b>You pay {money(total, currency)}</b>
        <span>{note}</span>
      </div>
      <button type="button" className="ui-btn ui-btn-dark" onClick={onAction} disabled={busy}>
        {label} {!busy && <i className="ti ti-arrow-right" aria-hidden="true" />}
      </button>
    </div>
  );
}

export const CATEGORIES: Record<string, string[]> = {
  "Social Media": ["X / Twitter", "Instagram", "TikTok", "YouTube", "Facebook"],
  "Content Creation": ["Writing", "Video", "Design", "Photography"],
  "Development": ["Frontend", "Backend", "Smart Contract", "Mobile"],
  "Marketing": ["SEO", "Email", "Ads", "Growth"],
  "Community": ["Moderation", "Support", "Events", "Outreach"],
  "Music Promotion": ["Streaming", "Download", "Content Creation", "Sharing"],
  "Article / Blog Writing": ["Blog Posts", "Articles", "Copywriting", "Guest Posts"],
  "App / Website Review": ["App Reviews", "Website Reviews", "Video Reviews"],
  "Surveys": ["Market Research", "Product Feedback", "Opinion Polls"],
  "Lead Generation": ["Email Signups", "Form Submissions", "Referrals"],
  "App Testing & Install": ["App Download", "Beta Testing", "Install & Review"],
  "Other": ["Miscellaneous"],
};

// Category picker label -> API category code -------------------------------------
export const CATEGORY_MAP: Record<string, string> = {
  'Social Media': 'SOCIAL_MEDIA',
  'Content Creation': 'CONTENT_WRITING',
  'Development': 'OTHER',
  'Marketing': 'OTHER',
  'Community': 'OTHER',
  'Music Promotion': 'OTHER',
  'Article / Blog Writing': 'CONTENT_WRITING',
  'App / Website Review': 'CONTENT_WRITING',
  'Surveys': 'SURVEY',
  'Lead Generation': 'OTHER',
  'App Testing & Install': 'APP_TESTING',
  'Other': 'OTHER',
  'Design': 'DESIGN',
  'Survey': 'SURVEY',
  'Data': 'DATA_ENTRY',
  'Testing': 'APP_TESTING',
  'Video': 'VIDEO_REVIEW',
  'Research': 'SURVEY',
  'Services': 'OTHER',
  'SOCIAL_MEDIA': 'SOCIAL_MEDIA',
};

// ── Job templates ────────────────────────────────────────────────────────────
// A template is the custom-job form's fields (saved via /poster/templates).
export type TemplateData = {
  mode?: string; title?: string; description?: string; currency?: string; bounty?: string; winners?: string
  category?: string; subcategory?: string; duration?: string; reqType?: string; reqValue?: string
  // Minimum rank and identity check (older templates kept these in reqType)
  reqRank?: number; reqId?: string
  screenshot?: boolean; trackingCode?: string
  // Social jobs: payout check window in minutes, as text ("0", "60", ...)
  payoutCheck?: string
  // Selection jobs: hours people can apply ("0.5", "4", "24", ...)
  selectionHours?: string
  hideAfterComplete?: boolean
  watermark?: boolean
}
export type TemplateFile = { name: string; url: string }
export type JobTemplate = {
  id: string; name: string; data: TemplateData; createdAt: string; updatedAt: string
  // Shared in the community library, files that go with the brief, copies others made
  isPublic?: boolean; files?: TemplateFile[] | null; copies?: number; copiedFromId?: string | null
  author?: { username: string; avatarUrl?: string | null } | null
}

// API code -> [picker category, subcategory] for jobs whose tags don't say
const CODE_TO_PICK: Record<string, [string, string?]> = {
  SOCIAL_MEDIA: ["Social Media"], CONTENT_WRITING: ["Article / Blog Writing"], SURVEY: ["Surveys"],
  APP_TESTING: ["App Testing & Install"], DESIGN: ["Content Creation", "Design"], VIDEO_REVIEW: ["App / Website Review", "Video Reviews"],
  WEB_RESEARCH: ["Surveys", "Market Research"], DATA_ENTRY: ["Other"], TRANSLATION: ["Other"], OTHER: ["Other"],
};

/** The form fields that would post this job again (for "Save as template"). */
export function taskToTemplateData(t: any): TemplateData {
  const tags: string[] = Array.isArray(t?.tags) ? t.tags : [];
  const picked: [string, string?] = CATEGORIES[tags[0]]
    ? [tags[0], CATEGORIES[tags[0]].includes(tags[1]) ? tags[1] : ""]
    : CODE_TO_PICK[t?.category] || ["Other"];
  const [reqType, reqValue] =
    t?.requiresXBlue ? ["xblue", ""] :
    t?.requiresX ? ["x", ""] :
    Number(t?.minXScore) > 0 ? ["xscore", String(t.minXScore)] :
    Number(t?.minSorsaScore) > 0 ? ["ogascore", String(t.minSorsaScore)] :
    Number(t?.minJobsDone) > 0 ? ["jobs", String(t.minJobsDone)] :
    t?.audiencePlatform && Number(t?.minFollowers) > 0 ? ["audience", `${t.audiencePlatform}:${t.minFollowers}`] : ["none", ""];
  const reqRank = Math.min(5, Math.max(1, Number(t?.minRank) || 1));
  const reqId = t?.workerRequirement === "KYC" ? "kyc" : t?.workerRequirement === "KYC2" ? "kyc2" : t?.workerRequirement === "HUMAN" ? "human" : "none";
  const winners = Math.max(1, Number(t?.maxWorkers) || 1);
  const pool = Number(t?.reward || 0) * winners;
  return {
    mode: "Challenge",
    title: String(t?.title || "").slice(0, 200),
    // Attachment links are appended to the brief when posting; don't carry them over
    description: String(t?.description || "").split("\n\n**Attachments**")[0].slice(0, 10000),
    currency: t?.currency || "NGN",
    bounty: String(t?.currency === "NGN" || !t?.currency ? Math.round(pool) : Number(pool.toFixed(2))),
    winners: String(winners),
    category: picked[0], subcategory: picked[1] || "",
    duration: "7 days", reqType, reqValue, reqRank, reqId,
    screenshot: !!t?.proofRequired,
    trackingCode: t?.trackingCode || "",
    ...(Number(t?.payoutCooldownMinutes) > 0 && { payoutCheck: String(t.payoutCooldownMinutes) }),
  };
}

export const listTemplates = () => apiRequest<JobTemplate[]>("/poster/templates");
export const saveTemplate = (data: TemplateData, name?: string, opts: { isPublic?: boolean; files?: TemplateFile[] } = {}) =>
  apiRequest<JobTemplate>("/poster/templates", { method: "POST", body: JSON.stringify({ name: name || data.title, data, ...(opts.isPublic && { isPublic: true }), ...(opts.files?.length && { files: opts.files }) }) });
// The community library: templates other members shared
export const listCommunityTemplates = (q = "") =>
  apiRequest<{ items: JobTemplate[]; total: number }>(`/poster/templates/community${q ? `?q=${encodeURIComponent(q)}` : ""}`);
// "Add to my templates"
export const copyTemplate = (id: string) => apiRequest<JobTemplate>(`/poster/templates/${id}/copy`, { method: "POST" });
export const setTemplatePublic = (id: string, isPublic: boolean) =>
  apiRequest<JobTemplate>(`/poster/templates/${id}`, { method: "PATCH", body: JSON.stringify({ isPublic }) });

// ── Automatic stricter rules (server: task.service strictRulesFor) ───────────
// Jobs with 1 to maxPlaces places paying at least minReward a person need a
// higher rank and a one-person check, so one person with many accounts can't
// take every place. Read from GET /tasks/strict-rules.
export type StrictRules = { maxPlaces: number; minReward: Record<string, number>; rank: number; personCheck: "HUMAN" | "KYC" };
export const getStrictRules = () => apiRequest<StrictRules>("/tasks/strict-rules", { auth: false });
export function strictRulesApply(r: StrictRules | null, j: { mode: string; places: number; perPerson: number; currency: string; community?: boolean }) {
  if (!r || j.mode !== "Challenge" || j.community) return false;
  const floor = r.minReward[j.currency];
  return j.places >= 1 && j.places <= r.maxPlaces && !!floor && j.perPerson >= floor;
}

// ── Selection window ─────────────────────────────────────────────────────────
// How long people can apply to a Selection job (server: task.service SELECTION_HOURS)
export const SELECTION_TIMES: [string, string][] = [
  ["0.5", "30 minutes"], ["1", "1 hour"], ["4", "4 hours"], ["8", "8 hours"], ["12", "12 hours"], ["24", "24 hours"], ["72", "3 days"], ["168", "7 days"],
];
