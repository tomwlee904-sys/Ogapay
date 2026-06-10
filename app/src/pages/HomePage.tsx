// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { injectSkeletonStyles } from "../components/SkeletonLoader";
import { API_BASE, apiRequest } from "../lib/api";
import TaskCard from "../components/TaskCard";

/* ─── GLOBAL STYLES ────────────────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap');

    :root {
      --bg:#ffffff; --bg2:#fafafa; --card:#ffffff; --card2:#f5f5f5;
      --border:#e5e5e5; --border2:#d4d4d4;
      --text:#111111; --text2:#525252; --text3:#a1a1aa;
      --primary:#111111; --accent:#1F8CFF; --accent2:#2563EB;
      --brand-blue:linear-gradient(90deg,#2563EB,#3B82F6,#60A5FA,#93C5FD);
      --gold:#f5b301;
      --shadow:0 4px 16px rgba(0,0,0,.06),0 1px 4px rgba(0,0,0,.03);
      --shadow-soft:0 2px 8px rgba(0,0,0,.04);
      --radius:14px; --nav-h:60px;
    }
    [data-theme="dark"] {
      --bg:#000000; --bg2:#050505; --card:#111111; --card2:#151515;
      --border:#232323; --border2:#333333;
      --text:#ffffff; --text2:#a1a1aa; --text3:#667186;
      --primary:#ffffff; --accent:#1F8CFF; --accent2:#60A5FA;
      --shadow:0 4px 16px rgba(0,0,0,.5); --shadow-soft:0 2px 8px rgba(0,0,0,.4);
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0; padding: 0;
      color: var(--text); background: var(--bg);
      font-family: "DM Sans", system-ui, sans-serif;
      overflow-x: hidden;
    }
    a { color: inherit; text-decoration: none; }
    button { font: inherit; cursor: pointer; }

    .container { width: min(1200px, calc(100% - 64px)); margin: 0 auto; }

    /* ── Gradient text ── */
    .grad-text {
      background: linear-gradient(90deg,#2563EB,#3B82F6,#60A5FA,#93C5FD);
      background-size: 300% 100%;
      -webkit-background-clip: text; background-clip: text; color: transparent;
      animation: gradShift 4s ease-in-out infinite;
    }

    /* ── Animations ── */
    @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
    @keyframes livePulse { 0%,100%{opacity:.55;transform:scale(.82)} 50%{opacity:1;transform:scale(1.08)} }
    @keyframes shimmer { 0%,45%{transform:translateX(-85%);opacity:0} 60%{opacity:1} 100%{transform:translateX(85%);opacity:0} }
    @keyframes progressLoad { from{transform:scaleX(.18);transform-origin:left} to{transform:scaleX(1);transform-origin:left} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes dotBreathe { 0%,100%{box-shadow:0 7px 18px rgba(16,21,37,.14)} 50%{box-shadow:0 8px 22px rgba(16,21,37,.24)} }
    @keyframes ping { 0%{transform:scale(1);opacity:1} 75%{transform:scale(2);opacity:0} 100%{transform:scale(1);opacity:1} }

    /* ── Section heading ── */
    .section-kicker {
      display:flex; align-items:center; gap:8px; margin-bottom:16px;
      color:var(--text3); text-transform:uppercase; letter-spacing:2px;
      font-size:11px; font-weight:800;
    }
    .section-title {
      margin:0; font-family:"Outfit",sans-serif;
      font-size:clamp(28px,3vw,40px); line-height:1.05;
      letter-spacing:-1.2px; font-weight:900; color:var(--text);
    }
    .section-sub { margin:12px auto 0; color:var(--text2); font-size:16px; line-height:1.55; font-weight:500; }

    /* ── Buttons ── */
    .btn-primary {
      display:inline-flex; align-items:center; justify-content:center; gap:9px;
      height:44px; padding:0 22px; border-radius:10px;
      background:var(--primary); color:#fff; border:1.5px solid var(--primary);
      font-size:14px; font-weight:700;
      box-shadow:0 4px 14px rgba(16,21,37,.18);
      transition:opacity .14s, transform .14s;
    }
    .btn-primary:hover { opacity:.88; transform:translateY(-1px); }
    [data-theme="dark"] .btn-primary { color:var(--bg); }
    .btn-outline {
      display:inline-flex; align-items:center; justify-content:center; gap:9px;
      height:44px; padding:0 22px; border-radius:10px;
      background:var(--card); color:var(--text);
      border:1.5px solid var(--border);
      font-size:14px; font-weight:700;
      box-shadow:var(--shadow-soft);
      transition:border-color .14s, box-shadow .14s;
    }
    .btn-outline:hover { border-color:var(--border2); box-shadow:var(--shadow); }
    .btn-pill {
      height:52px; min-width:260px; border-radius:999px;
      display:inline-flex; align-items:center; justify-content:center; gap:10px;
      background:var(--primary); color:#fff; border:1.5px solid var(--primary);
      font-size:14px; font-weight:800;
    }
    [data-theme="dark"] .btn-pill { background:#2a2a2a; color:#fff; border-color:#2a2a2a; }

    /* ── Card base ── */
    .card-base {
      border:1.5px solid var(--border); border-radius:var(--radius);
      background:var(--card); overflow:hidden;
      box-shadow:var(--shadow-soft);
      transition:border-color .14s, box-shadow .14s;
    }
    .card-base:hover { border-color:var(--border2); box-shadow:var(--shadow); }
    [data-theme="dark"] .card-base { background:#111111; border-color:#232323; box-shadow:none; }

    /* ── Hero ── */
    .hero {
      position:relative; overflow:hidden;
      background:
        radial-gradient(circle at 23% 24%,rgba(31,140,255,.12),transparent 32%),
        radial-gradient(circle at 63% 72%,rgba(37,99,235,.10),transparent 38%),
        radial-gradient(circle at 78% 22%,rgba(196,181,253,.12),transparent 28%),
        linear-gradient(180deg,#fff 0%,#fbfcff 64%,#fafafa 100%);
    }
    [data-theme="dark"] .hero {
      background:
        radial-gradient(circle at 18% 8%,rgba(31,140,255,.18),transparent 32%),
        radial-gradient(circle at 84% 18%,rgba(37,99,235,.16),transparent 34%),
        linear-gradient(180deg,#000 0%,#050505 100%);
    }
    .hero::after {
      content:""; position:absolute; inset:auto 0 0;
      height:120px; background:linear-gradient(transparent,#fff);
      pointer-events:none;
    }
    [data-theme="dark"] .hero::after { background:linear-gradient(transparent,#000); }
    .hero-grid {
      position:relative; z-index:1;
      display:grid; grid-template-columns:minmax(360px,1fr) 420px;
      gap:72px; align-items:center; padding:68px 0 82px;
    }

    /* ── Analytics card shimmer ── */
    .analytics-card::before {
      content:""; position:absolute; inset:-1px;
      background:linear-gradient(115deg,transparent 0%,rgba(96,165,250,.14) 35%,transparent 62%);
      transform:translateX(-70%);
      animation:shimmer 6s ease-in-out infinite;
      pointer-events:none;
    }

    /* ── Job card shimmer ── */
    .job-card::before {
      content:""; position:absolute; inset:0;
      background:linear-gradient(115deg,transparent 0%,rgba(147,197,253,.10) 42%,transparent 66%);
      transform:translateX(-85%);
      animation:shimmer 7s ease-in-out infinite;
      pointer-events:none;
    }
    .job-card:hover { border-color:#315EFB !important; transform:translateY(-2px); }

    /* ── Progress bar ── */
    .progress-bar span {
      display:block; height:100%;
      background:linear-gradient(90deg,#2563EB,#3B82F6,#60A5FA);
      background-size:240% 100%; border-radius:99px;
      animation:gradShift 4s ease-in-out infinite, progressLoad 1.1s ease-out both;
    }
    .progress-bar span::after {
      content:""; position:absolute; inset:0;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);
      animation:shimmer 2.8s ease-in-out infinite;
    }

    /* ── Navbar ── */
    .nav {
      position:relative; z-index:100; height:var(--nav-h);
      background:rgba(255,255,255,.92);
      border-bottom:1px solid transparent;
      backdrop-filter:blur(18px) saturate(1.4);
    }
    [data-theme="dark"] .nav { background:rgba(8,11,19,.92); border-bottom-color:var(--border); }
    .nav-inner {
      height:100%; display:grid;
      grid-template-columns:auto 1fr auto;
      align-items:center; gap:28px;
      width:min(1200px,calc(100% - 48px)); margin:0 auto;
    }
    .nav-link {
      display:inline-flex; align-items:center; gap:7px;
      padding:6px 10px; border-radius:8px;
      color:var(--text2); font-size:14px; font-weight:600; line-height:1;
      transition:color .14s, background .14s;
    }
    .nav-link:hover { color:var(--text); background:var(--bg2); }

    /* ── Mobile ── */
    @media(max-width:768px) {
      body { padding-bottom:92px; }
      .hide-mobile { display:none !important; }
      .hero-grid {
        display:block !important; padding:54px 0 30px !important;
        text-align:center !important;
      }
      .hero-grid > * { width:100% !important; max-width:100% !important; }
      .hero-analytics { margin:28px auto 0; border:0 !important; background:transparent !important; box-shadow:none !important; backdrop-filter:none !important; }
      .hero-analytics .analytics-head { display:none; }
      .hero-analytics .analytics-body { display:grid !important; grid-template-columns:repeat(3,1fr) !important; gap:10px; padding:16px 0 0; }
      .hero-analytics .stat { border:1.5px solid var(--border); border-radius:14px; background:rgba(255,255,255,.82); box-shadow:var(--shadow-soft); padding:13px 8px; display:grid; place-items:center; margin-top:0 !important; }
      [data-theme="dark"] .hero-analytics .stat { background:rgba(8,11,19,.72); border-color:#232323; box-shadow:none; }
      .hero-analytics .analytics-foot { display:none; }
      .hero-analytics::before { display:none; }
      .quick-grid { grid-template-columns:1fr 1fr !important; }
      .steps-grid { grid-template-columns:1fr !important; }
      .steps-grid::before { display:none !important; }
      .jobs-track { display:flex !important; flex-direction:column !important; }
      .store-grid,.community-grid { grid-template-columns:1fr !important; }
      .gs-accordion { grid-template-columns:1fr !important; }
      .paths { grid-template-columns:1fr !important; }
      .mobile-bottom-nav { display:grid !important; }
    }
    @media(max-width:520px) {
      .quick-grid { grid-template-columns:1fr !important; }
      .hero-analytics .analytics-body { grid-template-columns:1fr 1fr 1fr; }
    }

    /* ── Mobile bottom nav ── */
    .mobile-bottom-nav {
      display:none;
      position:fixed; left:0; right:0; bottom:0; z-index:250;
      grid-template-columns:repeat(5,1fr); align-items:end;
      height:88px; padding:8px 12px 10px;
      padding-bottom:calc(10px + env(safe-area-inset-bottom));
      background:rgba(255,255,255,.96);
      border-top:1px solid var(--border);
      box-shadow:0 -10px 30px rgba(16,21,37,.08);
      backdrop-filter:blur(18px) saturate(1.25);
    }
    [data-theme="dark"] .mobile-bottom-nav { background:rgba(5,7,11,.96); border-top-color:#232323; box-shadow:none; }
    .mobile-bottom-nav a {
      min-width:0; display:grid; justify-items:center; gap:4px;
      color:var(--text2); font-size:11px; font-weight:800; text-decoration:none;
    }
    .mobile-bottom-nav a.active,
    .mobile-bottom-nav a:hover { color:var(--text); }
    [data-theme="dark"] .mobile-bottom-nav a { color:#8b96a8; }
    [data-theme="dark"] .mobile-bottom-nav a.active,
    [data-theme="dark"] .mobile-bottom-nav a:hover { color:#f8fafc; }
    .mobile-bottom-nav .create-btn {
      transform:translateY(-18px); gap:5px; color:var(--text);
    }
    .mobile-bottom-nav .create-btn i {
      width:58px; height:58px; display:flex; align-items:center; justify-content:center;
      border-radius:18px; background:#111111; color:#fff;
      box-shadow:0 10px 22px rgba(16,21,37,.24); font-size:26px;
    }
    [data-theme="dark"] .mobile-bottom-nav .create-btn i {
      background:#f8fafc; color:#050505; box-shadow:0 0 22px rgba(167,139,250,.18);
    }

    /* ── Auth modal ── */
    .auth-modal {
      position:fixed; inset:0; z-index:1000;
      display:flex; align-items:center; justify-content:center;
      padding:18px; background:rgba(8,11,19,.58);
      opacity:0; pointer-events:none;
      transition:opacity .18s ease;
      backdrop-filter:blur(8px);
    }
    .auth-modal.open { opacity:1; pointer-events:auto; }
    .auth-panel {
      width:100%; max-width:420px;
      background:var(--card); border:1.5px solid var(--border);
      border-radius:18px; overflow:hidden;
      box-shadow:0 28px 80px rgba(8,11,19,.28);
      transform:translateY(10px) scale(.985);
      transition:transform .18s ease;
      max-height:min(92vh,700px); overflow-y:auto;
    }
    .auth-modal.open .auth-panel { transform:none; }
    [data-theme="dark"] .auth-panel { background:#111111; border-color:#232323; }
    .auth-input {
      width:100%; height:44px; padding:0 14px;
      background:var(--bg2); border:1.5px solid var(--border);
      border-radius:9px; color:var(--text); font-size:14px;
      font-family:inherit; outline:none;
      transition:border-color .14s;
    }
    .auth-input:focus { border-color:#315EFB; box-shadow:0 0 0 3px rgba(49,94,251,.12); }
    @media(max-width:520px) {
      .auth-modal { align-items:flex-end; padding:12px; }
      .auth-panel { max-width:100%; border-radius:18px; max-height:88vh; }
    }

    /* ── Drawer ── */
    .drawer-overlay {
      position:fixed; inset:0; z-index:299;
      background:rgba(0,0,0,.3); backdrop-filter:blur(3px);
      transition:opacity .25s;
    }
    .drawer {
      position:fixed; right:0; top:0; bottom:0; z-index:300;
      width:min(360px,92vw);
      background:var(--bg); border-left:1px solid var(--border);
      box-shadow:-16px 0 42px rgba(16,21,37,.12);
      display:flex; flex-direction:column;
      transition:transform .25s ease;
    }
    [data-theme="dark"] .drawer { background:#000000; border-left-color:#232323; }
    .drawer-item {
      display:flex; align-items:center; gap:14px;
      padding:12px 12px; border-radius:14px;
      color:var(--text); text-decoration:none;
      transition:background .15s; min-height:70px;
    }
    .drawer-item:hover { background:var(--bg2); }
    .drawer-icon {
      width:46px; height:46px; display:grid; place-items:center;
      border:1px solid var(--border); border-radius:12px;
      background:var(--bg2); color:var(--text2); flex-shrink:0;
    }
    .trust-bar {
      background:var(--bg2); border-top:1px solid var(--border);
      border-bottom:1px solid var(--border);
    }
    [data-theme="dark"] .trust-bar { background:#050505; border-color:#232323; }
  `}</style>
);

/* ─── TABLER ICON ──────────────────────────────────────────────────────────── */
const I = ({ n, s = 16, c = "currentColor", style }: { n: any; s?: number; c?: string; style?: any }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0 }} />
);

/* ─── LOGO MARK ────────────────────────────────────────────────────────────── */
const Logo = ({ size = 34 }) => (
  <div style={{ width: size, height: size, borderRadius: 9, overflow: "hidden", flexShrink: 0, boxShadow: "0 8px 22px rgba(37,99,235,.12)" }}>
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" style={{ display: "block" }}>
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

/* ─── THEME HOOK ───────────────────────────────────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("ogapay-theme") || "light"; } catch { return "light"; }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("ogapay-theme", theme); } catch {}
  }, [theme]);
  return [theme, () => setTheme(t => t === "light" ? "dark" : "light")];
}

/* ─── NAVBAR ───────────────────────────────────────────────────────────────── */
function Navbar({ theme, toggleTheme, openDrawer, isAuthed, navigate }) {
  const links = [
    { icon: "briefcase", label: "Jobs", href: "/tasks" },
    { icon: "building-store", label: "Store", href: "/store" },
    { icon: "users-group", label: "Communities", href: "/communities" },
    { icon: "chart-bar", label: "Analytics", href: "/analytics" },
    { icon: "help-circle", label: "FAQ", href: "/faq" },
  ];
  return (
    <nav className="nav">
      <div className="nav-inner">
        {/* Brand */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Outfit,sans-serif", fontSize: 19, fontWeight: 800, letterSpacing: "-.4px" }}>
          <Logo size={34} />
          OgaPay
        </a>

        {/* Desktop links */}
        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {links.map(l => (
            <a key={l.label} href={l.href} className="nav-link">
              <I n={l.icon} s={15} /> {l.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isAuthed ? (
            <>
              <a href="/wallet" className="wallet-btn" style={{ height: 36, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px solid var(--border2)", borderRadius: 999, background: "var(--card)", color: "var(--text)", fontSize: 13.5, fontWeight: 700 }}>
                <I n="wallet" s={15} />
                <strong style={{ background: "linear-gradient(90deg,#2563EB,#3B82F6,#60A5FA)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", fontSize: 15 }}>Wallet</strong>
              </a>
              <a href="/profile" className="icon-btn" style={{ width: 36, height: 36, display: "grid", placeItems: "center", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--text2)" }}>
                <I n="user-circle" s={17} />
              </a>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={{ height: 36, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px solid var(--border2)", borderRadius: 999, background: "var(--card)", color: "var(--text)", fontSize: 13.5, fontWeight: 700 }}>
                <I n="login" s={15} />
                <strong style={{ fontWeight: 800, fontSize: 14 }}>Login</strong>
              </button>
              <button onClick={() => navigate('/login?mode=signup')} style={{ height: 36, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px solid var(--border2)", borderRadius: 999, background: "#11151f", color: "#fff", fontSize: 13.5, fontWeight: 700 }}>
                Get Started
              </button>
            </>
          )}
          <button onClick={toggleTheme} style={{ width: 36, height: 36, display: "grid", placeItems: "center", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--text2)" }}>
            <I n={theme === "dark" ? "sun" : "moon"} s={17} />
          </button>
          <button onClick={openDrawer} style={{ width: 36, height: 36, display: "grid", placeItems: "center", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--text2)" }}>
            <I n="menu-2" s={17} />
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ─── COUNT-UP HOOK ──────────────────────────────────────────────────────────── */
function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target && target !== 0) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

/* ─── STATS SKELETON ──────────────────────────────────────────────────────────── */
function StatsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[1,2,3].map(i => (
        <div key={i}>
          <div className="sk" style={{ height: 32, width: 112, borderRadius: 8, marginBottom: 2 }} />
          <div className="sk" style={{ height: 12, width: 80, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── HERO STATS CARD ──────────────────────────────────────────────────────────── */
function HeroStatsCard() {
  const [stats, setStats] = useState(null);
  const [pulse, setPulse] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats/live`);
      const data = await res.json();
      setStats(data);
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    } catch {}
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeJobsCount = useCountUp(stats?.activeJobs);
  const last24hTasksCount = useCountUp(stats?.last24hTasks);
  const last24hPaidCount = useCountUp(stats?.last24hPaid);

  return (
    <div style={{
      background: 'var(--card)', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,.10)',
      border: '1px solid var(--border)', padding: '20px 24px', width: '100%', maxWidth: 384,
      display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 320,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Platform Stats</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#16a34a', fontWeight: 500 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#16a34a',
            animation: pulse ? 'ping 1s ease-in-out' : 'pulse 2s ease-in-out infinite',
            display: 'inline-block',
          }} />
          LIVE
        </span>
      </div>

      {/* Stats */}
      {!stats ? (
        <StatsSkeleton />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--text)', lineHeight: 1, fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.5px' }}>
              {activeJobsCount}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text3)' }}>Active jobs</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--text)', lineHeight: 1, fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.5px' }}>
              ₦{last24hPaidCount.toLocaleString()}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text3)' }}>Rewards distributed 24h</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--text)', lineHeight: 1, fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.5px' }}>
              {last24hTasksCount.toLocaleString()}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text3)' }}>Tasks completed 24h</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ width: 18, height: 18, background: 'var(--text)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: 'var(--bg)', fontSize: 9, fontWeight: 900 }}>O</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Powered by OgaPay Protocol</span>
      </div>
    </div>
  );
}

/* ─── HERO ─────────────────────────────────────────────────────────────────── */
function Hero({ openAuth, navigate, isAuthed }) {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          {/* Copy */}
          <div style={{ maxWidth: 560 }}>
            <h1 style={{ margin: "0 0 20px", fontFamily: "Outfit,sans-serif", fontSize: "clamp(44px,4.8vw,64px)", lineHeight: 1, letterSpacing: "-2.5px", fontWeight: 900, color: "var(--text)" }}>
              Work, <span className="grad-text">Earn</span> → Grow
            </h1>
            <p style={{ margin: "0 0 32px", maxWidth: 480, color: "var(--text2)", fontSize: 17, lineHeight: 1.65, fontWeight: 500 }}>
              Nigeria's #1 microtask marketplace. Complete tasks, earn instant rewards, and grow your income — no special skills required.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/tasks" className="btn-primary"><I n="briefcase" s={16} /> Browse Jobs</a>
              <button onClick={() => document.getElementById('featured-jobs')?.scrollIntoView({ behavior: 'smooth' })} className="btn-outline"><I n="user-plus" s={16} /> Get Started Free</button>
            </div>
          </div>

          {/* Stats card */}
          <HeroStatsCard />
        </div>
      </div>
    </section>
  );
}

/* ─── TRUST BAR ─────────────────────────────────────────────────────────────── */
function TrustBar() {
  const items = [
    { icon: "shield-check", label: "KYC Verified Workers" },
    { icon: "clock", label: "Instant Payouts" },
    { icon: "lock", label: "Escrow Protection" },
    { icon: "headset", label: "24/7 Support" },
    { icon: "chart-line", label: "Real-Time Analytics" },
  ];
  return (
    <div className="trust-bar">
      <div className="container" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px 32px", padding: "14px 0" }}>
        {items.map(t => (
          <span key={t.label} style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text3)", fontSize: 12, fontWeight: 700 }}>
            <I n={t.icon} s={15} /> {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── QUICK TASKS ────────────────────────────────────────────────────────────── */
function QuickTasks() {
  const [selectedTask, setSelectedTask] = useState(null)
  const [quickUrl, setQuickUrl] = useState('')
  const tasks = [
    { icon: "brand-x", name: "X Follow", price: "₦150 / 100", featured: false, key: 'x-follow', placeholder: 'Paste your X (Twitter) profile URL...' },
    { icon: "brand-telegram", name: "Telegram Join", price: "₦120 / 100", featured: false, key: 'telegram-join', placeholder: 'Paste your Telegram group/channel link...' },
    { icon: "brand-youtube", name: "YouTube Like", price: "₦200 / 100", featured: true, key: 'youtube-like', placeholder: 'Paste your YouTube video URL...' },
    { icon: "brand-instagram", name: "IG Follow", price: "₦180 / 100", featured: false, key: 'ig-follow', placeholder: 'Paste your Instagram profile URL...' },
  ];
  return (
    <section style={{ position: "relative", padding: "0 0 56px", background: "var(--bg)" }}>
      <div className="container">
        <div className="section-kicker"><I n="zap" s={13} /> QUICK TASKS</div>
        <div className="quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {tasks.map(t => {
            const isSelected = selectedTask?.key === t.key
            return (
              <div key={t.name} onClick={() => { setSelectedTask(t); setQuickUrl('') }}
                style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 18px", border: isSelected ? "2px solid #191C6B" : t.featured ? "1.5px solid var(--text)" : "1.5px solid var(--border)", borderRadius: 'var(--radius)', background: isSelected ? '#191C6B08' : 'var(--card)', cursor: "pointer", overflow: 'hidden', boxShadow: isSelected ? '0 0 0 1px rgba(25,28,107,.08)' : 'var(--shadow-soft)', transition: 'border-color .14s, box-shadow .14s, background .14s' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--bg2)", flexShrink: 0 }}>
                  <I n={t.icon} s={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{t.name}</div>
                  <div style={{ marginTop: 2, color: "var(--text3)", fontSize: 12, fontWeight: 700 }}>{t.price}</div>
                </div>
              </div>
            )
          })}
        </div>
        {selectedTask && (
          <div style={{ display:'flex', gap:10, marginTop:16, alignItems:'center' }}>
            <input value={quickUrl} onChange={e => setQuickUrl(e.target.value)}
              placeholder={selectedTask.placeholder}
              style={{ flex:1, height:52, padding:'0 18px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--card)', color:'var(--text)', fontSize:14, fontFamily:'inherit', outline:'none' }} />
            <button onClick={() => {
              if (!quickUrl.trim()) return;
              window.location.href = `/create?type=${selectedTask.key}&url=${encodeURIComponent(quickUrl)}`;
            }}
              style={{ height:52, padding:'0 24px', borderRadius:12, border:'none', background:'#191C6B', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontFamily:'inherit', whiteSpace:'nowrap' }}>
              Let's go <i className="ti ti-arrow-right" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ───────────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { icon: "user-check", title: "Create an Account", desc: "Sign up free in under 60 seconds. No crypto wallet needed to get started earning." },
    { icon: "briefcase", title: "Browse & Pick Tasks", desc: "Choose from social, creative, research, and custom tasks that match your skills." },
    { icon: "coin", title: "Complete & Get Paid", desc: "Submit your proof. Get paid instantly to your OgaPay wallet in Naira." },
  ];
  return (
    <section style={{ padding: "56px 0", background: "var(--bg)" }}>
      <div className="container" style={{ textAlign: "center" }}>
        <h2 className="section-title">How it works</h2>
        <p className="section-sub" style={{ maxWidth: 520 }}>Three simple steps to start earning on OgaPay today.</p>
        <div className="steps-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginTop: 36 }}>
          <div style={{ content: '""', position: "absolute", left: "18%", right: "18%", top: 36, borderTop: "2px dashed var(--border2)", opacity: .7, zIndex: 0, pointerEvents: "none" }} className="hide-mobile" />
          {steps.map((s, i) => (
            <div key={i} className="card-base" style={{ position: "relative", minHeight: 200, padding: 20, overflow: "hidden", transition: "transform .18s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}>
              <div style={{ position: "absolute", right: 10, top: 6, fontFamily: "Outfit,sans-serif", fontSize: 80, fontWeight: 900, color: "rgba(0,0,0,.035)", lineHeight: 1, userSelect: "none", zIndex: 0 }}>{i + 1}</div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--bg2)", marginBottom: 18 }}>
                  <I n={s.icon} s={20} />
                </div>
                <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800 }}>{s.title}</h3>
                <p style={{ margin: 0, color: "var(--text2)", lineHeight: 1.6, fontSize: 14 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
const WORKSPACE_SLUGS: Record<string, string> = {
  "Social Tasks": "social",
  "Writing": "writing",
  "Design": "design",
  "App Testing": "testing",
  "Research": "research",
  "Dev Tasks": "development",
};

function EarnPaths() {
  const paths = [
    { icon: "brand-x", label: "Social Tasks" },
    { icon: "pencil", label: "Writing" },
    { icon: "photo", label: "Design" },
    { icon: "device-mobile", label: "App Testing" },
    { icon: "search", label: "Research" },
    { icon: "code", label: "Dev Tasks" },
  ];
  return (
    <section style={{ padding: "56px 0", background: "var(--bg)", textAlign: "center" }}>
      <div className="container">
        <div className="section-kicker" style={{ justifyContent: "center" }}><I n="layout-grid" s={13} /> TASK CATEGORIES</div>
        <h2 className="section-title">Earn your way</h2>
        <p className="section-sub" style={{ maxWidth: 480 }}>Pick tasks that match your skills and interests.</p>
        <div className="paths" style={{ margin: "36px auto 0", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, maxWidth: 680 }}>
          {paths.map(p => (
            <Link key={p.label} to={"/worker/" + WORKSPACE_SLUGS[p.label]} className="card-base" style={{ minHeight: 72, display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", fontSize: 17, fontWeight: 800, textDecoration: "none" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--bg2)", flexShrink: 0 }}>
                <I n={p.icon} s={20} />
              </div>
              {p.label}
              <I n="chevron-right" s={18} c="var(--text3)" style={{ marginLeft: "auto" }} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FEATURED JOBS ─────────────────────────────────────────────────────────── */
function FeaturedJobs() {
  const [active, setActive] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  useEffect(() => { injectSkeletonStyles(); }, []);
  const fetchFeatured = () => {
    setLoading(true);
    apiRequest<any>('/tasks', { auth: false })
      .then(d => {
        const list = Array.isArray(d) ? d : d?.tasks || d?.data || [];
        setJobs(list.slice(0, 6));
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchFeatured(); }, []);
  useEffect(() => {
    if (jobs.length === 0) return;
    intervalRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % jobs.length);
    }, 4000);
    return () => clearInterval(intervalRef.current);
  }, [jobs.length]);
  const pauseSlider = () => clearInterval(intervalRef.current);
  const resumeSlider = () => {
    intervalRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % jobs.length);
    }, 4000);
  };
  return (
    <section id="featured-jobs" style={{ padding: "44px 0 34px", background: "var(--bg)" }}>
      <div className="container">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div className="section-kicker"><I n="flame" s={13} /> LIVE JOBS</div>
            <h2 className="section-title">Featured Tasks</h2>
          </div>
          <a href="/tasks" style={{ color: "var(--text2)", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>View all <I n="chevron-right" s={16} /></a>
        </div>

        {loading ? (
          <div className="jobs-track" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ border: '1.5px solid var(--border)', borderRadius: 16, background: 'var(--card)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '18px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 13 }}>
                  <div className="sk" style={{ width: 38, height: 38, borderRadius: '50%' }} />
                  <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                    <div className="sk" style={{ height: 10, width: '40%' }} />
                    <div className="sk" style={{ height: 14, width: '60%' }} />
                  </div>
                </div>
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="sk" style={{ height: 10, width: '30%' }} />
                  <div className="sk" style={{ height: 10, borderRadius: 99 }} />
                  <div className="sk" style={{ height: 100, borderRadius: 10 }} />
                  <div className="sk" style={{ height: 10, width: '50%' }} />
                  <div className="sk" style={{ height: 40, borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text2)' }}>
            <i className="ti ti-briefcase-off" style={{ fontSize: 36, color: 'var(--text3)', marginBottom: 12, display: 'block' }} />
            <h3 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>No featured tasks right now</h3>
            <p style={{ fontSize: 13, margin: '0 0 16px' }}>Check back soon for new opportunities.</p>
            <a href="/tasks" className="btn-primary"><I n="briefcase" s={16} /> Browse All Tasks</a>
          </div>
        ) : (
          <div style={{ position: 'relative' }} onMouseEnter={pauseSlider} onMouseLeave={resumeSlider}>
            <button className="hide-mobile" onClick={() => setActive(prev => (prev - 1 + jobs.length) % jobs.length)}
              style={{ position:'absolute', left:-20, top:'50%', transform:'translateY(-50%)', width:40, height:40, borderRadius:'50%', border:'1.5px solid var(--border)', background:'var(--card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, boxShadow:'var(--shadow-soft)' }}>
              <I n="chevron-left" s={18} />
            </button>
            <button className="hide-mobile" onClick={() => setActive(prev => (prev + 1) % jobs.length)}
              style={{ position:'absolute', right:-20, top:'50%', transform:'translateY(-50%)', width:40, height:40, borderRadius:'50%', border:'1.5px solid var(--border)', background:'var(--card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, boxShadow:'var(--shadow-soft)' }}>
              <I n="chevron-right" s={18} />
            </button>
            <div className="jobs-track" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
              {[0,1,2].map(offset => {
                const idx = (active + offset) % jobs.length;
                const t = jobs[idx];
                if (!t) return null;
                return <TaskCard key={t.id} task={t} />;
              })}
            </div>
          </div>
        )}

        {jobs.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 28 }}>
            {jobs.map((_, i) => (
              <span key={i} onClick={() => setActive(i)} style={{ width: active === i ? 44 : 34, height: 9, borderRadius: 999, cursor: "pointer", background: active === i ? "#191C6B" : "#dfe5ee", transition: "width .34s, background .34s", animation: active === i ? "dotBreathe 2.8s ease-in-out infinite" : "none" }} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── STORE SECTION ─────────────────────────────────────────────────────────── */
function StoreSection() {
  const [products, setProducts] = useState([]);
  const [active, setActive] = useState(0);
  const intervalRef = useRef(null);
  useEffect(() => {
    fetch(`${API_BASE}/store?limit=6`)
      .then(r => r.json())
      .then(d => {
        const raw = d?.data;
        const list = Array.isArray(raw) ? raw : raw?.items ?? [];
        setProducts(list);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (products.length === 0) return;
    intervalRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % products.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [products.length]);
  const pauseSlider = () => clearInterval(intervalRef.current);
  const resumeSlider = () => {
    intervalRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % products.length);
    }, 5000);
  };
  const cardStyle = {
    borderRadius: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid var(--border)',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: 'var(--card)',
    height: '100%',
  };
  const imgWrapStyle = {
    width: '100%',
    height: 200,
    overflow: 'hidden',
    borderRadius: 12,
    background: 'var(--bg2)',
    flexShrink: 0,
  };
  const titleRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  };
  const titleStyle = {
    fontSize: 15,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    margin: 0,
  };
  const dateStyle = {
    color: 'var(--text3)',
    fontSize: 12,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    marginTop: 1,
  };
  const descStyle = {
    fontSize: 14,
    color: 'var(--text2)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: 0,
    lineHeight: 1.4,
    minHeight: 39,
  };
  const creatorStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: 'var(--bg2)',
    borderRadius: 12,
  };
  const avatarStyle = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'var(--text)',
    display: 'grid',
    placeItems: 'center',
    color: 'var(--bg)',
    fontSize: 11,
    fontWeight: 800,
    flexShrink: 0,
  };
  const priceRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '8px 12px',
  };
  const primaryPriceStyle = {
    color: '#22c55e',
    fontWeight: 700,
    fontSize: 18,
  };
  const cryptoPriceStyle = {
    color: 'var(--text2)',
    fontSize: 14,
  };
  const viewBtnStyle = {
    width: '100%',
    border: '1px solid var(--border)',
    borderRadius: 12,
    paddingTop: 10,
    paddingBottom: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: 'var(--text2)',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    background: 'var(--card)',
    cursor: 'pointer',
  };
  const formatPrice = (price) => {
    const n = Number(price || 0);
    return n >= 1000 ? n.toLocaleString() : n.toFixed(2);
  };
  return (
    <section style={{ padding: "56px 0", background: "var(--bg)" }}>
      <div className="container">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div className="section-kicker"><I n="building-store" s={13} /> STORE</div>
            <h2 className="section-title">Top Products</h2>
          </div>
          <a href="/store" style={{ color: "var(--text2)", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>View all <I n="chevron-right" s={16} /></a>
        </div>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text2)' }}>
            <i className="ti ti-building-store-off" style={{ fontSize: 36, color: 'var(--text3)', marginBottom: 12, display: 'block' }} />
            <p style={{ fontSize: 13, margin: 0 }}>No products available yet.</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }} onMouseEnter={pauseSlider} onMouseLeave={resumeSlider}>
            <button className="hide-mobile" onClick={() => setActive(prev => (prev - 1 + products.length) % products.length)}
              style={{ position:'absolute', left:-20, top:'50%', transform:'translateY(-50%)', width:40, height:40, borderRadius:'50%', border:'1.5px solid var(--border)', background:'var(--card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, boxShadow:'var(--shadow-soft)' }}>
              <I n="chevron-left" s={18} />
            </button>
            <button className="hide-mobile" onClick={() => setActive(prev => (prev + 1) % products.length)}
              style={{ position:'absolute', right:-20, top:'50%', transform:'translateY(-50%)', width:40, height:40, borderRadius:'50%', border:'1.5px solid var(--border)', background:'var(--card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, boxShadow:'var(--shadow-soft)' }}>
              <I n="chevron-right" s={18} />
            </button>
            <div className="store-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
              {[0,1,2].map(offset => {
                const idx = (active + offset) % products.length;
                const p = products[idx];
                if (!p) return null;
                const sellerName = p.seller || 'Anonymous';
                const currency = p.currency || 'NGN';
                return (
                  <div key={p.id || idx} style={cardStyle}>
                    <div style={imgWrapStyle}>
                      {p.image ? (
                        <img src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontFamily: 'Outfit,sans-serif', fontSize: 26, fontWeight: 900, background: 'var(--bg2)', color: 'var(--text3)' }}>
                          {(p.title || '???').slice(0, 3).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={titleRowStyle}>
                      <span style={titleStyle}>{p.title || p.name}</span>
                      <time style={dateStyle}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</time>
                    </div>
                    {p.description && <p style={descStyle}>{p.description}</p>}
                    <div style={creatorStyle}>
                      <div style={avatarStyle}>{sellerName.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{sellerName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>New creator</div>
                      </div>
                    </div>
                    <div style={priceRowStyle}>
                      <span style={primaryPriceStyle}>{formatPrice(p.price)} {currency}</span>
                      <span style={cryptoPriceStyle}>{formatPrice(p.price)} {currency}</span>
                    </div>
                    <a href={`/store/${p.id}`} style={viewBtnStyle}>
                      <I n="eye" s={16} /> View more
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {products.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 28 }}>
            {products.map((_, i) => (
              <span key={i} onClick={() => setActive(i)} style={{ width: active === i ? 44 : 34, height: 9, borderRadius: 999, cursor: "pointer", background: active === i ? "var(--accent)" : "var(--border2)", transition: "width .34s, background .34s" }} />
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
          <a href="/store" className="btn-pill"><I n="building-store" s={16} /> Explore All Products</a>
        </div>
      </div>
    </section>
  );
}

/* ─── GET STARTED ACCORDION ─────────────────────────────────────────────────── */
function GetStarted({ openAuth, navigate }) {
  const [open, setOpen] = useState(null);
  const roles = [
    {
      icon: "user-check", label: "I want to Earn",
      title: "Start Earning in Minutes",
      desc: "Browse available tasks, complete them, and receive instant Naira payouts to your wallet.",
      steps: [
        { title: "Create your account", detail: "Sign up free in under 60 seconds." },
        { title: "Browse open tasks", detail: "Filter by category, pay, or platform." },
        { title: "Submit your proof", detail: "Screenshot, link, or text — depends on the task." },
        { title: "Get paid instantly", detail: "Naira credited to your OgaPay wallet immediately." },
      ],
      primaryLabel: "Browse Jobs", primaryHref: "/tasks",
      secondaryLabel: "Create Account",
    },
    {
      icon: "building-store", label: "I want to Post Tasks",
      title: "Hire Nigeria's Workforce",
      desc: "Create tasks, set your budget, and get results from thousands of verified workers within hours.",
      steps: [
        { title: "Create a task", detail: "Social, creative, research, or custom jobs." },
        { title: "Fund your budget", detail: "Deposit Naira to your OgaPay wallet." },
        { title: "Workers apply", detail: "Review submissions and approve what you like." },
        { title: "Release payment", detail: "Pay only for approved work." },
      ],
      primaryLabel: "Post a Task", primaryHref: "/create",
      secondaryLabel: "View Pricing", secondaryHref: "/pricing",
    },
  ];
  return (
    <section style={{ padding: "40px 0 56px", background: "var(--bg)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 className="section-title">Get started today</h2>
          <p className="section-sub" style={{ maxWidth: 520 }}>Choose your path and start in under 5 minutes.</p>
        </div>
        <div className="gs-accordion" style={{ maxWidth: 720, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {roles.map((r, i) => (
            <div key={i} style={{ background: "var(--card)", border: open === i ? "2px solid #030341" : "2px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: open === i ? "0 0 0 3px rgba(3,3,65,.08)" : "none", transition: "border-color .25s, box-shadow .25s" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", width: "100%", background: "none", border: "none", textAlign: "left", color: "var(--text)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: open === i ? "#030341" : "var(--bg2)", display: "grid", placeItems: "center", color: open === i ? "#fff" : "var(--text)", flexShrink: 0, transition: "background .25s, color .25s" }}>
                  <I n={r.icon} s={22} />
                </div>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{r.label}</span>
                <I n="chevron-right" s={18} c={open === i ? "#030341" : "var(--text3)"} style={{ transform: open === i ? "rotate(90deg)" : "none", transition: "transform .35s" }} />
              </button>
              {open === i && (
                <div style={{ padding: "0 22px 24px", borderTop: "1px solid var(--border)", animation: "fadeUp .2s ease" }}>
                  <h3 style={{ fontFamily: "Outfit,sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: "-.6px", margin: "16px 0 8px" }}>{r.title}</h3>
                  <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6, margin: "0 0 22px" }}>{r.desc}</p>
                  <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
                    {r.steps.map((s, si) => (
                      <div key={si} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <div style={{ width: 28, height: 28, minWidth: 28, borderRadius: "50%", background: "#030341", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, marginTop: 2 }}>{si + 1}</div>
                        <div>
                          <strong style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{s.title}</strong>
                          <span style={{ color: "var(--text2)", fontSize: 13, lineHeight: 1.45 }}>{s.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <a href={r.primaryHref} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 26px", borderRadius: 10, background: "#030341", color: "#fff", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
                      <I n="arrow-right" s={15} c="#fff" /> {r.primaryLabel}
                    </a>
                    <button onClick={openAuth} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 26px", borderRadius: 10, background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)", fontWeight: 700, fontSize: 14 }}>
                      {r.secondaryLabel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── COMMUNITIES ────────────────────────────────────────────────────────────── */
function Communities() {
  const [comms, setComms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/communities/featured`).then(r => r.json())
        const data = Array.isArray(res) ? res : res?.data || []
        setComms(data.slice(0, 3))
      } catch {}
      setLoading(false)
    })()
  }, [])
  if (loading) return null
  const cardStyle = {
    borderRadius: 16,
    border: '1px solid var(--border)',
    background: 'var(--card)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
  };
  const coverStyle = (c: any) => ({
    width: '100%',
    height: 192,
    position: 'relative' as const,
    background: c.coverColor || (c.accentColor ? `${c.accentColor}20` : 'var(--bg2)'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Outfit,sans-serif',
    fontSize: 42,
    fontWeight: 900,
    color: c.coverTextColor || c.accentColor || 'var(--text3)',
    flexShrink: 0,
    overflow: 'hidden',
  });
  const badgeStyle = {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    background: '#22c55e',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: 999,
  };
  const bodyStyle = {
    padding: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    flex: 1,
  };
  const titleStyle = {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  };
  const statRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    fontSize: 12,
    color: 'var(--text3)',
  };
  const descStyle = {
    fontSize: 14,
    color: 'var(--text2)',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: 0,
    lineHeight: 1.4,
    minHeight: 58,
  };
  const bottomRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    padding: '0 16px 16px',
  };
  const distributedStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
  };
  const distributedLabelStyle = {
    fontSize: 12,
    color: 'var(--text3)',
    fontWeight: 400,
    marginLeft: 4,
  };
  const viewBtnStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    marginLeft: 'auto',
    textDecoration: 'none',
  };
  return (
    <section style={{ padding: "56px 0", background: "var(--bg)" }}>
      <div className="container">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div className="section-kicker"><I n="users-group" s={13} /> COMMUNITIES</div>
            <h2 className="section-title">Join a Community</h2>
          </div>
          <a href="/communities" style={{ color: "var(--text2)", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>View all <I n="chevron-right" s={16} /></a>
        </div>
        <div className="community-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
          {comms.map((c, i) => {
            const initials = (c.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={c.id || i} style={cardStyle}>
                <div style={coverStyle(c)}>
                  {c.coverImage ? (
                    <img src={c.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  ) : (
                    <span>{initials}</span>
                  )}
                  {c.isActive && <span style={badgeStyle}>ACTIVE</span>}
                </div>
                <div style={bodyStyle}>
                  <h3 style={titleStyle}>{c.name}</h3>
                  <div style={statRowStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><I n="users" s={12} /> {(c.memberCount || 0).toLocaleString()} members</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><I n="briefcase" s={12} /> {(c.jobCount || 0)} jobs</span>
                  </div>
                  <p style={descStyle}>{c.description || ''}</p>
                </div>
                <div style={bottomRowStyle}>
                  <span style={distributedStyle}>
                    ₦{(c.distributed || 0).toLocaleString()}
                    <span style={distributedLabelStyle}>distributed</span>
                  </span>
                  <a href={`/communities/${c.id}`} style={viewBtnStyle}>
                    View <I n="chevron-right" s={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ─────────────────────────────────────────────────────────────────── */
function Footer() {
  const cols = [
    { title: "Earn", links: ["Browse Jobs", "Task Categories", "Leaderboard", "Worker Portal"] },
    { title: "Post", links: ["Create Task", "Communities", "Analytics"] },
    { title: "Company", links: ["About", "Blog", "FAQ", "Support", "Terms", "Privacy"] },
  ];
  const socialLinks = {
    "brand-x": "https://x.com/Ogapayhq",
    "brand-telegram": "https://t.me/ogapay",
    "brand-instagram": "https://instagram.com/ogapayhq?igsh=ajJrZzJ3Z2tjMXZm",
    "brand-facebook": "https://www.facebook.com/share/18bRPkuPVy/",
    "brand-tiktok": "https://tiktok.com/@ogapay"
  };
  const linkHrefs = {
    "Browse Jobs": "/tasks", "Task Categories": "/tasks", "Leaderboard": "/leaderboard",
    "Worker Portal": "/worker-portal", "Create Task": "/create", "Communities": "/communities",
    "Analytics": "/analytics", "About": "/about", "Blog": "/blog",
    "FAQ": "/faq", "Support": "/support", "Terms": "/terms",
    "Privacy": "/privacy", "Cookies": "/cookies", "Security": "/security"
  };
  return (
    <footer className="footer-rich" style={{ position: 'relative', overflow: 'hidden' }}>
      <video autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15, pointerEvents: 'none' }}>
        <source src="https://ogapay-five.vercel.app/videos/ogapay-bg.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="footer-content">
          <div>
            <div className="footer-logo" style={{display:"flex",alignItems:"center",gap:10,fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:800}}>
              <Logo size={26} /> OgaPay
            </div>
            <p>Nigeria's microtask marketplace — work, earn, and grow your income.</p>
            <div className="social-icons">
              {Object.entries(socialLinks).map(([ic, href]) => (
                <a key={ic} href={href} target="_blank" rel="noopener noreferrer">
                  <I n={ic} s={15} />
                </a>
              ))}
            </div>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <nav>
                {col.links.map(l => (
                  <a key={l} href={linkHrefs[l] || "/"}>{l}</a>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 OgaPay Technologies Ltd. All rights reserved.</span>
          <span>Made with care for the gig economy.</span>
        </div>
      </div>
    </footer>
  );
}

function MobileBottomNav() {

  const items = [
    { icon: "home", label: "Home", href: "/" },
    { icon: "briefcase", label: "Jobs", href: "/tasks" },
    { icon: "circle-plus", label: "Create", href: "/create", create: true },
    { icon: "building-store", label: "Store", href: "/store" },
    { icon: "user", label: "Profile", href: "/profile" },
  ];
  return (
    <nav className="mobile-bottom-nav">
      {items.map(n => (
        <a key={n.label} href={n.href} className={n.create ? "create-btn" : ""}>
          {n.create
            ? <i className={`ti ti-${n.icon}`} />
            : <I n={n.icon} s={26} />
          }
          <span>{n.label}</span>
        </a>
      ))}
    </nav>
  );
}

/* ─── MOBILE DRAWER ──────────────────────────────────────────────────────────── */
function Drawer({ open, onClose, openAuth, isAuthed, navigate }) {
  const links = [
    { icon: "briefcase", label: "Jobs", desc: "Browse & earn from tasks", href: "/tasks" },
    { icon: "building-store", label: "Store", desc: "Products & services", href: "/store" },
    { icon: "users-group", label: "Communities", desc: "Join earner groups", href: "/communities" },
    { icon: "chart-bar", label: "Analytics", desc: "Track your performance", href: "/analytics" },
    { icon: "wallet", label: "Wallet", desc: "Manage your balance", href: "/wallet" },
    { icon: "circle-plus", label: "Post a Task", desc: "Hire OgaPay workers", href: "/create", highlight: true },
  ];
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }} />
      <div className="drawer" style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}>
        {/* Head */}
        <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Outfit,sans-serif", fontSize: 19, fontWeight: 800 }}>
            <Logo size={32} /> OgaPay
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--text2)" }}>
            <I n="x" s={18} />
          </button>
        </div>
        {/* Links */}
        <div style={{ padding: "10px 8px", overflowY: "auto", flex: 1 }}>
          {links.map(l => (
            <a key={l.label} href={l.href} className="drawer-item">
              <div className="drawer-icon" style={{ background: l.highlight ? "#f5f0ff" : "var(--bg2)", color: l.highlight ? "#315EFB" : "var(--text2)", borderColor: l.highlight ? "#e9e0ff" : "var(--border)" }}>
                <I n={l.icon} s={20} />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{l.label}</strong>
                <small style={{ display: "block", marginTop: 4, color: "var(--text2)", fontSize: 13 }}>{l.desc}</small>
              </div>
            </a>
          ))}
        </div>
        {/* Footer */}
        <div style={{ padding: "10px", borderTop: "1px solid var(--border)" }}>
          <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, borderRadius: 999, background: "#11151f", color: "#fff" }}>
            {isAuthed ? (
              <>
                <button onClick={() => { onClose(); navigate('/profile'); }} style={{ border: 0, background: "transparent", color: "#fff", fontSize: 15, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <I n="user-circle" s={17} c="#fff" /> Profile
                </button>
                <span style={{ color: "#333" }}>|</span>
                <button onClick={() => { onClose(); navigate('/settings'); }} style={{ border: 0, background: "transparent", color: "#fff", fontSize: 15, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <I n="settings" s={17} c="#fff" /> Settings
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { onClose(); navigate('/login'); }} style={{ border: 0, background: "transparent", color: "#fff", fontSize: 15, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <I n="login" s={17} c="#fff" /> Login
                </button>
                <span style={{ color: "#333" }}>|</span>
                <button onClick={() => { onClose(); navigate('/login?mode=signup'); }} style={{ border: 0, background: "transparent", color: "#fff", fontSize: 15, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <I n="user-plus" s={17} c="#fff" /> Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── AUTH MODAL ─────────────────────────────────────────────────────────────── */
function AuthModal({ open, onClose, mode, setMode }) {
  const isLogin = mode === "login";
  return (
    <div className={`auth-modal${open ? " open" : ""}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="auth-panel">
        {/* Head */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={28} />
            <span style={{ fontFamily: "Outfit,sans-serif", fontSize: 18, fontWeight: 800 }}>OgaPay</span>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--text2)" }}>
            <I n="x" s={16} />
          </button>
        </div>

        {/* Tab toggle */}
        <div style={{ display: "flex", margin: "20px 24px 0", border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, height: 40, border: "none", background: mode === m ? "var(--primary)" : "transparent", color: mode === m ? "#fff" : "var(--text2)", fontWeight: 700, fontSize: 14, transition: "background .14s, color .14s" }}>
              {m === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ padding: "24px 24px 28px" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 6 }}>Email address</label>
            <input className="auth-input" type="email" placeholder="you@example.com" />
          </div>
          {!isLogin && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 6 }}>Full name</label>
              <input className="auth-input" type="text" placeholder="Your full name" />
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 6 }}>Password</label>
            <input className="auth-input" type="password" placeholder="••••••••" />
          </div>
          {isLogin && (
            <div style={{ textAlign: "right", marginTop: -12, marginBottom: 16 }}>
              <a href="/forgot-password" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>Forgot password?</a>
            </div>
          )}
          <button style={{ width: "100%", height: 46, borderRadius: 10, background: "var(--primary)", color: "#fff", border: "none", fontWeight: 800, fontSize: 15 }}>
            {isLogin ? "Login to OgaPay" : "Create Account"}
          </button>
          {!isLogin && (
            <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
              By signing up you agree to our <a href="/terms" style={{ color: "var(--accent)" }}>Terms of Service</a> and <a href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>.
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ color: "var(--text3)", fontSize: 12, fontWeight: 700 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
          <button style={{ width: "100%", height: 44, borderRadius: 10, background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <I n="brand-google" s={18} /> Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openAuth = (mode = "signup") => {
    navigate(mode === "signup" ? '/login?mode=signup' : '/login');
  };

  // lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      <GlobalStyles />
      <Navbar theme={theme} toggleTheme={toggleTheme} openDrawer={() => setDrawerOpen(true)} isAuthed={isAuthed} navigate={navigate} />
      <main>
        <Hero openAuth={openAuth} navigate={navigate} isAuthed={isAuthed} />
        <TrustBar />
        <QuickTasks />
        <HowItWorks />
        <EarnPaths />
        <FeaturedJobs />
        <StoreSection />
        <GetStarted openAuth={openAuth} navigate={navigate} />
        <Communities />
      </main>
      <Footer />
      <MobileBottomNav />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} openAuth={openAuth} isAuthed={isAuthed} navigate={navigate} />

    </>
  );
}
