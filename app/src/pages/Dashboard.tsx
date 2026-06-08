import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader";

const ACCENT = "#191C6B";

/* ─── INLINE SVG ICONS ────────────────────────────────────────── */
const Icon = ({ n, s = 18, c = "currentColor" }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0 }} />
);

/* ─── STYLES (injected inline to preserve exact layout) ────────── */
const CSS = `
  .app-layout { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 20px 0 72px !important; }
  .app-layout .page { max-width: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
  .dash-wrap2 { padding: 28px 20px 60px; width: 100%; }
  .dash-intro { display:flex; align-items:center; gap:14px; padding:16px 20px; background:var(--card); border:1px solid var(--border); border-radius:12px; margin-bottom:24px; }
  .dash-intro-icon { width:40px; height:40px; border-radius:10px; display:grid; place-items:center; flex-shrink:0; }
  .dash-intro h2 { font-family:"Outfit",sans-serif; font-size:17px; font-weight:800; margin:0 0 2px; }
  .dash-intro p { font-size:13px; color:var(--text2); margin:0; line-height:1.5; }
  .dash-intro.complete { background:#052e16; border-color:#166534; }
  .dash-intro.complete h2, .dash-intro.complete p { color:#fff; }
  .dash-progress { margin-bottom:24px; }
  .dash-progress-row { display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:6px; }
  .dash-progress-bar { height:6px; background:var(--border); border-radius:99px; overflow:hidden; }
  .dash-progress-fill { height:100%; border-radius:99px; background:#111; transition:width .4s ease; }
  .dash-progress-fill.done { background:#16a34a; }
  .dash-section-title { font-family:"Outfit",sans-serif; font-size:13px; font-weight:800; letter-spacing:.04em; margin-bottom:14px; display:flex; align-items:center; gap:8px; color:var(--text2); }
  .dash-step-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px; }
  .dash-step-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:18px 20px; }
  .dash-step-card.full { grid-column:1/-1; }
  .dash-step-badge { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:6px; background:var(--bg2); color:var(--text2); font-size:11px; font-weight:800; margin-bottom:10px; }
  .dash-step-card h4 { font-family:"Outfit",sans-serif; font-size:14px; font-weight:800; margin:0 0 4px; }
  .dash-step-card p { font-size:12px; color:var(--text2); margin:0 0 14px; line-height:1.5; }
  .dash-btn { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 18px; border-radius:9px; font-size:13px; font-weight:700; border:none; cursor:pointer; background:#111; color:#fff; transition:background .14s,opacity .14s; font-family:inherit; }
  .dash-btn:hover { opacity:.85; }
  .dash-btn.green { background:#16a34a; }
  .dash-btn.outline { background:transparent; border:1.5px solid var(--border); color:var(--text); }
  .dash-btn.outline:hover { border-color:var(--text2); }
  .dash-btn.sm { height:34px; padding:0 14px; font-size:12px; }
  .dash-input { width:100%; height:38px; padding:0 12px; border:1.5px solid var(--border); border-radius:9px; font-size:13px; font-family:inherit; background:var(--bg2); color:var(--text); outline:none; }
  .dash-input:focus { border-color:#111; }
  .dash-provider-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:14px; }
  .dash-provider { display:flex; flex-direction:column; align-items:center; gap:6px; padding:14px 8px; border:1.5px solid var(--border); border-radius:10px; cursor:pointer; transition:border-color .14s,background .14s; font-size:11px; font-weight:700; background:var(--card); }
  .dash-provider:hover { border-color:var(--text2); }
  .dash-provider.selected { border-color:#111; background:var(--bg2); }
  .dash-provider-icon { width:32px; height:32px; display:grid; place-items:center; }
  .dash-mini-list { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
  .dash-mini-row { display:flex; align-items:center; gap:8px; padding:6px 0; font-size:12px; color:var(--text2); }
  .dash-mini-row strong { color:var(--text); }
  .dash-mini-row svg { flex-shrink:0; color:#d4d4d8; }
  .dash-checklist { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px 20px; margin-bottom:20px; }
  .dash-check-title { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:var(--text2); margin-bottom:10px; }
  .dash-check-item { display:flex; align-items:center; gap:10px; padding:6px 0; font-size:13px; color:var(--text2); }
  .dash-check-item.done { color:#9ca3af; text-decoration:line-through; }
  .dash-check-bullet { width:18px; height:18px; border-radius:50%; border:2px solid var(--border2); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .dash-check-bullet.done { background:#111; border-color:#111; color:#fff; }
  .dash-announce { background:#111; border:1px solid #232323; border-radius:12px; padding:16px 20px; margin-bottom:24px; display:flex; align-items:center; gap:14px; color:#fff; }
  .dash-announce p { font-size:13px; margin:0; line-height:1.5; flex:1; }
  .dash-announce a { color:#a1a1aa; font-size:12px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
  .dash-announce a:hover { color:#fff; }
  .dash-stats-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:24px; }
  .dash-stat-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:18px 20px; display:flex; align-items:center; gap:14px; }
  .dash-stat-icon { width:40px; height:40px; border-radius:10px; background:var(--bg2); display:grid; place-items:center; flex-shrink:0; }
  .dash-stat-info { flex:1; }
  .dash-stat-label { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text2); margin-bottom:2px; }
  .dash-stat-value { font-family:"Outfit",sans-serif; font-size:22px; font-weight:900; color:var(--text); }
  .dash-success-msg { font-size:12px; color:#16a34a; font-weight:700; margin-top:8px; display:flex; align-items:center; gap:6px; }
  .dash-wallet-addr { font-size:11px; color:var(--text2); font-weight:700; margin-top:6px; font-family:monospace; }

  /* Right panel */
  .dash-right { display:flex; flex-direction:column; gap:14px; }
  .dash-right h3 { font-family:"Outfit",sans-serif; font-size:16px; font-weight:800; margin:0 0 2px; }
  .dash-right-sub { font-size:12px; color:var(--text2); margin:0 0 16px; line-height:1.5; }
  @keyframes checkPop { 0%{transform:scale(0)} 70%{transform:scale(1.2)} 100%{transform:scale(1)} }
  @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes confettiFall { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(120px) rotate(720deg);opacity:0} }
  .dash-check-anim { animation: checkPop .4s ease forwards }
  .dash-step-unlock { animation: fadeSlideIn .4s ease forwards }
  .dash-progress-fill { height:100%; border-radius:99px; background:#111; transition:width 1.2s cubic-bezier(0.22,1,0.36,1); }
  .dash-stat-card { cursor:pointer; transition:all .2s; }
  .dash-stat-card:hover { transform:translateY(-2px); box-shadow:0 4px 20px rgba(0,0,0,.06); }
  .dash-res-card { cursor:pointer; transition:all .2s; text-decoration:none; display:flex; align-items:center; gap:14px; padding:14px; border-radius:10px; background:var(--card); border:1px solid var(--border); margin-bottom:10px; }
  .dash-res-card:hover { transform:translateX(4px); border-color:#191C6B; }
  .dash-confetti { position:relative; overflow:hidden; }
  .dash-confetti-dot { position:absolute; width:6px; height:6px; border-radius:50%; animation:confettiFall 1.5s ease forwards; }
  .dash-tier-badge { display:inline-flex; align-items:center; gap:4px; border-radius:20px; padding:3px 10px; font-size:11px; font-weight:800; letter-spacing:0.06em; }
  .dash-earn-link { color:#191C6B; font-size:11px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px; }
  .dash-res-card { display:flex; align-items:center; gap:12px; padding:13px; border:1.5px solid var(--border); border-radius:10px; cursor:pointer; transition:border-color .14s,background .14s; text-decoration:none; color:inherit; }
  .dash-res-card:hover { border-color:#a1a1aa; background:var(--bg2); }
  .dash-res-icon { width:36px; height:36px; border-radius:9px; display:grid; place-items:center; flex-shrink:0; }
  .dash-res-card h4 { font-size:13px; font-weight:700; margin:0 0 2px; }
  .dash-res-card p { font-size:11px; color:var(--text2); margin:0; }
  .dash-divider { border-top:1px solid var(--border); margin:18px 0; }
  .dash-video { display:flex; align-items:center; gap:12px; padding:10px; border:1.5px solid var(--border); border-radius:10px; }
  .dash-video-thumb { width:60px; height:40px; border-radius:6px; background:var(--bg2); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; flex-shrink:0; }
  .dash-video-thumb span { font-size:9px; font-weight:700; color:var(--text2); }
  .dash-video-meta { flex:1; }
  .dash-video-meta h4 { font-size:12px; font-weight:700; margin:0 0 2px; }
  .dash-video-meta small { font-size:10px; color:var(--text2); }
  .dash-links-title { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:var(--text2); margin:14px 0 8px; }
  .dash-rlink { display:flex; align-items:center; gap:10px; font-size:12px; font-weight:600; color:var(--text2); text-decoration:none; padding:8px 0; border-bottom:1px solid var(--border); }
  .dash-rlink:last-child { border-bottom:none; }
  .dash-rlink:hover { color:var(--text); }
  .dash-progress-widget { background:var(--bg2); border:1.5px solid var(--border); border-radius:10px; padding:12px 14px; }
  .dash-progress-widget-title { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:var(--text2); margin-bottom:10px; }

  @media(max-width:768px) {
    .dash-wrap2 { padding:16px 10px 40px; }
    .dash-step-grid { grid-template-columns:1fr; gap:10px; }
    .dash-stats-row { grid-template-columns:1fr 1fr; gap:8px; }
    .dash-provider-grid { grid-template-columns:1fr 1fr 1fr; gap:6px; }
    .dash-intro { padding:12px 14px; gap:10px; }
    .dash-intro h2 { font-size:15px; }
    .dash-intro p { font-size:12px; }
    .dash-intro-icon { width:32px; height:32px; }
    .dash-section-title { font-size:11px; margin-bottom:10px; }
    .dash-step-card { padding:14px; }
    .dash-step-card h4 { font-size:13px; }
    .dash-step-card p { font-size:11px; }
    .dash-btn { height:36px; padding:0 14px; font-size:12px; }
    .dash-btn.sm { height:30px; padding:0 10px; font-size:11px; }
    .dash-provider { padding:10px 4px; font-size:10px; }
    .dash-provider-icon { width:26px; height:26px; }
    .dash-input { height:36px; font-size:12px; }
    .dash-announce { padding:12px 14px; }
    .dash-announce p { font-size:12px; }
    .dash-stat-card { padding:12px 14px; }
    .dash-stat-value { font-size:18px; }
    .dash-progress { margin-bottom:16px; }
    .dash-progress-row { font-size:11px; }
    .dash-video { flex-direction:column; }
    .dash-video-thumb { width:100%; height:100px; }
    .dash-mini-row { font-size:11px; }
    .dash-right { display:none; }
    .dash-grid { gap:16px; }
  }
  @media(max-width:480px) {
    .dash-wrap2 { padding:12px 6px 32px; }
    .dash-stats-row { grid-template-columns:1fr; }
    .dash-step-card { padding:12px; }
    .dash-intro { flex-direction:column; text-align:center; }
    .dash-provider-grid { grid-template-columns:1fr 1fr 1fr; gap:4px; }
    .dash-provider { padding:8px 2px; font-size:9px; }
    .dash-provider-icon { width:22px; height:22px; }

    .dash-stat-card { padding:10px 12px; }
    .dash-stat-value { font-size:16px; }
  }
  .dash-grid { display: flex; flex-direction: column; gap: 24px; }
  @media(min-width: 769px) { .dash-grid { display: grid; grid-template-columns: 1fr 280px; } }

  /* Locked step styling */
  .dash-step-locked { opacity: 0.35; pointer-events: none; filter: grayscale(0.8); }
  .dash-step-locked .dash-btn { pointer-events: none; }
  .dash-step-locked .dash-provider { pointer-events: none; }
`;

export default function OgaPayDashboard() {
  const navigate = useNavigate();
  const { user, isAuthed } = useAuth();
  const [dashLoading, setDashLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [availableTasks, setAvailableTasks] = useState("0");
  const [totalEarned, setTotalEarned] = useState("₦0.00");
  const [communityJoined, setCommunityJoined] = useState(false);
  const [barPct, setBarPct] = useState(0);

  const [isNew, setIsNew] = useState(() => {
    if (!user?.createdAt) return false;
    const ts = new Date(user.createdAt).getTime();
    return !isNaN(ts) && Date.now() - ts < 5 * 60 * 1000;
  });

  useEffect(() => { injectSkeletonStyles(); }, []);

  useEffect(() => {
    async function loadDashboard() {
      setDashLoading(true);
      console.log('[Dashboard] loadDashboard starting');
      try {
        console.log('[Dashboard] Making API calls...');
        const [summary, tasksResponse, earningsResponse] = await Promise.all([
          apiRequest<any>("/dashboard/summary").catch(e => { console.log('[Dashboard] /dashboard/summary error:', e.message); return null; }),
          apiRequest<any>("/tasks?limit=1&status=OPEN").catch(e => { console.log('[Dashboard] /tasks error:', e.message); return null; }),
          apiRequest<any>("/users/me/earnings").catch(e => { console.log('[Dashboard] /users/me/earnings error:', e.message); return null; }),
        ]);
        console.log('[Dashboard] API results:', {
          summary: summary ? 'received' : 'null',
          tasks: tasksResponse ? 'received' : 'null',
          earnings: earningsResponse ? 'received' : 'null'
        });

        if (summary) setSummaryData(summary);

        if (tasksResponse) {
          const tasks = tasksResponse.tasks ?? tasksResponse;
          if (Array.isArray(tasks)) {
            setAvailableTasks(String(tasks.length));
          } else if (tasksResponse.total !== undefined) {
            setAvailableTasks(String(tasksResponse.total));
          }
        }

        if (earningsResponse) {
          const total = earningsResponse.total ?? earningsResponse.totalEarned ?? 0;
          setTotalEarned("₦" + Number(total).toLocaleString());
        }
      } catch (e) {
        // keep defaults
      }
      setDashLoading(false);
    }
    loadDashboard();
    const onFocus = () => loadDashboard();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  /* ── Animate progress bar on page load ── */
  useEffect(() => {
    const timer = setTimeout(() => setBarPct(pct), 150);
    return () => clearTimeout(timer);
  }, [pct]);

  const fname = user?.firstName || "there";
  const lname = user?.lastName || "";
  const email = user?.email || "";
  const isEmailVerified = user?.isEmailVerified || false;
  const initials = `${(fname[0] || "").toUpperCase()}${(lname[0] || "").toUpperCase()}`;

  const metrics = summaryData?.metrics || {};
  const postedTasks = metrics.postedTasks ?? 0;
  const totalSpent = metrics.totalSpent ?? 0;
  const activeTasks = metrics.activeTasks ?? 0;
  const completedTasks = metrics.completedTasks ?? 0;
  const tasksCompleted = metrics.tasksCompleted ?? completedTasks ?? 0;
  const walletConnected = metrics.walletConnected ?? false;

  const getTier = (tc: number) => {
    if (tc >= 100) return { name: 'OgaBoss', color: '#f59e0b', next: null, nextAt: null }
    if (tc >= 50) return { name: 'Pro', color: '#7c3aed', next: 'OgaBoss', nextAt: 100 }
    if (tc >= 20) return { name: 'Earner', color: '#16a34a', next: 'Pro', nextAt: 50 }
    if (tc >= 5) return { name: 'Hustler', color: '#191C6B', next: 'Earner', nextAt: 20 }
    return { name: 'Starter', color: '#94a3b8', next: 'Hustler', nextAt: 5 }
  }
  const tier = getTier(tasksCompleted);

  const step1Done = !!(fname && lname && isEmailVerified);
  const step2Done = !!walletConnected;
  const step3Done = communityJoined;
  const step4Done = completedTasks > 0;
  const stepsDone = [step1Done, step2Done, step3Done, step4Done];
  const completed = stepsDone.filter(Boolean).length;
  const total = 4;
  const pct = Math.round((completed / total) * 100);
  const allDone = completed === total;

  if (!isAuthed) {
    return (
      <Layout sidebar={false}>
        <div className="loading"><div className="spinner" /> Sign in to view your dashboard</div>
      </Layout>
    );
  }

  if (dashLoading) {
    return (
      <Layout sidebar={false}>
        <SkeletonPage />
      </Layout>
    );
  }

  const checklist = [
    { label: "Complete your profile & verify email", done: step1Done },
    { label: "Connect a Solana wallet", done: step2Done },
    { label: "Join OgaPay community", done: step3Done },
    { label: "Complete your first task", done: step4Done },
  ];

  return (
    <Layout sidebar={false}>
      <style>{CSS}</style>
      <div className="dash-wrap2">

        {/* ── INTRO / WELCOME BANNER ── */}
        {allDone ? (
          <div className="dash-intro complete dash-confetti" onClick={() => navigate('/profile')} style={{cursor:'pointer'}}>
            <div className="dash-intro-icon" style={{ background: "#16a34a" }}>
              <Icon n="check" s={20} c="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <h2>You are ready to earn on OgaPay!</h2>
              <p>Your account is fully configured. Head to Jobs to start earning.</p>
            </div>
            <a href="/tasks" className="dash-btn" style={{ flexShrink: 0 }}>
              <Icon n="briefcase" s={14} /> Browse Jobs
            </a>
            <div className="dash-confetti-dot" style={{left:'10%',top:10,background:'#f59e0b',animationDelay:'0s'}} />
            <div className="dash-confetti-dot" style={{left:'30%',top:5,background:'#ec4899',animationDelay:'0.15s'}} />
            <div className="dash-confetti-dot" style={{left:'50%',top:8,background:'#16a34a',animationDelay:'0.3s'}} />
            <div className="dash-confetti-dot" style={{left:'70%',top:3,background:'#1F8CFF',animationDelay:'0.45s'}} />
            <div className="dash-confetti-dot" style={{left:'90%',top:6,background:'#7c3aed',animationDelay:'0.6s'}} />
          </div>
        ) : isNew ? (
          <div className="dash-intro" onClick={() => navigate('/profile')} style={{cursor:'pointer'}}>
            <div className="dash-intro-icon" style={{ background: user?.avatarUrl ? 'transparent' : '#191C6B', padding: 0, overflow: 'hidden' }}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" style={{width:40,height:40,borderRadius:10,objectFit:'cover'}} />
              ) : (
                <span style={{fontSize:16,fontWeight:800,color:'#fff'}}>{initials || 'U'}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                <h2 style={{margin:0}}>Welcome to OgaPay, {fname}!</h2>
                <span className="dash-tier-badge" style={{background:tier.color + '18',color:tier.color,border:'1px solid ' + tier.color + '30'}}>
                  <Icon n="award" s={11} /> {tier.name}
                </span>
              </div>
              <p>Your account is ready. Complete the 4 steps below to start earning tasks and getting paid.</p>
              <div style={{display:'flex',gap:20,marginTop:8,flexWrap:'wrap'}}>
                <span style={{fontSize:12,color:'var(--text2)',display:'inline-flex',alignItems:'center',gap:4}}>
                  <Icon n="check-circle" s={13} c="#16a34a" /> {tasksCompleted} Tasks Done
                </span>
                <span style={{fontSize:12,color:'var(--text2)',display:'inline-flex',alignItems:'center',gap:4}}>
                  <Icon n="currency-naira" s={13} c="#191C6B" /> {totalEarned}
                </span>
                <span style={{fontSize:12,color:'var(--text2)',display:'inline-flex',alignItems:'center',gap:4}}>
                  <Icon n="award" s={13} c={tier.color} /> {tier.name}
                </span>
              </div>
              {tier.next && (
                <div style={{marginTop:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text3)',fontWeight:600,marginBottom:4}}>
                    <span>{tier.name}</span>
                    <span>{tasksCompleted} / {tier.nextAt} tasks to {tier.next}</span>
                  </div>
                  <div style={{height:5,background:'var(--border)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:Math.min(100,(tasksCompleted/tier.nextAt)*100)+'%',background:tier.color,borderRadius:99,transition:'width 1s ease'}} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="dash-intro" onClick={() => navigate('/profile')} style={{cursor:'pointer'}}>
            <div className="dash-intro-icon" style={{ background: user?.avatarUrl ? 'transparent' : '#dcfce7', padding: 0, overflow: 'hidden' }}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" style={{width:40,height:40,borderRadius:10,objectFit:'cover'}} />
              ) : (
                <span style={{fontSize:16,fontWeight:800,color:'#16a34a'}}>{initials || 'U'}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                <h2 style={{margin:0}}>Welcome back, {fname}</h2>
                <span className="dash-tier-badge" style={{background:tier.color + '18',color:tier.color,border:'1px solid ' + tier.color + '30'}}>
                  <Icon n="award" s={11} /> {tier.name}
                </span>
              </div>
              <p>Good to see you again. Pick up where you left off.</p>
              <div style={{display:'flex',gap:20,marginTop:8,flexWrap:'wrap'}}>
                <span style={{fontSize:12,color:'var(--text2)',display:'inline-flex',alignItems:'center',gap:4}}>
                  <Icon n="check-circle" s={13} c="#16a34a" /> {tasksCompleted} Tasks Done
                </span>
                <span style={{fontSize:12,color:'var(--text2)',display:'inline-flex',alignItems:'center',gap:4}}>
                  <Icon n="currency-naira" s={13} c="#191C6B" /> {totalEarned}
                </span>
                <span style={{fontSize:12,color:'var(--text2)',display:'inline-flex',alignItems:'center',gap:4}}>
                  <Icon n="award" s={13} c={tier.color} /> {tier.name}
                </span>
              </div>
              {tier.next && (
                <div style={{marginTop:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text3)',fontWeight:600,marginBottom:4}}>
                    <span>{tier.name}</span>
                    <span>{tasksCompleted} / {tier.nextAt} tasks to {tier.next}</span>
                  </div>
                  <div style={{height:5,background:'var(--border)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:Math.min(100,(tasksCompleted/tier.nextAt)*100)+'%',background:tier.color,borderRadius:99,transition:'width 1s ease'}} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PAGE HEADER ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 900, margin: 0 }}>Getting Started</h1>
            <p style={{ fontSize: 14, color: "var(--text2)", margin: "4px 0 0" }}>Complete your setup to start earning on OgaPay</p>
          </div>
          {!allDone && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "#191C6B", color: "#fff", fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: .85, display: "inline-block" }} />
              {total - completed} tasks pending
            </span>
          )}
        </div>

        {/* ── PROGRESS BAR ── */}
        <div className="dash-progress">
          <div className="dash-progress-row">
            <span>{completed} of {total} steps complete</span>
            <span style={{ color: allDone ? "#16a34a" : "inherit" }}>{pct}%</span>
          </div>
          <div className="dash-progress-bar">
            <div className={`dash-progress-fill${allDone ? " done" : ""}`} style={{ width: `${barPct}%` }} />
          </div>
        </div>

        {/* ── TWO-COLUMN GRID ── */}
        <div className="dash-grid">

          {/* ── LEFT COLUMN ── */}
          <div>

            {/* ── STEP 1: PROFILE ── */}
            <div className="dash-section-title">
              <Icon n="circle-filled" s={8} /> STEP 1: COMPLETE YOUR PROFILE
            </div>
            <div className="dash-step-grid">
              <div className="dash-step-card">
                <div className="dash-step-badge">1A</div>
                <h4>Add Profile Photo &amp; Display Name</h4>
                <p>Set up your OgaPay identity so task creators can find and trust you.</p>
                {step1Done ? (
                  <div className="dash-success-msg dash-check-anim"><Icon n="check" s={12} /> Profile Complete</div>
                ) : (
                  <button className="dash-btn" onClick={() => { window.location.href = "/profile"; }}>
                    <Icon n="user" s={14} /> Go to Profile
                  </button>
                )}
              </div>
              <div className="dash-step-card">
                <div className="dash-step-badge">1B</div>
                <h4>Verify Your Email Address</h4>
                <p>Confirm your email to unlock withdrawals and receive task notifications.</p>
                <input className="dash-input" value={email} readOnly style={{ marginBottom: 10 }} />
                {isEmailVerified ? (
                  <div className="dash-success-msg dash-check-anim"><Icon n="check" s={12} /> Email Verified</div>
                ) : (
                  <button className="dash-btn" onClick={() => window.location.href = "/profile"}>
                    <Icon n="mail" s={14} /> Verify Email
                  </button>
                )}
              </div>
            </div>

            {/* ── STEP 2: WALLET ── */}
            {step1Done && (
            <div className={`${step2Done ? "dash-step-unlock" : "dash-step-locked"}`}>
            <div className="dash-section-title">
              <Icon n="circle-filled" s={8} /> STEP 2: CONNECT YOUR WALLET
            </div>
            <div className="dash-step-card full">
              <div className="dash-step-badge">2</div>
              <h4>Connect a Solana Wallet</h4>
              <p>Link your wallet to receive USDC payouts directly. Supports Phantom, Backpack, and Solflare.</p>
              <div className="dash-provider-grid">
                {[
                  { id: "phantom", label: "Phantom", icon: "brand-figma" },
                  { id: "backpack", label: "Backpack", icon: "backpack" },
                  { id: "solflare", label: "Solflare", icon: "flare" },
                ].map(p => (
                  <div key={p.id} className="dash-provider">
                    <div className="dash-provider-icon"><Icon n={p.icon} s={20} /></div>
                    <span>{p.label}</span>
                  </div>
                ))}
              </div>
              {step2Done ? (
                <div className="dash-success-msg dash-check-anim"><Icon n="check" s={12} /> Wallet Connected</div>
              ) : (
                <button className="dash-btn outline" onClick={() => window.location.href = "/profile"}>
                  <Icon n="wallet" s={14} /> Connect in Settings
                </button>
              )}
            </div>
            </div>
            )}

            {/* ── STEP 3: COMMUNITY ── */}
            {step2Done && (
            <div className={`${step3Done ? "dash-step-unlock" : "dash-step-locked"}`}>
            <div className="dash-section-title">
              <Icon n="circle-filled" s={8} /> STEP 3: JOIN THE COMMUNITY
            </div>
            <div className="dash-step-card full">
              <div className="dash-step-badge">3</div>
              <h4>Join OgaPay Communities</h4>
              <p>Stay updated on new tasks, tips, and announcements from other earners.</p>
              <div className="dash-provider-grid">
                {[
                  { id: "telegram", label: "Telegram", icon: "brand-telegram", href: "https://t.me/ogapay" },
                  { id: "x", label: "X (Twitter)", icon: "brand-x", href: "https://x.com/ogapay_ng" },
                  { id: "discord", label: "Discord", icon: "brand-discord", href: "https://discord.gg/ogapay" },
                ].map(p => (
                  <a key={p.id} href={p.href} target="_blank" rel="noopener noreferrer" className="dash-provider">
                    <div className="dash-provider-icon"><Icon n={p.icon} s={20} /></div>
                    <span>{p.label}</span>
                  </a>
                ))}
              </div>
              {step3Done ? (
                <div className="dash-success-msg dash-check-anim"><Icon n="check" s={12} /> Community Joined</div>
              ) : (
                <button className={`dash-btn${step3Done ? " green" : ""}`} onClick={() => setCommunityJoined(true)}>
                  <Icon n="users" s={14} /> I've Joined — Mark as Done
                </button>
              )}
            </div>
            </div>
            )}

            {/* ── STEP 4: FIRST TASK ── */}
            {step3Done && (
            <div className={`${step4Done ? "dash-step-unlock" : "dash-step-locked"}`}>
            <div className="dash-section-title">
              <Icon n="circle-filled" s={8} /> STEP 4: COMPLETE YOUR FIRST TASK
            </div>
            <div className="dash-step-card full">
              <div className="dash-step-badge">4</div>
              <h4>Complete Your First Task</h4>
              <p>Browse available tasks, apply for one, submit your proof, and receive your first OGA reward.</p>
              <div className="dash-mini-list">
                {["Browse tasks", "Apply & complete", "Submit proof"].map((label, i) => (
                  <div key={i} className="dash-mini-row">
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--bg2)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                    <strong>{label}</strong>
                    <Icon n="arrow-right" s={12} style={{ marginLeft: "auto" }} />
                  </div>
                ))}
              </div>
              {step4Done ? (
                <div className="dash-success-msg dash-check-anim"><Icon n="check" s={12} /> First task completed!</div>
              ) : (
                <a href="/tasks" className="dash-btn">
                  <Icon n="briefcase" s={14} /> Browse Available Tasks
                </a>
              )}
            </div>
            </div>
            )}

            {/* ── SETUP CHECKLIST ── */}
            <div className="dash-checklist" style={{ display: "none" }}>
              <div className="dash-check-title">Setup Checklist</div>
              {checklist.map((item, i) => (
                <div key={i} className={`dash-check-item${item.done ? " done" : ""}`}>
                  <div className={`dash-check-bullet${item.done ? " done" : ""}`}>
                    {item.done && <Icon n="check" s={10} c="#fff" />}
                  </div>
                  {item.label}
                </div>
              ))}
            </div>

            {/* ── ANNOUNCEMENT ── */}
            <div className="dash-announce">
              <Icon n="megaphone" s={18} c="#191C6B" />
              <p>OgaPay tasks are now available in Nigeria, Ghana, Kenya and more.</p>
              <a href="#"><Icon n="file-text" s={13} /> Read our getting started guide</a>
            </div>

            {/* ── STATS CARDS ── */}
            <div className="dash-stats-row">
              <div className="dash-stat-card" onClick={() => navigate('/tasks')}
                onMouseEnter={e => e.currentTarget.style.borderColor='#191C6B'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                <div className="dash-stat-icon"><Icon n="briefcase" s={18} /></div>
                <div className="dash-stat-info">
                  <div className="dash-stat-label">Available Tasks</div>
                  <div className="dash-stat-value">{availableTasks}</div>
                </div>
              </div>
              <div className="dash-stat-card" onClick={() => navigate('/wallet')}
                onMouseEnter={e => e.currentTarget.style.borderColor='#191C6B'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                <div className="dash-stat-icon"><Icon n="currency-naira" s={18} /></div>
                <div className="dash-stat-info">
                  <div className="dash-stat-label">Total Earned</div>
                  <div className="dash-stat-value">{totalEarned}</div>
                  <a href="/tasks" className="dash-earn-link"><Icon n="trending-up" s={11} /> Start Earning <Icon n="arrow-right" s={11} /></a>
                </div>
              </div>
              <div className="dash-stat-card" onClick={() => navigate('/my-tasks')}
                onMouseEnter={e => e.currentTarget.style.borderColor='#191C6B'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                <div className="dash-stat-icon"><Icon n="file-text" s={18} /></div>
                <div className="dash-stat-info">
                  <div className="dash-stat-label">Tasks Posted</div>
                  <div className="dash-stat-value">{postedTasks}</div>
                </div>
              </div>
              <div className="dash-stat-card" onClick={() => navigate('/my-tasks')}
                onMouseEnter={e => e.currentTarget.style.borderColor='#191C6B'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                <div className="dash-stat-icon"><Icon n="activity" s={18} /></div>
                <div className="dash-stat-info">
                  <div className="dash-stat-label">Active Tasks</div>
                  <div className="dash-stat-value">{activeTasks}</div>
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="dash-right">
            <h3>Resources</h3>
            <p className="dash-right-sub">Get help, watch guides, and connect with our community.</p>

            <div className="dash-res-card" onClick={() => window.open('https://t.me/ogapaycommunity', '_blank')}>
              <div className="dash-res-icon" style={{ background: "#0088cc" }}><Icon n="brand-telegram" s={18} c="#fff" /></div>
              <div>
                <h4>Telegram Support</h4>
                <p>Where the talk happens. Join us</p>
              </div>
            </div>

            <div className="dash-res-card" onClick={() => navigate('/faq')}>
              <div className="dash-res-icon"><Icon n="book" s={18} /></div>
              <div>
                <h4>Documentation</h4>
                <p>Learn how to earn on OgaPay. Full docs</p>
              </div>
            </div>

            <div className="dash-res-card" onClick={() => navigate('/communities')}>
              <div className="dash-res-icon" style={{ background: "#f59e0b" }}><Icon n="users" s={18} c="#fff" /></div>
              <div>
                <h4>Community</h4>
                <p>Join Nigerian Earners Hub</p>
              </div>
            </div>

            <div className="dash-divider" />

            <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Video tutorials</h3>
            <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>Step by step guides to get you started.</p>

            <div className="dash-video">
              <div className="dash-video-thumb">
                <Icon n="player-play" s={16} />
                <span>Coming soon</span>
              </div>
              <div className="dash-video-meta">
                <h4>How to earn your first on OgaPay</h4>
                <small>2 MINUTE VIDEO</small>
              </div>
            </div>

            <div className="dash-links-title">RESOURCE LINKS</div>
            <a href="https://x.com/ogapay_ng" target="_blank" rel="noopener noreferrer" className="dash-rlink">
              <Icon n="brand-x" s={14} /> Our Twitter <Icon n="arrow-up-right" s={12} style={{ marginLeft: "auto" }} />
            </a>
            <a href="/support" className="dash-rlink">
              <Icon n="headset" s={14} /> Support <Icon n="arrow-up-right" s={12} style={{ marginLeft: "auto" }} />
            </a>
            <a href="/" className="dash-rlink">
              <Icon n="home" s={14} /> Back to Home <Icon n="arrow-up-right" s={12} style={{ marginLeft: "auto" }} />
            </a>

            <div className="dash-divider" />

            <div className="dash-progress-widget">
              <div className="dash-progress-widget-title">Your Progress</div>
              <div className="dash-progress-row">
                <span>{completed}/{total} steps done</span>
                <span style={{ color: allDone ? "#16a34a" : "inherit" }}>{pct}%</span>
              </div>
              <div className="dash-progress-bar">
                <div className={`dash-progress-fill${allDone ? " done" : ""}`} style={{ width: `${barPct}%` }} />
              </div>
              {allDone && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon n="check" s={14} c="#16a34a" /> All steps complete!
                </div>
              )}
            </div>
          </div>

        </div>{/* end two-column grid */}
      </div>{/* end dash-wrap2 */}
    </Layout>
  );
}
