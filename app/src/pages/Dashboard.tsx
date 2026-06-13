import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import bs58 from "bs58";
import { SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader";
import FundWalletModal from "../components/FundWalletModal";
import { OnboardingChecklist } from "../components/OnboardingChecklist";

const ACCENT = "#191C6B";

/* ─── INLINE SVG ICONS ────────────────────────────────────────── */
const Icon = ({ n, s = 18, c = "currentColor", style }: { n: string; s?: number; c?: string; style?: React.CSSProperties }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0, ...style }} />
);

/* ─── STYLES (injected inline to preserve exact layout) ────────── */
const CSS = `
  .app-layout { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 20px 0 72px !important; }
  .app-layout .page { max-width: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
  .dash-wrap2 { padding: 28px 20px 60px; width: 100%; }
  .dash-intro { display:flex; align-items:center; gap:14px; padding:16px 20px; background:var(--card); border:1px solid var(--border); border-radius:12px; margin-bottom:24px; }
  .dash-intro-icon { width:40px; height:40px; border-radius:10px; display:grid; place-items:center; flex-shrink:0; background: transparent !important; }
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
  @keyframes stepPulse {
    0% { box-shadow: 0 0 0 0 rgba(25,28,107,0.15); }
    70% { box-shadow: 0 0 0 8px rgba(25,28,107,0); }
    100% { box-shadow: 0 0 0 0 rgba(25,28,107,0); }
  }
  .dash-step-card.pulse {
    animation: stepPulse 2s ease-in-out infinite;
    border-color: rgba(25,28,107,0.3) !important;
  }
  .dash-step-card.complete {
    border-color: rgba(22,163,74,0.3) !important;
    background: rgba(22,163,74,0.03) !important;
  }
  .dash-step-locked {
    opacity: 0.4;
    pointer-events: none;
    filter: grayscale(0.6);
  }
  .dash-step-locked .dash-btn { pointer-events: none; }
  .dash-step-locked .dash-provider { pointer-events: none; }
  .dash-step-card.complete { opacity: 1 !important; pointer-events: auto !important; filter: none !important; }
`;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function OgaPayDashboard() {
  const navigate = useNavigate();
  const { user, isAuthed, refreshUser } = useAuth();
  const [dashLoading, setDashLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [availableTasks, setAvailableTasks] = useState("0");
  const [totalEarned, setTotalEarned] = useState("₦0.00");
  const [communityJoined, setCommunityJoined] = useState(false);
  const [detectedWallets, setDetectedWallets] = useState<string[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [twitterAuthenticating, setTwitterAuthenticating] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);

  const [isNew, setIsNew] = useState(() => {
    if (!user?.createdAt) return false;
    const ts = new Date(user.createdAt).getTime();
    return !isNaN(ts) && Date.now() - ts < 5 * 60 * 1000;
  });

  useEffect(() => { injectSkeletonStyles(); }, []);

  // Detect installed Solana wallets immediately (not waiting for API calls)
  useEffect(() => {
    const found: string[] = [];
    if (typeof window !== "undefined") {
      if ((window as any).phantom?.solana?.isPhantom) found.push("phantom");
      if ((window as any).backpack?.isBackpack) found.push("backpack");
      if ((window as any).solflare?.isSolflare) found.push("solflare");
    }
    setDetectedWallets(found);
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      setDashLoading(true);
      try {
        const [summary, tasksResponse, earningsResponse] = await Promise.all([
          apiRequest<any>("/dashboard/summary").catch(() => null),
          apiRequest<any>("/tasks?limit=100&status=OPEN").catch(() => null),
          apiRequest<any>("/users/me/earnings").catch(() => null),
        ]);

        if (summary) setSummaryData(summary);

        if (tasksResponse) {
          const tasks = Array.isArray(tasksResponse) ? tasksResponse : (tasksResponse.tasks || tasksResponse.data || []);
          if (Array.isArray(tasks)) {
            setAvailableTasks(String(tasks.length));
          } else if (tasksResponse?.total !== undefined) {
            setAvailableTasks(String(tasksResponse.total));
          }
        }

        if (earningsResponse) {
          const total = earningsResponse.totalEarnings ?? earningsResponse.total ?? earningsResponse.totalEarned ?? 0;
          setTotalEarned("₦" + Number(total).toLocaleString());
        }

        // Check user's joined communities via API
        try {
          const myComs = await apiRequest<any>("/communities/mine/list");
          if (Array.isArray(myComs)) {
            setCommunityJoined(myComs.length > 0);
          }
        } catch (_) {}

        // Load bank details from user profile
        try {
          const me = await apiRequest<any>("/users/me");
          if (me?.bankAccount) setBankAccount(me.bankAccount);
          if (me?.bankName) setBankName(me.bankName);
          if (me?.bankAccount && me?.bankName) setBankSaved(true);
        } catch (_) {}
        
        // Fetch my submissions from API instead of localStorage
        try {
          const subsData = await apiRequest('/tasks/my/submissions').catch(() => null);
          if (subsData) {
            const list = Array.isArray(subsData) ? subsData : subsData?.data || [];
            setMySubmissions(list);
          }
        } catch {}

      } catch (e) {
        const el = document.getElementById('appToast')
        if (el) { el.textContent = 'Could not load dashboard data'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
      }
      setDashLoading(false);
    }
    loadDashboard();
    const onFocus = () => loadDashboard();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const fname = user?.firstName || "there";
  const lname = user?.lastName || "";
  const email = user?.email || "";
  const isEmailVerified = user?.isEmailVerified || false;
  const initials = `${(fname[0] || "").toUpperCase()}${(lname[0] || "").toUpperCase()}`;
  const avatarUrl = user?.avatar || (user as any)?.avatarUrl || null;

  const metrics = summaryData?.metrics || {};
  const postedTasks = metrics.postedTasks ?? 0;
  const totalSpent = metrics.totalSpent ?? 0;
  const activeTasks = metrics.activeTasks ?? 0;
  const completedTasks = metrics.completedTasks ?? 0;
  const walletConnected = metrics.walletConnected ?? false;
  const twitterConnected = metrics.twitterConnected ?? false;

  const step1Done = !!(fname && lname && isEmailVerified);
  const step2Done = !!walletConnected || bankSaved || !!walletAddress;
  const step3Done = communityJoined || twitterConnected;
  const step4Done = completedTasks > 0;
  const stepsDone = [step1Done, step2Done, step3Done, step4Done];
  const completed = stepsDone.filter(Boolean).length;
  const total = 4;
  const pct = Math.round((completed / total) * 100);
  const allDone = completed === total;

  async function connectWallet(id: string) {
    if (!detectedWallets.includes(id)) return;
    setConnecting(id);
    try {
      let wallet: any;
      if (id === "phantom") wallet = (window as any).phantom?.solana;
      else if (id === "backpack") wallet = (window as any).backpack;
      else if (id === "solflare") wallet = (window as any).solflare;
      if (!wallet?.connect) { setConnecting(null); return; }

      // Step 1: Connect wallet — get public key
      const resp = await wallet.connect();
      const pubKey = resp?.publicKey?.toString();
      if (!pubKey) throw new Error("No public key");

      // Immediately save wallet address to backend (so profile/auth/me see it)
      try {
        await apiRequest("/users/wallet", {
          method: "POST",
          body: JSON.stringify({ walletAddress: pubKey, provider: id }),
        });
      } catch {}

      // Step 2: Request a nonce from the backend
      const nonceRes = await apiRequest<{ nonce: string; message: string }>("/wallet/nonce", {
        method: "POST",
        body: JSON.stringify({ wallet: pubKey }),
      });
      if (!nonceRes?.nonce) throw new Error("No nonce received");

      // Step 3: Sign the message with the wallet
      const encodedMessage = new TextEncoder().encode(nonceRes.message);
      const signedResult = await wallet.signMessage(encodedMessage);
      const signatureBytes = signedResult?.signature ?? signedResult;
      const signature = bs58.encode(signatureBytes);

      // Step 4: Submit signature for verification
      await apiRequest("/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ wallet: pubKey, signature }),
      });

      setWalletAddress(pubKey);
      setSummaryData(prev => prev ? { ...prev, metrics: { ...prev.metrics, walletConnected: true } } : prev);
      refreshUser();
    } catch (e: any) {
            const el = document.getElementById("appToast");
      if (el) {
        el.textContent = e?.message || "Wallet verification failed";
        el.classList.add("show");
        setTimeout(() => el.classList.remove("show"), 3000);
      }
    }
    setConnecting(null);
  }

  async function connectTwitter() {
    setTwitterAuthenticating(true);
    try {
      const res = await apiRequest<{ authUrl: string }>('/twitter/init', { method: 'POST' });
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (e) {
      setTwitterAuthenticating(false);
      const el = document.getElementById('appToast');
      if (el) {
        el.textContent = 'Failed to start Twitter connection';
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
      }
    }
  }

  // Check for Twitter OAuth success on mount/focus
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('twitter') === 'connected') {
      // Clean URL and refetch dashboard
      window.history.replaceState({}, '', window.location.pathname);
      // Trigger refetch
      const el = document.getElementById('appToast');
      if (el) {
        el.textContent = 'Twitter connected successfully!';
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 4000);
      }
      // Refetch dashboard data
      const refetch = async () => {
        try {
          const summary = await apiRequest<any>('/dashboard/summary');
          if (summary) setSummaryData(summary);
        } catch {}
      };
      refetch();
    }
  }, []);

  async function saveBank() {
    if (!bankAccount || bankAccount.length < 10 || !bankName) return;
    setSavingBank(true);
    try {
      await apiRequest("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ bankAccount, bankName }),
      });
      setBankSaved(true);
    } catch { /* ignore */ }
    setSavingBank(false);
  }

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
          <div className="dash-intro complete" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div style={{width:44,height:44,borderRadius:'50%',flexShrink:0,overflow:'hidden',background:'#191C6B',color:'#fff',display:'grid',placeItems:'center',fontSize:15,fontWeight:800,border:'2px solid rgba(255,255,255,0.2)'}}>
              {avatarUrl ? <img src={avatarUrl} alt={fname} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} /> : initials || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <h2>You're all set, {fname}!</h2>
              <p>Your OgaPay account is fully configured. Head to Jobs to start earning.</p>
            </div>
            <a href="/tasks" className="dash-btn" style={{ flexShrink: 0 }}>
              <Icon n="briefcase" s={14} /> Browse Jobs
            </a>
          </div>
        ) : isNew ? (
          <div className="dash-intro" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div style={{width:44,height:44,borderRadius:'50%',flexShrink:0,overflow:'hidden',background:'#191C6B',color:'#fff',display:'grid',placeItems:'center',fontSize:15,fontWeight:800,border:'2px solid rgba(255,255,255,0.2)'}}>
              {avatarUrl ? <img src={avatarUrl} alt={fname} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} /> : initials || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <h2>Welcome to OgaPay, {fname}!</h2>
              <p>Your account is ready. Complete the 4 steps below to start earning tasks and getting paid.</p>
            </div>
          </div>
        ) : (
          <div className="dash-intro" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div style={{width:44,height:44,borderRadius:'50%',flexShrink:0,overflow:'hidden',background:'#191C6B',color:'#fff',display:'grid',placeItems:'center',fontSize:15,fontWeight:800,border:'2px solid rgba(255,255,255,0.2)'}}>
              {avatarUrl ? <img src={avatarUrl} alt={fname} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} /> : initials || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <h2>{getGreeting()}, {fname}</h2>
              <p>Good to see you again. Pick up where you left off.</p>
            </div>
          </div>
        )}

        {/* ── KYC NUDGE ── */}
        {user && !((user as any).kyc?.status?.includes('APPROVED')) && (
          <div onClick={() => navigate('/vault')} style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, marginBottom: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-shield-off" style={{ fontSize: 18, color: '#92400e' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e', flex: 1 }}>Complete your KYC verification to unlock withdrawals</span>
            <i className="ti ti-arrow-right" style={{ fontSize: 16, color: '#92400e' }} />
          </div>
        )}

        {/* ── EMAIL VERIFICATION NUDGE ── */}
        {user && !isEmailVerified && (
          <div style={{ padding: '12px 16px', background: '#dbeafe', border: '1px solid #60a5fa', borderRadius: 10, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-mail-exclamation" style={{ fontSize: 18, color: '#1e40af' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', flex: 1 }}>Verify your email to receive task notifications</span>
            <span onClick={() => navigate('/settings')} style={{ fontSize: 12, fontWeight: 800, color: '#1e40af', cursor: 'pointer', whiteSpace: 'nowrap' }}>Resend</span>
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
              {total - completed} steps remaining
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
            <div className={`dash-progress-fill${allDone ? " done" : ""}`} style={{ width: `${pct}%` }} />
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
              <div className={`dash-step-card ${step1Done ? 'complete' : 'pulse'}`}>
                <div className="dash-step-badge">1A</div>
                <h4>Add Profile Photo &amp; Display Name</h4>
                <p>Set up your OgaPay identity so task creators can find and trust you.</p>
                {step1Done ? (
                  <div className="dash-success-msg"><Icon n="check" s={12} /> Profile Complete</div>
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
                  <div className="dash-success-msg"><Icon n="check" s={12} /> Email Verified</div>
                ) : (
                  <button className="dash-btn" onClick={() => window.location.href = "/profile"}>
                    <Icon n="mail" s={14} /> Verify Email
                  </button>
                )}
              </div>
            </div>

            {/* ── STEP 2: WALLET ── */}
            <div className={`${!step1Done && !step2Done ? "dash-step-locked" : ""}`}>
            <div className="dash-section-title">
              <Icon n="circle-filled" s={8} /> STEP 2: CONNECT YOUR WALLET
            </div>
            <div className="dash-step-card full">
              <div className="dash-step-badge">2</div>
              <h4>Connect a Solana Wallet</h4>
              <p>Link your wallet to receive USDC payouts directly. Supports Phantom, Backpack, and Solflare.</p>
              <div className="dash-provider-grid">
                {[
                  {
                    id: "phantom", label: "Phantom", color: "#AB9FF2",
                    svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#AB9FF2"/><path d="M8 24V12c0-4.4 3.6-8 8-8s8 3.6 8 8v12l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5Z" fill="#fff"/><circle cx="13" cy="12" r="1.5" fill="#AB9FF2"/><circle cx="19" cy="12" r="1.5" fill="#AB9FF2"/></svg>
                  },
                  {
                    id: "backpack", label: "Backpack", color: "#0C8CE9",
                    svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#0C8CE9"/><path d="M13 10c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v1h1c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2h-8c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2h1v-1Z" fill="#fff"/><rect x="14" y="16" width="4" height="2" rx="1" fill="#0C8CE9"/><path d="M14 10v1h4v-1" fill="#0C8CE9"/></svg>
                  },
                  {
                    id: "solflare", label: "Solflare", color: "#E85D75",
                    svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="sfg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#FC5C7D"/><stop offset="1" stopColor="#6A82FB"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#sfg)"/><path d="M16 7c0 4-4 6.5-4 9.5S13.5 24 16 24s4-3 4-6-4-5.5-4-11Z" fill="#fff" opacity=".9"/><path d="M16 11c-1.2 2.5-2.5 4-2.5 5.5S14 20 16 20s2.5-1.5 2.5-3.5S17.2 13.5 16 11Z" fill="url(#sfg)"/></svg>
                  },
                ].map(p => (
                  <div key={p.id} className={`dash-provider${detectedWallets.includes(p.id) ? " selected" : ""}`} onClick={() => connectWallet(p.id)} style={{ cursor: detectedWallets.includes(p.id) || connecting ? "pointer" : "default", opacity: detectedWallets.includes(p.id) ? 1 : 0.5 }}>
                    <div className="dash-provider-icon">{p.svg}</div>
                    <span>{p.label}{detectedWallets.includes(p.id) ? " ●" : ""}</span>
                  </div>
                ))}
              </div>
              {step2Done ? (
                <>
                  <div className="dash-success-msg"><Icon n="check" s={12} /> Wallet Connected</div>
                  <button className="dash-btn green sm" style={{ marginTop: 8 }} onClick={() => setShowFundModal(true)}>
                    <Icon n="plus" s={14} /> Fund Wallet
                  </button>
                </>
              ) : (
                <button className="dash-btn outline" onClick={() => window.location.href = "/profile"}>
                  <Icon n="wallet" s={14} /> Connect in Settings
                </button>
              )}

              <div className="dash-divider" style={{ margin: "16px 0" }} />
              <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "var(--text2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".1em" }}>— Or add a Nigerian bank account —</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input className="dash-input" value={bankAccount} onChange={e => setBankAccount(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Account number" maxLength={10} />
                <input className="dash-input" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name (e.g. Access Bank)" />
                {bankSaved ? (
                  <div className="dash-success-msg"><Icon n="check" s={12} /> Bank account saved</div>
                ) : (
                  <button className="dash-btn" onClick={saveBank} disabled={savingBank || bankAccount.length < 10 || !bankName} style={{ opacity: (savingBank || bankAccount.length < 10 || !bankName) ? 0.5 : 1 }}>
                    <Icon n="device-floppy" s={14} /> {savingBank ? "Saving..." : "Save Bank Details"}
                  </button>
                )}
              </div>
            </div>
            </div>

            {/* ── STEP 3: COMMUNITY ── */}
            <div className={`${!step2Done && !step3Done ? "dash-step-locked" : ""}`}>
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
                  { id: "x", label: "X (Twitter)", icon: "brand-x", connect: true },
                  { id: "facebook", label: "Facebook", icon: "brand-facebook", href: "https://www.facebook.com/share/18bRPkuPVy/" },
                  { id: "discord", label: "Discord", icon: "brand-discord", href: "https://discord.gg/ogapay" },
                ].map(p =>
                  p.connect ? (
                    <button key={p.id} onClick={connectTwitter} disabled={twitterAuthenticating} className="dash-provider" style={{ border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--card)', cursor: twitterAuthenticating ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: twitterAuthenticating ? 0.6 : 1 }}>
                      <div className="dash-provider-icon"><Icon n={p.icon} s={20} /></div>
                      <span>{twitterAuthenticating ? 'Connecting...' : p.label}</span>
                    </button>
                  ) : (
                    <a key={p.id} href={p.href} target="_blank" rel="noopener noreferrer" className="dash-provider">
                      <div className="dash-provider-icon"><Icon n={p.icon} s={20} /></div>
                      <span>{p.label}</span>
                    </a>
                  )
                )}
              </div>
              {step3Done ? (
                <div className="dash-success-msg"><Icon n="check" s={12} /> Community Joined</div>
              ) : (
                <button className={`dash-btn${step3Done ? " green" : ""}`} onClick={() => navigate('/communities')}>
                  <Icon n="users" s={14} /> Browse Communities
                </button>
              )}
            </div>
            </div>

            {/* ── STEP 4: FIRST TASK ── */}
            <div className={`${!step3Done || step4Done ? "dash-step-locked" : ""}`}>
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
                <div className="dash-success-msg"><Icon n="check" s={12} /> First task completed!</div>
              ) : (
                <a href="/tasks" className="dash-btn">
                  <Icon n="briefcase" s={14} /> Browse Available Tasks
                </a>
              )}
            </div>
            </div>

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
              <div className="dash-stat-card" onClick={() => navigate('/tasks')} style={{ cursor: 'pointer' }}>
                <div className="dash-stat-icon"><Icon n="briefcase" s={18} /></div>
                <div className="dash-stat-info">
                  <div className="dash-stat-label">Available Tasks</div>
                  <div className="dash-stat-value">{availableTasks}</div>
                  {availableTasks === "0" && <div style={{ fontSize: 11, fontWeight: 700, color: '#191C6B', marginTop: 2 }}>Browse tasks &rarr;</div>}
                </div>
              </div>
              <div className="dash-stat-card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                  <div className="dash-stat-icon" style={{ background: '#191C6B15', color: '#191C6B' }}><Icon n="currency-dollar" s={18} /></div>
                  <div className="dash-stat-info">
                    <div className="dash-stat-label">Balance</div>
                    <div className="dash-stat-value" style={{ fontSize: 16 }}>
                      {(() => {
                        const walletEntries = user?.wallet ? Object.values(user.wallet as any) : [];
                        const ngnWallet = walletEntries.find((w: any) => w.currency === 'NGN' || w.balance !== undefined) as any;
                        const ctxBalance = ngnWallet?.balance ?? ngnWallet?.available ?? null;
                        if (ctxBalance !== null && ctxBalance > 0) {
                          return '₦' + Number(ctxBalance).toLocaleString();
                        }
                        return totalEarned || '₦0';
                      })()}
                    </div>
                  </div>
                </div>
                <button className="dash-btn green sm" onClick={(e) => { e.stopPropagation(); setShowFundModal(true); }} style={{ flexShrink: 0 }}>
                  <Icon n="plus" s={14} /> Fund
                </button>
              </div>
              <div className="dash-stat-card" onClick={() => navigate('/my-tasks')} style={{ cursor: 'pointer' }}>
                <div className="dash-stat-icon"><Icon n="file-text" s={18} /></div>
                <div className="dash-stat-info">
                  <div className="dash-stat-label">Tasks Posted</div>
                  <div className="dash-stat-value">{postedTasks}</div>
                </div>
              </div>
              <div className="dash-stat-card" onClick={() => navigate('/my-tasks')} style={{ cursor: 'pointer' }}>
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

            <a href="https://t.me/ogapay" target="_blank" rel="noopener noreferrer" className="dash-res-card">
              <div className="dash-res-icon" style={{ background: "#0088cc" }}><Icon n="brand-telegram" s={18} c="#fff" /></div>
              <div>
                <h4>Telegram Support</h4>
                <p>Where the talk happens. Join us</p>
              </div>
            </a>

            <a href="/faq" className="dash-res-card">
              <div className="dash-res-icon"><Icon n="book" s={18} /></div>
              <div>
                <h4>Documentation</h4>
                <p>Learn how to earn on OgaPay. Full docs</p>
              </div>
            </a>

            <a href="/communities" className="dash-res-card">
              <div className="dash-res-icon" style={{ background: "#f59e0b" }}><Icon n="users" s={18} c="#fff" /></div>
              <div>
                <h4>Community</h4>
                <p>Join Nigerian Earners Hub</p>
              </div>
            </a>

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
            <a href="https://x.com/Ogapayhq" target="_blank" rel="noopener noreferrer" className="dash-rlink">
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
                <div className={`dash-progress-fill${allDone ? " done" : ""}`} style={{ width: `${pct}%` }} />
              </div>
              {allDone && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon n="check" s={14} c="#16a34a" /> All steps complete!
                </div>
              )}
            </div>
          </div>

        </div>{/* end two-column grid */}

          {/* --- Onboarding Checklist --- */}
          <div style={{ marginBottom: 20 }}>
            <OnboardingChecklist />
          </div>

          {/* --- Active / Completed tasks from submissions (from API) --- */}
          {(() => {
            const pending = mySubmissions.filter((s: any) => s.status === 'PENDING' || s.status === 'APPLIED');
            const approved = mySubmissions.filter((s: any) => s.status === 'APPROVED');
            const rejected = mySubmissions.filter((s: any) => s.status === 'REJECTED');

            if (mySubmissions.length === 0) return null;

            return (
              <div style={{ marginTop: 24 }}>
                {pending.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 className="dash-section-title"><i className="ti ti-refresh" /> Active Tasks ({pending.length})</h3>
                    {pending.map((s: any) => (
                      <div key={s.id} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
                        {s.task?.title || 'Task'}
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400, marginTop: 4 }}>
                          Submitted {new Date(s.createdAt).toLocaleDateString()} · Reward: {s.task?.reward} {s.task?.currency}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {approved.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 className="dash-section-title" style={{ color: '#16a34a' }}><i className="ti ti-circle-check" /> Completed ✅ ({approved.length})</h3>
                    {approved.map((s: any) => (
                      <div key={s.id} style={{ padding: 14, borderRadius: 10, border: '1px solid rgba(22,163,74,0.2)', background: 'rgba(22,163,74,0.03)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{s.task?.title || 'Task'}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>+{s.task?.reward} {s.task?.currency}</span>
                      </div>
                    ))}
                  </div>
                )}
                {rejected.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 className="dash-section-title" style={{ color: '#ef4444' }}><i className="ti ti-x" /> Not Approved ({rejected.length})</h3>
                    {rejected.map((s: any) => (
                      <div key={s.id} style={{ padding: 14, borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.03)', marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
                        {s.task?.title || 'Task'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

      </div>{/* end dash-wrap2 */}
      {showFundModal && (
        <FundWalletModal
          onClose={() => setShowFundModal(false)}
          onDone={() => refreshUser()}
        />
      )}
    </Layout>
  );
}
