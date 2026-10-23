import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FundJobWalletModal from "../FundJobWalletModal";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useWalletBalance } from "../../context/WalletBalanceContext";
import { RequirementPicker, NO_REQS, type Reqs, money, minReward, reqFields, createTask, apiErrorText, deadlineFor } from "./shared";
import { PayoutCheckPicker } from "../PayoutCheck";
import { useSocialPrices, priceOf, isStaggered, batchSizeFor, ACTION_OF, PACK_NAMES, X_TARGET, RaidPack } from "./socialPrices";

/* Quick task: a preset social action on one platform. The poster picks the
   action, pastes a link or handle and chooses how many people; each person
   is paid the platform's preset price per action. On X the price depends on
   the action (socialPrices.ts, checked by the server), with blue-tick versions
   at 2.4x and raid packs; X jobs are paid in naira. */

const PROOF: Record<string, string> = {
  Followers: "a screenshot showing you follow the account",
  Subscribers: "a screenshot showing you subscribed",
  Members: "a screenshot showing you joined",
  Likes: "a screenshot showing your like",
  Reactions: "a screenshot showing your reaction",
  Comments: "the link to your comment",
  Messages: "a screenshot of your message",
  Reposts: "a screenshot of your repost",
  Shares: "a screenshot of your share",
  Bookmarks: "a screenshot of your bookmark",
  Views: "a screenshot showing you watched it",
  "Story Views": "a screenshot showing you viewed the story",
  "Post Views": "a screenshot showing you viewed the post",
  Raid: "links to your like, repost and comment",
  Quotes: "the link to your quote post",
};

export default function QuickTaskForm({ platform, onBack, onCreated }: { platform: any; onBack: () => void; onCreated: (taskId: string) => void }) {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { convert } = useCurrency();
  const { balances: walletBalances, refresh: refreshWallet } = useWalletBalance();

  const [action, setAction] = useState<string>(platform.actions[0] || "");
  const [link, setLink] = useState("");
  const [qtyInput, setQtyInput] = useState("100");
  const [currency, setCurrency] = useState<"NGN" | "USDC">("NGN");
  const [reqs, setReqs] = useState<Reqs>(NO_REQS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showFund, setShowFund] = useState(false);
  // Payout check window in minutes (0 = instant, as before). Only X posts can be re-checked.
  const [payoutCheck, setPayoutCheck] = useState(0);
  // X only: blue-tick accounts only (2.4x), and the raid pack
  const [blueOnly, setBlueOnly] = useState(false);
  const [pack, setPack] = useState<RaidPack>("SMALL");
  const prices = useSocialPrices();

  const isX = platform.id === "x";
  const social = isX ? ACTION_OF[action] : undefined;
  const isRaid = social === "RAID";
  // The "Blue-tick X account" requirement is the same thing as the switch
  const blue = isX && (blueOnly || reqs.extra === "xblue");
  const cur: "NGN" | "USDC" = isX ? "NGN" : currency;

  // Preset price per action is defined in Naira; USDC is converted, never below the minimum
  const priceNgn = social ? priceOf(prices, social, blue, pack) : Math.max(minReward("NGN"), Number(platform.pricePerAction) || 50);
  const price = cur === "NGN" ? priceNgn : Math.max(minReward("USDC"), Number(convert(priceNgn, "NGN" as any, "USDC" as any).toFixed(2)));
  const packInfo = prices.raidPacks.find(r => r.pack === pack);
  const qty = isRaid ? (packInfo?.places || 0) : Math.min(1000, Math.max(0, parseInt(qtyInput) || 0));
  const subtotal = Math.round(price * qty * 100) / 100;
  const total = Math.round(subtotal * 110) / 100;
  const staggered = !!social && isStaggered(prices, social, qty);
  const balance = Number(walletBalances?.[cur]?.balance || 0);
  const proof = PROOF[action] || "a screenshot as proof";

  const submit = async () => {
    if (!isAuthed) { navigate("/login?redirect=/create"); return; }
    if (!link.trim()) { setError(`Add the ${platform.name} link or handle.`); return; }
    if (qty < 1) { setError("Choose how many people (1 to 1,000)."); return; }
    if (balance < total) { setShowFund(true); return; }
    setBusy(true); setError("");
    const target = link.trim();
    try {
      const deadline = deadlineFor("7 days");
      const what = isRaid ? "Raid (like, repost and comment)" : action;
      const brief = `${what} on ${platform.name}: ${target}\n\nThen submit ${proof}.${social ? ` You have ${prices.holdMinutes} minutes after taking a place to send it.` : ""}`;
      const taskId = await createTask({
        title: isRaid ? `${blue ? "Blue-tick raid" : "Raid"} on ${platform.name} (${PACK_NAMES[pack]})` : `${blue ? "Blue-tick " : ""}${action} on ${platform.name}`,
        description: brief,
        instructions: brief,
        category: "SOCIAL_MEDIA",
        reward: price,              // paid to each person
        maxWorkers: qty,            // number of people
        currency: cur,
        tags: ["quick-task", platform.id, action.toLowerCase()].slice(0, 5),
        ...(social && {
          socialAction: social,
          ...(isRaid && { raidPack: pack }),
          ...(X_TARGET.test(target) && { targetUrl: target }),
          ...(blue && { requiresXBlue: true }),
        }),
        payoutCooldownMinutes: payoutCheck,
        proofRequired: `Submit ${proof}`,
        ...(deadline && { deadline: deadline.toISOString() }),
        ...reqFields(reqs),
      });
      refreshWallet();
      onCreated(taskId);
    } catch (err: any) {
      setError(apiErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="qt">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <button className="ui-btn ui-btn-ghost" onClick={onBack}><i className="ti ti-arrow-left" /> Platforms</button>
        <b style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>{platform.icon} {platform.name}</b>
      </div>

      <div className="cf-field">
        <span className="cf-lbl">Action</span>
        <div className="qt-actions" role="radiogroup" aria-label="Action">
          {platform.actions.map((a: string) => (
            <button key={a} type="button" role="radio" aria-checked={action === a} className={action === a ? "on" : ""} onClick={() => setAction(a)}>{a}</button>
          ))}
        </div>
      </div>

      {isX && (
        <label className="qt-blue">
          <input type="checkbox" checked={blue} onChange={e => { setBlueOnly(e.target.checked); if (e.target.checked && reqs.extra === "none") setReqs({ ...reqs, extra: "xblue", value: "" }); if (!e.target.checked && reqs.extra === "xblue") setReqs({ ...reqs, extra: "none", value: "" }); }} />
          <span><b>Blue-tick accounts only</b><small>Only X accounts with a blue tick can take part. {prices.blueTimes}x the price.</small></span>
        </label>
      )}

      {isRaid && (
        <div className="cf-field">
          <span className="cf-lbl">Raid pack</span>
          <div className="qt-packs" role="radiogroup" aria-label="Raid pack">
            {prices.raidPacks.map(r => (
              <button key={r.pack} type="button" role="radio" aria-checked={pack === r.pack} className={pack === r.pack ? "on" : ""} onClick={() => setPack(r.pack)}>
                <b>{PACK_NAMES[r.pack]}</b>
                <span>{money(blue ? r.bluePrice : r.price, "NGN")}</span>
                <small>{r.places} raiders</small>
              </button>
            ))}
          </div>
          <p className="cf-hint">Each raider likes, reposts and comments on your post for {money(price, "NGN")}.</p>
        </div>
      )}

      <div className="qt-price">
        <div><b>{money(total, cur)}</b> <span>for {qty.toLocaleString()} {isRaid ? "raiders" : action.toLowerCase()}</span></div>
        <span>{money(price, cur)} per {social ? (isRaid ? "raider" : "action") : "person"} + 10% fee</span>
      </div>

      <div className="cf-row">
        {!isRaid && (
          <div className="cf-field">
            <label htmlFor="qt-qty">Amount</label>
            <input id="qt-qty" className="ui-input" type="number" min={1} max={1000} value={qtyInput} onChange={e => setQtyInput(e.target.value)} />
          </div>
        )}
        <div className="cf-field">
          <label htmlFor="qt-cur">Currency</label>
          {isX ? (
            <input id="qt-cur" className="ui-input" readOnly value="NGN" title="X quick tasks are paid in naira" />
          ) : (
            <select id="qt-cur" className="ui-select" value={currency} onChange={e => setCurrency(e.target.value as any)}>
              <option value="NGN">NGN</option><option value="USDC">USDC</option>
            </select>
          )}
        </div>
      </div>

      {social && (
        <p className="cf-hint" style={{ margin: 0 }}>
          <i className="ti ti-clock" /> Each person has {prices.holdMinutes} minutes to send proof after taking a place, or the place goes to someone else.
          {staggered && ` To keep bots out, places open ${batchSizeFor(qty)} at a time, every ${prices.stagger.everyMinutes} minutes.`}
        </p>
      )}

      <div className="cf-field">
        <label htmlFor="qt-link">{action} · link or handle</label>
        <input id="qt-link" className="ui-input" value={link} onChange={e => setLink(e.target.value)} placeholder={platform.id === "x" ? "https://x.com/… or @handle" : `${platform.name} link`} />
        <p className="cf-hint">People will submit {proof}.</p>
      </div>

      <RequirementPicker reqs={reqs} onChange={setReqs} />

      <div className="cf-field">
        <span className="cf-lbl">Payout check</span>
        <PayoutCheckPicker value={payoutCheck} onChange={setPayoutCheck} />
        {platform.id !== "x" && payoutCheck > 0 && <p className="cf-hint">Only X posts can be checked automatically. On {platform.name} the wait still applies, and you review the proof.</p>}
      </div>

      {isAuthed && (
        <p className="cf-hint" style={{ margin: 0 }}>Paid from your {cur} balance: <b style={{ color: balance >= total ? "var(--green)" : "var(--red)" }}>{money(balance, cur)}</b></p>
      )}
      {error && <div className="cf-error">{error}</div>}

      <button className="ui-btn ui-btn-dark ui-btn-lg" onClick={submit} disabled={busy}>
        {!isAuthed ? "Sign in to continue" : busy ? "Publishing…" : balance < total ? "Top up and pay" : `Pay ${money(total, cur)} and publish`} {!busy && <i className="ti ti-arrow-right" />}
      </button>
      <p className="cw-terms" style={{ marginTop: -6 }}>The job goes live as soon as it's paid. Unused budget returns to your wallet when it closes.</p>

      {showFund && (
        <FundJobWalletModal
          currency={cur}
          shortfall={Math.max(0, total - balance)}
          totalToPay={total}
          balance={balance}
          onClose={() => setShowFund(false)}
          onFunded={() => { setShowFund(false); refreshWallet(); }}
        />
      )}
    </div>
  );
}
