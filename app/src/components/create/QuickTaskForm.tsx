import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FundJobWalletModal from "../FundJobWalletModal";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useWalletBalance } from "../../context/WalletBalanceContext";
import { RequirementPicker, money, minReward, reqFields, createTask, apiErrorText, deadlineFor } from "./shared";

/* Quick task: a preset social action on one platform. The poster picks the
   action, pastes a link or handle and chooses how many people; each person
   is paid the platform's preset price per action. */

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
  const [reqType, setReqType] = useState("none");
  const [reqValue, setReqValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showFund, setShowFund] = useState(false);

  // Preset price per action is defined in Naira; USDC is converted, never below the minimum
  const priceNgn = Math.max(minReward("NGN"), Number(platform.pricePerAction) || 50);
  const price = currency === "NGN" ? priceNgn : Math.max(minReward("USDC"), Number(convert(priceNgn, "NGN" as any, "USDC" as any).toFixed(2)));
  const qty = Math.min(1000, Math.max(0, parseInt(qtyInput) || 0));
  const subtotal = price * qty;
  const total = subtotal * 1.1;
  const balance = Number(walletBalances?.[currency]?.balance || 0);
  const proof = PROOF[action] || "a screenshot as proof";

  const submit = async () => {
    if (!isAuthed) { navigate("/login?redirect=/create"); return; }
    if (!link.trim()) { setError(`Add the ${platform.name} link or handle.`); return; }
    if (qty < 1) { setError("Choose how many people (1 to 1,000)."); return; }
    if (balance < total) { setShowFund(true); return; }
    setBusy(true); setError("");
    try {
      const deadline = deadlineFor("7 days");
      const brief = `${action} on ${platform.name}: ${link.trim()}\n\nThen submit ${proof}.`;
      const taskId = await createTask({
        title: `${action} on ${platform.name}`,
        description: brief,
        instructions: brief,
        category: "SOCIAL_MEDIA",
        reward: price,              // paid to each person
        maxWorkers: qty,            // number of people
        currency,
        tags: ["quick-task", platform.id, action.toLowerCase()].slice(0, 5),
        proofRequired: `Submit ${proof}`,
        ...(deadline && { deadline: deadline.toISOString() }),
        ...reqFields(reqType, reqValue),
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

      <div className="qt-price">
        <div><b>{money(total, currency)}</b> <span>for {qty.toLocaleString()} {action.toLowerCase()}</span></div>
        <span>{money(price, currency)} per person + 10% fee</span>
      </div>

      <div className="cf-row">
        <div className="cf-field">
          <label htmlFor="qt-qty">Amount</label>
          <input id="qt-qty" className="ui-input" type="number" min={1} max={1000} value={qtyInput} onChange={e => setQtyInput(e.target.value)} />
        </div>
        <div className="cf-field">
          <label htmlFor="qt-cur">Currency</label>
          <select id="qt-cur" className="ui-select" value={currency} onChange={e => setCurrency(e.target.value as any)}>
            <option value="NGN">NGN</option><option value="USDC">USDC</option>
          </select>
        </div>
      </div>

      <div className="cf-field">
        <label htmlFor="qt-link">{action} · link or handle</label>
        <input id="qt-link" className="ui-input" value={link} onChange={e => setLink(e.target.value)} placeholder={platform.id === "x" ? "https://x.com/… or @handle" : `${platform.name} link`} />
        <p className="cf-hint">People will submit {proof}.</p>
      </div>

      <RequirementPicker type={reqType} value={reqValue} onChange={(t, v) => { setReqType(t); setReqValue(v); }} />

      {isAuthed && (
        <p className="cf-hint" style={{ margin: 0 }}>Paid from your {currency} balance: <b style={{ color: balance >= total ? "var(--green)" : "var(--red)" }}>{money(balance, currency)}</b></p>
      )}
      {error && <div className="cf-error">{error}</div>}

      <button className="ui-btn ui-btn-dark ui-btn-lg" onClick={submit} disabled={busy}>
        {!isAuthed ? "Sign in to continue" : busy ? "Publishing…" : balance < total ? "Top up and pay" : `Pay ${money(total, currency)} and publish`} {!busy && <i className="ti ti-arrow-right" />}
      </button>
      <p className="cw-terms" style={{ marginTop: -6 }}>The job goes live as soon as it's paid. Unused budget returns to your wallet when it closes.</p>

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
    </div>
  );
}
