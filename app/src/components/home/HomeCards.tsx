import { Link } from "react-router-dom";
import { jobRequirements } from "../../lib/requirements";
import { CATEGORY_LABELS as CATEGORY } from "../../lib/categories";
import { BoostedTag, PremiumMark } from "../Perks";
import Money from "../Money";
import ItemCover, { itemCategoryLabel } from "../ItemCover";
import { spokenMoney } from "../../lib/money";
import { jobDeadline, deadlineLabel } from "../../lib/deadline";

/* Homepage cards for highlighted jobs and creator-store products. Kept separate
   from TaskCard so the rest of the app keeps its existing card design. */

type Convert = (amount: number, from: any, to: any) => number;

const money = (n: number) => Math.round(n).toLocaleString("en-US");

const plain = (s?: string) => (s || "").replace(/[#*_`>]+/g, "").replace(/\s+/g, " ").trim();

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
  const deadline = jobDeadline(task);
  const max = Number(task.maxWorkers ?? task.slots ?? 0);
  const done = Number(task.submissionsCount ?? task._count?.submissions ?? task.currentWorkers ?? 0);
  const open = Math.max(0, max - done);
  const pct = max > 0 ? Math.min(100, (done / max) * 100) : 0;
  const category = CATEGORY[task.category] || "General";
  const tag = Array.isArray(task.tags) && task.tags[0] && task.tags[0] !== category ? ` / ${task.tags[0]}` : "";

  const reqs = jobRequirements(task);

  return (
    <Link to={`/tasks/${task.id}`} className="hc-card" aria-label={`${task.title} by ${name}, ${spokenMoney(amount, cur)} per worker. View job`}>
      <div className="hc-top">
        <span className="hc-type"><i className="ti ti-briefcase" />{task.category === "SOCIAL_MEDIA" ? "Social task" : "Custom job"}</span>
        {task.isBoosted ? <BoostedTag /> : task.featured && <span className="hc-pill"><i className="ti ti-star-filled" style={{ color: "#bd8517" }} />Highlighted</span>}
      </div>

      <div className="hc-by">
        <Avatar src={poster.avatarUrl} name={name} />
        <span className="hc-by-txt"><span>Listed by</span><b>{name}{poster.premium && <PremiumMark />}</b></span>
      </div>

      <div className="hc-reward">
        <span className="hc-lbl">Reward per worker</span>
        <Money amount={amount} currency={cur} convert={convert} size={30} positive />
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
        <time className={deadline.state === "ended" ? "hc-ended" : undefined}><i className="ti ti-clock" />{deadlineLabel(deadline)}</time>
        {applied
          ? <span className="hc-go hc-done"><i className="ti ti-circle-check" />Submitted</span>
          : <span className="hc-go">View job<span className="hc-arrow"><i className="ti ti-arrow-up-right" /></span></span>}
      </div>
    </Link>
  );
}

export function HomeCommunityCard({ community: c }: { community: any }) {
  const members = Number(c.memberCount ?? c.members ?? 0);
  const jobs = Number(c.taskCount ?? c.tasks ?? 0);
  const rewards = Number(c.rewards ?? 0);
  const initials = c.initials || String(c.name || "OP").split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Link to={`/communities/${c.id}`} className="hc-card hc-product hc-community" aria-label={`${c.name}, ${members} members. View community`}>
      <div className="hc-media">
        {c.coverImage ? <img src={c.coverImage} alt="" loading="lazy" /> : <span className="hc-media-ph">{initials}</span>}
        {(c.badge || c.category) && <span className="hc-badge">{c.badge || c.category}</span>}
      </div>
      <div className="hc-pbody">
        <h3>{c.name}</h3>
        <div className="hc-cmeta">
          <span><i className="ti ti-users" />{members.toLocaleString()} {members === 1 ? "member" : "members"}</span>
          <span><i className="ti ti-briefcase" />{jobs.toLocaleString()} {jobs === 1 ? "job" : "jobs"}</span>
        </div>
        <p className="hc-pdesc">{plain(c.description || c.desc)}</p>
        <div className="hc-story-foot">
          <span>{rewards > 0 ? <><b className="hc-cpaid">₦{money(rewards)}</b> paid out</> : c.isPublic === false ? "Private" : "Open to join"}</span>
          <span className="hc-go">View community<span className="hc-arrow"><i className="ti ti-arrow-up-right" /></span></span>
        </div>
      </div>
    </Link>
  );
}

export function HomeProductCard({ item, convert }: { item: any; convert: Convert }) {
  const price = Number(item.price ?? 0);
  const cur = item.currency || "NGN";
  const seller = item.seller || "OgaPay";
  return (
    <Link to={`/store/${item.id}`} className="hc-card hc-product" aria-label={`${item.title} by ${seller}, ${spokenMoney(price, cur)}. View details`}>
      <div className="hc-media">
        <ItemCover src={item.image} category={item.category} title={item.title} />
        <span className="hc-active"><span />Active</span>
      </div>
      <div className="hc-pbody">
        <span className="hc-type">{itemCategoryLabel(item.category, item.title)}</span>
        <h3>{item.title}</h3>
        <p className="hc-pdesc">{plain(item.description)}</p>
        <div className="hc-by">
          <Avatar src={item.sellerAvatar} name={seller} size={28} />
          <span className="hc-by-txt">
            <b>{seller}</b>
            <span>{item.reviewsCount > 0 ? <><b className="hc-rating">{Number(item.rating).toFixed(1)}</b> <i className="ti ti-star-filled hc-star" /> · {item.reviewsCount} reviews</> : item.official ? "From OgaPay" : "New seller"}</span>
          </span>
        </div>
        <div className="hc-reward hc-price">
          <div className="hc-row"><span className="hc-lbl">Price</span><span className="hc-go">View details <i className="ti ti-arrow-up-right" /></span></div>
          <Money amount={price} currency={cur} convert={convert} size={26} />
        </div>
      </div>
    </Link>
  );
}
