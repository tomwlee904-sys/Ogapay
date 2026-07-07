import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiRequest, API_BASE } from "../lib/api";
import bs58 from "bs58";
import { SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader";
import { OnboardingChecklist } from "../components/OnboardingChecklist";
import FundWalletModal from "../components/FundWalletModal";

// ── Info tooltip ─────────────────────────────────────────────────────
function InfoBtn({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", marginLeft: 4, verticalAlign: "middle" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.stopPropagation(); setShow(s => !s) }}>
      <i className="ti ti-info-circle" style={{ fontSize: 12, color: "var(--text3)", cursor: "pointer" }} />
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", background: "var(--text)", color: "var(--card)",
          fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 8,
          whiteSpace: "normal", width: 240, zIndex: 99, pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

import { useToast } from "../components/Toast";

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
  .dash-progress-fill { height:100%; border-radius:99px; background:var(--accent); transition:width .4s ease; }
  .dash-progress-fill.done { background:var(--green); }
  .dash-section-title { font-family:"Outfit",sans-serif; font-size:13px; font-weight:800; letter-spacing:.04em; margin-bottom:14px; display:flex; align-items:center; gap:8px; color:var(--text2); }
  .dash-stepper-header { display:flex; align-items:center; gap:12px; margin:24px 0 14px; }
  .dash-stepper-num { width:28px; height:28px; border-radius:50%; background:#191C6B; color:#fff; display:grid; place-items:center; font-size:13px; font-weight:800; flex-shrink:0; }
  .dash-stepper-num.done { background:var(--green); }
  .dash-stepper-label { font-family:"Outfit",sans-serif; font-size:15px; font-weight:800; color:var(--text); margin:0; }
  .dash-stepper-sub { font-size:12px; color:var(--text2); margin:0; }
  .dash-step-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px; }
  .dash-step-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:18px 20px; }
  .dash-step-card.full { grid-column:1/-1; }
  .dash-step-badge { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:6px; background:var(--bg2); color:var(--text2); font-size:11px; font-weight:800; margin-bottom:10px; }
  .dash-step-card h4 { font-family:"Outfit",sans-serif; font-size:14px; font-weight:800; margin:0 0 4px; }
  .dash-step-card p { font-size:12px; color:var(--text2); margin:0 0 14px; line-height:1.5; }
  .dash-btn { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 18px; border-radius:9px; font-size:13px; font-weight:700; border:none; cursor:pointer; background:var(--accent); color:#fff; transition:background .14s,opacity .14s; font-family:inherit; }
  .dash-btn:hover { opacity:.85; }
  .dash-btn.green { background:var(--green); }
  .dash-btn.outline { background:transparent; border:1.5px solid var(--border); color:var(--text); }
  .dash-btn.outline:hover { border-color:var(--text2); }
  .dash-btn.sm { height:34px; padding:0 14px; font-size:12px; }
  .dash-input { width:100%; height:38px; padding:0 12px; border:1.5px solid var(--border); border-radius:9px; font-size:13px; font-family:inherit; background:var(--bg2); color:var(--text); outline:none; }
  .dash-input:focus { border-color:var(--accent); }
  .dash-provider-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:14px; }
  .dash-community-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
  .dash-provider { display:flex; flex-direction:column; align-items:center; gap:6px; padding:14px 8px; border:1.5px solid var(--border); border-radius:10px; cursor:pointer; transition:border-color .14s,background .14s; font-size:11px; font-weight:700; background:var(--card); }
  .dash-provider:hover { border-color:var(--text2); }
  .dash-provider.selected { border-color:#191C6B; background:rgba(25,28,107,0.05); }
  .dash-provider-icon { width:32px; height:32px; display:grid; place-items:center; }
  .dash-mini-list { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
  .dash-mini-row { display:flex; align-items:center; gap:8px; padding:6px 0; font-size:12px; color:var(--text2); }
  .dash-mini-row strong { color:var(--text); }
  .dash-mini-row svg { flex-shrink:0; color:#d4d4d8; }
  .dash-announce { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px 20px; margin-bottom:24px; display:flex; align-items:center; gap:14px; color:var(--text); }
  .dash-announce p { font-size:13px; margin:0; line-height:1.5; flex:1; }
  .dash-announce a { color:var(--text2); font-size:12px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
  .dash-announce a:hover { color:var(--text); }
  .dash-stats-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:24px; }
  .dash-stat-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:18px 20px; display:flex; align-items:center; gap:14px; }
  .dash-stat-icon { width:40px; height:40px; border-radius:10px; background:var(--bg2); display:grid; place-items:center; flex-shrink:0; }
  .dash-stat-info { flex:1; }
  .dash-stat-label { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text2); margin-bottom:2px; }
  .dash-stat-value { font-family:"Outfit",sans-serif; font-size:22px; font-weight:900; color:var(--text); }
  .dash-success-msg { font-size:12px; color:var(--green); font-weight:700; margin-top:8px; display:flex; align-items:center; gap:6px; }
  .dash-wallet-addr { font-size:11px; color:var(--text2); font-weight:700; margin-top:6px; font-family:monospace; }

  /* Right panel */
  .dash-left { min-width:0; }
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
    .dash-wrap2 { padding:14px 12px 32px; }
    .dash-step-grid { grid-template-columns:1fr; gap:10px; }
    .dash-stats-row { grid-template-columns:1fr 1fr; gap:8px; }
    .dash-stat-card { padding:10px 12px; }
    .dash-stat-value { font-size:17px; }
    .dash-provider-grid { grid-template-columns:1fr 1fr 1fr; gap:6px; }
    .dash-community-grid { grid-template-columns:1fr 1fr; gap:8px; }
    .dash-intro { padding:12px 14px; gap:10px; }
    .dash-intro h2 { font-size:15px; }
    .dash-intro p { font-size:12px; }
    .dash-intro-icon { width:32px; height:32px; }
    .dash-section-title { font-size:11px; margin-bottom:10px; }
    .dash-step-card { padding:14px 16px; }
    .dash-step-card h4 { font-size:13px; }
    .dash-step-card p { font-size:11px; margin-bottom:10px; }
    .dash-btn { height:36px; padding:0 14px; font-size:12px; }
    .dash-btn.sm { height:30px; padding:0 10px; font-size:11px; }
    .dash-provider { padding:10px 4px; font-size:10px; }
    .dash-provider-icon { width:26px; height:26px; }
    .dash-input { height:36px; font-size:12px; }
    .dash-announce { padding:12px 14px; }
    .dash-announce p { font-size:11px; }
    .dash-progress { margin-bottom:12px; }
    .dash-progress-row { font-size:11px; }
    .dash-progress-bar { height:5px; }
    .dash-video { flex-direction:column; }
    .dash-video-thumb { width:100%; height:100px; }
    .dash-mini-row { font-size:11px; }
    .dash-right { display:flex; flex-direction:column; gap:14px; margin-top:24px; }
    .dash-right h3 { font-size:15px; }
    .dash-res-card { padding:10px; }
    .dash-video, .dash-links-title, .dash-rlink, .dash-divider:last-of-type { display:none; }
    .dash-grid { gap:16px; }
    .dash-left { min-width:0; }
    .dash-step-badge { width:20px; height:20px; font-size:10px; margin-bottom:7px; }
    .dash-headline { flex-direction:column !important; align-items:flex-start !important; gap:6px !important; }
    .dash-headline h1 { font-size:20px !important; }
    .dash-headline p { font-size:12px !important; }
    .dash-headline-badge { font-size:10px !important; padding:3px 8px !important; }
    .dash-subs-wrap { margin-top:16px !important; }
  }
  @media(max-width:480px) {
    .dash-sub-card { padding:10px 12px !important; font-size:12px !important; }
    .dash-sub-card-title { font-size:12px !important; }
    .dash-sub-meta { font-size:10px !important; }
    .dash-sub-reward { font-size:11px !important; }
    .dash-wrap2 { padding:10px 8px 24px; }
    .dash-stats-row { grid-template-columns:1fr; }
    .dash-step-card { padding:12px; }
    .dash-intro { flex-direction:row; text-align:left; gap:8px; padding:10px 12px; }
    .dash-intro h2 { font-size:14px; }
    .dash-intro p { font-size:11px; }
    .dash-intro-icon { width:28px; height:28px; }
    .dash-provider-grid { grid-template-columns:1fr 1fr 1fr; gap:4px; }
    .dash-provider { padding:6px 2px; font-size:8px; gap:3px; }
    .dash-provider-icon { width:22px; height:22px; }
    .dash-section-title { font-size:10px; margin-bottom:8px; letter-spacing:.06em; }
    .dash-step-card h4 { font-size:12px; }
    .dash-step-card p { font-size:10px; margin-bottom:8px; }
    .dash-btn { height:32px; padding:0 12px; font-size:11px; gap:5px; }
    .dash-btn.sm { height:28px; padding:0 8px; font-size:10px; }
    .dash-input { height:32px; font-size:11px; }
    .dash-stat-card { padding:10px 12px; }
    .dash-stat-value { font-size:15px; }
    .dash-stat-icon { width:28px !important; height:28px !important; font-size:14px !important; }
    .dash-stat-label { font-size:10px !important; }
    .dash-success-msg { font-size:10px !important; padding:4px 8px !important; }
    .dash-announce { padding:10px 12px; }
    .dash-announce p { font-size:10px; }
    .dash-progress-row { font-size:10px; }
    .dash-progress-bar { height:4px; }
    .dash-progress { margin-bottom:10px; }
  }
  .dash-grid { display: flex; flex-direction: column; gap: 24px; }
  @media(min-width: 769px) { .dash-grid { display: grid; grid-template-columns: 1fr 280px; } }

  /* Locked step styling */
  @keyframes stepPulse {
    0% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb),0.15); }
    70% { box-shadow: 0 0 0 8px rgba(var(--accent-rgb),0); }
    100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb),0); }
  }
  .dash-step-card.pulse {
    animation: stepPulse 2s ease-in-out infinite;
    border-color: rgba(var(--accent-rgb),0.3) !important;
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
  const { toast } = useToast();
  const [dashLoading, setDashLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [availableTasks, setAvailableTasks] = useState("0");
  const [avgReward, setAvgReward] = useState(350);
  const [totalEarned, setTotalEarned] = useState("₦0.00");
  const [communityJoined, setCommunityJoined] = useState(false);
  const [detectedWallets, setDetectedWallets] = useState<string[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [twitterAuthenticating, setTwitterAuthenticating] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showOgaScoreInfo, setShowOgaScoreInfo] = useState(false);
  const [showRankInfo, setShowRankInfo] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);

  const tasksCompleted = (user as any).tasksCompleted || (user as any)._count?.taskSubmissions || 0;
  const userCreatedAt = user?.createdAt ? new Date(user.createdAt).getTime() : 0;
  const isNewUser = !isNaN(userCreatedAt) && Date.now() - userCreatedAt < 7 * 86400000 && tasksCompleted === 0;

  const [recommended, setRecommended] = useState<any[]>([]);
  const [onboardingCollapsed, setOnboardingCollapsed] = useState(() => {
    return localStorage.getItem('ogapay_onboarding_collapsed') === 'true';
  });

  function toggleOnboarding() {
    const next = !onboardingCollapsed;
    setOnboardingCollapsed(next);
    localStorage.setItem('ogapay_onboarding_collapsed', String(next));
  }

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
        refreshUser();
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
            const rewards = tasks.map((t: any) => Number(t.reward) || 0).filter((r: number) => r > 0);
            if (rewards.length > 0) setAvgReward(Math.round(rewards.reduce((a: number, b: number) => a + b, 0) / rewards.length));
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
        } catch (_) { toast('Failed to load community data', 'error') }

        // Load bank details from auth context
        
        // Fetch my submissions from API instead of localStorage
        try {
          const subsData = await apiRequest<any>('/tasks/my/submissions').catch(() => null);
          if (subsData) {
            const list = Array.isArray(subsData) ? subsData : subsData?.submissions || [];
            setMySubmissions(list);
          }
        } catch { toast('Failed to load submissions', 'error') }

        // Set recommendations from the already-fetched tasks
        if (tasksResponse) {
          const taskList = Array.isArray(tasksResponse) ? tasksResponse : tasksResponse?.data || tasksResponse?.tasks || [];
          setRecommended(taskList.slice(0, 20));
        }

      } catch (e) {
        toast('Could not load dashboard data', 'error')
      }
      setDashLoading(false);
    }
    loadDashboard();
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
  const step2Done = !!walletConnected || !!walletAddress;
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

      // Step 5: Save wallet to profile only after signature verified
      try {
        await apiRequest("/users/wallet", {
          method: "POST",
          body: JSON.stringify({ walletAddress: pubKey, provider: id }),
        });
      } catch (e: any) { console.error(e) }

      setWalletAddress(pubKey);
      setSummaryData((prev: any) => prev ? { ...prev, metrics: { ...prev.metrics, walletConnected: true } } : prev);
      refreshUser();
    } catch (e: any) {
      toast(e?.message || "Wallet verification failed", 'error')
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
      toast('Failed to start Twitter connection', 'error')
    }
  }

  // Check for Twitter OAuth success on mount/focus
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('twitter') === 'connected') {
      // Clean URL and refetch dashboard
      window.history.replaceState({}, '', window.location.pathname);
      toast('Twitter connected successfully!', 'success')
      // Refetch dashboard data
      const refetch = async () => {
        try {
          const summary = await apiRequest<any>('/dashboard/summary');
          if (summary) setSummaryData(summary);
        } catch (e: any) { console.error(e) }
      };
      refetch();
    }
  }, []);

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

  return (
    <Layout sidebar={false}>
      <style>{CSS}</style>
      <div className="dash-wrap2">

        {/* ── INTRO / WELCOME BANNER ── */}
        {allDone ? (
          <div className="dash-intro complete" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div style={{width:44,height:44,borderRadius:'50%',flexShrink:0,overflow:'hidden',background:'var(--accent)',color:'#fff',display:'grid',placeItems:'center',fontSize:15,fontWeight:800,border:'2px solid rgba(255,255,255,0.2)'}}>
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
        ) : isNewUser ? (
          <div className="dash-intro" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div style={{width:44,height:44,borderRadius:'50%',flexShrink:0,overflow:'hidden',background:'var(--accent)',color:'#fff',display:'grid',placeItems:'center',fontSize:15,fontWeight:800,border:'2px solid rgba(255,255,255,0.2)'}}>
              {avatarUrl ? <img src={avatarUrl} alt={fname} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} /> : initials || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <h2>Welcome to OgaPay, {fname}!</h2>
              <p>Your account is ready. Complete the 4 steps below to start earning tasks and getting paid.</p>
            </div>
          </div>
        ) : (
          <div className="dash-intro" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div style={{width:44,height:44,borderRadius:'50%',flexShrink:0,overflow:'hidden',background:'var(--accent)',color:'#fff',display:'grid',placeItems:'center',fontSize:15,fontWeight:800,border:'2px solid rgba(255,255,255,0.2)'}}>
              {avatarUrl ? <img src={avatarUrl} alt={fname} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} /> : initials || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <h2>{getGreeting()}, {fname}</h2>
              <p>Good to see you again. Pick up where you left off.</p>
            </div>
          </div>
        )}

        {/* ── KYC NUDGE ── */}
        {user && !['APPROVED', 'VERIFIED'].includes(user?.kycStatus || '') && (
          <div onClick={() => navigate('/settings#kyc')} style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, marginBottom: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-shield-off" style={{ fontSize: 18, color: '#b45309' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#b45309', flex: 1 }}>Complete your KYC verification to unlock withdrawals</span>
            <i className="ti ti-arrow-right" style={{ fontSize: 16, color: '#b45309' }} />
          </div>
        )}

        {/* ── EMAIL VERIFICATION NUDGE ── */}
        {user && !isEmailVerified && (
          <div style={{ padding: '12px 16px', background: 'rgba(25,28,107,0.07)', border: '1px solid rgba(25,28,107,0.25)', borderRadius: 10, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-mail-exclamation" style={{ fontSize: 18, color: '#191C6B' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#191C6B', flex: 1 }}>Verify your email to receive task notifications</span>
            <span onClick={async (e) => {
              const el = e.currentTarget;
              const orig = el.textContent;
              el.textContent = 'Sending...'; el.style.pointerEvents = 'none';
              try {
                const r = await fetch(`${API_BASE}/auth/send-verification`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: user?.email }),
                });
                const j = await r.json();
                if (!r.ok) throw new Error(j.message || 'Failed');
                el.innerHTML = '<i class="ti ti-check" style="font-size:12px"></i> Sent!';
                setTimeout(() => { el.textContent = 'Resend'; el.style.pointerEvents = 'auto'; }, 4000);
              } catch {
                el.textContent = 'Failed';
                setTimeout(() => { el.textContent = 'Resend'; el.style.pointerEvents = 'auto'; }, 3000);
              }
            }} style={{ fontSize: 12, fontWeight: 800, color: '#191C6B', cursor: 'pointer', whiteSpace: 'nowrap' }}>Resend</span>
          </div>
        )}

        {/* ── SMART NUDGE ── */}
        {(() => {
          if (!user) return null;
          const dismissed = localStorage.getItem('ogapay_nudge_dismissed');
          if (dismissed) {
            try {
              const parsed = JSON.parse(dismissed);
              if (Date.now() - parsed.ts < 86400000) return null;
      } catch (e: any) { console.error(e) }
          }
          const lastTaskAt = (user as any).lastTaskAt;
          const daysSinceTask = lastTaskAt
            ? Math.floor((Date.now() - new Date(lastTaskAt as string).getTime()) / 86400000)
            : -1;
          const balanceVal = (() => {
            const walletEntries = user?.wallet ? Object.values(user.wallet as any) : [];
            const ngnWallet = walletEntries.find((w: any) => w.currency === 'NGN' || w.balance !== undefined) as any;
            return ngnWallet?.balance ?? ngnWallet?.available ?? 0;
          })();
          const nudge = !['APPROVED', 'VERIFIED'].includes(user?.kycStatus || '') && tasksCompleted >= 3
            ? { icon: 'ti-shield', color: '#f59e0b', msg: 'Verify your identity to unlock tasks worth ₦500+', cta: 'Verify Now', action: '/settings#kyc' }
            : daysSinceTask > 3 && lastTaskAt
            ? { icon: 'ti-bolt', color: 'var(--accent)', msg: `You haven't earned in ${daysSinceTask} days — new tasks are waiting`, cta: 'Browse Tasks', action: '/tasks' }
            : balanceVal >= 1000
            ? { icon: 'ti-wallet', color: 'var(--green)', msg: `You have ₦${balanceVal.toLocaleString()} available — ready to withdraw?`, cta: 'Withdraw', action: '/wallet' }
            : (!user.bio || !user.avatar)
            ? { icon: 'ti-user', color: '#0891b2', msg: 'Complete your profile to build trust with task posters', cta: 'Complete Profile', action: '/profile' }
            : null;
          if (!nudge) return null;
          return (
            <div style={{ padding: '10px 14px', background: `${nudge.color}10`, border: `1px solid ${nudge.color}40`, borderRadius: 10, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className={nudge.icon} style={{ fontSize: 18, color: nudge.color }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{nudge.msg}</span>
              <button onClick={() => navigate(nudge.action)} style={{ height: 30, padding: '0 12px', borderRadius: 7, background: nudge.color, color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{nudge.cta}</button>
              <button onClick={() => { localStorage.setItem('ogapay_nudge_dismissed', JSON.stringify({ ts: Date.now() })); window.location.reload() }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, fontSize: 14 }}><i className="ti ti-x" /></button>
            </div>
          );
        })()}
        {/* ── STATS CARDS (always under greeting) ── */}
        <div className="dash-stats-row">
          <div className="dash-stat-card" onClick={() => navigate('/tasks')} style={{ cursor: 'pointer' }}>
            <div className="dash-stat-icon" style={{ background: 'rgba(var(--accent-rgb),0.08)', color: 'var(--accent)' }}><Icon n="briefcase" s={18} /></div>
            <div className="dash-stat-info">
              <div className="dash-stat-label">Available to Earn<InfoBtn text="Estimated total earnings across all open tasks. Calculated as the number of open tasks × average reward per task." /></div>
              <div className="dash-stat-value">₦{(parseInt(availableTasks) * avgReward).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>across {availableTasks} open tasks</div>
            </div>
          </div>
          <div className="dash-stat-card" onClick={() => navigate('/wallet')} style={{ cursor: 'pointer' }}>
            <div className="dash-stat-icon" style={{ background: 'rgba(22,163,74,0.08)', color: 'var(--green)' }}><Icon n="wallet" s={18} /></div>
            <div className="dash-stat-info">
              <div className="dash-stat-label">Your Balance<InfoBtn text="Your total wallet balance across all currencies. Connect a Solana wallet to enable crypto payments and withdrawals." /></div>
              <div className="dash-stat-value" style={{ fontSize: 16 }}>
                {(() => {
                  const walletEntries = user?.wallet ? Object.values(user.wallet as any) : [];
                  const ngnWallet = walletEntries.find((w: any) => w.currency === 'NGN' || w.balance !== undefined) as any;
                  const ctxBalance = ngnWallet?.balance ?? ngnWallet?.available ?? 0;
                  return '₦' + Number(ctxBalance).toLocaleString();
                })()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                {(() => {
                  const e = user?.wallet ? Object.values(user.wallet as any) : [];
                  const n = e.find((w: any) => w.currency === 'NGN') as any;
                  const b = n?.balance ?? n?.available ?? 0;
                  return b >= 500 ? <><i className="ti ti-circle-check" style={{color:'var(--green)'}} /> Ready to withdraw</> : `₦${(500 - b).toLocaleString()} more to withdraw`;
                })()}
              </div>
            </div>
          </div>
          <div className="dash-stat-card" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
            <div className="dash-stat-icon" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}><Icon n="star" s={18} /></div>
            <div className="dash-stat-info">
              <div className="dash-stat-label">OgaScore
                <button onClick={e => { e.stopPropagation(); setShowOgaScoreInfo(true) }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: 3 }}>
                  <i className="ti ti-info-circle" style={{ fontSize: 13, color: 'var(--text3)' }} />
                </button>
              </div>
              <div className="dash-stat-value">{(user as any).ogaScore || (user as any).reputationScore || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Rank {(user as any).rank || 1}
                <button onClick={e => { e.stopPropagation(); setShowRankInfo(true) }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: 2 }}>
                  <i className="ti ti-info-circle" style={{ fontSize: 10, color: 'var(--text3)' }} />
                </button>
              </div>
            </div>
          </div>
          <div className="dash-stat-card" onClick={() => navigate('/my-tasks')} style={{ cursor: 'pointer' }}>
            <div className="dash-stat-icon" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed' }}><Icon n="check" s={18} /></div>
            <div className="dash-stat-info">
              <div className="dash-stat-label">Tasks Done</div>
              <div className="dash-stat-value">{tasksCompleted}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{tasksCompleted === 0 ? 'Complete your first task today' : `${mySubmissions.filter(s => s.status === 'PENDING').length} pending approval`}</div>
            </div>
          </div>
        </div>

        {/* ── PROGRESS BAR (visible once user has started) ── */}
        {completed > 0 && (
          <div className="dash-progress" style={{ marginBottom: 20 }}>
            <div className="dash-progress-row">
              <span style={{ fontWeight: 700, fontSize: 13 }}>{completed} of {total} steps complete</span>
              <span style={{ color: allDone ? "var(--green)" : "var(--accent)", fontWeight: 800 }}>{pct}%</span>
            </div>
            <div className="dash-progress-bar">
              <div className={`dash-progress-fill${allDone ? " done" : ""}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* ── GETTING STARTED (only when onboarding incomplete) ── */}
        {!allDone && (
          <>
            <div className="dash-headline" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 900, margin: 0 }}>Getting Started</h1>
                <p style={{ fontSize: 14, color: "var(--text2)", margin: "4px 0 0" }}>Complete your setup to start earning on OgaPay</p>
              </div>
            </div>

            <OnboardingChecklist />            
            {/* ANNOUNCEMENT */}
            <div className="dash-announce">
              <Icon n="megaphone" s={18} c="var(--accent)" />
              <p>OgaPay tasks are now available in Nigeria, Ghana, Kenya and more.</p>
              <a href="https://ogapay.gitbook.io/userguide" target="_blank" rel="noopener"><Icon n="file-text" s={13} /> Read our getting started guide</a>
            </div>
          </>
        )}

        {/* ── QUICK EARN STRIP ── */}
        {recommended.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 900, margin: 0 }}>Available Tasks</h2>
              <a href="/tasks" style={{ fontSize: 13, fontWeight: 700, color: '#191C6B', textDecoration: 'none' }}>See all →</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {recommended.slice(0, 6).map((task: any) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', cursor: 'pointer', transition: 'border-color .15s, transform .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(25,28,107,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = ''; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#191C6B' }}>₦{Number(task.reward || 0).toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg2)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{task.category || 'General'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TWO-COLUMN GRID (resources + submissions) ── */}
        <div className="dash-grid">
          <div className="dash-left">
            {(() => {
              const pending = mySubmissions.filter((s: any) => s.status === 'PENDING' || s.status === 'APPLIED');
              const approved = mySubmissions.filter((s: any) => s.status === 'APPROVED');
              const rejected = mySubmissions.filter((s: any) => s.status === 'REJECTED');

              if (mySubmissions.length === 0) return null;

              return (
                <div className="dash-subs-wrap" style={{ marginTop: 24 }}>
                  {pending.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h3 className="dash-section-title"><i className="ti ti-refresh" /> Active Tasks ({pending.length})</h3>
                      {pending.map((s: any) => (
                        <div key={s.id} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
                          {s.task?.title || 'Task'}
                          <div className='dash-sub-meta' style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400, marginTop: 4 }}>
                            Submitted {new Date(s.createdAt).toLocaleDateString()} · Reward: {s.task?.reward} {s.task?.currency}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {approved.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h3 className="dash-section-title" style={{ color: 'var(--green)' }}><i className="ti ti-circle-check" /> Completed ✓ ({approved.length})</h3>
                      {approved.map((s: any) => (
                        <div key={s.id} style={{ padding: 14, borderRadius: 10, border: '1px solid rgba(22,163,74,0.2)', background: 'rgba(22,163,74,0.03)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="dash-sub-card-title" style={{ fontSize: 13, fontWeight: 700 }}>{s.task?.title || 'Task'}</span>
                          <span className="dash-sub-reward" style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)' }}>+{s.task?.reward} {s.task?.currency}</span>
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
          </div>
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

            <a href="https://www.youtube.com/watch?v=G14bYYthL2g" target="_blank" rel="noopener noreferrer" className="dash-video" style={{textDecoration:'none',display:'flex',gap:12,alignItems:'center',padding:'10px 12px',borderRadius:10,border:'1px solid var(--border)',background:'var(--card)',transition:'all .2s',cursor:'pointer'}}>
              <div className="dash-video-thumb" style={{width:80,height:60,borderRadius:8,background:'linear-gradient(135deg,#315EFB,#011F9A)',display:'grid',placeItems:'center',flexShrink:0}}>
                <Icon n="player-play" s={20} c="#fff" />
              </div>
              <div className="dash-video-meta" style={{flex:1}}>
                <h4 style={{fontSize:13,fontWeight:700,margin:'0 0 2px',color:'var(--text)'}}>How to earn your first on OgaPay</h4>
                <small style={{fontSize:10,color:'var(--text3)',fontWeight:600,textTransform:'uppercase'}}>Watch on YouTube →</small>
              </div>
            </a>

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

          </div>
        </div>{/* end two-column grid */}

      </div>{/* end dash-wrap2 */}
      {showFundModal && (
        <FundWalletModal
          onClose={() => setShowFundModal(false)}
          onDone={() => refreshUser()}
        />
      )}

      {showOgaScoreInfo && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={() => setShowOgaScoreInfo(false)}>
          <div style={{background:'var(--card)',borderRadius:14,padding:24,maxWidth:460,width:'90%',position:'relative'}} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowOgaScoreInfo(false)} style={{position:'absolute',top:16,right:16,background:'none',border:'none',fontSize:24,cursor:'pointer',color:'var(--text2)'}}><i className="ti ti-x" /></button>
            <h2 style={{fontSize:18,fontWeight:900,marginBottom:16}}>What is OgaScore?</h2>
            <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
              OgaScore is your reputation score on OgaPay. It reflects your trust level and activity on the platform. A higher score unlocks premium communities and higher-paying tasks.
            </p>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:8}}>How to increase your OgaScore:</div>
            <ul style={{fontSize:12,color:'var(--text)',lineHeight:1.8,paddingLeft:18,margin:'0 0 4px'}}>
              <li>Connect social accounts (LinkedIn +10, X +8, GitHub +8, Google +5, Telegram +5)</li>
              <li>Complete KYC/BVN verification (+20)</li>
              <li>Complete tasks on time</li>
              <li>Fill in your profile (bio, avatar, skills)</li>
              <li>Connect a Solana wallet</li>
              <li>Refer friends to OgaPay</li>
            </ul>
          </div>
        </div>
      )}

      {showRankInfo && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={() => setShowRankInfo(false)}>
          <div style={{background:'var(--card)',borderRadius:14,padding:24,maxWidth:460,width:'90%',position:'relative'}} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowRankInfo(false)} style={{position:'absolute',top:16,right:16,background:'none',border:'none',fontSize:24,cursor:'pointer',color:'var(--text2)'}}><i className="ti ti-x" /></button>
            <h2 style={{fontSize:18,fontWeight:900,marginBottom:16}}>What is Rank?</h2>
            <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
              Your Rank (level) reflects your experience and standing on OgaPay. It's determined by your OgaScore, tasks completed, success rate, and overall platform activity.
            </p>
            <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
              Higher ranks unlock access to exclusive tasks, premium communities, and higher reward opportunities.
            </p>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:6}}>Ranks: Beginner → Intermediate → Advanced → Expert → Legend</div>
          </div>
        </div>
      )}
    </Layout>
  );
}
