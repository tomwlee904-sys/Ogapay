import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES, listTemplates, listCommunityTemplates, copyTemplate, setTemplatePublic, money, type JobTemplate, type TemplateData, type TemplateFile } from "./shared";

// Pick a starting point for a custom job: your saved templates (Manage jobs >
// Templates, or "Save as template" on this page) or a few worded examples.
// Examples fill the wording and how many people to pay. Most leave the budget
// to you; ready-made ones (like app testing) also suggest a budget and a
// duration, which you can change before posting.

type Example = TemplateData & { note?: string };

// App testing for app startups: link, phone type, feedback questions and proof.
// The parts the poster must fill in are in [brackets]; the Create checklist
// (TEMPLATE_BLANKS in lib/jobText.ts) won't let the job go out while any is left.
// Suggested ₦1,500 per tester (a 15-20 minute job) for 20 testers over 7 days.
const APP_TESTING: Example = {
  // Everyone who tests properly gets paid, so it is a normal job, not a contest
  mode: "Challenge",
  // The best-paid example, so one person with many accounts would take many
  // places: human verification by default (the poster can remove it)
  reqType: "human",
  title: "Test our app and give feedback",
  category: "App Testing & Install", subcategory: "Beta Testing", winners: "20",
  currency: "NGN", bounty: "30000", duration: "7 days",
  note: "Suggested: ₦1,500 per tester, 20 testers, 7 days. Fill in the parts in [brackets]; change anything else you like.",
  description: [
    "Test our app and tell us honestly what you think. It takes about 15 to 20 minutes.",
    "",
    // Store and store-testing links only: an app file from anywhere else skips the stores' safety checks
    "App link: [paste your app's store link: Play Store, Play testing, App Store or TestFlight]",
    "Phone: [Android / iOS / both]",
    "",
    "What to do:",
    "1. Install the app and create an account.",
    "2. Use [the main thing your app does, for example set up your profile or search for a product] at least once.",
    "3. Note anything that breaks, is slow or is confusing.",
    "",
    "You never need to pay or send your own money to do this job.",
    "",
    "Answer these questions in your submission (a sentence or two each):",
    "1. How easy was it to sign up? Give a score from 1 to 5 and say why.",
    "2. What did you like most?",
    "3. What confused you or didn't work?",
    "4. Would you keep using it or tell a friend? Why?",
    "5. What one thing should we change first?",
    "",
    "Proof: a short screen recording of you using the app (put the Google Drive or unlisted YouTube link in the Link box) or at least 3 screenshots. Also say your phone model and whether it is Android or iOS.",
  ].join("\n"),
};

const EXAMPLES: Example[] = [
  APP_TESTING,
  { title: "Follow and repost on X", category: "Social Media", subcategory: "X / Twitter", winners: "50", description: "Follow our account and repost the pinned post. Submit a link to your repost." },
  { title: "Join our Telegram community", category: "Community", winners: "200", description: "Join our Telegram channel and say hello in the group. Submit a screenshot showing you joined." },
  { title: "Like and comment on our Instagram post", category: "Social Media", subcategory: "Instagram", winners: "100", description: "Like our latest post and leave a genuine comment (not just emojis). Submit a screenshot of your comment." },
  { title: "Subscribe and like on YouTube", category: "Social Media", subcategory: "YouTube", winners: "150", description: "Subscribe to our channel and like the latest video. Submit a screenshot." },
  { title: "Write a product review", category: "App / Website Review", subcategory: "App Reviews", winners: "25", description: "Use our product and write an honest review of at least 100 words. Submit a link or paste the review." },
];

export default function TemplatesModal({ onClose, onUse }: { onClose: () => void; onUse: (data: TemplateData, example: boolean, files?: TemplateFile[]) => void }) {
  const { isAuthed } = useAuth();
  const [mine, setMine] = useState<JobTemplate[] | null>(isAuthed ? null : []);
  const [tab, setTab] = useState<"mine" | "community" | "examples">("mine");
  // Community library: templates other members shared
  const [community, setCommunity] = useState<JobTemplate[] | null>(null);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<JobTemplate | null>(null);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    if (tab !== "community" || !isAuthed) return;
    const t = setTimeout(() => {
      listCommunityTemplates(q.trim()).then((r) => setCommunity(r?.items || [])).catch(() => setCommunity([]));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [tab, q, isAuthed]);
  // "Add to my templates": a private copy you can change
  const addToMine = async (t: JobTemplate) => {
    setBusy(t.id);
    try {
      const copy = await copyTemplate(t.id);
      setMine((m) => (m && copy && !m.some((x) => x.id === copy.id) ? [copy, ...m] : m));
      setBusy("added:" + t.id);
    } catch { setBusy("error:" + t.id); }
  };
  const togglePublic = async (t: JobTemplate) => {
    try {
      const row = await setTemplatePublic(t.id, !t.isPublic);
      setMine((m) => m && m.map((x) => (x.id === t.id ? { ...x, isPublic: row?.isPublic ?? !t.isPublic } : x)));
    } catch { /* leave it as it was */ }
  };

  useEffect(() => {
    if (!isAuthed) return;
    listTemplates().then((t) => { setMine(t || []); if (!t?.length) setTab("examples"); }).catch(() => { setMine([]); setTab("examples"); });
  }, [isAuthed]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const use = (d: TemplateData, example: boolean, files?: TemplateFile[] | null) => { onUse(d, example, files || []); onClose(); };
  const fileCount = (t: JobTemplate) => (t.files?.length ? `${t.files.length} file${t.files.length > 1 ? "s" : ""}` : null);
  const summary = (d: TemplateData) => [
    d.bounty && Number(d.bounty) > 0 ? `Budget ${money(Number(d.bounty), (d.currency as any) || "NGN")}` : null,
    d.winners ? `${d.winners} ${d.winners === "1" ? "person" : "people"}` : null,
    d.category && CATEGORIES[d.category] ? d.category : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="tm-wrap" role="dialog" aria-modal="true" aria-label="Job templates">
      <div className="tm-scrim" onClick={onClose} />
      <div className="tm-panel">
        <div className="tm-head">
          <strong>Start from a template</strong>
          <button className="tm-x" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
        </div>
        <div className="tm-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>My templates{mine?.length ? ` (${mine.length})` : ""}</button>
          <button role="tab" aria-selected={tab === "community"} className={tab === "community" ? "on" : ""} onClick={() => { setTab("community"); setPreview(null); }}>Community</button>
          <button role="tab" aria-selected={tab === "examples"} className={tab === "examples" ? "on" : ""} onClick={() => setTab("examples")}>Examples</button>
        </div>
        <div className="tm-body">
          {tab === "community" ? (
            !isAuthed ? <div className="tm-empty">Sign in to browse templates other members shared.</div>
            : preview ? (
              <div className="tm-preview">
                <button className="ui-btn ui-btn-ghost" onClick={() => setPreview(null)}><i className="ti ti-arrow-left" /> All community templates</button>
                <strong>{preview.name}</strong>
                <span className="tm-meta">Community template{preview.author ? ` by @${preview.author.username}` : ""}{preview.copies ? ` · added by ${preview.copies} ${preview.copies === 1 ? "person" : "people"}` : ""}</span>
                {preview.data.description && <p className="tm-desc">{preview.data.description}</p>}
                {!!preview.files?.length && (
                  <div className="tm-files"><b>Attachments</b>{preview.files.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer"><i className="ti ti-paperclip" /> {x.name}</a>)}</div>
                )}
                <div className="ui-actions">
                  <button className="ui-btn ui-btn-dark" onClick={() => use(preview.data, false, preview.files)}>Use</button>
                  <button className="ui-btn ui-btn-ghost" disabled={busy === preview.id || busy === "added:" + preview.id} onClick={() => addToMine(preview)}>
                    <i className={`ti ${busy === "added:" + preview.id ? "ti-check" : "ti-plus"}`} /> {busy === "added:" + preview.id ? "Added to my templates" : busy === "error:" + preview.id ? "Couldn't add. Retry" : "Add to my templates"}
                  </button>
                </div>
              </div>
            ) : (<>
              <input className="ui-input tm-search" type="search" placeholder="Search community templates" aria-label="Search community templates" value={q} onChange={(e) => setQ(e.target.value)} />
              {community === null ? <div className="ui-sk" style={{ height: 120 }} /> : community.length === 0 ? (
                <div className="tm-empty">{q ? "No shared templates match that." : "No shared templates yet. Tick Public when you save a template to share yours."}</div>
              ) : community.map((t) => (
                <div key={t.id} className="tm-item">
                  <div className="tm-item-t">
                    <strong>{t.name}</strong>
                    <span>{[t.author ? `@${t.author.username}` : null, summary(t.data), fileCount(t)].filter(Boolean).join(" · ") || "Shared job"}</span>
                    {t.data.description && <p>{t.data.description}</p>}
                  </div>
                  <button className="ui-btn ui-btn-ghost" onClick={() => setPreview(t)}>Preview</button>
                </div>
              ))}
            </>)
          ) : tab === "mine" ? (
            mine === null ? <div className="ui-sk" style={{ height: 120 }} /> : mine.length === 0 ? (
              <div className="tm-empty">
                {isAuthed
                  ? <>No saved templates yet. Fill in a job and choose <b>Save as template</b>, or save any job you've posted from <Link to="/manage-jobs" onClick={onClose}>Manage jobs</Link>.</>
                  : <>Sign in to use your saved templates.</>}
              </div>
            ) : mine.map((t) => (
              <div key={t.id} className="tm-item">
                <div className="tm-item-t">
                  <strong>{t.name}</strong>
                  <span>{[summary(t.data), fileCount(t), t.isPublic ? "Public" : null].filter(Boolean).join(" · ") || "Saved job"}</span>
                  {t.data.description && <p>{t.data.description}</p>}
                </div>
                <div className="tm-item-acts">
                  <button className="ui-btn ui-btn-ghost" onClick={() => togglePublic(t)} aria-pressed={!!t.isPublic} title={t.isPublic ? "Shared in the community library. Tap to make it private." : "Only you can see it. Tap to share it in the community library."}>
                    <i className={`ti ${t.isPublic ? "ti-world" : "ti-lock"}`} /> {t.isPublic ? "Public" : "Private"}
                  </button>
                  <button className="ui-btn ui-btn-dark" onClick={() => use(t.data, false, t.files)}>Use</button>
                </div>
              </div>
            ))
          ) : EXAMPLES.map(({ note, ...d }) => (
            <div key={d.title} className="tm-item">
              <div className="tm-item-t">
                <strong>{d.title}</strong>
                <span>{note || summary(d)}</span>
                <p>{d.description}</p>
              </div>
              <button className="ui-btn ui-btn-ghost" onClick={() => use(d, true)}>Use</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
