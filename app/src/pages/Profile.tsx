import { useState } from "react";
import { useNavigate } from 'react-router-dom'
import Layout from "../components/Layout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/* ─── Icons ─── */
const Icon = ({ n, s = 16, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
);

const XIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--text)">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.739l7.727-8.833L1.255 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

/* ─── Data ─── */
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
  { icon: "file-text", label: "Blogs", page: "blog" },
  { icon: "briefcase", label: "Available Jobs", page: "jobs" },
  { icon: "bookmark", label: "Bookmarks", page: "bookmarks" },
  { icon: "circle-plus", label: "Create Job", page: "create" },
];

const WORKERS = [
  { id: 1, username: 'Twitter_Automation_god', bio: 'I am a professional software developer and I write code that helps people save time and make money.', rating: 0, reviews: 0 },
  { id: 2, username: 'Dogo2541', bio: 'Active', rating: 0, reviews: 0 },
  { id: 3, username: 'Taki.Sakura', bio: 'Always available to help', rating: 0, reviews: 0 },
  { id: 4, username: 'Blueice', bio: 'That web3 guy', rating: 0, reviews: 0 },
  { id: 5, username: 'CHOCHO', bio: 'Hi, I\'m CHOCHO, a passionate graphic designer dedicated to transforming ideas into visually compelling and meaningful designs.', rating: 0, reviews: 0 },
  { id: 6, username: 'Wurk.Brainard', bio: 'Not a hell of an intro. Just a chill guy who\'s kinda into web3. Loves writing articles.', rating: 0, reviews: 0 },
  { id: 7, username: 'moony', bio: 'No bio available yet', rating: 3.9, reviews: 12 },
  { id: 8, username: 'ASQUARE', bio: 'Chasing the Big bag', rating: 3.5, reviews: 8 },
];

/* ─── Helpers ─── */
const f = new Intl.NumberFormat("en-US");
const refLink = "https://ogapay.vercel.app/ref/F48NUF...jemX";

function Toggle({ on, set }) {
  return (
    <button onClick={() => set(v => !v)} className="tg-btn">
      <span className={`tg-knob ${on ? "on" : ""}`} />
    </button>
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); };
  return (
    <button onClick={copy} className="btn-outline btn-sm">
      <Icon n={ok ? "check" : "copy"} s={13} c={ok ? "var(--green)" : "var(--text2)"} />
      {ok ? "Copied!" : "Copy"}
    </button>
  );
}

function StatRow({ label, val, info, valClass }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}{info && <Icon n="info-circle" s={13} c="var(--text3)" />}</span>
      <span className={`stat-val ${valClass === "no" ? "text-red" : valClass === "yes" ? "text-green" : ""}`}>
        {val}
      </span>
    </div>
  );
}

function Stars({ score = 0, size = 12 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= Math.round(score) ? '#facc15' : 'none'}
          stroke={i <= Math.round(score) ? '#facc15' : 'var(--border2)'} strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
      {score > 0 && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 2 }}>{score.toFixed(1)}</span>}
    </span>
  )
}

/* ─── Sub Pages (tabs) ─── */
function MyJobsTab() {
  const [form, setForm] = useState({ type: "active", search: "" });
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const jobs = [
    { title: "Social Media Engagement — Retweet & Like", tags: "X/Twitter · Social · Easy", desc: "Retweet the pinned post on X and like it.", reward: "0.025 SOL", filled: 42, total: 150 },
    { title: "App Testing — UI/UX Feedback", tags: "Mobile · Testing · Medium", desc: "Test the new beta version of the OgaPay mobile app.", reward: "0.05 SOL", filled: 12, total: 30 },
    { title: "Content Review — Proofread Blog Post", tags: "Google Docs · Content · Easy", desc: "Review a 500-word blog post about DeFi trends.", reward: "0.015 SOL", filled: 18, total: 40 },
  ];
  return (
    <div className="sub-page">
      <div className="page-head-sm"><Icon n="briefcase" s={20} /><h2>My Jobs</h2></div>
      <div className="form-row-group" style={{ display:"flex", gap:10, marginBottom:18 }}>
        {["active","pending","completed"].map(t => (
          <button key={t} onClick={() => setForm(f => ({...f,type:t}))} className={`pill-btn ${form.type===t?"active":""}`}>{t}</button>
        ))}
      </div>
      <div className="search-wrap" style={{ marginBottom:20 }}>
        <input value={form.search} onChange={s("search")} placeholder="Search jobs..." />
      </div>
      <div style={{ display:"grid", gap:12 }}>
        {jobs.map((j,i) => {
          const pct = Math.round((j.filled/j.total)*100);
          return (
            <div className="card card-sm" key={i}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{j.title}</div>
                  <div style={{ fontSize:11, color:"var(--text2)", fontWeight:600 }}>{j.tags}</div>
                  <div style={{ fontSize:12, color:"var(--text2)", marginTop:6 }}>{j.desc}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div className="text-green" style={{ fontFamily:"Outfit,sans-serif", fontSize:18, fontWeight:800 }}>{j.reward}</div>
                  <div style={{ fontSize:11, color:"var(--text3)" }}>{j.filled}/{j.total} slots</div>
                </div>
              </div>
              <div className="bar-wrap"><div className="bar-fill" style={{ width:`${pct}%`, background:pct===100?"var(--green)":"var(--primary)" }} /></div>
              <button className="btn-primary btn-sm" disabled={pct===100} style={{ opacity:pct===100?.5:1, cursor:pct===100?"not-allowed":"pointer" }}>
                {pct===100?"Filled":"Apply Now"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function Profile() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");
  const [showBal, setShowBal] = useState(false);
  const [swBal, setSwBal] = useState(false);
  const [earnPeriod, setEarnPeriod] = useState("7d");
  const [subPage, setSubPage] = useState(null);
  const [workerSearch, setWorkerSearch] = useState("");

  const data = earnPeriod === "7d" ? CHART_7 : CHART_30;
  const totalEarned = data.reduce((a, b) => a + b.val, 0);

  const filteredWorkers = WORKERS.filter(w =>
    w.username.toLowerCase().includes(workerSearch.toLowerCase()) ||
    w.bio.toLowerCase().includes(workerSearch.toLowerCase())
  );

  const tabs = [
    { id: "profile", label: "Profile", icon: "user" },
    { id: "earnings", label: "Earnings", icon: "currency-dollar" },
    { id: "jobs", label: "My Jobs", icon: "briefcase" },
    { id: "referrals", label: "Referrals", icon: "users" },
    { id: "alerts", label: "Alerts", icon: "bell" },
    { id: "portal", label: "Worker Portal", icon: "layout-dashboard" },
  ];

  if (subPage === "blog") {
    navigate('/blog');
  }

  if (subPage === "jobs") return <Layout><div className="pg">{subPage === "jobs" && <MyJobsTab />}</div></Layout>;
  if (subPage === "vault") { window.location.href = '/vault'; return null; }
  if (subPage === "create") { window.location.href = '/create'; return null; }
  if (subPage === "bookmarks") return <Layout><div className="pg"><div className="page-head-sm"><Icon n="bookmark" s={20} /><h2>Bookmarks</h2></div><div className="card card-sm" style={{textAlign:"center", padding:"48px 20px"}}><Icon n="bookmark-off" s={40} c="var(--text3)" /><div style={{fontSize:13,color:"var(--text3)",marginTop:12}}>No bookmarks yet.</div></div></div></Layout>;

  return (
    <Layout>
      <style>{`
        .pg{max-width:1060px;margin:0 auto;padding:0 20px 60px}
        .tab-bar{display:flex;gap:0;border-bottom:1px solid var(--border);margin:0 0 24px;overflow-x:auto}
        .tab-btn{height:44px;padding:0 16px;border:none;border-bottom:2px solid transparent;background:none;color:var(--text2);font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:7px;transition:color .13s,border-color .13s}
        .tab-btn:hover{color:var(--text)}
        .tab-btn.active{color:var(--text);border-bottom-color:var(--accent)}

        .prof-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
        @media(max-width:820px){.prof-grid{grid-template-columns:1fr}}
        .prof-full{grid-column:1/-1}

        .card{border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:none}
        .card-sm{background:var(--card)}
        .card-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);font-size:14px;font-weight:800}
        .card-body{padding:16px 18px}

        .stat-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px dashed var(--border);font-size:13px}
        .stat-row:last-child{border-bottom:none}
        .stat-label{color:var(--text2);font-weight:600;display:flex;align-items:center;gap:5px}
        .stat-val{font-weight:800;color:var(--text)}

        .addr-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px dashed var(--border);font-size:13px}
        .addr-val{font-family:monospace;font-size:12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;color:var(--text2)}
        .action-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
        .action-grid .full{grid-column:1/-1}

        .btn-primary{height:36px;padding:0 16px;border-radius:99px;border:none;background:var(--primary);color:var(--bg);font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:opacity .15s}
        .btn-primary:hover{opacity:.85}
        .btn-sm{height:34px;padding:0 14px;font-size:12px}
        .btn-outline{height:34px;padding:0 14px;border-radius:99px;border:1.5px solid var(--border);background:transparent;color:var(--text);font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:border-color .13s,color .13s}
        .btn-outline:hover{border-color:var(--text)}

        .quick-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:4px}
        @media(max-width:700px){.quick-grid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:480px){.quick-grid{grid-template-columns:repeat(2,1fr)}}
        .quick-item{display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px 8px;border:1.5px solid var(--border);border-radius:12px;background:var(--card);cursor:pointer;font-size:11px;font-weight:700;color:var(--text2);transition:border-color .13s,color .13s}
        .quick-item:hover{border-color:var(--text);color:var(--text)}

        .earn-top{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:16px 18px;border-bottom:1px solid var(--border)}
        @media(max-width:600px){.earn-top{grid-template-columns:1fr}}

        .period-group{display:flex;gap:8px}
        .period-btn{height:28px;padding:0 12px;border-radius:99px;border:1.5px solid var(--border);font-size:11px;font-weight:700;background:transparent;color:var(--text2);cursor:pointer}
        .period-btn.active{background:var(--primary);color:var(--bg);border-color:var(--primary)}

        .tb{width:100%;border-collapse:collapse}
        .tb th{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text2);padding:10px 14px;text-align:left;border-bottom:1px solid var(--border)}
        .tb td{padding:11px 14px;font-size:13px;color:var(--text2);border-bottom:1px solid var(--border)}
        .empty-td{text-align:center;color:var(--text3);padding:28px 14px}

        .ref-box{background:var(--bg2);border:1px solid var(--border);border-radius:9px;padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .ref-url{font-family:monospace;font-size:12px;color:var(--text2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

        .bar-wrap{height:5px;background:var(--bg2);border-radius:99px;overflow:hidden;margin-bottom:10px}
        .bar-fill{height:100%;border-radius:99px}

        .page-head-sm{display:flex;align-items:center;gap:8px;margin-bottom:20px}
        .page-head-sm h2{font-size:20px;font-weight:800;margin:0}

        .text-green{color:var(--green,#16a34a)}
        .text-red{color:#ef4444}
        .text-muted{color:var(--text2)}
        .sub-page{max-width:900px;margin:0 auto;padding:20px 0 40px}

        .tg-btn{width:44px;height:24px;border-radius:99px;border:none;cursor:pointer;background:var(--border2);position:relative;flex-shrink:0;transition:background .2s}
        .tg-knob{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--card);transition:left .2s;box-shadow:0 1px 2px rgba(0,0,0,.2)}
        .tg-knob.on{left:23px}

        .pill-btn{height:34px;padding:0 14px;border-radius:99px;border:1.5px solid var(--border);background:transparent;color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;text-transform:capitalize;transition:all .13s}
        .pill-btn.active{background:var(--primary);color:var(--bg);border-color:var(--primary)}
        .pill-btn:hover:not(.active){border-color:var(--text)}

        .search-wrap input{width:100%;height:38px;padding:0 14px;border:1.5px solid var(--border);border-radius:9px;background:var(--card);color:var(--text);font-size:13px;outline:none}
        .search-wrap input::placeholder{color:var(--text3)}

        .donut{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
        .donut-item{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--text2)}
        .donut-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}

        .worker-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
        .worker-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;cursor:pointer;transition:border-color .15s,transform .15s;display:flex;flex-direction:column;gap:10px}
        .worker-card:hover{border-color:var(--accent);transform:translateY(-2px)}
        .worker-row{display:flex;align-items:center;gap:10px}
        .worker-avatar{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:1px solid var(--border);display:grid;place-items:center;flex-shrink:0}
        .worker-avatar i{font-size:16px;color:var(--text3)}
        .worker-name{font-size:14px;font-weight:700;color:var(--text)}
        .worker-bio{font-size:12px;color:var(--text2);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .worker-footer{display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:6px;border-top:1px dashed var(--border)}

        .wp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
        @media(max-width:700px){.wp-stats{grid-template-columns:repeat(2,1fr)}}
        .stat-tile{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center}
        .stat-tile i{font-size:22px;margin-bottom:6px}
        .stat-number{font-family:"Outfit",sans-serif;font-size:22px;font-weight:900;color:var(--text)}
        .stat-label{font-size:11px;color:var(--text3);font-weight:600;margin-top:2px}

        .avatar-circle{width:52px;height:52px;border-radius:50%;background:var(--primary);color:var(--bg);font-size:18px;font-weight:800;display:grid;place-items:center;flex-shrink:0}
      `}</style>

      {/* ─────── Tab Bar ─────── */}
      <div className="pg">
      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab===t.id?"active":""}`} onClick={() => setTab(t.id)}>
            <Icon n={t.icon} s={15} c={tab===t.id?"var(--text)":"var(--text2)"} /> {t.label}
            {t.id==="alerts" && <span style={{width:7,height:7,borderRadius:"50%",background:"var(--accent)",display:"inline-block"}} />}
          </button>
        ))}
      </div>

      {/* ════════════ PROFILE TAB ════════════ */}
      {tab==="profile" && (
        <div className="prof-grid">
          {/* ─── LEFT: Account Information ─── */}
          <div className="card card-sm">
            <div className="card-head"><span><Icon n="wallet" s={16} /> Account Information</span></div>
            <div className="card-body">
              <div className="addr-row">
                <span style={{fontWeight:600,color:"var(--text2)"}}>Wallet Address</span>
                <span className="addr-val">F48NUF...jemX <CopyBtn text="F48NUF...jemX" /></span>
              </div>
              <div className="addr-row">
                <span style={{fontWeight:600,color:"var(--text2)"}}>Show all balances</span>
                <Toggle on={showBal} set={setShowBal} />
              </div>
              <div style={{padding:"12px 0",borderBottom:"1px dashed var(--border)"}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>OGA Balance</div>
                <div style={{fontSize:16,fontWeight:800}}>50 <span style={{color:"var(--accent)"}}>$OGA</span></div>
                <div style={{fontSize:12,color:"var(--text2)",marginTop:2}}>≈ $0.00 USD</div>
              </div>
              <div className="action-grid">
                <button className="btn-primary">Withdraw</button>
                <button className="btn-primary">Deposit</button>
                <button className="btn-primary full">Swap</button>
                <button className="btn-outline full">Pair Device</button>
                <button className="btn-outline full">Link extra wallet</button>
              </div>
              <div style={{padding:"12px 0 4px",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800}}>Auto Swap</div>
                  <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.4,marginTop:2}}>Auto-swap rewards to your preferred token. Min swap: 5 $OGA</div>
                  <div style={{display:"flex",gap:5,marginTop:6}}>
                    {["SOL","USDC","NGN"].map(t => (
                      <span key={t} className="chip" style={{display:"inline-flex",alignItems:"center",gap:4,border:"1.5px solid var(--border)",borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:700}}>{t}</span>
                    ))}
                  </div>
                </div>
                <Toggle on={swBal} set={setSwBal} />
              </div>
              <div style={{marginTop:8}}><a href="/wallet" style={{fontSize:12,color:"var(--accent)",fontWeight:600}}>View my withdrawals</a></div>
            </div>
          </div>

          {/* ─── RIGHT: Profile Info ─── */}
          <div className="card card-sm">
            <div className="card-head"><span><Icon n="user" s={16} /> Profile</span><button className="btn-outline btn-sm" onClick={() => navigate('/edit-profile')}>Edit</button></div>
            <div className="card-body">
              <div style={{display:"flex",alignItems:"center",gap:14,paddingBottom:14,borderBottom:"1px solid var(--border)",marginBottom:14}}>
                <div className="avatar-circle">TJ</div>
                <div>
                  <div style={{fontSize:17,fontWeight:800}}>Tom J.</div>
                  <div style={{fontSize:13,color:"var(--text2)"}}>@tomijimoh</div>
                </div>
              </div>
              <div style={{fontSize:13,lineHeight:1.5,marginBottom:14,color:"var(--text2)"}}>
                Crypto enthusiast & task earner. Building on Solana.
              </div>
              <div style={{display:"flex",gap:20,fontSize:13,fontWeight:700,paddingBottom:14,borderBottom:"1px solid var(--border)",marginBottom:14}}>
                <span>248 <span style={{fontWeight:400,color:"var(--text2)"}}>Followers</span></span>
                <span>129 <span style={{fontWeight:400,color:"var(--text2)"}}>Following</span></span>
              </div>
              <div>
                <StatRow label="Rank" val="Level 1" />
                <StatRow label="Sorsa score" val="0" />
                <StatRow label="OGA metric" val="0" />
                <StatRow label="Holdings last vault" val="0 $OGA" />
                <StatRow label="Verified X account" val="Yes" valClass="yes" />
                <StatRow label="Seeker user" val="No" valClass="no" />
                <div className="stat-row" style={{borderBottom:"none"}}>
                  <span className="stat-label">Human verified</span>
                  <button className="btn-primary btn-sm">Verify with VeryAI</button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── FULL WIDTH: Referral Link ─── */}
          <div className="card card-sm prof-full">
            <div className="card-head"><span><Icon n="link" s={16} /> Your Referral Link</span></div>
            <div className="card-body">
              <div className="ref-box">
                <span className="ref-url">{refLink}</span>
                <CopyBtn text={refLink} />
                <button className="btn-primary btn-sm"><XIcon size={12} /> Post on X</button>
              </div>
            </div>
          </div>

          {/* ─── FULL WIDTH: Quick Links ─── */}
          <div className="prof-full">
            <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:"var(--text2)"}}>Quick Links</div>
            <div className="quick-grid">
              {QUICK.map(q => (
                <div key={q.label} className="quick-item" onClick={() => {
                  if (q.page === "blog") navigate('/blog');
                  else if (q.page === "vault") navigate('/vault');
                  else if (q.page === "create") navigate('/create');
                  else if (q.page === "jobs") navigate('/tasks');
                  else setSubPage(q.page);
                }}>
                  <Icon n={q.icon} s={18} c="var(--text2)" />
                  <span>{q.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── FULL WIDTH: Earnings ─── */}
          <div className="card card-sm prof-full">
            <div className="card-head">
              <span><Icon n="chart-line" s={16} /> Earnings</span>
              <div className="period-group">
                <button className={`period-btn ${earnPeriod==="7d"?"active":""}`} onClick={()=>setEarnPeriod("7d")}>7 days</button>
                <button className={`period-btn ${earnPeriod==="30d"?"active":""}`} onClick={()=>setEarnPeriod("30d")}>30 days</button>
              </div>
            </div>
            <div className="earn-top">
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".06em"}}>Total Earned</div>
                <div style={{fontFamily:"Outfit,sans-serif",fontSize:26,fontWeight:900,margin:"4px 0"}}>{totalEarned.toFixed(2)} $OGA</div>
                <div style={{fontSize:12,color:"var(--text2)"}}>≈ $0.00 USD</div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",marginBottom:6}}>Breakdown</div>
                <div className="donut">
                  {DONUT_CATS.map(d => (
                    <div key={d.name} className="donut-item"><span className="donut-dot" style={{background:d.color}} />{d.name}</div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{padding:"14px 18px 18px"}}>
              <div style={{height:160}}>
                {(totalEarned===0) ? (
                  <div style={{textAlign:"center",padding:"50px 0",color:"var(--text3)",fontSize:12}}>
                    <Icon n="chart-bar-off" s={28} c="var(--text3)" /><br />No earnings data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{fontSize:10,fill:"var(--text3)"}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize:10,fill:"var(--text3)"}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}} />
                      <Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{r:4}} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* ─── FULL WIDTH: Withdrawal History ─── */}
          <div className="card card-sm prof-full">
            <div className="card-head"><span><Icon n="history" s={16} /> Withdrawal History</span></div>
            <div style={{overflowX:"auto"}}>
              <table className="tb"><thead><tr><th>AMOUNT</th><th>TRANSACTION</th><th>DATE</th></tr></thead>
              <tbody><tr><td colSpan={3} className="empty-td">No withdrawals yet</td></tr></tbody></table>
            </div>
          </div>

          {/* ─── FULL WIDTH: Swap History ─── */}
          <div className="card card-sm prof-full">
            <div className="card-head"><span><Icon n="arrows-exchange" s={16} /> Swap History</span></div>
            <div style={{overflowX:"auto"}}>
              <table className="tb"><thead><tr><th>FROM</th><th>TO</th><th>AMOUNT</th><th>RECEIVED</th><th>DATE</th></tr></thead>
              <tbody><tr><td colSpan={5} className="empty-td">No swaps yet</td></tr></tbody></table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ EARNINGS TAB ════════════ */}
      {tab==="earnings" && (
        <div style={{maxWidth:900,margin:"0 auto",padding:"0 0 40px"}}>
          <div className="page-head-sm"><Icon n="currency-dollar" s={20} /><h2>Earnings</h2></div>
          <div className="card card-sm">
            <div className="card-head">
              <span>Overview</span>
              <div className="period-group">
                <button className={`period-btn ${earnPeriod==="7d"?"active":""}`} onClick={()=>setEarnPeriod("7d")}>7 days</button>
                <button className={`period-btn ${earnPeriod==="30d"?"active":""}`} onClick={()=>setEarnPeriod("30d")}>30 days</button>
              </div>
            </div>
            <div className="earn-top">
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".06em"}}>Total Earned</div>
                <div style={{fontFamily:"Outfit,sans-serif",fontSize:28,fontWeight:900,margin:"4px 0"}}>{totalEarned.toFixed(2)} $OGA</div>
                <div style={{fontSize:12,color:"var(--text2)"}}>≈ $0.00 USD</div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",marginBottom:8}}>Earning Sources</div>
                <div className="donut">
                  {DONUT_CATS.map(d => (
                    <div key={d.name} className="donut-item"><span className="donut-dot" style={{background:d.color}} />{d.name}</div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{padding:"14px 18px 18px"}}>
              <div style={{height:200}}>
                {totalEarned===0 ? (
                  <div style={{textAlign:"center",padding:"60px 0",color:"var(--text3)",fontSize:12}}>
                    <Icon n="chart-bar-off" s={32} c="var(--text3)" /><br />No earnings data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{fontSize:10,fill:"var(--text3)"}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize:10,fill:"var(--text3)"}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}} />
                      <Line type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{r:4}} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MY JOBS TAB ════════════ */}
      {tab==="jobs" && <MyJobsTab />}

      {/* ════════════ REFERRALS TAB ════════════ */}
      {tab==="referrals" && (
        <div style={{maxWidth:900,margin:"0 auto",padding:"0 0 40px"}}>
          <div className="page-head-sm"><Icon n="users" s={20} /><h2>Referrals</h2></div>
          <div className="card card-sm" style={{marginBottom:20}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)"}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Your Referral Link</div>
              <div className="ref-box">
                <span className="ref-url">{refLink}</span>
                <CopyBtn text={refLink} />
                <button className="btn-primary btn-sm"><XIcon size={12} /> Post on X</button>
              </div>
            </div>
            <table className="tb"><thead><tr><th>USER</th><th>JOINED</th><th>EARNINGS</th><th>STATUS</th></tr></thead>
            <tbody><tr><td colSpan={4} className="empty-td">No referrals yet. Share your link to start earning!</td></tr></tbody></table>
          </div>
        </div>
      )}

      {/* ════════════ ALERTS TAB ════════════ */}
      {tab==="alerts" && (
        <div style={{maxWidth:900,margin:"0 auto",padding:"0 0 40px"}}>
          <div className="page-head-sm"><Icon n="bell" s={20} /><h2>Alerts</h2></div>
          <div className="card card-sm">
            <div className="card-head">
              <span><Icon n="bell" s={16} /> Notifications</span>
              <button className="btn-sm" style={{fontSize:12,fontWeight:700,color:"var(--accent)",border:"none",background:"none",cursor:"pointer"}}>Mark all read</button>
            </div>
            <div style={{textAlign:"center",padding:"48px 20px"}}>
              <Icon n="bell-off" s={40} c="var(--text3)" />
              <div style={{fontSize:13,color:"var(--text3)",marginTop:12}}>No alerts yet. We'll notify you about new jobs, earnings, and updates.</div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ WORKER PORTAL TAB ════════════ */}
      {tab==="portal" && (
        <div style={{maxWidth:1060,margin:"0 auto",padding:"0 0 40px"}}>
          <div className="page-head-sm"><Icon n="layout-dashboard" s={20} /><h2>Worker Portal</h2></div>

          {/* Stats */}
          <div className="wp-stats">
            {[
              { icon:"ti ti-star", color:"var(--accent)", label:"Reviews", val:"124" },
              { icon:"ti ti-zap", color:"#F59E0B", label:"Challenges", val:"8" },
              { icon:"ti ti-trophy", color:"#16a34a", label:"Won", val:"12" },
              { icon:"ti ti-heart", color:"#EC4899", label:"Compliments", val:"34" },
            ].map(s => (
              <div key={s.label} className="stat-tile">
                <i className={s.icon} style={{color:s.color}} />
                <div className="stat-number">{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="search-wrap" style={{marginBottom:16}}>
            <input value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} placeholder="Search workers..." />
          </div>

          {/* Worker Grid */}
          <div className="worker-grid">
            {filteredWorkers.length === 0 ? (
              <div style={{gridColumn:"1/-1",textAlign:"center",padding:"48px 20px",color:"var(--text3)"}}>
                <Icon n="search-off" s={32} c="var(--text3)" /><br />No workers found
              </div>
            ) : filteredWorkers.map(w => (
              <div key={w.id} className="worker-card">
                <div className="worker-row">
                  <div className="worker-avatar"><i className="ti ti-user" /></div>
                  <div className="worker-name">{w.username}</div>
                </div>
                <div className="worker-bio">{w.bio}</div>
                <div className="worker-footer">
                  <Stars score={w.rating} size={11} />
                  <span style={{fontSize:11,color:"var(--text3)"}}>{w.reviews} reviews</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{marginTop:20,textAlign:"center",fontSize:12,color:"var(--text3)"}}>
            <i className="ti ti-users" style={{fontSize:14,marginRight:4}} /> Found {filteredWorkers.length} workers
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}
