import { ReactNode } from "react";
import { rankName } from "../../lib/requirements";
import { API_BASE, apiRequest, getAccessToken } from "../../lib/api";
import { useProviders } from "../../lib/providers";

/* Shared building blocks for the Create flows (custom job, X campaign,
   quick task). Everything here maps to fields the task API actually stores. */

export type Currency = "NGN" | "USDC" | "SOL";

// ── Requirements ─────────────────────────────────────────────────────────────
export const REQ_OPTIONS: [string, string][] = [
  ["none", "Anyone can take part"],
  ["kyc", "KYC verified workers"],
  ["human", "Human verified (Very)"],
  ["x", "Verified X account"],
  ["wallet", "Connected Solana wallet"],
  ["rank", "Minimum worker rank"],
  ["ogascore", "Minimum OgaScore"],
];

export function reqFields(type: string, value: string): Record<string, any> {
  const n = Math.max(1, parseInt(value) || 1);
  switch (type) {
    case "kyc": return { workerRequirement: "KYC" };
    case "human": return { workerRequirement: "HUMAN" };
    case "x": return { requiresX: true };
    case "wallet": return { requiresWallet: true };
    case "rank": return { minRank: Math.min(5, Math.max(2, n)) }; // 2 Intermediate … 5 Legend
    case "ogascore": return { minSorsaScore: Math.min(100, n) };
    default: return {};
  }
}

export function reqLabel(type: string, value: string) {
  if (type === "rank") return `${rankName(Math.max(2, parseInt(value) || 2))} rank or higher`;
  if (type === "ogascore") return `OgaScore ≥ ${Math.max(1, parseInt(value) || 1)}`;
  return REQ_OPTIONS.find(([v]) => v === type)?.[1] || "Anyone can take part";
}

export function RequirementPicker({ type, value, onChange }: { type: string; value: string; onChange: (t: string, v: string) => void }) {
  const needsValue = type === "rank" || type === "ogascore";
  // "Human verified" only while VeryAI is set up (nobody could take the job otherwise)
  const providers = useProviders();
  const options = REQ_OPTIONS.filter(([v]) => v !== "human" || providers?.very || type === "human");
  return (
    <div className={needsValue ? "cf-row" : undefined}>
      <div className="cf-field">
        <label>Who can take part</label>
        <select className="ui-select" value={type} onChange={e => onChange(e.target.value, value)}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {type === "rank" && (
        <div className="cf-field">
          <label htmlFor="cf-rank">Minimum rank</label>
          <select id="cf-rank" className="ui-select" value={String(Math.min(5, Math.max(2, parseInt(value) || 2)))} onChange={e => onChange(type, e.target.value)}>
            {[2, 3, 4, 5].map(n => <option key={n} value={n}>{rankName(n)} or higher</option>)}
          </select>
        </div>
      )}
      {type === "ogascore" && (
        <div className="cf-field">
          <label htmlFor="cf-score">Minimum OgaScore</label>
          <input id="cf-score" className="ui-input" type="number" min={1} max={100} value={value} placeholder="e.g. 40"
            onChange={e => onChange(type, e.target.value)} />
        </div>
      )}
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
  screenshot?: boolean; trackingCode?: string
}
export type JobTemplate = { id: string; name: string; data: TemplateData; createdAt: string; updatedAt: string }

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
    t?.workerRequirement === "KYC" ? ["kyc", ""] :
    t?.workerRequirement === "HUMAN" ? ["human", ""] :
    t?.requiresX ? ["x", ""] :
    t?.requiresWallet ? ["wallet", ""] :
    Number(t?.minRank) > 1 ? ["rank", String(t.minRank)] :
    Number(t?.minSorsaScore) > 0 ? ["ogascore", String(t.minSorsaScore)] : ["none", ""];
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
    duration: "7 days", reqType, reqValue,
    screenshot: !!t?.proofRequired,
    trackingCode: t?.trackingCode || "",
  };
}

export const listTemplates = () => apiRequest<JobTemplate[]>("/poster/templates");
export const saveTemplate = (data: TemplateData, name?: string) =>
  apiRequest<JobTemplate>("/poster/templates", { method: "POST", body: JSON.stringify({ name: name || data.title, data }) });
