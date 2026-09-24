import { Link } from "react-router-dom";

/* Homepage cards for highlighted jobs and creator-store products. Kept separate
   from TaskCard so the rest of the app keeps its existing card design. */

type Convert = (amount: number, from: any, to: any) => number;

const money = (n: number) => Math.round(n).toLocaleString("en-US");
const usd = (n: number) => `$${n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString("en-US")}`;

const CATEGORY: Record<string, string> = {
  SOCIAL_MEDIA: "Social media", DATA_ENTRY: "Data entry", CONTENT_WRITING: "Content writing",
  APP_TESTING: "App testing", SURVEY: "Survey", DESIGN: "Design", TRANSLATION: "Translation",
  WEB_RESEARCH: "Web research", VIDEO_REVIEW: "Video review", OTHER: "General",
};

const plain = (s?: string) => (s || "").replace(/[#*_`>]+/g, "").replace(/\s+/g, " ").trim();

function timeLeft(end?: string | null) {
  if (!end) return "No deadline";
  const ms = new Date(end).getTime() - Date.now();
  if (Number.isNaN(ms)) return "No deadline";
  if (ms <= 0) return "Ended";
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m % 60}m left`;
  return `${m}m left`;
}

function Avatar({ src, name, size = 32 }: { src?: string | null; name: string; size?: number }) {
  return (
    <span className="hc-av" style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" loading="lazy" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

export function HomeJobCard({ task, convert, applied }: { task: any; convert: Convert; applied?: boolean }) {
  const poster = task.poster || task.creator || {};
  const name = poster.username || poster.firstName || task.creatorName || "OgaPay";
  const amount = Number(task.reward ?? task.amount ?? 0);
  const cur = task.currency || "NGN";
  const alt = cur === "NGN" ? `≈ ${usd(convert(amount, "NGN", "USDC"))} USD` : `≈ ₦${money(convert(amount, cur, "NGN"))}`;
  const max = Number(task.maxWorkers ?? task.slots ?? 0);
  const done = Number(task.submissionsCount ?? task._count?.submissions ?? task.currentWorkers ?? 0);
  const open = Math.max(0, max - done);
  const pct = max > 0 ? Math.min(100, (done / max) * 100) : 0;
  const category = CATEGORY[task.category] || "General";
  const tag = Array.isArray(task.tags) && task.tags[0] && task.tags[0] !== category ? ` / ${task.tags[0]}` : "";

  const reqs: { icon: string; text: string }[] = [];
  if (Number(task.minRank) > 0) reqs.push({ icon: "award", text: `Rank ${task.minRank}+` });
  const score = Number(task.minOgaScore ?? task.minSorsaScore ?? 0);
  if (score > 0) reqs.push({ icon: "shield-check", text: `OgaScore ≥ ${score}` });
  if (task.requiresWallet) reqs.push({ icon: "wallet", text: "Wallet connected" });
  if (task.requiresLinkedin) reqs.push({ icon: "brand-linkedin", text: "LinkedIn linked" });
  if (typeof task.workerRequirement === "string" && task.workerRequirement) reqs.push({ icon: "user-check", text: task.workerRequirement });

  return (
    <Link to={`/tasks/${task.id}`} className="hc-card" aria-label={`${task.title} by ${name}, ${cur === "NGN" ? "₦" : ""}${money(amount)} ${cur}. View job`}>
      <div className="hc-top">
        <span className="hc-type"><i className="ti ti-briefcase" />{task.category === "SOCIAL_MEDIA" ? "Social task" : "Custom job"}</span>
        {task.featured && <span className="hc-pill"><i className="ti ti-star-filled" style={{ color: "#bd8517" }} />Highlighted</span>}
      </div>

      <div className="hc-by">
        <Avatar src={poster.avatarUrl} name={name} />
        <span className="hc-by-txt"><span>Listed by</span><b>{name}</b></span>
      </div>

      <div className="hc-reward">
        <span className="hc-lbl">Reward per worker</span>
        <div className="hc-amt"><strong>{cur === "NGN" ? "₦" : ""}{money(amount)}</strong><span>{cur}</span></div>
        <span className="hc-alt">{alt}</span>
      </div>

      <div className="hc-reqs">
        {reqs.length === 0 ? <span>No extra requirements</span> : reqs.slice(0, 2).map((r) => (
          <span key={r.text}><i className={`ti ti-${r.icon}`} />{r.text}</span>
        ))}
      </div>

      <div className="hc-brief">
        <span className="hc-type"><i className="ti ti-file-text" />The brief</span>
        <span className="hc-cat">{category}{tag}</span>
        <p><b>{task.title}</b> {plain(task.description) !== plain(task.title) ? plain(task.description) : ""}</p>
      </div>

      <div className="hc-subs">
        <div className="hc-row"><span>Submissions</span><strong>{done} / {max || "∞"}</strong></div>
        <div className="hc-bar"><span style={{ width: `${pct}%` }} /></div>
        <ul className="hc-dots">
          <li>{done} submitted</li>
          <li>{max ? (open > 0 ? `${open} open` : "Target reached") : "Unlimited entries"}</li>
          {task.featured && <li>Featured</li>}
        </ul>
      </div>

      <div className="hc-foot">
        <time><i className="ti ti-clock" />{timeLeft(task.expiresAt || task.deadline)}</time>
        {applied
          ? <span className="hc-go hc-done"><i className="ti ti-circle-check" />Submitted</span>
          : <span className="hc-go">View job<span className="hc-arrow"><i className="ti ti-arrow-up-right" /></span></span>}
      </div>
    </Link>
  );
}

export function HomeProductCard({ item, convert }: { item: any; convert: Convert }) {
  const price = Number(item.price ?? 0);
  const cur = item.currency || "NGN";
  const alt = cur === "NGN" ? `≈ ${usd(convert(price, "NGN", "USDC"))} USD` : `≈ ₦${money(convert(price, cur, "NGN"))}`;
  const seller = item.seller || "OgaPay";
  const initials = (item.category || item.title || "OP").split(/\s+/).map((w: string) => w[0]).join("").slice(0, 3).toUpperCase();
  return (
    <Link to={`/store/${item.id}`} className="hc-card hc-product">
      <div className="hc-media">
        {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="hc-media-ph">{initials}</span>}
        <span className="hc-active"><span />Active</span>
      </div>
      <div className="hc-pbody">
        <span className="hc-type">{item.category || "Service"}</span>
        <h3>{item.title}</h3>
        <p className="hc-pdesc">{plain(item.description)}</p>
        <div className="hc-by">
          <Avatar src={item.sellerAvatar} name={seller} size={28} />
          <span className="hc-by-txt">
            <b style={{ fontSize: 12 }}>{seller}</b>
            <span>{item.reviewsCount > 0 ? <><b style={{ fontSize: 10, color: "var(--hv-ink)" }}>{Number(item.rating).toFixed(1)}</b> <i className="ti ti-star-filled" style={{ color: "#bd8517", fontSize: 9 }} /> · {item.reviewsCount} reviews</> : "New seller"}</span>
          </span>
        </div>
        <div className="hc-reward hc-price">
          <div className="hc-row"><span className="hc-lbl">Price</span><span className="hc-go" style={{ fontSize: 10 }}>View details <i className="ti ti-arrow-up-right" /></span></div>
          <div className="hc-amt"><strong>{cur === "NGN" ? "₦" : ""}{money(price)}</strong><span>{cur}</span></div>
          <span className="hc-alt">{alt} <span style={{ fontFamily: "inherit" }}>estimated</span></span>
        </div>
      </div>
    </Link>
  );
}
