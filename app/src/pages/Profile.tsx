import { useState } from "react";
import Layout from "../components/Layout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const I = ({ n, s = 16, c = "currentColor" }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0 }} />
);

const Logo = ({ size = 28 }) => (
  <div style={{ width: size, height: size, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <rect width="512" height="512" fill="white"/>
      <rect x="98" y="98" width="107" height="107" rx="20" fill="black"/>
      <path d="M225 98H312C323 98 332 107 332 118V205H225V98Z" fill="black"/>
      <path d="M352 98H392C440 98 470 128 470 176V205H352V98Z" fill="black"/>
      <rect x="98" y="225" width="107" height="107" fill="black"/>
      <rect x="225" y="225" width="107" height="107" fill="black"/>
      <path d="M352 225H470V254C470 302 440 332 392 332H352V225Z" fill="black"/>
      <rect x="98" y="352" width="107" height="107" rx="20" fill="black"/>
      <path d="M225 352H312C323 352 332 361 332 372V439C332 450 323 459 312 459H225V352Z" fill="black"/>
    </svg>
  </div>
);

const XIcon = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.739l7.727-8.833L1.255 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const CHART_7 = ["Thu","Fri","Sat","Sun","Mon","Tue","Wed"].map(d => ({ day: d, val: 0 }));
const CHART_30 = Array.from({ length: 30 }, (_, i) => ({ day: `D${i+1}`, val: 0 }));
const DONUT_CATS = [
  { name: "Jobs", color: "#22c55e" },
  { name: "Referrals", color: "#a855f7" },
  { name: "Tips", color: "#3b82f6" },
  { name: "Vault", color: "#f59e0b" },
];
const QUICK = [
  { icon: "activity", label: "Job Monitor", page: "jobs" },
  { icon: "safe", label: "Vault", page: "vault" },
  { icon: "file-text", label: "Blogs", page: "blogs" },
  { icon: "briefcase", label: "Available Jobs", page: "jobs" },
  { icon: "bookmark", label: "Bookmarks", page: "bookmarks" },
  { icon: "circle-plus", label: "Create Job", page: "create" },
];

function Toggle({ on, set }) {
  return (
    <button onClick={() => set(v => !v)} style={{
      width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer",
      background: on ? "#111" : "var(--border)", position: "relative", flexShrink: 0, transition: "background .2s"
    }}>
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3, width: 18, height: 18,
        borderRadius: "50%", background: "var(--card)", transition: "left .2s",
        boxShadow: "0 1px 3px rgba(0,0,0,.25)"
      }} />
    </button>
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); };
  return (
    <button onClick={copy} style={{ height: 34, padding: "0 14px", borderRadius: 99, border: "1.5px solid #e5e7eb", background: "var(--card)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: ok ? "#16a34a" : "#111" }}>
      <I n={ok ? "check" : "copy"} s={13} c={ok ? "#16a34a" : "#6b7280"} /> {ok ? "Copied!" : "Copy"}
    </button>
  );
}

function SubPage({ title, icon, onBack, children }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <I n={icon} s={22} /> <h1 style={{ fontFamily: "Outfit,sans-serif", fontSize: 22, fontWeight: 900 }}>{title}</h1>
      </div>
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: "var(--card)", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", ...style }}>{children}</div>;
}
function CardHead({ left, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 13px", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 800 }}>{left}</div>
      {right && <div>{right}</div>}
    </div>
  );
}
function CardBody({ children, style = {} }) {
  return <div style={{ padding: "16px 20px", ...style }}>{children}</div>;
}
function Row({ label, val, valClass, info, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px dashed #f3f4f6", fontSize: 13 }}>
      <span style={{ color: "var(--text2)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
        {label}{info && <I n="info-circle" s={13} c="#d1d5db" />}
      </span>
      {right || <span style={{ fontWeight: 800, color: valClass === "no" ? "#ef4444" : valClass === "yes" ? "#16a34a" : "#111" }}>{val}</span>}
    </div>
  );
}

function JobsPage({ onBack }) {
  const jobs = [
    { title: "Follow @OgaPay on X", reward: "₦150", total: 100, filled: 100, tags: "Twitter · Follow", desc: "Follow our official X account and stay followed for 7 days." },
    { title: "Repost our product launch tweet", reward: "₦200", total: 50, filled: 48, tags: "Twitter · Repost", desc: "Repost our pinned tweet. Must have 50+ followers." },
    { title: "Join OgaPay Telegram group", reward: "₦120", total: 200, filled: 140, tags: "Telegram · Join", desc: "Join our Telegram community and stay for 7 days." },
    { title: "Design a logo for OgaPay Store", reward: "₦15,000", total: 1, filled: 0, tags: "Design · Challenge", desc: "Submit a minimalist logo. Best submission wins the bounty." },
  ];
  return (
    <SubPage title="Available Jobs" icon="briefcase" onBack={onBack}>
      <div style={{ display: "grid", gap: 12 }}>
        {jobs.map((j, i) => {
          const pct = Math.round((j.filled / j.total) * 100);
          return (
            <Card key={i} style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3 }}>{j.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 700 }}>{j.tags}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>{j.desc}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 20, fontWeight: 900, color: "#16a34a" }}>{j.reward}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{j.filled}/{j.total} slots</div>
                </div>
              </div>
              <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#16a34a" : "#111", borderRadius: 99 }} />
              </div>
              <button style={{ height: 36, padding: "0 20px", borderRadius: 99, background: pct === 100 ? "var(--border)" : "#111", color: pct === 100 ? "#9ca3af" : "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: pct === 100 ? "not-allowed" : "pointer" }} disabled={pct === 100}>
                {pct === 100 ? "Full" : "Apply Now"}
              </button>
            </Card>
          );
        })}
      </div>
    </SubPage>
  );
}

function VaultPage({ onBack }) {
  return (
    <SubPage title="Vault" icon="safe" onBack={onBack}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[{ label: "Next Distribution", val: "11h 42m" }, { label: "Your Holdings", val: "50 $OGA" }, { label: "Est. Earnings", val: "₦0.00" }, { label: "Total Distributed", val: "₦0.00" }].map(s => (
          <Card key={s.label} style={{ padding: "20px" }}>
            <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 24, fontWeight: 900 }}>{s.val}</div>
          </Card>
        ))}
      </div>
      <Card>
        <CardHead left={<><I n="clock" s={16} /> Distribution History</>} />
        <div style={{ padding: "0 20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["AMOUNT","DATE","TX"].map(h => <th key={h} style={{ fontSize: 11, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".06em", padding: "12px 0", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>{h}</th>)}</tr></thead>
            <tbody><tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text3)", fontSize: 13, padding: "28px 0" }}>No distributions yet. Hold $OGA to participate.</td></tr></tbody>
          </table>
        </div>
      </Card>
    </SubPage>
  );
}

function CreatePage({ onBack }) {
  const [form, setForm] = useState({ title: "", desc: "", reward: "", slots: "", type: "social" });
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const inpStyle = { width: "100%", height: 44, padding: "0 14px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontFamily: "inherit", fontSize: 14, outline: "none", background: "var(--bg2)" };
  return (
    <SubPage title="Create Job" icon="circle-plus" onBack={onBack}>
      <Card>
        <CardHead left={<><I n="circle-plus" s={16} /> New Job</>} />
        <CardBody>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Job Type</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["social", "custom", "challenge"].map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{ height: 36, padding: "0 16px", borderRadius: 99, border: "1.5px solid", borderColor: form.type === t ? "#111" : "var(--border)", background: form.type === t ? "#111" : "#fff", color: form.type === t ? "#fff" : "#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {[
              { label: "Job Title", key: "title", ph: "e.g. Follow our X account" },
              { label: "Description", key: "desc", ph: "Explain what workers need to do...", area: true },
              { label: "Reward per Worker (₦)", key: "reward", ph: "e.g. 150", type: "number" },
              { label: "Number of Slots", key: "slots", ph: "e.g. 100", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{f.label}</div>
                {f.area
                  ? <textarea value={form[f.key]} onChange={s(f.key)} placeholder={f.ph} rows={4} style={{ ...inpStyle, height: "auto", padding: "10px 14px", resize: "vertical" }} />
                  : <input value={form[f.key]} onChange={s(f.key)} placeholder={f.ph} type={f.type || "text"} style={inpStyle} />
                }
              </div>
            ))}
            {form.reward && form.slots && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 9, padding: "12px 16px", fontSize: 13 }}>
                <strong>Total budget:</strong> ₦{(parseFloat(form.reward || 0) * parseInt(form.slots || 0)).toLocaleString()}
              </div>
            )}
            <button style={{ height: 46, borderRadius: 10, background: "#111", color: "#fff", border: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              Post Job
            </button>
          </div>
        </CardBody>
      </Card>
    </SubPage>
  );
}

function BlogsPage({ onBack }) {
  const [showForm, setShowForm] = useState(false);
  return (
    <SubPage title="Blogs" icon="file-text" onBack={onBack}>
      {showForm
        ? <Card><CardBody>
            <div style={{ display: "grid", gap: 14 }}>
              {[{ label: "Title", ph: "Your blog post title" }, { label: "Content", ph: "Write your post...", area: true }].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{f.label}</div>
                  {f.area ? <textarea placeholder={f.ph} rows={8} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontFamily: "inherit", fontSize: 14, resize: "vertical", outline: "none" }} /> : <input placeholder={f.ph} style={{ width: "100%", height: 44, padding: "0 14px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontFamily: "inherit", fontSize: 14, outline: "none" }} />}
                </div>
              ))}
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ height: 44, padding: "0 28px", borderRadius: 10, background: "#111", color: "#fff", border: "none", fontFamily: "inherit", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Publish</button>
                <button onClick={() => setShowForm(false)} style={{ height: 44, padding: "0 20px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "var(--card)", fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </CardBody></Card>
        : <Card style={{ padding: "48px 20px", textAlign: "center" }}>
            <I n="file-text" s={44} c="#d1d5db" />
            <div style={{ marginTop: 14, fontSize: 14, color: "var(--text2)" }}>No blog posts yet.</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>Share your experience with the OgaPay community.</div>
            <button onClick={() => setShowForm(true)} style={{ marginTop: 20, height: 40, padding: "0 24px", borderRadius: 99, background: "#111", color: "#fff", border: "none", fontFamily: "inherit", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Write a Post
            </button>
          </Card>
      }
    </SubPage>
  );
}

function BookmarksPage({ onBack }) {
  return (
    <SubPage title="Bookmarks" icon="bookmark" onBack={onBack}>
      <Card style={{ padding: "48px 20px", textAlign: "center" }}>
        <I n="bookmark" s={44} c="#d1d5db" />
        <div style={{ marginTop: 14, fontSize: 14, color: "var(--text2)" }}>No bookmarked jobs yet.</div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>Bookmark jobs to save them for later.</div>
      </Card>
    </SubPage>
  );
}

export default function OgaPayProfile({ user: propUser }) {
  const user = propUser || { firstName: "Tom", lastName: "Okonkwo", email: "tom@ogapay.com" };
  const name = `${user.firstName} ${user.lastName || ""}`.trim();
  const handle = `@${user.firstName.toLowerCase()}_${(user.lastName || "user").toLowerCase().slice(0, 4)}1`;
  const initials = `${user.firstName[0]}${user.lastName ? user.lastName[0] : ""}`.toUpperCase();

  const [tab, setTab] = useState("profile");
  const [page, setPage] = useState("profile");
  const [autoSwap, setAutoSwap] = useState(false);
  const [period, setPeriod] = useState("7");
  const [showBal, setShowBal] = useState(false);
  const refLink = "https://ogapay.ng/?ref=AMR6CGX";
  const chartData = period === "7" ? CHART_7 : CHART_30;

  const nav = (p) => setPage(p);

  if (page !== "profile") {
    const pages = { jobs: JobsPage, vault: VaultPage, create: CreatePage, blogs: BlogsPage, bookmarks: BookmarksPage };
    const Comp = pages[page] || JobsPage;
    return (
      <Layout>
        <Comp onBack={() => setPage("profile")} />
      </Layout>
    );
  }

  const TABS = [
    { key: "profile", icon: "user", label: "Profile" },
    { key: "earnings", icon: "currency-dollar", label: "Earnings" },
    { key: "jobs", icon: "briefcase", label: "My Jobs" },
    { key: "referrals", icon: "users", label: "Referrals" },
    { key: "alerts", icon: "bell", label: "Alerts", dot: true },
    { key: "portal", icon: "layout-dashboard", label: "Worker Portal" },
  ];

  const inpStyle = { width: "100%", height: 44, padding: "0 14px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontFamily: "inherit", fontSize: 13, outline: "none", background: "var(--bg2)" };

  return (
    <Layout>
    <div style={{ background: "var(--bg)", color: "var(--text)", fontSize: 14 }}>

      {/* ── TOPBAR ── */}
      <header style={{ height: 56, background: "var(--card)", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Outfit,sans-serif", fontSize: 18, fontWeight: 800 }}>
          <Logo size={28} /> OgaPay
        </div>
        <nav className="topbar-nav" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[
            { icon: "layout-grid", label: "All Jobs", p: "jobs" },
            { icon: "building-store", label: "Store" },
            { icon: "safe", label: "Vault", p: "vault" },
            { icon: "help-circle", label: "FAQ" },
          ].map(l => (
            <a key={l.label} className="tnav-a" onClick={() => l.p && nav(l.p)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 7, fontSize: 13, fontWeight: 600, color: "var(--text2)", cursor: "pointer", transition: "color .13s,background .13s" }}>
              <I n={l.icon} s={14} /> {l.label}
            </a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 99, padding: "5px 14px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            BALANCE: <span style={{ color: "#16a34a", fontWeight: 800 }}>₦0.00</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, border: "1.5px solid #e5e7eb", borderRadius: 99, padding: "4px 12px 4px 4px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#111", display: "grid", placeItems: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>{initials}</div>
            F48N...jemX
          </div>
          <button style={{ width: 34, height: 34, border: "1.5px solid #e5e7eb", borderRadius: 7, background: "var(--card)", display: "grid", placeItems: "center", cursor: "pointer" }}>
            <I n="moon" s={15} c="#6b7280" />
          </button>
        </div>
      </header>

      {/* ── TAB NAV ── */}
      <div style={{ background: "var(--card)", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", padding: "0 24px", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "13px 18px", fontSize: 13, fontWeight: 700, color: tab === t.key ? "#111" : "#6b7280", cursor: "pointer", border: "none", borderBottom: `2px solid ${tab === t.key ? "#111" : "transparent"}`, background: "none", transition: "color .13s,border-color .13s", whiteSpace: "nowrap" }}>
            <div style={{ position: "relative" }}>
              <I n={t.icon} s={20} />
              {t.dot && <span style={{ position: "absolute", top: -2, right: -6, width: 7, height: 7, borderRadius: "50%", background: "#ef4444", border: "1.5px solid #fff" }} />}
            </div>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ PROFILE TAB ══════════════ */}
      {tab === "profile" && (
        <div className="fade" style={{ maxWidth: 1060, margin: "0 auto", padding: "22px 20px 60px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} data-grid="two">
          {/* ── Account Info ── */}
          <Card>
            <CardHead
              left={<><I n="user-circle" s={17} /> Account Information</>}
              right={<button style={{ width: 30, height: 30, border: "1.5px solid #e5e7eb", borderRadius: 7, background: "var(--card)", display: "grid", placeItems: "center", cursor: "pointer" }}><I n="refresh" s={14} c="#6b7280" /></button>}
            />
            <CardBody>
              <Row label="Address" right={<span style={{ fontFamily: "monospace", fontSize: 12, background: "var(--bg)", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px" }}>F48NUF...jemX</span>} />
              <div onClick={() => setShowBal(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text2)", fontWeight: 600, cursor: "pointer", marginTop: 6, marginBottom: 4 }}>
                Show all balances <span style={{ color: "var(--text3)" }}>3 hidden</span> <I n={showBal ? "chevron-up" : "chevron-down"} s={13} c="#9ca3af" />
              </div>
              {showBal && (
                <div style={{ background: "var(--bg)", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 14px", marginBottom: 8 }}>
                  {[{ l: "SOL", v: "0.000 SOL" }, { l: "USDC", v: "0.00 USDC" }, { l: "NGN", v: "₦0.00" }].map(b => (
                    <div key={b.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px dashed #e5e7eb", fontSize: 13 }}>
                      <span style={{ color: "var(--text2)", fontWeight: 600 }}>{b.l}</span><span style={{ fontWeight: 700 }}>{b.v}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed #f3f4f6" }}>
                <span style={{ color: "var(--text2)", fontWeight: 600, fontSize: 13 }}>OGA Balance</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "Outfit,sans-serif", fontSize: 18, fontWeight: 900 }}>50 <span style={{ color: "#2563eb" }}>$OGA</span></span>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>₦0.01</span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "14px 0 10px" }}>
                {[
                  { label: "Withdraw", icon: "arrow-bar-up", full: false },
                  { label: "Deposit", icon: "plus", full: false },
                  { label: "Swap", icon: "arrows-exchange", full: true },
                  { label: "Pair Device", icon: "device-mobile", full: true, outline: true },
                  { label: "Link extra wallet", icon: "wallet", full: true, outline: true },
                ].map(b => (
                  <button key={b.label} className={b.outline ? "outbtn" : "actbtn"} style={{
                    height: 40, borderRadius: 99, border: b.outline ? "1.5px solid #e5e7eb" : "none",
                    background: b.outline ? "#fff" : "#111", color: b.outline ? "#111" : "#fff",
                    fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    gridColumn: b.full ? "1/-1" : "auto", cursor: "pointer", transition: "background .13s"
                  }}>
                    <I n={b.icon} s={14} c={b.outline ? "#6b7280" : "#fff"} /> {b.label}
                  </button>
                ))}
              </div>

              {/* Auto Swap */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "13px 0 8px", borderTop: "1px solid #f3f4f6" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 3 }}>Auto Swap</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.45, marginBottom: 8 }}>Convert your OGA earnings into another token automatically.</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ l: "SOL", c: "#9945FF" }, { l: "USDC", c: "#2775CA" }, { l: "NGN", c: "#16a34a" }].map(t => (
                      <div key={t.l} style={{ display: "flex", alignItems: "center", gap: 5, border: "1.5px solid #e5e7eb", borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.c, display: "inline-block" }} /> {t.l}
                      </div>
                    ))}
                  </div>
                </div>
                <Toggle on={autoSwap} set={setAutoSwap} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
                <span>Minimum: 0.001 SOL (~₦7.00)</span>
                <a onClick={() => setTab("earnings")} style={{ color: "#2563eb", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>View my withdrawals <I n="arrow-down" s={12} c="#2563eb" /></a>
              </div>
            </CardBody>
          </Card>

          {/* ── Right col: Profile + Referral ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Card>
              <CardHead
                left={<><XIcon size={16} /> Profile</>}
                right={<a style={{ fontSize: 12, color: "#2563eb", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>Edit <I n="pencil" s={12} c="#2563eb" /></a>}
              />
              <CardBody>
                <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, borderBottom: "1px solid #f3f4f6", marginBottom: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#111", display: "grid", placeItems: "center", color: "#fff", fontSize: 20, fontWeight: 900, flexShrink: 0 }}>{initials}</div>
                  <div>
                    <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 18, fontWeight: 900 }}>{user.firstName}</div>
                    <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>{handle}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, marginBottom: 14 }}>it's Good you are checking. Tread carefully 😊</div>
                <div style={{ display: "flex", gap: 20, fontSize: 13, fontWeight: 700, paddingBottom: 14, borderBottom: "1px solid #f3f4f6", marginBottom: 14 }}>
                  <div><strong>158</strong> <span style={{ color: "var(--text2)", fontWeight: 500 }}>Followers</span></div>
                  <div><strong>205</strong> <span style={{ color: "var(--text2)", fontWeight: 500 }}>Following</span></div>
                </div>
                <div>
                  <Row label="Rank" val="Level 1" info />
                  <Row label="Sorsa score" val="0" />
                  <Row label="OGA metric score" val="101.81" />
                  <Row label="Holdings last vault" val="0 $OGA" info />
                  <Row label="Verified X account" val="No" valClass="no" />
                  <Row label="Seeker user" val="No" valClass="no" />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", fontSize: 13 }}>
                    <span style={{ color: "var(--text2)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>Human verified <I n="info-circle" s={13} c="#d1d5db" /></span>
                    <button style={{ height: 34, padding: "0 16px", borderRadius: 99, background: "#111", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                      <I n="sparkles" s={13} c="#fff" /> Verify with VeryAI
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHead left={<><I n="link" s={17} /> Your Referral Link</>} />
              <CardBody>
                <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>Share your link and earn ₦500 for every new worker who joins OgaPay.</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 14px" }}>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{refLink}</span>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <CopyBtn text={refLink} />
                    <button style={{ height: 34, padding: "0 14px", borderRadius: 99, background: "#111", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                      <XIcon size={12} color="#fff" /> Post on X
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* ── Quick Links ── */}
          <div style={{ gridColumn: "1/-1" }}>
            <Card>
              <CardHead left={<><I n="zap" s={17} /> Quick Links</>} />
              <CardBody>
                <div className="quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
                  {QUICK.map(q => (
                    <button key={q.label} className="qbtn" onClick={() => nav(q.page)} style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "16px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 9, fontSize: 12, fontWeight: 700, color: "var(--text2)", background: "var(--card)", transition: "all .13s", cursor: "pointer" }}>
                      <I n={q.icon} s={22} c="#6b7280" /> {q.label}
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* ── Earnings chart ── */}
          <div style={{ gridColumn: "1/-1" }}>
            <Card>
              <CardHead
                left={<><I n="currency-dollar" s={17} /> Earnings</>}
                right={
                  <div style={{ display: "flex", gap: 6 }}>
                    {["7", "30"].map(p => (
                      <button key={p} onClick={() => setPeriod(p)} style={{ height: 30, padding: "0 14px", borderRadius: 99, border: "1.5px solid", borderColor: period === p ? "#111" : "var(--border)", background: period === p ? "#111" : "#fff", color: period === p ? "#fff" : "#6b7280", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{p} days</button>
                    ))}
                  </div>
                }
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: "18px 20px", borderBottom: "1px solid #f3f4f6" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>EARNED IN {period} DAYS</div>
                  <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 28, fontWeight: 900, display: "flex", alignItems: "baseline", gap: 8 }}>
                    0 <span style={{ fontSize: 14, color: "var(--text2)", fontWeight: 700 }}>$OGA</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Combined across all categories</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <svg width={80} height={80} viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="28" fill="none" stroke="var(--border)" strokeWidth="16" />
                    <text x="40" y="44" textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="700">No data</text>
                  </svg>
                  <div style={{ display: "grid", gap: 7 }}>
                    {DONUT_CATS.map(d => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, fontSize: 12 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, display: "inline-block" }} /> {d.name}
                        </span>
                        <span style={{ color: "var(--text2)", fontFamily: "monospace", fontSize: 11 }}>0 $OGA</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding: "12px 20px 18px" }}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} />
                    <Tooltip contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="val" stroke="#111" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 10 }}>No combined earnings activity in this timeframe yet.</div>
              </div>
            </Card>
          </div>

          {/* ── Withdrawal History ── */}
          <div style={{ gridColumn: "1/-1" }}>
            <Card>
              <CardHead left={<><I n="clock" s={17} /> Withdrawal History</>} />
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead><tr><th>AMOUNT</th><th>TRANSACTION</th><th>DATE</th></tr></thead>
                  <tbody><tr><td colSpan={3} className="empty-td">No withdrawals yet</td></tr></tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* ── Swap History ── */}
          <div style={{ gridColumn: "1/-1" }}>
            <Card>
              <CardHead left={<><I n="arrows-exchange" s={17} /> Swap History</>} />
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead><tr><th>FROM</th><th>TO</th><th>AMOUNT</th><th>RECEIVED</th><th>DATE</th></tr></thead>
                  <tbody><tr><td colSpan={5} className="empty-td">No swaps yet</td></tr></tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════ EARNINGS TAB ══════════════ */}
      {tab === "earnings" && (
        <div className="fade" style={{ maxWidth: 1060, margin: "0 auto", padding: "22px 20px 60px", display: "grid", gap: 18 }}>
          <Card>
            <CardHead
              left={<><I n="currency-dollar" s={17} /> Earnings</>}
              right={<div style={{ display: "flex", gap: 6 }}>{["7","30"].map(p => <button key={p} onClick={() => setPeriod(p)} style={{ height: 30, padding: "0 14px", borderRadius: 99, border: "1.5px solid", borderColor: period === p ? "#111" : "var(--border)", background: period === p ? "#111" : "#fff", color: period === p ? "#fff" : "#6b7280", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{p} days</button>)}</div>}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: "18px 20px", borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>EARNED IN {period} DAYS</div>
                <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 28, fontWeight: 900, display: "flex", alignItems: "baseline", gap: 8 }}>0 <span style={{ fontSize: 14, color: "var(--text2)", fontWeight: 700 }}>$OGA</span></div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Combined across all categories</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <svg width={80} height={80} viewBox="0 0 80 80"><circle cx="40" cy="40" r="28" fill="none" stroke="var(--border)" strokeWidth="16" /></svg>
                <div style={{ display: "grid", gap: 7 }}>
                  {DONUT_CATS.map(d => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, fontSize: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, display: "inline-block" }} />{d.name}</span>
                      <span style={{ color: "var(--text2)", fontFamily: "monospace", fontSize: 11 }}>0 $OGA</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 20px 18px" }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0,4]} ticks={[0,1,2,3,4]} />
                  <Tooltip contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="val" stroke="#111" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 10 }}>No combined earnings activity in this timeframe yet.</div>
            </div>
          </Card>
          <Card>
            <CardHead left={<><I n="clock" s={17} /> Withdrawal History</>} />
            <div style={{ overflowX: "auto" }}>
              <table><thead><tr><th>AMOUNT</th><th>TRANSACTION</th><th>DATE</th></tr></thead><tbody><tr><td colSpan={3} className="empty-td">No withdrawals yet</td></tr></tbody></table>
            </div>
          </Card>
          <Card>
            <CardHead left={<><I n="arrows-exchange" s={17} /> Swap History</>} />
            <div style={{ overflowX: "auto" }}>
              <table><thead><tr><th>FROM</th><th>TO</th><th>AMOUNT</th><th>RECEIVED</th><th>DATE</th></tr></thead><tbody><tr><td colSpan={5} className="empty-td">No swaps yet</td></tr></tbody></table>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════ MY JOBS TAB ══════════════ */}
      {tab === "jobs" && (
        <div className="fade" style={{ maxWidth: 1060, margin: "0 auto", padding: "22px 20px 60px" }}>
          <Card>
            <CardHead left={<><I n="briefcase" s={17} /> My Jobs</>} right={<button onClick={() => nav("jobs")} style={{ height: 34, padding: "0 16px", borderRadius: 99, background: "#111", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Browse Jobs</button>} />
            <div style={{ overflowX: "auto" }}>
              <table><thead><tr><th>JOB</th><th>STATUS</th><th>REWARD</th><th>DATE</th></tr></thead><tbody><tr><td colSpan={4} className="empty-td">No jobs yet. <span onClick={() => nav("jobs")} style={{ color: "#2563eb", fontWeight: 700, cursor: "pointer" }}>Browse available jobs →</span></td></tr></tbody></table>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════ REFERRALS TAB ══════════════ */}
      {tab === "referrals" && (
        <div className="fade" style={{ maxWidth: 1060, margin: "0 auto", padding: "22px 20px 60px", display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[{ l: "Total Referrals", v: "0" }, { l: "Active Referrals", v: "0" }, { l: "Total Earned", v: "₦0" }].map(s => (
              <Card key={s.l} style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{s.l}</div>
                <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 26, fontWeight: 900 }}>{s.v}</div>
              </Card>
            ))}
          </div>
          <Card>
            <CardHead left={<><I n="link" s={17} /> Your Referral Link</>} />
            <CardBody>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>Earn ₦500 for every new worker who signs up using your link.</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 14px", marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{refLink}</span>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <CopyBtn text={refLink} />
                  <button style={{ height: 34, padding: "0 14px", borderRadius: 99, background: "#111", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}><XIcon size={12} color="#fff" /> Post on X</button>
                </div>
              </div>
              <table><thead><tr><th>USER</th><th>JOINED</th><th>EARNINGS</th><th>STATUS</th></tr></thead><tbody><tr><td colSpan={4} className="empty-td">No referrals yet. Share your link to start earning!</td></tr></tbody></table>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ══════════════ ALERTS TAB ══════════════ */}
      {tab === "alerts" && (
        <div className="fade" style={{ maxWidth: 1060, margin: "0 auto", padding: "22px 20px 60px" }}>
          <Card>
            <CardHead left={<><I n="bell" s={17} /> Alerts</>} right={<button style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", border: "none", background: "none", cursor: "pointer" }}>Mark all read</button>} />
            <CardBody style={{ textAlign: "center", padding: "48px 20px" }}>
              <I n="bell-off" s={40} c="#d1d5db" />
              <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 12 }}>No alerts yet. We'll notify you about new jobs, earnings, and updates.</div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ══════════════ WORKER PORTAL TAB ══════════════ */}
      {tab === "portal" && (
        <div className="fade" style={{ maxWidth: 1060, margin: "0 auto", padding: "22px 20px 60px", display: "grid", gap: 18 }}>
          <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {[
              { icon: "briefcase", label: "Tasks Done", val: "0" },
              { icon: "trophy", label: "Won", val: "0" },
              { icon: "heart", label: "Compliments", val: "0" },
              { icon: "currency-naira", label: "Total Earned", val: "₦0" },
            ].map(s => (
              <Card key={s.label} style={{ padding: 20, textAlign: "center" }}>
                <I n={s.icon} s={24} c="#6b7280" />
                <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 26, fontWeight: 900, margin: "8px 0 4px" }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700 }}>{s.label}</div>
              </Card>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <Card>
              <CardHead left={<><I n="layout-dashboard" s={17} /> Worker Portal</>} />
              <CardBody>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 16 }}>Build your reputation as a worker on OgaPay. Complete tasks, earn compliments, and rise through the ranks.</p>
                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { icon: "star", label: "My Reviews", val: "0 reviews", sub: "0.0 rating" },
                    { icon: "zap", label: "Challenges Participated", val: "0" },
                    { icon: "gift", label: "Tips Received", val: "0" },
                    { icon: "users", label: "Communities", val: "0 joined" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed #f3f4f6", fontSize: 13 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text2)", fontWeight: 600 }}><I n={r.icon} s={16} c="#9ca3af" />{r.label}</span>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800 }}>{r.val}</div>
                        {r.sub && <div style={{ fontSize: 11, color: "var(--text3)" }}>{r.sub}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHead left={<><I n="user" s={17} /> My Store</>} right={<button style={{ height: 32, padding: "0 14px", borderRadius: 99, background: "#111", color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Open Store</button>} />
              <CardBody style={{ textAlign: "center", padding: "32px 20px" }}>
                <I n="building-store" s={40} c="#d1d5db" />
                <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 12 }}>No products listed yet.</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Open your store to sell services and products.</div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
