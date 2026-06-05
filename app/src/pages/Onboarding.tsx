import { useState } from "react";

const I = ({ n, s = 18, c = "currentColor" }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0 }} />
);

const Logo = ({ size = 28 }) => (
  <div style={{ width: size, height: size, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
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

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap');

  .og-wrap { font-family: "DM Sans", sans-serif; background: #f4f4f5; height: 100vh; display: flex; flex-direction: column; overflow: hidden; color: #111; font-size: 14px; }

  /* layout */
  .og-body { display: grid; grid-template-columns: 52px 1fr 268px; flex: 1; overflow: hidden; }

  /* sidebar */
  .og-side { background:#fff; border-right:1px solid #e4e4e7; display:flex; flex-direction:column; align-items:center; padding:14px 0; gap:4px; }
  .og-side-logo { margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #e4e4e7; width:100%; display:flex; justify-content:center; }
  .og-nav-btn { width:36px; height:36px; display:grid; place-items:center; border-radius:8px; color:#a1a1aa; cursor:pointer; transition:background .13s,color .13s; position:relative; border:none; background:transparent; }
  .og-nav-btn:hover { background:#f4f4f5; color:#111; }
  .og-nav-btn.act { background:#111; color:#fff; }
  .og-nav-btn.act::before { content:""; position:absolute; left:-1px; top:50%; transform:translateY(-50%); width:3px; height:18px; background:#111; border-radius:0 3px 3px 0; }
  .og-nav-divider { width:28px; border-top:1px solid #e4e4e7; margin:6px 0; }

  /* topbar */
  .og-top { background:#fff; border-bottom:1px solid #e4e4e7; height:48px; display:flex; align-items:center; justify-content:space-between; padding:0 20px; grid-column:1/-1; }
  .og-crumb { display:flex; align-items:center; gap:6px; color:#71717a; font-size:13px; font-weight:600; }
  .og-crumb .cur { color:#111; }
  .og-topright { display:flex; align-items:center; gap:10px; }
  .og-badge { background:#2563eb; color:#fff; font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; display:inline-flex; align-items:center; gap:5px; }
  .og-avatar { width:28px; height:28px; border-radius:50%; background:#111; display:grid; place-items:center; color:#fff; font-size:11px; font-weight:800; cursor:pointer; }

  /* content */
  .og-content { overflow-y:auto; padding:24px 22px; background:#fafafa; }
  .og-h1 { font-family:"Outfit",sans-serif; font-size:20px; font-weight:800; margin-bottom:2px; }
  .og-sub { font-size:13px; color:#71717a; margin-bottom:20px; }

  /* intro strip */
  .og-intro { background:#fff; border:1.5px solid #e4e4e7; border-radius:9px; padding:11px 14px; font-size:13px; color:#71717a; margin-bottom:18px; }
  .og-intro strong { color:#111; }
  .og-intro a { color:#111; font-weight:700; text-underline-offset:2px; }

  /* progress */
  .og-prog-row { display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:#71717a; margin-bottom:6px; }
  .og-prog-row span:last-child { color:#111; }
  .og-prog-track { height:4px; background:#e4e4e7; border-radius:99px; overflow:hidden; margin-bottom:22px; }
  .og-prog-fill { height:100%; background:#111; border-radius:99px; transition:width .4s ease; }

  /* step label */
  .og-step-lbl { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:#a1a1aa; margin-bottom:12px; display:flex; align-items:center; gap:6px; }

  /* platform grid */
  .og-platform-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:22px; position:relative; }
  .og-or { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); background:#fafafa; border:1px solid #e4e4e7; border-radius:20px; width:28px; height:28px; display:grid; place-items:center; font-size:11px; font-weight:800; color:#a1a1aa; z-index:2; }
  .og-pcard { background:#fff; border:1.5px solid #e4e4e7; border-radius:12px; padding:18px; cursor:pointer; transition:border-color .15s,box-shadow .15s; }
  .og-pcard:hover { border-color:#a1a1aa; box-shadow:0 2px 8px rgba(0,0,0,.06); }
  .og-pcard.sel { border-color:#111; box-shadow:0 0 0 3px rgba(17,17,17,.07); }
  .og-step-num { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border:1.5px solid #e4e4e7; border-radius:6px; font-size:11px; font-weight:800; color:#71717a; margin-bottom:14px; }
  .og-pcard h3 { font-family:"Outfit",sans-serif; font-size:15px; font-weight:800; line-height:1.2; margin-bottom:8px; }
  .og-pcard p { font-size:12px; color:#71717a; line-height:1.5; margin-bottom:14px; }

  /* os selector */
  .og-os { display:flex; align-items:center; gap:8px; border:1.5px solid #e4e4e7; border-radius:7px; padding:7px 11px; margin-bottom:10px; font-size:12px; font-weight:600; background:#fff; cursor:pointer; position:relative; transition:border-color .14s; }
  .og-os:hover { border-color:#a1a1aa; }
  .og-os select { position:absolute; opacity:0; inset:0; cursor:pointer; width:100%; }

  /* download btn */
  .og-dl { height:34px; padding:0 16px; background:#2563eb; color:#fff; border:none; border-radius:7px; font-size:13px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:7px; font-family:inherit; transition:background .14s; }
  .og-dl:hover { background:#1d4ed8; }
  .og-dl.green { background:#16a34a; }
  .og-dl.green:hover { background:#15803d; }

  /* connect card */
  .og-connect { background:#fff; border:1.5px solid #e4e4e7; border-radius:12px; padding:18px; margin-bottom:18px; }
  .og-connect h3 { font-family:"Outfit",sans-serif; font-size:15px; font-weight:800; margin-bottom:4px; }
  .og-connect p { font-size:12px; color:#2563eb; margin-bottom:12px; }

  /* provider options */
  .og-providers { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:14px; }
  .og-provider-opt { border:1.5px solid #e4e4e7; border-radius:8px; padding:10px 12px; cursor:pointer; text-align:center; font-size:12px; font-weight:700; transition:border-color .14s,background .14s; display:flex; flex-direction:column; align-items:center; gap:6px; }
  .og-provider-opt:hover { border-color:#a1a1aa; background:#fafafa; }
  .og-provider-opt.sel { border-color:#111; background:#f9f9f9; }
  .og-provider-opt span { font-size:10px; color:#71717a; font-weight:600; }

  /* checklist */
  .og-checklist { background:#fff; border:1.5px solid #e4e4e7; border-radius:12px; padding:14px 16px; margin-bottom:18px; }
  .og-cl-title { font-size:11px; font-weight:800; color:#71717a; text-transform:uppercase; letter-spacing:.08em; margin-bottom:12px; }
  .og-cl-item { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #f4f4f5; font-size:13px; font-weight:600; }
  .og-cl-item:last-child { border-bottom:none; padding-bottom:0; }
  .og-cl-item.done { color:#a1a1aa; text-decoration:line-through; }
  .og-check { width:20px; height:20px; border-radius:50%; border:2px solid #e4e4e7; flex-shrink:0; display:grid; place-items:center; background:#fff; }
  .og-check.done { background:#111; border-color:#111; }

  /* announce */
  .og-announce { background:#0f0f0f; border-radius:10px; padding:16px 18px; color:#fff; font-size:13px; line-height:1.55; position:relative; overflow:hidden; }
  .og-announce::before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 80% 50%,rgba(37,99,235,.28),transparent 60%); pointer-events:none; }
  .og-announce a { color:#22c55e; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px; }
  .og-announce-sub { display:flex; align-items:center; gap:6px; margin-top:8px; color:#a1a1aa; font-size:12px; }
  .og-announce-sub a { color:#a1a1aa; font-weight:600; font-size:12px; }

  /* right panel */
  .og-right { background:#fff; border-left:1px solid #e4e4e7; overflow-y:auto; padding:20px 16px; }
  .og-rh2 { font-family:"Outfit",sans-serif; font-size:16px; font-weight:800; margin-bottom:4px; }
  .og-rsub { font-size:12px; color:#71717a; margin-bottom:16px; line-height:1.5; }

  /* resource card */
  .og-res-card { border:1.5px solid #e4e4e7; border-radius:10px; padding:13px; margin-bottom:10px; display:flex; align-items:center; gap:12px; cursor:pointer; transition:border-color .14s,background .14s; text-decoration:none; color:inherit; }
  .og-res-card:hover { border-color:#a1a1aa; background:#fafafa; }
  .og-res-icon { width:38px; height:38px; border-radius:9px; display:grid; place-items:center; background:#f4f4f5; flex-shrink:0; }
  .og-res-card h4 { font-size:13px; font-weight:700; margin-bottom:2px; }
  .og-res-card p { font-size:11px; color:#71717a; }

  /* video card */
  .og-video { border:1.5px solid #e4e4e7; border-radius:10px; overflow:hidden; margin-bottom:14px; }
  .og-video-thumb { height:106px; background:linear-gradient(135deg,#f0f0f0,#e4e4e7); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; }
  .og-video-play { width:36px; height:36px; border-radius:50%; background:rgba(0,0,0,.08); display:grid; place-items:center; }
  .og-video-meta { padding:10px 12px; display:flex; align-items:flex-start; justify-content:space-between; }
  .og-video-meta h4 { font-size:12px; font-weight:700; margin-bottom:2px; }
  .og-video-meta small { font-size:10px; color:#71717a; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
  .og-divider { border-top:1px solid #e4e4e7; margin:14px 0; }
  .og-links-title { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:#a1a1aa; margin:14px 0 10px; }
  .og-rlink { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:#111; text-decoration:none; margin-bottom:8px; transition:color .14s; }
  .og-rlink:hover { color:#2563eb; }

  /* completion banner */
  .og-complete { background:linear-gradient(135deg,#052e16,#064e3b); border:1.5px solid #166534; border-radius:12px; padding:18px; color:#fff; margin-bottom:18px; display:flex; align-items:center; gap:14px; }
  .og-complete-icon { width:42px; height:42px; border-radius:10px; background:rgba(255,255,255,.1); display:grid; place-items:center; flex-shrink:0; }
`;

const SIDEBAR_ITEMS = [
  { icon: "home", key: "home", tip: "Home" },
  { icon: "layout-dashboard", key: "dashboard", tip: "Dashboard" },
  { icon: "shield", key: "shield", tip: "Security" },
  { icon: "map-pin", key: "location", tip: "Location" },
  { icon: "download", key: "download", tip: "Downloads" },
];

const PROVIDERS = [
  { icon: "device-desktop", label: "Desktop App", key: "desktop" },
  { icon: "browser", label: "Browser Ext", key: "chrome" },
  { icon: "terminal-2", label: "CLI", key: "cli" },
];

const RESOURCE_LINKS = [
  { label: "Our Twitter", icon: "brand-x" },
  { label: "Support", icon: "headset" },
  { label: "Back to Landing Page", icon: "home" },
];

export default function OgaPayOnboarding() {
  const [activeNav, setActiveNav] = useState("home");
  const [selectedPlatform, setPlatform] = useState(null);
  const [selectedProvider, setProvider] = useState(null);
  const [os, setOs] = useState("Windows");
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);

  const progress = [step1Done, step2Done].filter(Boolean).length;
  const pct = Math.round((progress / 2) * 100);
  const allDone = step1Done && step2Done;

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      <style>{css}</style>

      <div className="og-wrap">

        {/* ── Topbar (spans full width) ── */}
        <header className="og-top">
          <div className="og-crumb">
            <Logo size={22} />
            <span style={{ marginLeft: 6 }}>OgaPay</span>
            <I n="chevron-right" s={13} c="#d4d4d8" />
            <span>Provider</span>
            <I n="chevron-right" s={13} c="#d4d4d8" />
            <span>Statistics</span>
            <I n="chevron-right" s={13} c="#d4d4d8" />
            <span className="cur">Getting Started</span>
          </div>
          <div className="og-topright">
            {!allDone && (
              <span className="og-badge">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: .85, display: "inline-block", animation: "pulse 1.8s ease-in-out infinite" }} />
                {2 - progress} tasks pending
              </span>
            )}
            {allDone && (
              <span className="og-badge" style={{ background: "#16a34a" }}>
                <I n="check" s={11} c="#fff" /> Setup complete
              </span>
            )}
            <div className="og-avatar">A</div>
          </div>
        </header>

        {/* ── Body grid ── */}
        <div className="og-body">

          {/* Sidebar */}
          <aside className="og-side">
            <div className="og-side-logo"><Logo size={26} /></div>
            {SIDEBAR_ITEMS.map((s, i) => (
              <>
                {i === 4 && <div key="div" className="og-nav-divider" />}
                <button key={s.key} title={s.tip} className={`og-nav-btn${activeNav === s.key ? " act" : ""}`} onClick={() => setActiveNav(s.key)}>
                  <I n={s.icon} s={17} />
                </button>
              </>
            ))}
          </aside>

          {/* Main content */}
          <main className="og-content">

            {/* Page heading */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <h1 className="og-h1">Getting Started</h1>
                <p className="og-sub">Install your first provider today.</p>
              </div>
              {!allDone && (
                <span className="og-badge" style={{ marginTop: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: .85, display: "inline-block" }} />
                  {2 - progress} tasks pending
                </span>
              )}
            </div>

            {/* Intro strip */}
            <div className="og-intro">
              <strong>Anon,</strong> get started by{" "}
              <a href="#" style={{ textDecoration: "underline" }}>downloading the runtime</a>{" "}
              to begin receiving credits.
            </div>

            {/* Progress */}
            <div className="og-prog-row">
              <span>{progress} of 2 steps complete</span>
              <span>{pct}%</span>
            </div>
            <div className="og-prog-track">
              <div className="og-prog-fill" style={{ width: `${pct}%` }} />
            </div>

            {/* ── Completion banner ── */}
            {allDone && (
              <div className="og-complete">
                <div className="og-complete-icon">
                  <I n="check" s={22} c="#4ade80" />
                </div>
                <div>
                  <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 15, fontWeight: 800, marginBottom: 3 }}>Setup complete!</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>You're ready to start receiving tasks and earning on OgaPay.</div>
                </div>
              </div>
            )}

            {/* ── STEP 1 ── */}
            <div className="og-step-lbl">
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: step1Done ? "#16a34a" : "#d4d4d8", display: "inline-block", flexShrink: 0 }} />
              STEP 1: PICK A PLATFORM
            </div>

            <div className="og-platform-grid">
              <div className="og-or">OR</div>

              {/* 1A — Desktop App */}
              <div className={`og-pcard${selectedPlatform === "desktop" ? " sel" : ""}`} onClick={() => setPlatform("desktop")}>
                <div className="og-step-num">1A</div>
                <h3>Download the OgaPay desktop app</h3>
                <p>Available for Windows, Mac, and Linux. The fastest way to start receiving tasks and earning.</p>

                <div className="og-os" onClick={e => e.stopPropagation()}>
                  {os === "Windows" && (
                    <svg width="15" height="15" viewBox="0 0 16 16">
                      <path fill="#00adef" d="M0 0h7.5v7.5H0z"/>
                      <path fill="#f35325" d="M8.5 0H16v7.5H8.5z"/>
                      <path fill="#81bc06" d="M0 8.5h7.5V16H0z"/>
                      <path fill="#ffba08" d="M8.5 8.5H16V16H8.5z"/>
                    </svg>
                  )}
                  {os === "Mac" && <I n="brand-apple" s={14} />}
                  {os === "Linux" && <I n="brand-ubuntu" s={14} />}
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{os}</span>
                  <select value={os} onChange={e => setOs(e.target.value)}>
                    <option>Windows</option>
                    <option>Mac</option>
                    <option>Linux</option>
                  </select>
                  <I n="chevron-down" s={13} c="#a1a1aa" />
                </div>

                <button className={`og-dl${step1Done ? " green" : ""}`}
                  onClick={e => { e.stopPropagation(); setPlatform("desktop"); setStep1Done(true); }}>
                  {step1Done
                    ? <><I n="check" s={14} c="#fff" /> Downloaded</>
                    : <><I n="download" s={14} c="#fff" /> Download</>
                  }
                </button>
              </div>

              {/* 1B — Chrome Extension */}
              <div className={`og-pcard${selectedPlatform === "chrome" ? " sel" : ""}`} onClick={() => setPlatform("chrome")}>
                <div className="og-step-num">1B</div>
                <h3>Download the Chrome extension</h3>
                <p>Install our browser extension to get started with OgaPay directly in your browser.</p>

                <div className="og-os" style={{ cursor: "default", pointerEvents: "none" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                    <circle cx="12" cy="12" r="4" fill="white"/>
                    <path d="M12 8h8.5" stroke="#EA4335" strokeWidth="2.5"/>
                    <path d="M12 8 7.5 16" stroke="#34A853" strokeWidth="2.5"/>
                    <path d="M16.5 16H7.5" stroke="#FBBC05" strokeWidth="2.5"/>
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Chrome Extension</span>
                </div>

                <button className={`og-dl${step1Done ? " green" : ""}`}
                  onClick={e => { e.stopPropagation(); setPlatform("chrome"); setStep1Done(true); }}>
                  {step1Done
                    ? <><I n="check" s={14} c="#fff" /> Downloaded</>
                    : <><I n="download" s={14} c="#fff" /> Download</>
                  }
                </button>
              </div>
            </div>

            {/* ── STEP 2 ── */}
            <div className="og-step-lbl">
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: step2Done ? "#16a34a" : "#d4d4d8", display: "inline-block", flexShrink: 0 }} />
              STEP 2: CONNECT A PROVIDER
            </div>

            <div className="og-connect">
              <div className="og-step-num">2</div>
              <h3>Connect a provider</h3>
              <p>Use one of our provider runtimes to get started now.</p>

              <div className="og-providers">
                {PROVIDERS.map(p => (
                  <div key={p.key} className={`og-provider-opt${selectedProvider === p.key ? " sel" : ""}`} onClick={() => setProvider(p.key)}>
                    <I n={p.icon} s={20} c={selectedProvider === p.key ? "#111" : "#a1a1aa"} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: selectedProvider === p.key ? "#111" : "#71717a" }}>{p.label}</span>
                  </div>
                ))}
              </div>

              <button className={`og-dl${step2Done ? " green" : ""}`}
                onClick={() => setStep2Done(true)}>
                {step2Done
                  ? <><I n="check" s={14} c="#fff" /> Connected</>
                  : <><I n="plug" s={14} c="#fff" /> Connect Now</>
                }
              </button>
            </div>

            {/* Checklist */}
            <div className="og-checklist">
              <div className="og-cl-title">Setup Checklist</div>
              {[
                { label: "Download OgaPay app or extension", done: step1Done },
                { label: "Connect a provider runtime", done: step2Done },
              ].map((item, i) => (
                <div key={i} className={`og-cl-item${item.done ? " done" : ""}`}>
                  <div className={`og-check${item.done ? " done" : ""}`}>
                    {item.done && <I n="check" s={11} c="#fff" />}
                  </div>
                  {item.label}
                  {item.done && <I n="check" s={14} c="#16a34a" style={{ marginLeft: "auto" }} />}
                </div>
              ))}
            </div>

            {/* Announcement */}
            <div className="og-announce">
              <div style={{ position: "relative", zIndex: 1 }}>
                <span>OgaPay is now{" "}
                  <a href="#">available to all users. <I n="arrow-up-right" s={12} c="#22c55e" /></a>
                </span>
                <div className="og-announce-sub">
                  <I n="file-text" s={13} c="#a1a1aa" />
                  <a href="#">Read our documentation <I n="arrow-up-right" s={11} /></a>
                </div>
              </div>
            </div>

          </main>

          {/* ── Right panel ── */}
          <aside className="og-right">
            <h2 className="og-rh2">Resources</h2>
            <p className="og-rsub">Read our documentation, watch our video guides and join our community.</p>

            <a href="#" className="og-res-card">
              <div className="og-res-icon" style={{ background: "#5865F2" }}>
                <I n="brand-discord" s={20} c="#fff" />
              </div>
              <div>
                <h4>Discord support</h4>
                <p>Where the talk happens. Join the Discord ↗</p>
              </div>
            </a>

            <a href="#" className="og-res-card">
              <div className="og-res-icon">
                <I n="book" s={20} c="#111" />
              </div>
              <div>
                <h4>Documentation</h4>
                <p>Learn how to use OgaPay. Full docs ↗</p>
              </div>
            </a>

            <a href="#" className="og-res-card">
              <div className="og-res-icon" style={{ background: "#f59e0b" }}>
                <I n="users-group" s={20} c="#fff" />
              </div>
              <div>
                <h4>Community</h4>
                <p>Join Nigerian Earners Hub ↗</p>
              </div>
            </a>

            <div className="og-divider" />

            <h3 style={{ fontFamily: "Outfit,sans-serif", fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Video tutorials</h3>
            <p style={{ fontSize: 12, color: "#71717a", marginBottom: 12 }}>Step by step guides to get you started.</p>

            <div className="og-video">
              <div className="og-video-thumb">
                <div className="og-video-play">
                  <I n="player-play" s={16} c="#71717a" />
                </div>
                <span style={{ fontSize: 11, color: "#a1a1aa", fontWeight: 700 }}>Coming soon</span>
              </div>
              <div className="og-video-meta">
                <div>
                  <h4>An introduction to OgaPay API</h4>
                  <small>2 minute video</small>
                </div>
                <I n="arrow-up-right" s={15} c="#a1a1aa" />
              </div>
            </div>

            <div className="og-links-title">RESOURCE LINKS</div>
            {RESOURCE_LINKS.map(l => (
              <a key={l.label} href="#" className="og-rlink">
                <I n={l.icon} s={15} c="#a1a1aa" />
                {l.label}
                <I n="arrow-up-right" s={13} c="#a1a1aa" style={{ marginLeft: "auto" }} />
              </a>
            ))}

            {/* Progress widget */}
            <div className="og-divider" />
            <div style={{ background: "#f9f9f9", border: "1.5px solid #e4e4e7", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#71717a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Your Progress</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#111" }}>
                <span>{progress}/2 steps done</span>
                <span style={{ color: pct === 100 ? "#16a34a" : "#111" }}>{pct}%</span>
              </div>
              <div style={{ height: 6, background: "#e4e4e7", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#16a34a" : "#111", borderRadius: 99, transition: "width .4s ease" }} />
              </div>
              {pct === 100 && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <I n="check" s={14} c="#16a34a" /> All steps complete!
                </div>
              )}
            </div>
          </aside>

        </div>
      </div>
    </>
  );
}
