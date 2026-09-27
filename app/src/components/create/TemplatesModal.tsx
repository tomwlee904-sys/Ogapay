import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES, listTemplates, money, type JobTemplate, type TemplateData } from "./shared";

// Pick a starting point for a custom job: your saved templates (Manage jobs >
// Templates, or "Save as template" on this page) or a few worded examples.
// Examples fill the wording and how many people to pay, not the budget.

const EXAMPLES: TemplateData[] = [
  { title: "Follow and repost on X", category: "Social Media", subcategory: "X / Twitter", winners: "50", description: "Follow our account and repost the pinned post. Submit a link to your repost." },
  { title: "Join our Telegram community", category: "Community", winners: "200", description: "Join our Telegram channel and say hello in the group. Submit a screenshot showing you joined." },
  { title: "Like and comment on our Instagram post", category: "Social Media", subcategory: "Instagram", winners: "100", description: "Like our latest post and leave a genuine comment (not just emojis). Submit a screenshot of your comment." },
  { title: "Subscribe and like on YouTube", category: "Social Media", subcategory: "YouTube", winners: "150", description: "Subscribe to our channel and like the latest video. Submit a screenshot." },
  { title: "Write a product review", category: "App / Website Review", subcategory: "App Reviews", winners: "25", description: "Use our product and write an honest review of at least 100 words. Submit a link or paste the review." },
  { title: "Beta test our app", category: "App Testing & Install", subcategory: "Beta Testing", winners: "20", description: "Install the app, try the main features and report any bugs or confusing parts. Include screenshots or a screen recording." },
];

export default function TemplatesModal({ onClose, onUse }: { onClose: () => void; onUse: (data: TemplateData, example: boolean) => void }) {
  const { isAuthed } = useAuth();
  const [mine, setMine] = useState<JobTemplate[] | null>(isAuthed ? null : []);
  const [tab, setTab] = useState<"mine" | "examples">("mine");

  useEffect(() => {
    if (!isAuthed) return;
    listTemplates().then((t) => { setMine(t || []); if (!t?.length) setTab("examples"); }).catch(() => { setMine([]); setTab("examples"); });
  }, [isAuthed]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const use = (d: TemplateData, example: boolean) => { onUse(d, example); onClose(); };
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
          <button role="tab" aria-selected={tab === "examples"} className={tab === "examples" ? "on" : ""} onClick={() => setTab("examples")}>Examples</button>
        </div>
        <div className="tm-body">
          {tab === "mine" ? (
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
                  <span>{summary(t.data) || "Saved job"}</span>
                  {t.data.description && <p>{t.data.description}</p>}
                </div>
                <button className="ui-btn ui-btn-dark" onClick={() => use(t.data, false)}>Use</button>
              </div>
            ))
          ) : EXAMPLES.map((d) => (
            <div key={d.title} className="tm-item">
              <div className="tm-item-t">
                <strong>{d.title}</strong>
                <span>{summary(d)}</span>
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
