import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../lib/api";
import { useApi } from "../lib/useApi";
import Navbar from "../components/Navbar";
import Drawer from "../components/Drawer";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import HelixStory, { type HelixPanel } from "../components/home/HelixStory";
import Carousel from "../components/home/Carousel";
import { HomeJobCard, HomeProductCard, HomeCommunityCard } from "../components/home/HomeCards";
import ConnectArt from "../components/home/ConnectArt";
import NetworkFlow from "../components/home/NetworkFlow";
import { useCurrency } from "../context/CurrencyContext";

import "../styles/homepage.css";
import "../styles/home-v2.css";
import "../styles/home-cards.css";
import { sized } from '../lib/img'
import { jobDeadline } from '../lib/deadline'
import { displayPref, formatUsd } from '../lib/money'

/* ─── helpers ──────────────────────────────────────────────────────────────── */

// Public milestones only show once they are big enough to be worth showing.

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

/* ─── hero ─────────────────────────────────────────────────────────────────── */

// A glass card like wurk.fun's: a soft gradient over a blurred backdrop, a tinted
// glow and a curved light arc (optics), a hairline rim, a light sweep when it
// appears, and a reflection that follows the pointer
function StatCard({ icon, label, value, sub, format, positive, tint, delay }: { icon: string; label: string; value: number | null; sub: string; format: (n: number) => string; positive?: boolean; tint: string; delay: number }) {
  const v = useCountUp(value);
  const ref = useRef<HTMLDivElement>(null);
  const glass = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--glass-x", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty("--glass-y", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };
  return (
    <div ref={ref} className="hv-stat" style={{ ["--glass-tint" as any]: tint, ["--stat-delay" as any]: `${delay}s` }}
      onPointerMove={glass} onPointerEnter={() => ref.current?.setAttribute("data-glass", "on")} onPointerLeave={() => ref.current?.removeAttribute("data-glass")}>
      <span className="hv-stat-optics" aria-hidden="true"><span className="hv-stat-sweep" /></span>
      <span className="hv-stat-reflection" aria-hidden="true" />
      <div className="hv-stat-head"><span className="hv-stat-icon"><i className={`ti ti-${icon}`} /></span>{label}</div>
      <div className={`hv-stat-val${positive ? " pos" : ""}`}>{value == null ? <span className="hv-sk" /> : format(v)}</div>
      <div className="hv-stat-sub">{sub}</div>
    </div>
  );
}

function Hero({ live, onCreate }: { live: any; onCreate: () => void }) {
  const { preferredCurrency, convert } = useCurrency();
  const inUsd = displayPref(preferredCurrency) === "USDC";
  const fundedFmt = (v: number) => (inUsd ? formatUsd(convert(v, "NGN", "USDC")) : naira(v));
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
              <span className="hv-mono">Paid tasks. Freelance services. One marketplace.</span>
            </div>
            <h1 className="hv-h1">Earn your way.<span className="hv-h1-sub">Hire the help you need.</span></h1>
            <p className="hv-lead">
              Earn on your schedule doing simple tasks or offering your skills. Need help? Post a job or promote your business.
              We hold payment until approval.
            </p>
            <div className="hv-btns">
              <Link to="/tasks" className="hv-btn hv-btn-dark">Start earning <i className="ti ti-arrow-right" /></Link>
              <button className="hv-btn hv-btn-ghost" onClick={onCreate}>Create a job <i className="ti ti-arrow-right" /></button>
            </div>
            <div className="hv-note">Pay and get paid in Naira or USDC. Withdraw to your bank or wallet.</div>
          </div>

          <div>
            {/* the labels and caption are drawn inside the animation */}
            <NetworkFlow />
            <div className="hv-mono hv-eyebrow" style={{ marginTop: 26 }}><span className="hv-dot" /> Platform activity</div>
            <div className="hv-stats">
              <StatCard icon="briefcase" label="Active jobs" value={n("activeJobs")} sub="Open to apply now" format={(x) => Math.round(x).toLocaleString()} tint="132, 169, 187" delay={0.1} />
              <StatCard icon="coins" label="Rewards funded" value={rewards.value} sub={rewards.sub} format={fundedFmt} tint="143, 181, 167" delay={0.28} />
              <StatCard icon="circle-check" label="Tasks approved" value={approved.value} sub={approved.sub} format={(x) => Math.round(x).toLocaleString()} tint="160, 162, 194" delay={0.46} />
              <StatCard icon="users" label="Active workers" value={n("activeWorkers")} sub="Have earned on OgaPay" format={(x) => Math.round(x).toLocaleString()} positive tint="152, 169, 188" delay={0.64} />
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
              <span className="hv-tick-av">{p.avatarUrl ? <img src={sized(p.avatarUrl, 24, true)} alt="" loading="lazy" /> : name.charAt(0).toUpperCase()}</span>
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

type PathTab = {
  label: string; eyebrow: string; heading: string; lead: string;
  cta: { label: string; to: string };
  steps?: [string, string][];
  code?: { label: string; text: string };
};
type PathDef = { id: string; icon: string; title: string; desc: string; tags: string; tabs: PathTab[] };

// Everything here is what the product does today
const PATHS: PathDef[] = [
  {
    id: "worker", icon: "user", title: "I'm a Worker", desc: "Earn rewards. Hire help when you need it.", tags: "Earn / Create",
    tabs: [
      {
        label: "Earn", eyebrow: "Put your skills to work", heading: "Your first paid task starts here.",
        lead: "Pick a task that fits your skills, do the work and send your proof. The reward is held in escrow and lands in your wallet once it's approved.",
        cta: { label: "Browse jobs", to: "/tasks" },
        steps: [
          ["Create your account", "Free, and it takes under a minute."],
          ["Pick a task", "Social, app testing, community, research and more."],
          ["Submit proof, get paid", "Approved work is paid into your wallet. Verify your identity to withdraw to your bank."],
        ],
      },
      {
        label: "Create a job", eyebrow: "Hire real people", heading: "Post a job in a few minutes.",
        lead: "Say what needs doing, set the reward per person and the proof you want. Your budget sits in escrow and is paid out as you approve work.",
        cta: { label: "Create a job", to: "/create" },
        steps: [
          ["Fund your wallet", "Pay in with Paystack or a bank transfer."],
          ["Post your job", "Instructions, reward per person and the proof you need."],
          ["Review and approve", "Check each submission. Anything left unreviewed for 72 hours is approved automatically."],
        ],
      },
    ],
  },
  {
    id: "builder", icon: "code", title: "I'm a Builder", desc: "Post jobs and read results from your own app or agent.", tags: "REST API / API keys",
    tabs: [
      {
        label: "Quick start", eyebrow: "Developer API", heading: "Bring OgaPay data into your app.",
        lead: "A REST API for your app or AI agent. Every key reads your jobs, submissions, balance and transactions; a key with write access can also post jobs and pay for approved work.",
        cta: { label: "Get an API key", to: "/developer" },
        steps: [
          ["Create an API key", "On the Developer API page, while signed in. Up to 5 active keys."],
          ["Send it with each request", "As a Bearer token or in an X-API-Key header."],
          ["Stay under the limit", "60 requests a minute for each key."],
        ],
        code: { label: "First request", text: `curl ${API_BASE}/dev/me \\\n  -H "Authorization: Bearer oga_live_YOUR_KEY"` },
      },
      {
        label: "Endpoints", eyebrow: "Read and write", heading: "Read data, post jobs, pay for work.",
        lead: "Write endpoints need a key with write access. No key can withdraw or send money.",
        cta: { label: "Developer guide", to: "/developer" },
        code: {
          label: "Endpoints",
          text: [`# Base URL: ${API_BASE}/dev`, "", "GET  /me", "GET  /jobs", "GET  /jobs/:id", "GET  /my/jobs", "GET  /my/submissions", "GET  /my/balance", "GET  /my/transactions", "", "# With write access", "POST /jobs", "GET  /jobs/:id/submissions", "POST /submissions/:id/approve", "POST /submissions/:id/reject", "POST /jobs/:id/winners", "POST /jobs/:id/cancel"].join("\n"),
        },
      },
    ],
  },
];

function PathCode({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };
  return (
    <div className="hv-pp-code">
      <div className="hv-pp-code-bar">
        <span className="hv-mono">{label}</span>
        <button type="button" onClick={copy} aria-label={copied ? "Copied" : "Copy code"}>
          <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} aria-hidden="true" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre><code>{text}</code></pre>
    </div>
  );
}

function ChoosePath() {
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const cur = PATHS.find((p) => p.id === sel);
  const t = cur?.tabs[tab];
  const pick = (id: string) => { setSel(sel === id ? null : id); setTab(0); };

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
            const on = sel === p.id;
            return (
              // useReveal adds "in" to this wrapper directly, so its class must never
              // change with state; the selected look lives on the button inside
              <div key={p.id} className="hv-reveal">
                <button type="button" className={`hv-path${on ? " on" : ""}`} onClick={() => pick(p.id)}
                  aria-expanded={on} aria-controls="hv-path-panel">
                  <span className="hv-path-icon"><i className={`ti ti-${p.icon}`} aria-hidden="true" /></span>
                  <span className="hv-path-copy">
                    <span className="hv-path-title">{p.title}</span>
                    <span className="hv-path-desc">{p.desc}</span>
                    <span className="hv-mono hv-path-tags">{p.tags}</span>
                  </span>
                  <span className="hv-chev" aria-hidden="true"><i className="ti ti-chevron-down" /></span>
                </button>
              </div>
            );
          })}
        </div>

        {cur && t && (
          <div className="hv-pp" id="hv-path-panel" role="region" aria-label={cur.title}>
            <div className="hv-pp-bar">
              <div className="hv-pp-tabs" role="tablist">
                {cur.tabs.map((x, i) => (
                  <button key={x.label} type="button" role="tab" aria-selected={i === tab}
                    className={`hv-pp-tab${i === tab ? " on" : ""}`} onClick={() => setTab(i)}>{x.label}</button>
                ))}
              </div>
              <button type="button" className="hv-pp-x" onClick={() => setSel(null)} aria-label="Close">
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className="hv-pp-body" role="tabpanel" key={`${cur.id}-${tab}`}>
              <div className="hv-pp-intro">
                <span className="hv-mono">{t.eyebrow}</span>
                <h3 className="hv-pp-title">{t.heading}</h3>
                <p className="hv-pp-lead">{t.lead}</p>
                <Link to={t.cta.to} className="hv-btn hv-btn-dark hv-pp-cta">{t.cta.label} <i className="ti ti-arrow-right" aria-hidden="true" /></Link>
              </div>
              <div className="hv-pp-side">
                {t.steps && (
                  <ol className="hv-pp-steps">
                    {t.steps.map(([title, desc], i) => (
                      <li key={title}>
                        <span className="hv-pp-num">{String(i + 1).padStart(2, "0")}</span>
                        <span><b>{title}</b><span>{desc}</span></span>
                      </li>
                    ))}
                  </ol>
                )}
                {t.code && <PathCode {...t.code} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── numbers + possibilities ──────────────────────────────────────────────── */

function Milestone({ value, label, format }: { value: number; label: string; format: (n: number) => string }) {
  const v = useCountUp(value, 1800);
  return (
    <div className="hv-num hv-reveal">
      <div className="hv-num-val">{format(v)}<span className="hv-num-plus">+</span></div>
      <div className="hv-num-lbl">{label}</div>
    </div>
  );
}

// A number only goes public once it's big enough to be worth showing
const MILESTONE_MIN = { users: 1000, jobs: 100, paidNgn: 1_000_000 };

function Numbers({ live, all }: { live: any; all: any }) {
  const users = Number(all?.data?.totalUsers ?? all?.totalUsers ?? 0);
  const approved = Number(live?.tasksDone ?? 0);
  const funded = Number(live?.totalPaidOut ?? 0);
  const items = [
    { value: approved, label: "Jobs completed", format: (x: number) => compact(Math.round(x)), show: approved >= MILESTONE_MIN.jobs },
    { value: funded, label: "Paid to workers", format: naira, show: funded >= MILESTONE_MIN.paidNgn },
    { value: users, label: "Users registered", format: (x: number) => compact(Math.round(x)), show: users >= MILESTONE_MIN.users },
  ].filter((m) => m.show);
  if (items.length === 0) return null;
  return (
    <section className="hv-section hv-numbers-band">
      <div className="hv-inner">
        <div className="hv-numbers-head hv-reveal">
          <span className="hv-mono">OgaPay, in numbers</span>
          <span className="hv-numbers-note">All-time milestones</span>
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
        <div className="hv-poss hv-reveal">
          <div>
            <span className="hv-mono hv-ruled">The possibilities</span>
            <h2 className="hv-h2 hv-poss-title">Everything work needs,<br /><span>in one place.</span></h2>
          </div>
          <p className="hv-lead">See how OgaPay brings together human skill, verification and on-demand payment.</p>
        </div>
        <div className="hv-connected">
          <div className="hv-reveal">
            <span className="hv-mono">Connected by design</span>
            <h3 className="hv-h3 hv-connected-title">The new work<br />economy for Africa</h3>
            <p className="hv-lead" style={{ marginTop: 18 }}>
              From quick social tasks and app feedback to launch campaigns and ongoing projects, OgaPay connects people
              and teams with people who can help. Start with one task and build from there.
            </p>
            <a href="#ecosystem" className="hv-textlink" onClick={(e) => { e.preventDefault(); document.getElementById("ecosystem")?.scrollIntoView({ behavior: "smooth" }); }}>
              Explore OgaPay <i className="ti ti-arrow-down" />
            </a>
          </div>
          <div className="hv-connected-art hv-reveal"><ConnectArt /></div>
        </div>
      </div>
    </section>
  );
}

/* ─── highlighted jobs ─────────────────────────────────────────────────────── */

function SectionHead({ eyebrow, title, sub, more, to }: { eyebrow: string; title: string; sub: string; more: string; to: string }) {
  return (
    <header className="hv-shead hv-reveal">
      <div>
        <span className="hv-mono">{eyebrow}</span>
        <h2 className="hv-h2">{title}</h2>
        <p className="hv-sub">{sub}</p>
      </div>
      <Link to={to} className="hv-more">{more} <i className="ti ti-arrow-up-right" /></Link>
    </header>
  );
}

function HighlightedJobs({ jobs, loading }: { jobs: any[]; loading: boolean }) {
  const { convert } = useCurrency();
  // Featured first, then the biggest rewards, like a highlighted board should read.
  const shown = useMemo(() => [...jobs]
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || Number(b.reward ?? 0) - Number(a.reward ?? 0))
    .slice(0, 12), [jobs]);
  return (
    <section className="hv-section" id="featured-jobs">
      <div className="hv-inner">
        <div className="hv-panel">
        <SectionHead eyebrow="Find your next opportunity" title="Highlighted jobs" sub="Featured jobs" more="More jobs" to="/tasks" />
        {loading && <div className="hv-car"><div className="hv-car-view"><div className="hv-car-track" style={{ ["--hv-per" as any]: 3 }}>{[0, 1, 2].map((i) => <div key={i} className="hv-car-slide"><div className="hc-card" style={{ height: 480 }}><span className="hv-sk" /></div></div>)}</div></div></div>}
        {!loading && shown.length === 0 && <div className="hv-empty" style={{ marginTop: 28 }}>No open jobs right now. <Link to="/create" style={{ fontWeight: 600 }}>Post the first one</Link>.</div>}
        {!loading && shown.length > 0 && (
          <Carousel label="Highlighted jobs carousel" items={shown} render={(t) => <HomeJobCard task={t} convert={convert} />} />
        )}
        </div>
      </div>
    </section>
  );
}

/* ─── creator store ────────────────────────────────────────────────────────── */

function CreatorStore({ items }: { items: any[] }) {
  const { convert } = useCurrency();
  if (items.length === 0) return null;
  return (
    <section className="hv-section">
      <div className="hv-inner">
        <div className="hv-panel hv-reveal">
          <SectionHead eyebrow="Made by creators" title="Creator Store" sub="Featured products and services from OgaPay sellers" more="Browse all products" to="/store" />
          <Carousel label="Creator store carousel" items={items} render={(it) => <HomeProductCard item={it} convert={convert} />} />
        </div>
      </div>
    </section>
  );
}

/* ─── journal ──────────────────────────────────────────────────────────────── */

function Journal({ posts }: { posts: any[] }) {
  if (posts.length === 0) return null;
  const date = (d?: string) => (d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "");
  return (
    <section className="hv-section">
      <div className="hv-inner">
        <div className="hv-panel hv-reveal">
        <SectionHead eyebrow="From the journal" title="Featured blogs" sub="Learn more about OgaPay" more="View all blogs" to="/blog" />
        <Carousel label="Featured blogs carousel" items={posts} render={(p) => (
          <Link to={`/blog/${p.slug || p.id}`} className="hc-card hc-product hc-story">
            <div className="hc-media">{p.coverImage ? <img src={sized(p.coverImage, 400)} alt="" loading="lazy" /> : <span className="hc-media-ph">OP</span>}</div>
            <div className="hc-pbody">
              <span className="hc-type">{date(p.publishedAt || p.createdAt)}</span>
              <h3>{p.title}</h3>
              <p className="hc-pdesc">{p.excerpt}</p>
              <div className="hc-story-foot">
                <span>{p.author?.username ? `@${p.author.username}` : "OgaPay team"}</span>
                <span className="hc-go">Read story<span className="hc-arrow"><i className="ti ti-arrow-up-right" /></span></span>
              </div>
            </div>
          </Link>
        )} />
        </div>
      </div>
    </section>
  );
}

/* ─── communities ──────────────────────────────────────────────────────────── */

function CommunitiesRow({ items }: { items: any[] }) {
  if (items.length === 0) return null;
  return (
    <section className="hv-section">
      <div className="hv-inner">
        <div className="hv-panel hv-reveal">
          <SectionHead eyebrow="People & projects" title="Communities" sub="Groups working and earning together on OgaPay" more="Explore communities" to="/communities" />
          <Carousel label="Communities carousel" items={items} render={(c) => <HomeCommunityCard community={c} />} />
        </div>
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
  // Some older jobs have a past deadline but no expiry, so the API still lists them
  // as open; don't highlight ones that have already ended
  const jobs = useMemo(() => listOf(jobsRes).filter((j: any) => jobDeadline(j).state !== "ended"), [jobsRes]);
  const jobsLoading = !jobsRes && !jobsErr;
  // The discovery panels that pass over the ecosystem helix (only those with content)
  const storeRes = useJson<any>("/store?limit=9&sort=newest");
  const blogRes = useJson<any>("/blog?limit=9");
  const commRes = useJson<any>("/communities?limit=12");
  const panels = useMemo<HelixPanel[]>(() => {
    const storeItems: any[] = Array.isArray(storeRes?.data) ? storeRes.data : [];
    const posts: any[] = blogRes?.data?.posts || [];
    const commList: any[] = commRes?.data?.communities || (Array.isArray(commRes?.data) ? commRes.data : []);
    const comms = commList.filter((c) => c.isPublic !== false && c.isActive !== false).slice(0, 9);
    const out: HelixPanel[] = [{ key: "jobs", node: <HighlightedJobs jobs={jobs} loading={jobsLoading} /> }];
    if (storeItems.length) out.push({ key: "store", node: <CreatorStore items={storeItems} /> });
    if (posts.length) out.push({ key: "blogs", node: <Journal posts={posts} /> });
    if (comms.length) out.push({ key: "communities", node: <CommunitiesRow items={comms} /> });
    return out;
  }, [jobs, jobsLoading, storeRes, blogRes, commRes]);

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
          <HelixStory panels={panels} jobs={jobs} />
        </div>
      </main>
      <Footer />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <BottomNav />
    </>
  );
}
