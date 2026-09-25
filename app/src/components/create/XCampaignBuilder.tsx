import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Layout";
import FundJobWalletModal from "../FundJobWalletModal";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useWalletBalance } from "../../context/WalletBalanceContext";
import { OverviewCard, RequirementPicker, Steps, Fold, DURATIONS, deadlineFor, money, minReward, reqFields, reqLabel, createTask, apiErrorText } from "./shared";

/* X campaign: pick an X post, choose the actions you want (reposts, comments,
   likes...), set how many people and the reward for each. Each action becomes
   its own funded job, so workers see one clear instruction per task. */

type Post = { id?: string; url: string; authorName: string; authorUsername: string; avatarUrl: string | null; text: string; likes: number; reposts: number; replies: number };
type Comp = { on: boolean; qty: string; reward: string };

const COMPONENTS = [
  { id: "repost", label: "Reposts", verb: "Repost", icon: "ti-repeat", proof: "a screenshot of your repost", qty: 50, ngn: 60 },
  { id: "comment", label: "Comments", verb: "Comment on", icon: "ti-message-circle", proof: "the link to your comment", qty: 20, ngn: 100 },
  { id: "like", label: "Likes", verb: "Like", icon: "ti-heart", proof: "a screenshot showing you liked it", qty: 100, ngn: 50 },
  { id: "bookmark", label: "Bookmarks", verb: "Bookmark", icon: "ti-bookmark", proof: "a screenshot of your bookmarks", qty: 50, ngn: 50 },
  { id: "quote", label: "Quotes", verb: "Quote", icon: "ti-quote", proof: "the link to your quote post", qty: 20, ngn: 120 },
];

const X_URL = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/i;

export default function XCampaignBuilder({ initialUrl = "", onClose, onCreated }: { initialUrl?: string; onClose: () => void; onCreated: (taskId: string) => void }) {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { convert } = useCurrency();
  const { balances: walletBalances, refresh: refreshWallet } = useWalletBalance();

  const [url, setUrl] = useState(initialUrl);
  const [post, setPost] = useState<Post | null>(null);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [currency, setCurrency] = useState<"NGN" | "USDC">("NGN");
  const [comps, setComps] = useState<Record<string, Comp>>(() =>
    Object.fromEntries(COMPONENTS.map((c, i) => [c.id, { on: i === 0, qty: String(c.qty), reward: String(c.ngn) }])));
  const [reqType, setReqType] = useState("none");
  const [reqValue, setReqValue] = useState("");
  const [duration, setDuration] = useState("7 days");
  const [openExtra, setOpenExtra] = useState(false);
  const [created, setCreated] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showFund, setShowFund] = useState(false);

  const handle = post?.authorUsername && post.authorUsername !== "unknown" ? post.authorUsername : (url.match(X_URL)?.[1] || "");

  const findPost = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const m = url.trim().match(X_URL);
    if (!m) { setFindError("Paste a link to an X post, like https://x.com/username/status/123…"); return; }
    setFindError("");
    setFinding(true);
    const fallback: Post = { url: url.trim(), authorName: m[1], authorUsername: m[1], avatarUrl: null, text: "", likes: 0, reposts: 0, replies: 0 };
    try {
      if (isAuthed) {
        const data = await apiRequest<any>("/twitter/fetch-post", { method: "POST", body: JSON.stringify({ url: url.trim() }) });
        setPost(data?.authorUsername && data.authorUsername !== "unknown" ? { ...fallback, ...data } : fallback);
      } else {
        setPost(fallback);
      }
    } catch {
      setPost(fallback); // preview unavailable; the link itself is enough to run the campaign
    } finally {
      setFinding(false);
      setStep(s => (s < 2 ? 2 : s));
    }
  };

  // Coming from the chooser with a link already pasted
  useEffect(() => { if (initialUrl) findPost(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rewards are entered in the chosen currency
  const rate = (ngn: number) => currency === "NGN" ? ngn : Math.max(minReward("USDC"), Number(convert(ngn, "NGN" as any, "USDC" as any).toFixed(2)));
  const switchCurrency = (next: "NGN" | "USDC") => {
    setCurrency(next);
    setComps(prev => Object.fromEntries(COMPONENTS.map(c => [c.id, { ...prev[c.id], reward: String(next === "NGN" ? c.ngn : Math.max(minReward("USDC"), Number(convert(c.ngn, "NGN" as any, "USDC" as any).toFixed(2)))) }])));
  };

  const lines = useMemo(() => COMPONENTS.filter(c => comps[c.id].on).map(c => {
    const qty = Math.min(1000, Math.max(0, parseInt(comps[c.id].qty) || 0));
    const reward = parseFloat(comps[c.id].reward) || 0;
    return { ...c, qty, reward, subtotal: qty * reward, valid: qty >= 1 && reward >= minReward(currency) };
  }), [comps, currency]);
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
  const fee = subtotal * 0.10;
  const total = subtotal + fee;
  const balance = Number(walletBalances?.[currency]?.balance || 0);
  const alt = currency === "NGN" ? `≈ $${convert(total, "NGN" as any, "USDC" as any).toFixed(2)} USD` : `≈ ₦${Math.round(convert(total, "USDC" as any, "NGN" as any)).toLocaleString("en-US")}`;

  const checklist = [
    { ok: !!post, label: "Find the X post you want to grow." },
    { ok: lines.length > 0, label: "Choose at least one action." },
    { ok: lines.length > 0 && lines.every(l => l.valid), label: `Set at least 1 person and ${money(minReward(currency), currency)} per action.` },
  ];
  const ready = checklist.every(c => c.ok);

  const publish = async () => {
    if (!isAuthed) { navigate("/login?redirect=/create"); return; }
    if (step < 3) {
      if (!ready) { setError("Finish the checklist before continuing."); return; }
      setError(""); setStep(3); window.scrollTo({ top: 0, behavior: "smooth" }); return;
    }
    const remaining = lines.filter(l => !created[l.id]);
    const remainingCost = remaining.reduce((s, l) => s + l.subtotal * 1.1, 0);
    if (balance < remainingCost) { setShowFund(true); return; }
    setBusy(true); setError("");
    const deadline = deadlineFor(duration);
    const done = { ...created };
    try {
      for (const l of remaining) {
        const who = handle ? `@${handle}'s` : "this";
        const brief = [
          `${l.verb} ${who} post on X: ${post!.url}`,
          ``,
          `Then submit ${l.proof}. Use your own active account; submissions from new or empty accounts may be rejected.`,
          reqType !== "none" ? `\nWho can take part: ${reqLabel(reqType, reqValue)}.` : "",
        ].join("\n");
        done[l.id] = await createTask({
          title: `${l.verb} ${who} post on X`.slice(0, 200),
          description: brief,
          instructions: brief,
          category: "SOCIAL_MEDIA",
          reward: l.reward,
          currency,
          maxWorkers: l.qty,
          tags: ["x-campaign", l.id],
          proofRequired: `Submit ${l.proof}`,
          ...(deadline && { deadline: deadline.toISOString() }),
          ...reqFields(reqType, reqValue),
        });
        setCreated({ ...done });
      }
      refreshWallet();
      onCreated(Object.values(done)[0] || "");
    } catch (err: any) {
      const made = Object.keys(done).length;
      setError(`${apiErrorText(err)}${made ? ` ${made} of ${lines.length} actions were already published and paid; pressing Pay again only publishes the rest.` : ""}`);
    } finally {
      setBusy(false);
    }
  };

  const rows: [string, string, string?][] = [
    ...lines.map(l => [`${l.label} × ${l.qty}`, money(l.subtotal, currency), `${money(l.reward, currency)} each`] as [string, string, string]),
    ["Platform fee (10%)", money(fee, currency)],
  ];

  return (
    <Layout>
      <div className="ui-page" style={{ paddingTop: 28 }}>
        <header className="ui-head">
          <div>
            <span className="ui-eyebrow"><i className="ti ti-sparkles" /> Made for your next idea</span>
            <h1 className="ui-title">Create an X campaign</h1>
            <p className="ui-sub">Choose the actions and rewards for your post. Review the total before paying.</p>
          </div>
          <button className="ui-btn ui-btn-ghost" onClick={onClose}><i className="ti ti-arrow-left" /> Change job type</button>
        </header>

        <Steps labels={["Enter post", "Set rewards", "Payment"]} current={step} />

        <div className="cw-layout">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!isAuthed && (
              <div className="cw-banner" style={{ margin: 0 }}>
                <span>Plan your campaign now. Sign in to see the post preview and pay.</span>
                <button className="ui-btn ui-btn-dark" onClick={() => navigate("/login?redirect=/create")}>Sign in</button>
              </div>
            )}

            <section className="ui-card cf-card">
              <div className="cf-head"><b><i className="ti ti-brand-x" /> Post details</b></div>
              <form className="cf-body" onSubmit={findPost}>
                <div className="cf-field">
                  <label htmlFor="xc-url">Post URL</label>
                  <div className="ui-search">
                    <input id="xc-url" className="ui-input" style={{ paddingLeft: 14 }} type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://x.com/username/status/…" />
                    <button type="button" className="ui-btn ui-btn-ghost" style={{ height: 42 }} aria-label="Paste link"
                      onClick={async () => { try { setUrl((await navigator.clipboard.readText()).trim()); } catch { /* clipboard blocked */ } }}>
                      <i className="ti ti-clipboard" />
                    </button>
                    <button type="submit" className="ui-btn ui-btn-dark" style={{ height: 42 }} disabled={finding || !url.trim()}>
                      <i className="ti ti-search" /> {finding ? "Finding…" : "Find post"}
                    </button>
                  </div>
                  <p className={`cf-hint${findError ? " err" : ""}`}>{findError || "Enter the URL of the X post you want to promote."}</p>
                </div>
                {post && (
                  <div className="xc-post">
                    <div className="xc-post-head">
                      <div className="xc-author">
                        {post.avatarUrl ? <img src={post.avatarUrl} alt="" /> : <span className="ph"><i className="ti ti-brand-x" /></span>}
                        <span><b>{post.authorName}</b><span>@{post.authorUsername}</span></span>
                      </div>
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="ui-count" style={{ textDecoration: "underline" }}>Open post</a>
                    </div>
                    {post.text && <p>{post.text}</p>}
                    {(post.likes > 0 || post.reposts > 0 || post.replies > 0) && (
                      <div className="xc-stats">
                        <span><i className="ti ti-heart" />{post.likes.toLocaleString()} likes</span>
                        <span><i className="ti ti-repeat" />{post.reposts.toLocaleString()} reposts</span>
                        <span><i className="ti ti-message-circle" />{post.replies.toLocaleString()} replies</span>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </section>

            {step >= 2 && (
              <section className="ui-card cf-card">
                <div className="cf-head">
                  <b><i className="ti ti-stack-2" /> Actions and rewards</b>
                  <select className="ui-select" style={{ width: 110, height: 36 }} value={currency} onChange={e => switchCurrency(e.target.value as any)} aria-label="Currency">
                    <option value="NGN">NGN</option><option value="USDC">USDC</option>
                  </select>
                </div>
                <div className="cf-body">
                  <p className="cf-hint" style={{ margin: 0 }}>Choose the actions you need, then set how many people and the reward each person gets. A 10% platform fee is added at payment.</p>
                  <div>
                    {COMPONENTS.map(c => {
                      const st = comps[c.id];
                      const line = lines.find(l => l.id === c.id);
                      return (
                        <div key={c.id} className={`xc-comp${st.on ? " on" : ""}`}>
                          <button type="button" className="xc-comp-head" aria-pressed={st.on} onClick={() => setComps(p => ({ ...p, [c.id]: { ...p[c.id], on: !p[c.id].on } }))}>
                            <span className="xc-check">{st.on && <i className="ti ti-check" />}</span>
                            <i className={`ti ${c.icon}`} />
                            <b>{c.label}</b>
                            {line && <small>{money(line.subtotal, currency)}</small>}
                          </button>
                          {st.on && (
                            <div className="xc-comp-body">
                              <div className="cf-field">
                                <label>People</label>
                                <input className="ui-input" type="number" min={1} max={1000} value={st.qty} onChange={e => setComps(p => ({ ...p, [c.id]: { ...p[c.id], qty: e.target.value } }))} />
                              </div>
                              <div className="cf-field">
                                <label>Reward each</label>
                                <input className="ui-input" inputMode="decimal" value={st.reward} onChange={e => setComps(p => ({ ...p, [c.id]: { ...p[c.id], reward: e.target.value.replace(/[^0-9.]/g, "") } }))} />
                              </div>
                              <div className="cf-field">
                                <label>Budget</label>
                                <input className="ui-input" readOnly value={money(line?.subtotal || 0, currency)} />
                              </div>
                              <p className="cf-hint">Min {money(minReward(currency), currency)} each · suggested {money(rate(c.ngn), currency)} · people submit {c.proof}.</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Fold title="Extra settings" sub={`Requirement: ${reqLabel(reqType, reqValue)} · Closes after ${duration}`} open={openExtra} onToggle={() => setOpenExtra(o => !o)}>
                    <RequirementPicker type={reqType} value={reqValue} onChange={(t, v) => { setReqType(t); setReqValue(v); }} />
                    <div className="cf-field">
                      <label>Campaign closes after</label>
                      <select className="ui-select" value={duration} onChange={e => setDuration(e.target.value)}>
                        {DURATIONS.map(([l]) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </Fold>

                  {step === 3 && (
                    <div className="cf-review">
                      <div><span>Your {currency} balance</span><b style={{ color: balance >= total ? "var(--green)" : "var(--red)" }}>{money(balance, currency)}</b></div>
                      {Object.keys(created).length > 0 && <div><span>Already published</span><b>{Object.keys(created).length} of {lines.length} actions</b></div>}
                    </div>
                  )}
                  {error && <div className="cf-error">{error}</div>}
                </div>
              </section>
            )}
          </div>

          <OverviewCard
            rows={rows}
            total={total}
            currency={currency}
            alt={alt}
            checklist={step < 3 ? checklist : []}
            primaryLabel={!isAuthed ? "Sign in to continue" : step < 3 ? "Continue to payment" : busy ? "Publishing…" : `Pay ${money(total, currency)} and publish`}
            onPrimary={publish}
            busy={busy}
          />
        </div>
      </div>

      {showFund && (
        <FundJobWalletModal
          currency={currency}
          shortfall={Math.max(0, total - balance)}
          totalToPay={total}
          balance={balance}
          onClose={() => setShowFund(false)}
          onFunded={() => { setShowFund(false); refreshWallet(); }}
        />
      )}
    </Layout>
  );
}
