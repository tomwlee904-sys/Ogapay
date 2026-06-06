import { useState, useEffect } from "react";
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
/* ─── Worker Portal Content ─── */
function WorkerPortalContent() {
  const navigate = useNavigate();

  const navItems = [
    { icon: 'ti ti-building-store', label: 'My Store' },
    { icon: 'ti ti-article', label: 'My Blogs' },
    { icon: 'ti ti-briefcase', label: 'My Work' },
    { icon: 'ti ti-message', label: 'Messages' },
    { icon: 'ti ti-users', label: 'Communities' },
    { icon: 'ti ti-file-check', label: 'My Submissions' },
    { icon: 'ti ti-pencil', label: 'Reviews to Write' },
    { icon: 'ti ti-star', label: 'My Reviews' },
    { icon: 'ti ti-eye', label: 'View My Profile' },
  ];

  const stats = [
    { icon: 'ti ti-star', color: '#1F8CFF', count: 124, label: 'Reviews' },
    { icon: 'ti ti-zap', color: '#F59E0B', count: 8, label: 'Challenges Participated' },
    { icon: 'ti ti-trophy', color: '#16a34a', count: 12, label: 'Won' },
    { icon: 'ti ti-heart', color: '#EC4899', count: 34, label: 'Compliments' },
    { icon: 'ti ti-users', color: '#2563EB', count: 15, label: 'Communities' },
    { icon: 'ti ti-gift', color: '#1F8CFF', count: 28, label: 'Tips Received' },
    { icon: 'ti ti-file-text', color: '#F59E0B', count: 6, label: 'Blogs' },
  ];

  return (
    <div className="wp-page">
      <div className="wp-nav-grid">
        {navItems.slice(0, 5).map((t, i) => (
          <div key={i} className="wp-nav-tile" style={{ borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
            <i className={t.icon} />
            <span>{t.label}</span>
          </div>
        ))}
      </div>
      <div className="wp-nav-grid-2">
        {navItems.slice(5).map((t, i) => (
          <div key={i} className="wp-nav-tile" style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <i className={t.icon} />
            <span>{t.label}</span>
          </div>
        ))}
      </div>
      <div className="wp-bread">
        <span onClick={() => navigate('/store')}>Dashboard</span>
        <i className="ti ti-chevron-right" style={{ fontSize: 10, color: 'var(--border2)' }} />
        <span className="current">Worker Portal</span>
      </div>
      <div className="wp-hero"><h1>Welcome back</h1></div>
      <div className="wp-stats-row">
        <span><i className="ti ti-star" /> No wins yet</span>
        <span><i className="ti ti-users" /> No communities</span>
        <span><i className="ti ti-heart" /> No compliments</span>
      </div>
      <div className="wp-profile-card">
        <div className="wp-profile-top">
          <div className="wp-avatar-box"><i className="ti ti-user" /></div>
          <div className="wp-profile-info">
            <div className="wp-profile-name">
              No nickname yet
              <button className="wp-edit-btn" onClick={() => navigate('/edit-profile')}>
                <i className="ti ti-pencil" style={{ fontSize: 13 }} /> Edit Profile
              </button>
            </div>
          </div>
        </div>
        <div className="wp-bio-box">
          <div className="wp-bio-label">Bio</div>
          <div className="wp-bio-text">No bio yet. Add one to tell others about yourself!</div>
        </div>
      </div>
      <div className="wp-stats-list">
        {stats.map((s, i) => (
          <div key={i} className="wp-stat-row">
            <i className={`${s.icon} wp-stat-icon`} style={{ color: s.color }} />
            <span className="wp-stat-count">{s.count}</span>
            <span className="wp-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── My Blog Posts Section ─── */
function BlogPostsSection() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ogapay_user_posts') || '[]')
      setPosts(stored.reverse())
    } catch { setPosts([]) }
  }, [])

  const deletePost = (id: number) => {
    try {
      const stored = JSON.parse(localStorage.getItem('ogapay_user_posts') || '[]')
      const updated = stored.filter((p: any) => p.id !== id)
      localStorage.setItem('ogapay_user_posts', JSON.stringify(updated))
      setPosts(updated.reverse())
    } catch {}
  }

  const badgeColors: Record<string, string> = {
    News: '#185FA5', Businesses: '#3B6D11', Freelancers: '#534AB7', 'Case Studies': '#993556',
  }

  const published = posts.filter(p => p.status === 'published')
  const drafts = posts.filter(p => p.status === 'draft')

  return (
    <div className="card card-sm prof-full">
      <div className="card-head">
        <span><Icon n="file-text" s={16} /> My Blog Posts</span>
        <button className="btn-primary btn-sm" onClick={() => navigate('/blog/write')}>
          <i className="ti ti-plus" style={{fontSize:13}} /> Write Article
        </button>
      </div>
      <div className="card-body">
        {posts.length === 0 ? (
          <div style={{textAlign:'center',padding:'32px 20px',color:'var(--text3)'}}>
            <Icon n="file-text" s={36} c="var(--text3)" />
            <div style={{fontSize:13,marginTop:10}}>No articles yet. Write your first one!</div>
          </div>
        ) : (
          <div>
            {drafts.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Drafts ({drafts.length})</div>
                {drafts.map(p => (
                  <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px dashed var(--border)',fontSize:13}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
                      <div style={{width:4,height:4,borderRadius:'50%',background:'var(--text3)',flexShrink:0}} />
                      <span style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title || 'Untitled'}</span>
                      <span style={{fontSize:11,color:'var(--text3)',fontWeight:600}}>{p.category}</span>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn-outline btn-sm" onClick={() => navigate(`/blog/edit/${p.id}`)}>Edit</button>
                      <button className="btn-sm" style={{height:34,padding:'0 12px',borderRadius:99,border:'1.5px solid #fca5a5',background:'transparent',color:'#dc2626',fontSize:11,fontWeight:700,cursor:'pointer'}} onClick={() => deletePost(p.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {published.length > 0 && (
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Published ({published.length})</div>
                {published.map(p => (
                  <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px dashed var(--border)',fontSize:13}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
                      <div style={{width:18,height:18,borderRadius:4,background:p.coverColor || '#534AB7',flexShrink:0}} />
                      <span style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</span>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,background:'#EEEDFE',color:'#534AB7',fontWeight:600}}>{p.category}</span>
                      <span style={{fontSize:11,color:'var(--text3)'}}>{p.date}</span>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn-outline btn-sm" onClick={() => navigate(`/blog/edit/${p.id}`)}>Edit</button>
                      <button className="btn-sm" style={{height:34,padding:'0 12px',borderRadius:99,border:'1.5px solid #fca5a5',background:'transparent',color:'#dc2626',fontSize:11,fontWeight:700,cursor:'pointer'}} onClick={() => deletePost(p.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");
  const [showBal, setShowBal] = useState(false);
  const [swBal, setSwBal] = useState(false);
  const [earnPeriod, setEarnPeriod] = useState("7d");
  const [subPage, setSubPage] = useState(null);
  const [accountNumber, setAccountNumber] = useState("0123456789");
  const [bankName, setBankName] = useState("Access Bank");
  const [accountName, setAccountName] = useState("Tomijimoh O.");
  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankMsg, setBankMsg] = useState("");
  const [showKyc, setShowKyc] = useState(false);
  const [bvnNumber, setBvnNumber] = useState("");
  const [kycStep, setKycStep] = useState("idle");
  const [kycMsg, setKycMsg] = useState("");
  const [kycLoading, setKycLoading] = useState(false);


  const data = earnPeriod === "7d" ? CHART_7 : CHART_30;
  const totalEarned = data.reduce((a, b) => a + b.val, 0);

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
        .pg{width:100%;max-width:100%;margin:0 auto;padding:0 16px 60px}
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
        .wp-page{max-width:800px;margin:0 auto;padding:0 0 40px}
        .wp-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--border);margin-bottom:24px}
        .wp-nav-grid-2{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border);margin-bottom:24px}
        .wp-nav-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 8px;gap:10px;cursor:pointer;border-right:1px solid var(--border);transition:all .15s;min-height:90px}
        .wp-nav-tile:hover{background:var(--bg2)}
        .wp-nav-tile:last-child{border-right:none}
        .wp-nav-tile i{font-size:26px;color:var(--text3);transition:color .15s}
        .wp-nav-tile:hover i{color:var(--accent)}
        .wp-nav-tile span{font-size:11px;color:var(--text3);text-align:center;line-height:1.3;font-weight:600}
        .wp-bread{font-size:12px;color:var(--text3);margin-bottom:12px;display:flex;align-items:center;gap:6px}
        .wp-bread span{cursor:pointer;color:var(--text2)}
        .wp-bread span:hover{color:var(--accent)}
        .wp-bread .current{color:var(--text2);font-weight:600}
        .wp-hero h1{font-size:22px;font-weight:800;margin:0 0 16px;color:var(--text)}
        .wp-stats-row{display:flex;gap:20px;margin-bottom:24px;flex-wrap:wrap}
        .wp-stats-row span{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text3)}
        .wp-stats-row i{font-size:14px;color:var(--text3)}
        .wp-profile-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px}
        .wp-profile-top{display:flex;align-items:flex-start;gap:16px}
        .wp-avatar-box{width:72px;height:72px;border-radius:10px;background:var(--bg2);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--border)}
        .wp-avatar-box i{font-size:32px;color:var(--text3)}
        .wp-profile-info{flex:1;min-width:0}
        .wp-profile-name{font-size:18px;font-weight:800;color:var(--text);display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
        .wp-edit-btn{font-size:12px;padding:7px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-weight:600;white-space:nowrap;transition:all .15s}
        .wp-edit-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--card)}
        .wp-bio-box{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px;margin-top:14px}
        .wp-bio-label{font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.06em;margin-bottom:6px;text-transform:uppercase}
        .wp-bio-text{font-size:13px;color:var(--text2);line-height:1.5}
        .wp-stats-list{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
        .wp-stat-row{display:flex;align-items:center;gap:14px;padding:15px 18px;border-bottom:1px solid var(--border);transition:background .15s}
        .wp-stat-row:last-child{border-bottom:none}
        .wp-stat-row:hover{background:var(--bg2)}
        .wp-stat-icon{font-size:20px;width:24px;text-align:center}
        .wp-stat-count{font-size:16px;font-weight:800;color:var(--text);min-width:30px}
        .wp-stat-label{font-size:14px;color:var(--text2);font-weight:500}
        @media(max-width:600px){.wp-nav-grid{grid-template-columns:repeat(3,1fr)}.wp-nav-grid-2{grid-template-columns:repeat(3,1fr)}.wp-profile-top{flex-direction:column;align-items:center;text-align:center}.wp-profile-name{flex-direction:column;align-items:center}.wp-avatar-box{width:64px;height:64px}}
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

              {/* ─── Bank Account Details ─── */}
              <div style={{padding:"12px 0 4px",borderTop:"1px solid var(--border)",marginTop:12}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:800}}>Bank Account (NGN)</div>
                  <button className="btn-sm" style={{fontSize:11,fontWeight:700,color:"var(--accent)",border:"none",background:"none",cursor:"pointer"}}
                    onClick={() => setEditingBank(v => !v)}>
                    <Icon n={editingBank ? "x" : "edit"} s={13} /> {editingBank ? "Cancel" : "Edit"}
                  </button>
                </div>
                {editingBank ? (
                  <div>
                    <input className="dash-input" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account holder name" style={{marginBottom:6}} />
                    <input className="dash-input" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name" style={{marginBottom:6}} />
                    <input className="dash-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" style={{marginBottom:8}} />
                    <div style={{display:"flex",gap:8}}>
                      <button className="dash-btn" style={{height:34,fontSize:12}}
                        onClick={async () => {
                          setSavingBank(true); setBankMsg("");
                          try {
                            const token = localStorage.getItem('ogapay_access_token');
                            if (token) {
                              await fetch('https://ogapay-production.up.railway.app/api/v1/users/me', {
                                method: 'PATCH',
                                headers: {'Content-Type':'application/json','Authorization':'Bearer '+token},
                                body: JSON.stringify({accountNumber, bankName, accountName}),
                              });
                            }
                            setBankMsg("Bank details saved!");
                            setTimeout(() => { setBankMsg(""); setEditingBank(false); }, 2000);
                          } catch { setBankMsg("Failed to save"); }
                          setSavingBank(false);
                        }}>
                        <Icon n="check" s={13} /> Save
                      </button>
                      {bankMsg && <span style={{fontSize:11,color:"var(--green)",padding:"8px 0"}}>{bankMsg}</span>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="addr-row" style={{borderBottom:"none"}}>
                      <span style={{fontSize:12,color:"var(--text2)"}}>Account Name</span>
                      <span style={{fontWeight:700,fontSize:13}}>{accountName}</span>
                    </div>
                    <div className="addr-row" style={{borderBottom:"none"}}>
                      <span style={{fontSize:12,color:"var(--text2)"}}>Bank</span>
                      <span style={{fontWeight:700,fontSize:13}}>{bankName}</span>
                    </div>
                    <div className="addr-row" style={{borderBottom:"none"}}>
                      <span style={{fontSize:12,color:"var(--text2)"}}>Account Number</span>
                      <span style={{fontWeight:700,fontSize:13,fontFamily:"monospace"}}>{accountNumber}</span>
                    </div>
                  </div>
                )}
              </div>
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
                  <button className="btn-primary btn-sm" onClick={() => setShowKyc(true)}>Verify Identity (KYC)</button>
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
                <div style={{fontSize:16,fontWeight:800,marginTop:2}}>≈ NGN 0.00</div>
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

          {/* ─── FULL WIDTH: My Blog Posts ─── */}
          <BlogPostsSection />
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
        <WorkerPortalContent />
      )}
      </div>
    
      {/* ─── KYC / BVN Verification Modal ─── */}
      {showKyc && (
        <div className="review-overlay" onClick={() => setShowKyc(false)}>
          <div className="review-modal" onClick={e => e.stopPropagation()} style={{
            position:'fixed', inset:0, zIndex:1000, display:'grid', placeItems:'center',
            background:'rgba(0,0,0,0.5)', padding:20, overflowY:'auto',
          }}>
            <div style={{
              background:'var(--card)', borderRadius:16, maxWidth:480, width:'100%',
              maxHeight:'90vh', overflow:'auto', border:'1px solid var(--border)', padding:'28px 30px',
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                <h2 style={{fontFamily:'Outfit',fontSize:18,fontWeight:800,margin:0}}>Identity Verification (KYC)</h2>
                <button onClick={() => setShowKyc(false)} style={{width:32,height:32,borderRadius:8,border:'1px solid var(--border)',background:'var(--card)',cursor:'pointer',display:'grid',placeItems:'center',fontSize:16,color:'var(--text2)'}}><i className="ti ti-x" /></button>
              </div>

              {kycStep === "idle" && (
                <div>
                  <p style={{fontSize:13,color:'var(--text2)',marginBottom:20,lineHeight:1.6}}>
                    Verify your identity to unlock withdrawals and access all features. 
                    You can verify using your BVN (Bank Verification Number).
                  </p>
                  <div style={{background:'var(--bg2)',borderRadius:10,padding:16,marginBottom:20}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:4}}>Required for:</div>
                    <div style={{display:'grid',gap:6}}>
                      {["Withdrawals above NGN 10,000","Task creation (Poster role)","Higher task rewards","Trust & reputation"].map((item,i) => (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text2)'}}>
                          <i className="ti ti-check" style={{color:'#16a34a',fontSize:14}} /> {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="dash-btn" style={{width:'100%',justifyContent:'center'}}
                    onClick={() => setKycStep("bvn")}>
                    <Icon n="shield-check" s={16} /> Start Verification
                  </button>
                  <p style={{fontSize:11,color:'var(--text3)',textAlign:'center',marginTop:12}}>
                    Your data is encrypted and securely processed.
                  </p>
                </div>
              )}

              {kycStep === "bvn" && (
                <div>
                  <p style={{fontSize:13,color:'var(--text2)',marginBottom:16}}>
                    Enter your BVN (Bank Verification Number) to verify your identity.
                  </p>
                  <div style={{marginBottom:16}}>
                    <label style={{fontSize:12,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:6}}>BVN</label>
                    <input className="dash-input" value={bvnNumber} onChange={e => setBvnNumber(e.target.value.replace(/\D/g,'').slice(0,11))}
                      placeholder="Enter 11-digit BVN" maxLength={11}
                      style={{fontSize:16,letterSpacing:2,fontWeight:700,textAlign:'center'}} />
                  </div>
                  {kycMsg && <div style={{fontSize:12,color:kycMsg.includes('successful')?'var(--green)':'#DC2626',marginBottom:12}}>{kycMsg}</div>}
                  <button className="dash-btn" style={{width:'100%',justifyContent:'center',opacity:bvnNumber.length!==11?0.5:1}}
                    disabled={bvnNumber.length!==11 || kycLoading}
                    onClick={async () => {
                      if (bvnNumber.length !== 11) return;
                      setKycLoading(true); setKycMsg("");
                      try {
                        const token = localStorage.getItem('ogapay_access_token');
                        if (!token) { setKycMsg("Please log in first"); setKycLoading(false); return; }
                        const res = await fetch('https://ogapay-production.up.railway.app/api/v1/kyc/submit', {
                          method: 'POST',
                          headers: {'Content-Type':'application/json','Authorization':'Bearer '+token},
                          body: JSON.stringify({
                            idType: 'BVN',
                            idNumber: bvnNumber,
                            dateOfBirth: new Date().toISOString(),
                          }),
                        });
                        const json = await res.json();
                        if (json.success) {
                          setKycMsg("KYC submitted successfully! Verification takes 1-24 hours.");
                          setKycStep("submitted");
                        } else {
                          setKycMsg(json.message || "Submission failed");
                        }
                      } catch (err) {
                        setKycMsg("Service unavailable. Try again later.");
                      }
                      setKycLoading(false);
                    }}>
                    {kycLoading ? <><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} /> Submitting...</> : <><Icon n="shield-check" s={16} /> Submit KYC</>}
                  </button>
                  <button style={{display:'block',margin:'12px auto 0',border:'none',background:'none',fontSize:12,color:'var(--text3)',cursor:'pointer'}}
                    onClick={() => { setKycStep("idle"); setKycMsg(""); }}>
                    Back
                  </button>
                </div>
              )}

              {kycStep === "submitted" && (
                <div style={{textAlign:'center',padding:'20px 0'}}>
                  <div style={{width:64,height:64,borderRadius:'50%',background:'#16a34a18',display:'grid',placeItems:'center',margin:'0 auto 16px'}}>
                    <i className="ti ti-shield-check" style={{fontSize:32,color:'#16a34a'}} />
                  </div>
                  <h3 style={{fontFamily:'Outfit',fontSize:17,fontWeight:800,margin:'0 0 8px'}}>Verification Submitted</h3>
                  <p style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>
                    Your KYC is under review. This typically takes 1-24 hours. 
                    You'll be notified once your identity is verified.
                  </p>
                  <button className="dash-btn" style={{marginTop:20}} onClick={() => setShowKyc(false)}>
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

</Layout>
  );
}
