import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../lib/api";
import { useApi } from "../lib/useApi";
import TaskCard from "../components/TaskCard";
import Navbar from "../components/Navbar";
import Drawer from "../components/Drawer";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import { Logo } from "../components/Logo";
import EcosystemStory from "../components/home/EcosystemStory";

import "../styles/homepage.css";
import "../styles/home-v2.css";

/* ─── helpers ──────────────────────────────────────────────────────────────── */

// Public milestones only show once they are big enough to be worth showing.
const MIN_PUBLIC_MILESTONE = 100;

const naira = (n: number) => {
  if (n >= 1e9) return `₦${(n / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1e6) return `₦${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e4) return `₦${Math.round(n / 1e3)}K`;
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
};
const compact = (n: number) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M+`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K+`;
  return n.toLocaleString("en-US");
};
const reward = (amount: number, currency?: string) =>
  currency && currency !== "NGN" ? `${currency === "SOL" ? "" : "$"}${amount.toLocaleString("en-US")}${currency === "SOL" ? " SOL" : ""}` : `₦${Math.round(amount).toLocaleString("en-NG")}`;
const ago = (d?: string) => {
  if (!d) return "";
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const listOf = (res: any): any[] => (Array.isArray(res) ? res : res?.data?.tasks || res?.data || res?.tasks || []);

function useCountUp(target: number | null, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target == null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setV(from + (target - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

// Adds .in to every .hv-reveal inside the page as it scrolls into view.
function useReveal(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    const watch = () => el.querySelectorAll(".hv-reveal:not(.in)").forEach((n) => io.observe(n));
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(el, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [root]);
}

function useJson<T = any>(path: string, pollMs = 0) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`${API_BASE}${path}`).then((r) => r.json()).then((d) => { if (alive) setData(d); }).catch(() => {});
    load();
    const id = pollMs ? window.setInterval(load, pollMs) : 0;
    return () => { alive = false; if (id) window.clearInterval(id); };
  }, [path, pollMs]);
  return data;
}

/* ─── hero network graphic ─────────────────────────────────────────────────── */

function NetworkGraphic() {
  const paths = useMemo(() => {
    const W = 600, H = 188, cx = W / 2, cy = H / 2, n = 26, out: { d: string; flow: boolean; delay: number }[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1) - 0.5;
        const x0 = side < 0 ? 0 : W;
        const y0 = cy + k * (H - 16) + Math.sin(i * 1.7) * 4;
        const xe = cx + side * 42;
        const ye = cy + k * 10;
        const c1x = side < 0 ? 150 : W - 150, c2x = side < 0 ? 215 : W - 215;
        out.push({
          d: `M${x0},${y0.toFixed(1)} C${c1x},${(y0 * 0.85 + cy * 0.15).toFixed(1)} ${c2x},${(cy + k * 40).toFixed(1)} ${xe},${ye.toFixed(1)}`,
          flow: i % 4 === side + 1,
          delay: (i * 0.37) % 5,
        });
      }
    }
    return out;
  }, []);
  return (
    <div className="hv-network" aria-hidden="true">
      <span className="hv-network-stem" style={{ top: 0 }} />
      <svg viewBox="0 0 600 188" preserveAspectRatio="none">
        {paths.map((p, i) => (
          <path key={i} d={p.d} className={p.flow ? "hv-flow" : undefined} style={p.flow ? { animationDelay: `-${p.delay}s` } : undefined} />
        ))}
      </svg>
      <div className="hv-network-hub"><Logo size={34} /></div>
      <span className="hv-network-stem" style={{ bottom: 0 }} />
    </div>
  );
}

/* ─── hero ─────────────────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, sub, format, positive }: { icon: string; label: string; value: number | null; sub: string; format: (n: number) => string; positive?: boolean }) {
  const v = useCountUp(value);
  return (
    <div className="hv-stat">
      <div className="hv-stat-head"><span className="hv-stat-icon"><i className={`ti ti-${icon}`} /></span>{label}</div>
      <div className={`hv-stat-val${positive ? " pos" : ""}`}>{value == null ? <span className="hv-sk" /> : format(v)}</div>
      <div className="hv-stat-sub">{sub}</div>
    </div>
  );
}

function Hero({ live, onCreate }: { live: any; onCreate: () => void }) {
  const n = (k: string) => (live && typeof live[k] === "number" ? live[k] : live ? 0 : null);
  // On a quiet day the 24h figures are zero; show the all-time figure instead and say so.
  const recentOrTotal = (recent: string, total: string) => {
    const r = n(recent);
    return r === null || r > 0 ? { value: r, sub: "Over the last 24 hours" } : { value: n(total), sub: "All time" };
  };
  const rewards = recentOrTotal("last24hPaid", "totalPaidOut");
  const approved = recentOrTotal("last24hTasks", "tasksDone");
  const scrollOn = () => document.getElementById("hv-ticker")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <section className="hv-hero">
      <div className="hv-inner">
        <div className="hv-hero-grid">
          <div className="hv-hero-copy">
            <div className="hv-tag">
              <span className="hv-tag-icon"><i className="ti ti-arrow-up-right" /></span>
              <span className="hv-mono">The task network for Africa, on Solana.</span>
            </div>
            <h1 className="hv-h1">Work, earn, grow.</h1>
            <p className="hv-h1-sub">Paid in Naira or USDC.</p>
            <p className="hv-lead">
              Post a paid task, hire someone for a project, or earn with the skills you already have.
              OgaPay connects people who need work done with people ready to do it, and AI agents can hire them too.
            </p>
            <div className="hv-btns">
              <button className="hv-btn hv-btn-dark" onClick={onCreate}>Create a job <i className="ti ti-plus" /></button>
              <Link to="/tasks" className="hv-btn hv-btn-ghost">Start earning <i className="ti ti-arrow-right" /></Link>
            </div>
            <div className="hv-note">Fund jobs with Naira or crypto. Withdraw to your bank or wallet.</div>
          </div>

          <div>
            <div className="hv-labels">
              <span className="hv-mono hv-eyebrow"><span className="hv-dot" /> People + agents</span>
              <span className="hv-mono">Escrow protected</span>
            </div>
            <NetworkGraphic />
            <div className="hv-caption">Real people. Real work. One network.</div>
            <div className="hv-mono hv-eyebrow" style={{ marginTop: 26 }}><span className="hv-dot" /> Platform activity</div>
            <div className="hv-stats">
              <StatCard icon="briefcase" label="Active jobs" value={n("activeJobs")} sub="Open to apply now" format={(x) => Math.round(x).toLocaleString()} />
              <StatCard icon="coins" label="Rewards funded" value={rewards.value} sub={rewards.sub} format={naira} />
              <StatCard icon="circle-check" label="Tasks approved" value={approved.value} sub={approved.sub} format={(x) => Math.round(x).toLocaleString()} />
              <StatCard icon="users" label="Active workers" value={n("activeWorkers")} sub="Have earned on OgaPay" format={(x) => Math.round(x).toLocaleString()} positive />
            </div>
          </div>
        </div>

        <div className="hv-hero-foot">
          <span className="hv-powered"><i className="ti ti-shield-check" /> Powered by Solana</span>
          <button className="hv-scrollhint" onClick={scrollOn}>Your next task starts here <i className="ti ti-arrow-down" /></button>
          <span className="hv-mono">NGN + USDC <span style={{ margin: "0 8px" }}>/</span> Escrow on every job</span>
        </div>
      </div>
    </section>
  );
}

/* ─── live ticker ──────────────────────────────────────────────────────────── */

function Ticker({ jobs }: { jobs: any[] }) {
  if (jobs.length === 0) return <div id="hv-ticker" />;
  const items = jobs.slice(0, 14);
  const row = [...items, ...items];
  return (
    <div id="hv-ticker" className="hv-ticker" aria-label="Latest jobs">
      <div className="hv-ticker-track">
        {row.map((t, i) => {
          const p = t.poster || t.creator || {};
          const name = p.username || p.firstName || t.creatorName || "OgaPay";
          return (
            <Link key={`${t.id}-${i}`} to={`/tasks/${t.id}`} className="hv-tick" aria-hidden={i >= items.length}>
              <span className="hv-tick-av">{p.avatarUrl ? <img src={p.avatarUrl} alt="" loading="lazy" /> : name.charAt(0).toUpperCase()}</span>
              <b>{name}</b>
              <span className="amt">+{reward(Number(t.reward ?? t.amount ?? 0), t.currency)}</span>
              <span style={{ color: "var(--text2)" }}>{t.title}</span>
              <span className="ago">{ago(t.createdAt)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─── choose your path ─────────────────────────────────────────────────────── */

const PATHS = [
  {
    id: "worker", icon: "user", title: "I'm a Worker", desc: "Earn rewards. Hire help when you need it.", tags: "Earn / Create",
    steps: [["Create your account", "free, in under a minute"], ["Pick a paid task", "social, testing, research, design and more"], ["Submit your proof", "get paid from escrow once it's approved"]],
    primary: { label: "Start earning", to: "/tasks" }, secondary: { label: "Create a job", to: "/create" },
  },
  {
    id: "builder", icon: "robot", title: "I'm a Builder", desc: "Plug your app or AI agent into real people.", tags: "API / Webhooks / Agents",
    steps: [["Turn on Developer Mode", "in Settings, then create an API key"], ["Post tasks from code", "set rewards, requirements and proof"], ["Collect results", "approve work and pay automatically"]],
    primary: { label: "Build with OgaPay", to: "/developer" }, secondary: { label: "Read the docs", to: "/docs" },
  },
];

function ChoosePath() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="hv-section">
      <div className="hv-inner">
        <div className="hv-center hv-reveal">
          <span className="hv-mono">Choose your path</span>
          <h2 className="hv-h2">Start with OgaPay</h2>
          <p className="hv-lead" style={{ marginTop: 16 }}>Whether you're here to earn or to build, pick your path below.</p>
        </div>
        <div className="hv-paths">
          {PATHS.map((p) => {
            const isOpen = open === p.id;
            return (
              <div key={p.id} className={`hv-path hv-reveal${isOpen ? " open" : ""}`}>
                <button className="hv-path-head" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}>
                  <span className="hv-path-icon"><i className={`ti ti-${p.icon}`} /></span>
                  <span>
                    <span className="hv-path-title" style={{ display: "block" }}>{p.title}</span>
                    <span className="hv-path-desc" style={{ display: "block" }}>{p.desc}</span>
                    <span className="hv-mono hv-path-tags" style={{ display: "block" }}>{p.tags}</span>
                  </span>
                  <span className="hv-chev"><i className="ti ti-chevron-down" /></span>
                </button>
                <div className="hv-path-body">
                  <div>
                    <ol className="hv-steps">
                      {p.steps.map(([a, b]) => <li key={a}><b>{a}</b>, {b}</li>)}
                    </ol>
                    <div className="hv-path-cta">
                      <Link to={p.primary.to} className="hv-btn hv-btn-dark">{p.primary.label} <i className="ti ti-arrow-right" /></Link>
                      <Link to={p.secondary.to} className="hv-btn hv-btn-ghost">{p.secondary.label}</Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── numbers + possibilities ──────────────────────────────────────────────── */

function Milestone({ value, label, format }: { value: number; label: string; format: (n: number) => string }) {
  const v = useCountUp(value, 1800);
  return (
    <div className="hv-num hv-reveal">
      <div className="hv-num-val">{format(v)}</div>
      <div className="hv-num-lbl">{label}</div>
    </div>
  );
}

function Numbers({ live, all }: { live: any; all: any }) {
  const users = Number(all?.data?.totalUsers ?? all?.totalUsers ?? 0);
  const approved = Number(live?.tasksDone ?? 0);
  const funded = Number(live?.totalPaidOut ?? 0);
  const items = [
    { value: approved, label: "Tasks approved", format: (x: number) => compact(Math.round(x)), show: approved >= MIN_PUBLIC_MILESTONE },
    { value: funded, label: "Funded in rewards", format: naira, show: funded >= MIN_PUBLIC_MILESTONE * 1000 },
    { value: users, label: "Users registered", format: (x: number) => compact(Math.round(x)), show: users >= MIN_PUBLIC_MILESTONE },
  ].filter((m) => m.show);
  // One lonely number reads worse than none; wait until at least two qualify.
  if (items.length < 2) return null;
  return (
    <section className="hv-section">
      <div className="hv-inner">
        <div className="hv-reveal">
          <span className="hv-mono">OgaPay, in numbers</span>
          <h2 className="hv-h2">All-time milestones</h2>
        </div>
        <div className="hv-numbers" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
          {items.map((m) => <Milestone key={m.label} value={m.value} label={m.label} format={m.format} />)}
        </div>
      </div>
    </section>
  );
}

function Possibilities() {
  return (
    <section className="hv-section">
      <div className="hv-inner">
        <div className="hv-center hv-reveal">
          <span className="hv-mono">What you can do</span>
          <h2 className="hv-h2">Everything work needs,<br />in one place.</h2>
          <p className="hv-lead" style={{ marginTop: 18 }}>See how OgaPay brings together human skill, verification and on-demand payment.</p>
        </div>
        <div className="hv-connected">
          <div className="hv-reveal">
            <span className="hv-mono">Built to connect</span>
            <h3 className="hv-h3" style={{ fontSize: "clamp(28px,3.2vw,40px)" }}>The new work economy for Africa</h3>
          </div>
          <div className="hv-reveal">
            <p className="hv-lead">
              From quick social tasks and app feedback to launch campaigns and ongoing projects, OgaPay connects people,
              teams and AI agents with people who can help. Start with one task and build from there.
            </p>
            <Link to="/tasks" className="hv-btn hv-btn-ghost" style={{ marginTop: 22 }}>Explore OgaPay <i className="ti ti-arrow-right" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── highlighted jobs ─────────────────────────────────────────────────────── */

function HighlightedJobs({ jobs, loading }: { jobs: any[]; loading: boolean }) {
  const [tab, setTab] = useState<"featured" | "newest">("featured");
  const shown = useMemo(() => {
    const list = [...jobs];
    if (tab === "newest") list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    else list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return list.slice(0, 6);
  }, [jobs, tab]);
  return (
    <section className="hv-section" id="featured-jobs">
      <div className="hv-inner">
        <div className="hv-headrow hv-reveal">
          <div>
            <span className="hv-mono">Find your next task</span>
            <h2 className="hv-h2">Highlighted jobs</h2>
          </div>
          <div className="hv-seg" role="tablist">
            <button className={tab === "featured" ? "on" : ""} onClick={() => setTab("featured")}>Featured jobs</button>
            <button className={tab === "newest" ? "on" : ""} onClick={() => setTab("newest")}>Newest jobs</button>
          </div>
        </div>
        <div className="hv-jobs">
          {loading && [0, 1, 2].map((i) => <div key={i} className="hv-stat" style={{ height: 280 }}><span className="hv-sk" /></div>)}
          {!loading && shown.length === 0 && <div className="hv-empty">No open jobs right now. <Link to="/create" style={{ fontWeight: 600 }}>Post the first one</Link>.</div>}
          {!loading && shown.map((t) => <div key={t.id} className="hv-reveal"><TaskCard task={t} /></div>)}
        </div>
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Link to="/tasks" className="hv-btn hv-btn-ghost">More jobs <i className="ti ti-arrow-right" /></Link>
        </div>
      </div>
    </section>
  );
}

/* ─── journal ──────────────────────────────────────────────────────────────── */

function Journal() {
  const res = useJson<any>("/blog?limit=9");
  const posts: any[] = res?.data?.posts || [];
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const perPage = typeof window !== "undefined" && window.innerWidth <= 768 ? 1 : window.innerWidth <= 1024 ? 2 : 3;
  const pages = Math.max(1, Math.ceil(posts.length / perPage));
  const go = (p: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(pages - 1, p));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setPage(next);
  };
  if (posts.length === 0) return null;
  const date = (d?: string) => (d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "");
  return (
    <section className="hv-section">
      <div className="hv-inner">
        <div className="hv-headrow hv-reveal">
          <div>
            <span className="hv-mono">From the journal</span>
            <h2 className="hv-h2">Featured stories</h2>
            <p className="hv-lead" style={{ marginTop: 12 }}>Guides, product news and earning tips from the OgaPay team.</p>
          </div>
          <Link to="/blog" className="hv-btn hv-btn-ghost">View all stories <i className="ti ti-arrow-right" /></Link>
        </div>
        <div className="hv-journal" ref={track} onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {posts.map((p) => (
            <Link key={p.id} to={`/blog/${p.slug || p.id}`} className="hv-post">
              <div className="hv-post-img">{p.coverImage && <img src={p.coverImage} alt="" loading="lazy" />}</div>
              <div className="hv-post-body">
                <span className="hv-mono">{date(p.publishedAt || p.createdAt)}</span>
                <div className="hv-post-title">{p.title}</div>
                <p className="hv-post-ex">{p.excerpt}</p>
                <div className="hv-post-foot">
                  <span>{p.author?.username ? `@${p.author.username}` : ""}</span>
                  <span>Read story <i className="ti ti-arrow-right" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {pages > 1 && (
          <div className="hv-pager">
            <button onClick={() => go(page - 1)} disabled={page === 0} aria-label="Previous stories"><i className="ti ti-arrow-left" /></button>
            <span className="hv-mono">{String(page + 1).padStart(2, "0")} / {String(pages).padStart(2, "0")}</span>
            <button onClick={() => go(page + 1)} disabled={page >= pages - 1} aria-label="Next stories"><i className="ti ti-arrow-right" /></button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── page ─────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);

  const live = useJson<any>("/stats/live", 60000);
  const all = useJson<any>("/stats");
  const { data: jobsRes, error: jobsErr } = useApi("/tasks?status=OPEN", { auth: false });
  const jobs = useMemo(() => listOf(jobsRes), [jobsRes]);
  const jobsLoading = !jobsRes && !jobsErr;

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const onCreate = () => navigate(isAuthed ? "/create" : "/login?mode=signup");

  return (
    <>
      <Navbar onMenuToggle={() => setDrawerOpen(true)} />
      <main ref={rootRef} className="hv" style={{ paddingTop: "var(--nav-h)", overflowX: "clip" }}>
        <div className="hv-frame">
          <Hero live={live} onCreate={onCreate} />
          <Ticker jobs={jobs} />
          <ChoosePath />
          <Numbers live={live} all={all} />
          <Possibilities />
        </div>
        <EcosystemStory />
        <div className="hv-frame">
          <HighlightedJobs jobs={jobs} loading={jobsLoading} />
          <Journal />
          <section className="hv-section hv-final">
            <div className="hv-inner hv-reveal">
              <span className="hv-mono">Get started</span>
              <h2 className="hv-h2">Your next task starts here.</h2>
              <div className="hv-btns">
                <Link to="/tasks" className="hv-btn hv-btn-dark">Start earning <i className="ti ti-arrow-right" /></Link>
                <button className="hv-btn hv-btn-ghost" onClick={onCreate}>Create a job <i className="ti ti-plus" /></button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <BottomNav />
    </>
  );
}
