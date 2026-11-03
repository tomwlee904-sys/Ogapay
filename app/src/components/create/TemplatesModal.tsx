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
  reqId: "human",
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

// A ready-made job: what to do, the proof and what isn't paid, with the parts to
// fill in as [paste ...] (2026-11-03, the common job types on OgaPay and other
// task sites). Suggested pay is a guide, from OgaPay's quick X prices.
const ready = (e: { title: string; category: string; subcategory?: string; winners: number; each: number; days?: string; steps: string[]; proof: string; notPaid: string; screenshot?: boolean; reqId?: string }): Example => ({
  mode: "Challenge",
  title: e.title, category: e.category, ...(e.subcategory && { subcategory: e.subcategory }),
  winners: String(e.winners), currency: "NGN", bounty: String(e.winners * e.each), duration: e.days || "7 days",
  ...(e.screenshot && { screenshot: true }), ...(e.reqId && { reqId: e.reqId }),
  note: `Suggested: ₦${e.each.toLocaleString("en-US")} a person, ${e.winners} people. Fill in the parts in [brackets].`,
  description: [...e.steps, "", `Proof: ${e.proof}`, "", `Not paid if: ${e.notPaid}`].join("\n"),
});

const READY: Example[] = [
  ready({ title: "Follow us on TikTok", category: "Social Media", subcategory: "TikTok", winners: 100, each: 50, screenshot: true,
    steps: ["Follow our TikTok account: [paste your TikTok profile link]", "", "What to do:", "1. Open the link and tap Follow.", "2. Stay followed. Unfollowing after you're paid can get your account flagged."],
    proof: "a screenshot of our profile showing \"Following\", and your TikTok username in the note.",
    notPaid: "the screenshot doesn't show \"Following\", or the account is empty or fake." }),
  ready({ title: "Like, comment on and share our TikTok video", category: "Social Media", subcategory: "TikTok", winners: 100, each: 100, screenshot: true,
    steps: ["Our video: [paste your TikTok video link]", "", "What to do:", "1. Watch the video to the end and like it.", "2. Leave a real comment of at least 8 words about the video.", "3. Share it to your story or to a friend."],
    proof: "a screenshot showing your comment under the video with your username visible, and your TikTok username in the note.",
    notPaid: "the comment is generic (\"nice\", \"fire\", emojis only) or copied from someone else." }),
  ready({ title: "Follow our Facebook page and like our latest post", category: "Social Media", subcategory: "Facebook", winners: 100, each: 50, screenshot: true,
    steps: ["Our page: [paste your Facebook page link]", "", "What to do:", "1. Open the page and tap Follow (or Like Page).", "2. Like our most recent post."],
    proof: "a screenshot of the page showing you follow it, and the name on your Facebook account in the note.",
    notPaid: "the account is new, empty or fake, or the screenshot doesn't show you follow the page." }),
  ready({ title: "Follow us on Instagram", category: "Social Media", subcategory: "Instagram", winners: 100, each: 50, screenshot: true,
    steps: ["Our account: [paste your Instagram profile link]", "", "What to do:", "1. Open the link and tap Follow.", "2. Stay followed. Unfollowing after you're paid can get your account flagged."],
    proof: "a screenshot of our profile showing \"Following\", and your Instagram username in the note.",
    notPaid: "the screenshot doesn't show \"Following\", or the account is empty or fake." }),
  ready({ title: "Like and reply to our post on X", category: "Social Media", subcategory: "X / Twitter", winners: 100, each: 100,
    steps: ["Our post: [paste your X post link]", "", "What to do:", "1. Like the post.", "2. Reply with a real comment of at least 10 words in your own words: what you like, how you'd use it, or a question."],
    proof: "the link to your reply, and your X username in the note.",
    notPaid: "the reply is short or generic (\"nice\", \"👍\"), copied, or deleted later." }),
  ready({ title: "Leave a real comment on our YouTube video", category: "Social Media", subcategory: "YouTube", winners: 100, each: 50, screenshot: true,
    steps: ["Our video: [paste your YouTube video link]", "", "What to do:", "1. Watch at least 2 minutes of the video and like it.", "2. Leave a comment of at least 10 words about something in the video."],
    proof: "a screenshot of your comment with your channel name visible, and your channel name in the note.",
    notPaid: "the comment could be about any video, is copied, or is under 10 words." }),
  ready({ title: "Follow our company page on LinkedIn", category: "Social Media", winners: 100, each: 50, screenshot: true,
    steps: ["Our page: [paste your LinkedIn page link]", "", "What to do:", "1. Open the page and tap Follow.", "2. Like our latest post."],
    proof: "a screenshot of the page showing \"Following\", and your LinkedIn name in the note.",
    notPaid: "the profile is empty or fake, or the screenshot doesn't show \"Following\"." }),
  ready({ title: "Post our flyer on your WhatsApp status", category: "Community", subcategory: "Outreach", winners: 50, each: 100, screenshot: true,
    steps: ["Our flyer and link: [paste your flyer or link]", "", "What to do:", "1. Post the flyer (or the link) on your WhatsApp status with one line in your own words.", "2. Keep it up for 24 hours."],
    proof: "a screenshot of your status taken at least 6 hours after you posted it, with the view count showing.",
    notPaid: "the screenshot is taken before 6 hours or doesn't show the views, or the status was deleted." }),
  ready({ title: "Join our Discord server", category: "Community", subcategory: "Outreach", winners: 100, each: 50, screenshot: true,
    steps: ["Our server: [paste your Discord invite link]", "", "What to do:", "1. Join the server and accept the rules.", "2. Say hello in the welcome channel."],
    proof: "a screenshot of your hello message in the server, and your Discord username in the note.",
    notPaid: "you leave the server after you're paid, or the screenshot doesn't show your message." }),
  ready({ title: "Stream our song and follow the artist", category: "Music Promotion", subcategory: "Streaming", winners: 100, each: 100, screenshot: true,
    steps: ["The song: [paste the song link on Audiomack, Boomplay, Spotify or Apple Music]", "", "What to do:", "1. Play the whole song once, without skipping.", "2. Like or save it.", "3. Follow the artist."],
    proof: "a screenshot of the song playing with your account name visible, and your username on that app in the note.",
    notPaid: "the song is skipped or muted, or the screenshot doesn't show your account." }),
  ready({ title: "Make a TikTok video with our song", category: "Music Promotion", subcategory: "Content Creation", winners: 20, each: 1000, days: "14 days",
    steps: ["The sound: [paste the TikTok sound link]", "", "What to do:", "1. Make your own 15 to 60 second video (a dance, a skit, a lip-sync or a reaction) using our sound.", "2. Add [paste your hashtag] to the caption.", "3. Keep the video public for at least 14 days."],
    proof: "the link to your TikTok video.",
    notPaid: "the video is reposted from someone else, doesn't use the sound, or is under 15 seconds." }),
  ready({ title: "Answer our short survey", category: "Surveys", subcategory: "Market Research", winners: 100, each: 100, screenshot: true,
    steps: ["The survey: [paste your survey link]", "", "What to do:", "1. Answer every question honestly. It takes about 5 minutes.", "2. Submit the form."],
    proof: "a screenshot of the \"response recorded\" page, and the name or email you used in the note.",
    notPaid: "the answers are random or copied, or the form wasn't submitted." }),
  ready({ title: "Vote in our poll", category: "Surveys", subcategory: "Opinion Polls", winners: 100, each: 50, screenshot: true,
    steps: ["The poll: [paste the poll link]", "", "What to do:", "1. Open the link.", "2. Vote for [paste who or what to vote for]."],
    proof: "a screenshot of the page after you voted.",
    notPaid: "you vote for something else or vote more than once." }),
  ready({ title: "Sign up on our app or website", category: "Lead Generation", subcategory: "Email Signups", winners: 50, each: 150, screenshot: true, reqId: "human",
    steps: ["Sign up here: [paste your sign-up link]", "", "What to do:", "1. Create an account with your real name and email.", "2. Confirm your email if we send you a link.", "", "You never need to pay or send your own money to do this job."],
    proof: "a screenshot of your account page or welcome screen, and the email you signed up with in the note.",
    notPaid: "the details are fake, or someone already signed up with the same email or phone." }),
  ready({ title: "Get 10 friends to sign up with your link", category: "Lead Generation", subcategory: "Referrals", winners: 10, each: 3000, days: "14 days", reqId: "human",
    steps: ["Where to get your link: [paste the page where people find their referral link]", "", "What to do:", "1. Share your own referral link with friends, family and your followers.", "2. Get 10 real people to sign up with it and confirm their accounts.", "", "This takes a few days. Only real people count."],
    proof: "a screenshot of your referral page showing 10 or more confirmed sign-ups, with your username visible.",
    notPaid: "the sign-ups are fake, made by you, or from the same device." }),
  ready({ title: "Write a post about us on X, Facebook or LinkedIn", category: "Content Creation", subcategory: "Writing", winners: 20, each: 300,
    steps: ["About us: [paste one or two lines about your brand]", "Our link: [paste your website link]", "", "What to do:", "1. Write a post of at least 60 words in your own words: what we do and why someone should try it.", "2. Include our link.", "3. Keep it up for at least 14 days."],
    proof: "the link to your post.",
    notPaid: "the post is copied, written by AI, under 60 words, or deleted." }),
  ready({ title: "Try our website and tell us what's confusing", category: "App / Website Review", subcategory: "Website Reviews", winners: 30, each: 200,
    steps: ["Our website: [paste your website link]", "", "What to do:", "1. Spend about 5 minutes using the site as a new visitor would.", "2. Answer in your submission: What did you like? What confused you? What should we fix first?"],
    proof: "your answers (at least 50 words) and one screenshot of the page you liked or found confusing.",
    notPaid: "the answers could be about any website or are copied." }),
];

const EXAMPLES: Example[] = [
  APP_TESTING,
  ...READY,
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
  // Examples by category ("" = all)
  const [exCat, setExCat] = useState("");
  const exCats = [...new Set(EXAMPLES.map((e) => e.category || "Other"))];
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
          ) : <>
            <div className="tm-cats" role="group" aria-label="Show examples for">
              {["", ...exCats].map((c) => <button key={c || "all"} type="button" className={`ui-chip${exCat === c ? " on" : ""}`} aria-pressed={exCat === c} onClick={() => setExCat(c)}>{c || "All"}</button>)}
            </div>
            {EXAMPLES.filter((e) => !exCat || (e.category || "Other") === exCat).map(({ note, ...d }) => (
            <div key={d.title} className="tm-item">
              <div className="tm-item-t">
                <strong>{d.title}</strong>
                <span>{note || summary(d)}</span>
                <p>{d.description}</p>
              </div>
              <button className="ui-btn ui-btn-ghost" onClick={() => use(d, true)}>Use</button>
            </div>
          ))}
          </>}
        </div>
      </div>
    </div>
  );
}
