import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { useMoney } from "../../lib/useMoney";
import { sized } from "../../lib/img";

/* The latest payouts drifting sideways under the hero network, like wurk.fun's
   earnings strip: two copies of the list side by side so the loop never shows a
   gap, moved a little every frame and wrapped when the first copy has passed.
   It can be swiped, stops while you hover, touch or tab into it, and doesn't move
   for people who prefer reduced motion. Hidden until there are a few payouts. */

type Payout = { username: string; avatarUrl: string | null; amount: number; currency: string; at: string };

const ago = (d: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

export default function PayoutStrip() {
  const show = useMoney();
  const [items, setItems] = useState<Payout[] | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLUListElement>(null);
  const held = useRef(false);

  useEffect(() => {
    apiRequest<Payout[]>("/stats/payouts", { auth: false })
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el || !items || items.length < 3) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = 0, last = 0, raf = 0, visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);
    const step = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 0;
      last = t;
      const w = first.current?.offsetWidth || 0;
      if (visible && !held.current && !document.hidden && w > 0) {
        x -= dt * 0.03; // 30px a second
        if (-x >= w) x += w;
        el.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [items]);

  if (!items || items.length < 3) return null;
  // Fill a wide screen even when there are only a few payouts
  const list = items.length >= 10 ? items : Array.from({ length: Math.ceil(10 / items.length) }, () => items).flat();
  const row = (aria: boolean) => (
    <ul className="hv-earn-list" ref={aria ? first : undefined} aria-hidden={aria ? undefined : true}>
      {list.map((p, i) => (
        <li key={i} className="hv-earn-item">
          <Link className="hv-earn-who" to={`/user/${encodeURIComponent(p.username)}`} tabIndex={aria ? 0 : -1}>
            <span className="hv-earn-av" aria-hidden="true">
              {p.avatarUrl ? <img src={sized(p.avatarUrl, 24, true)} alt="" width={24} height={24} loading="lazy" /> : p.username.charAt(0).toUpperCase()}
            </span>
            <span className="hv-earn-name">{p.username}</span>
          </Link>
          <span className="hv-earn-amt">+{show(p.amount, p.currency)}</span>
          <time className="hv-earn-time" dateTime={p.at}>{ago(p.at)}</time>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="hv-earn" aria-label="Recent payouts to workers">
      <div className="hv-earn-vp"
        onPointerEnter={() => { held.current = true; }} onPointerLeave={() => { held.current = false; }}
        onFocus={() => { held.current = true; }} onBlur={() => { held.current = false; }}
        onTouchStart={() => { held.current = true; }} onTouchEnd={() => { setTimeout(() => { held.current = false; }, 1500); }}>
        <div className="hv-earn-track" ref={track}>
          {row(true)}
          {row(false)}
        </div>
      </div>
    </section>
  );
}
