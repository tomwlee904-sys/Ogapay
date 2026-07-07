import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from "../components/Layout";
import { apiRequest, API_BASE } from "../lib/api";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { useWalletBalance } from "../context/WalletBalanceContext";

import { injectSkeletonStyles, SkeletonPage } from '../components/SkeletonLoader'
import { useToast } from '../components/Toast'
import { uploadImage } from '../lib/upload'
import bs58 from "bs58"
import VirtualAccountCard from '../components/VirtualAccountCard'

/* ─── Icons ─── */
import TabWorkerPortalContent from '../components/ProfileWorkerPortalTab'
import TabNotificationsContent from '../components/ProfileNotificationsTab'
import TabReferralsContent from '../components/ProfileReferralsTab'
import TabMyTasksContent from '../components/ProfileMyTasksTab'
import TabEarningsContent from '../components/ProfileEarningsTab'
const Icon = ({ n, s = 16, c }: { n: any; s?: number; c?: any }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
);

const XIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--text)">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.739l7.727-8.833L1.255 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const QUICK = [
  { icon: "activity", label: "Job Monitor", page: "monitor" },
  { icon: "lock", label: "Vault", page: "vault" },
  { icon: "news", label: "Blogs", page: "blog" },
  { icon: "checklist", label: "Available Jobs", page: "tasks" },
  { icon: "bookmark", label: "Bookmarks", page: "bookmarks" },
  { icon: "circle-plus", label: "Create Job", page: "create" },
];

/* ─── Helpers ─── */
const f = new Intl.NumberFormat("en-US");

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return new Date(dateStr).toLocaleDateString();
}

function Toggle({ on, set }: { on: any; set: any }) {
  return (
    <button onClick={() => set((v: any) => !v)} className="tg-btn">
      <span className={`tg-knob ${on ? "on" : ""}`} />
    </button>
  );
}

function CopyBtn({ text }: { text: any }) {
  const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); };
  return (
    <button onClick={copy} className="btn-outline btn-sm">
      <Icon n={ok ? "check" : "copy"} s={13} c={ok ? "var(--green)" : "var(--text2)"} />
      {ok ? "Copied!" : "Copy"}
    </button>
  );
}

function StatRow({ label, val, info, valClass, onInfoClick }: { label: any; val: any; info?: any; valClass?: any; onInfoClick?: () => void }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}{info && (
        <button onClick={e => { e.stopPropagation(); onInfoClick?.() }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: 3 }}>
          <Icon n="info-circle" s={13} c="var(--text3)" />
        </button>
      )}</span>
      <span className={`stat-val ${valClass === "no" ? "text-red" : valClass === "yes" ? "text-green" : ""}`}>
        {val}
      </span>
    </div>
  );
}

/* ─── Toast helper ─── */

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

/* ─── Main Profile Component ─── */
// ── Inject skeleton styles on mount ──
export default function Profile() {
  useEffect(() => { injectSkeletonStyles(); }, []);
  const { fmt, preferredCurrency } = useCurrency()
  const navigate = useNavigate();
  const { user: authUser, refreshUser } = useAuth();
  const { balances: walletBal, refresh: refreshWallet } = useWalletBalance();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || "profile");
  const [showBal, setShowBal] = useState(false);
  const [swBal, setSwBal] = useState(false);
  const [verifSending, setVerifSending] = useState(false);
  const [verifMsg, setVerifMsg] = useState('');
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankMsg, setBankMsg] = useState("");
  const [showKyc, setShowKyc] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [kycDob, setKycDob] = useState("");
  const [kycStep, setKycStep] = useState("idle");
  const [kycMsg, setKycMsg] = useState("");
  const [kycLoading, setKycLoading] = useState(false);
  const [kycDocument, setKycDocument] = useState<File | null>(null);
  const [kycDocumentPreview, setKycDocumentPreview] = useState("");
  const [kycUploading, setKycUploading] = useState(false);

  // ── Info Modal State ──
  const [showInfo, setShowInfo] = useState<string | null>(null);

  // ── Edit Profile Modal State ──
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', username: '', bio: '', avatarUrl: '' });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── API Data state ──
  const [profileData, setProfileData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [detectedWallets, setDetectedWallets] = useState<string[]>([]);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [generatingPair, setGeneratingPair] = useState(false);

  // ── Fetch all data on mount & when authUser changes (e.g. wallet connected on Dashboard) ──
  const loadProfile = async () => {
    try {
      const [userData, txData, refData, kycData] = await Promise.all([
        apiRequest<any>('/users/me').catch(() => null),
        apiRequest<any>('/users/transactions/history').catch(() => null),
        apiRequest<any>('/users/referrals/stats').catch(() => null),
        apiRequest<any>('/kyc/status').catch(() => null),
      ]);
      if (userData) {
        setProfileData(userData);
        const ba = userData.bankAccount;
        if (ba) {
          if (typeof ba === 'object') {
            const acctNum = ba.accountNumber || ba.account_number || ''
            const bName = ba.bankName || ba.bank_name || ''
            const aName = ba.accountName || ba.account_name || ''
            setAccountNumber(acctNum)
            setBankName(bName)
            setAccountName(aName)
            setEditingBank(false)
          } else if (typeof ba === 'string' && ba.length > 0) {
            setAccountNumber(ba)
            setEditingBank(false)
          } else {
            setEditingBank(false)
          }
        } else {
          setEditingBank(false)
        }
      }
      if (txData) setTransactions(Array.isArray(txData) ? txData : txData?.data || []);
      if (refData) setReferralStats(refData);
      if (kycData) setKycStatus(kycData);
    } catch (err) {
      toast('Failed to load profile data', 'error');
    }
  };

  useEffect(() => {
    setLoading(true);
    loadProfile().finally(() => setLoading(false));
  }, [authUser]);

  // Detect installed Solana wallets
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
    if (editingBank) {
      setTimeout(() => document.getElementById('bank-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [editingBank]);

  const parseUser = (d: any) => {
    if (!d) return null;
    return {
      id: d.id || d.sub || '',
      email: d.email || '',
      firstName: d.firstName || d.first_name || '',
      lastName: d.lastName || d.last_name || '',
      username: d.username || d.userName || d.user_name || '',
      avatarUrl: d.avatarUrl || d.avatar_url || d.avatar || d.picture || null,
      role: d.role || 'WORKER',
      referralCode: d.referralCode || d.referral_code || '',
      isEmailVerified: d.isEmailVerified ?? d.is_email_verified ?? false,
      createdAt: d.createdAt || d.created_at || '',
      wallets: d.wallets || [],
      workerProfile: d.workerProfile || d.worker_profile || null,
      kyc: d.kyc || null,
      _count: d._count || { tasksCreated: 0, taskSubmissions: 0 },
    };
  };

  const user = parseUser(profileData);

  // Computed wallet info — read from authUser (auth context) not local profileData
  const walletAddress = authUser?.walletAddress || profileData?.walletAddress || '';
  const hasWallet = !!walletAddress;
  const shortAddr = walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : '';

  const ngnBal = walletBal?.NGN?.balance ?? 0;
  const usdcBal = walletBal?.USDC?.balance ?? 0;
  const solBal = walletBal?.SOL?.balance ?? 0;
  const totalNgn = walletBal?.NGN?.available ?? ngnBal;

  // formatNgn replaced by useCurrency fmt

  // Earnings from transactions
  const earningsTotal = transactions
    .filter((t: any) => Number(t.amount || 0) > 0)
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  const withdrawals = transactions.filter((t: any) => (t.type || '').toLowerCase().includes('withdraw'));

  // Referral link
  const refCode = user?.referralCode || referralStats?.referralCode || '';
  const refUrl = refCode ? `${window.location.origin}/ref/${refCode}` : '';

  // KYC status
  const isKycVerified = kycStatus?.status === 'APPROVED' || profileData?.kyc?.status === 'APPROVED';

  // Bank account save
  const saveBank = async () => {
    if (!accountNumber || !bankName || !accountName) {
      setBankMsg('Please fill all fields');
      return;
    }
    setSavingBank(true);
    setBankMsg('');
    try {
      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          bankAccount: accountNumber,
          bankName: bankName,
          accountName: accountName,
        }),
      });
      setEditingBank(false);
      setSavingBank(false);
      refreshUser();
      toast('Bank account saved');
    } catch (err) {
      setBankMsg('Failed to save bank details. Please try again.');
      setSavingBank(false);
    }
  };

  async function connectWallet(id: string) {
    if (!detectedWallets.includes(id)) return;
    setConnecting(id);
    try {
            let wallet: any;
      if (id === "phantom") wallet = (window as any).phantom?.solana;
      else if (id === "backpack") wallet = (window as any).backpack;
      else if (id === "solflare") wallet = (window as any).solflare;
      if (!wallet?.connect) { setConnecting(null); return; }

            let pubKey = wallet.publicKey?.toString();
      if (!pubKey) {
        const resp = await wallet.connect();
        pubKey = resp?.publicKey?.toString();
              } else {
              }
      if (!pubKey) throw new Error("No public key");

      // Immediately save wallet address to backend
      try {
        await apiRequest("/users/wallet", {
          method: "POST",
          body: JSON.stringify({ walletAddress: pubKey, provider: id }),
        });
      } catch (e: any) { console.error(e) }

            const nonceRes = await apiRequest<{ nonce: string; message: string }>("/wallet/nonce", {
        method: "POST",
        body: JSON.stringify({ wallet: pubKey }),
      });
      if (!nonceRes?.nonce) throw new Error("No nonce received");
      
            const encodedMessage = new TextEncoder().encode(nonceRes.message);
      const signedResult = await wallet.signMessage(encodedMessage);
      const signatureBytes = signedResult?.signature ?? signedResult;
      const signature = bs58.encode(signatureBytes);
      
            await apiRequest("/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ wallet: pubKey, signature }),
      });
      
      await refreshUser()
      await loadProfile()
      setShowWalletOptions(false)
      toast('Wallet connected!')
    } catch (e: any) {
      const msg = e?.message || String(e) || "Wallet verification failed";
            toast(msg, 'error');
    }
    setConnecting(null);
  }

  const handleGeneratePairCode = async () => {
    setGeneratingPair(true)
    try {
      const data: any = await apiRequest('/devices/pair/generate', { method: 'POST' })
      if (data?.code) {
        setPairCode(data.code)
        setTimeout(() => setPairCode(''), 5 * 60 * 1000)
      }
    } catch (err: any) {
      toast(err.message || 'Failed to generate code', 'error')
    } finally {
      setGeneratingPair(false)
    }
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: "user" },
    { id: "earnings", label: "Earnings", icon: "currency-dollar" },
    { id: "my-tasks", label: "My Tasks", icon: "clipboard-list" },
    { id: "referrals", label: "Referrals", icon: "affiliate" },
    { id: "notifications", label: "Notifications", icon: "bell" },
    { id: "portal", label: "Worker Portal", icon: "briefcase" },
  ];
  const tabNav = (id: string) => {
    setTab(id);
  };

  // Scroll active tab into view on mobile
  const tabBarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tabBarRef.current) {
      const activeBtn = tabBarRef.current.querySelector('.tab-btn.active');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [tab]);

  return loading ? <SkeletonPage /> : (
    <div className="page-fade-in">
    <Layout>
      <style>{`
        .pg{width:100%;max-width:100%;margin:0 auto;padding:0 16px 60px}
        .page{max-width:100%!important;width:100%}
        .tab-bar{display:grid;grid-template-columns:repeat(6,1fr);gap:0;margin:0 0 20px;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card)}
        .tab-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;height:72px;padding:10px 10px;border:none;border-right:1px solid var(--border);background:transparent;color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;transition:background .13s,color .13s;text-align:center;font-family:inherit}
        .tab-btn:last-child{border-right:none}
        .tab-btn:hover{background:var(--bg2);color:var(--text)}
        .tab-btn.active{background:rgba(var(--accent-rgb),0.06);color:var(--text)}
        .tab-btn i{font-size:18px;color:var(--text3);transition:color .13s}
        .tab-btn.active i{color:var(--accent)}
        @media(max-width:640px){.tab-bar{overflow-x:auto;overflow-y:hidden;grid-template-columns:none;display:flex;flex-wrap:nowrap;border-radius:10px;scrollbar-width:none;-webkit-overflow-scrolling:touch;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 20px,#000 calc(100% - 20px),transparent 100%);mask-image:linear-gradient(to right,transparent 0,#000 20px,#000 calc(100% - 20px),transparent 100%)}.tab-btn{min-width:84px;height:64px;padding:8px 6px;font-size:11px;white-space:nowrap}.tab-btn i{font-size:17px}}
        .prof-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
        @media(max-width:820px){.prof-grid{grid-template-columns:1fr}}
        .prof-full{grid-column:1/-1;margin-bottom:32px}
        .profile-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:0;overflow:hidden;transition:box-shadow .25s ease}
        .profile-card-sm{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px}
        .profile-card-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border);font-size:14px;font-weight:800}
        .profile-card-body{padding:20px 24px}
        .stat-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);font-size:13px}
        .stat-row:last-child{border-bottom:none}
        .stat-label{color:var(--text2);font-weight:600;display:flex;align-items:center;gap:5px}
        .stat-val{font-weight:800;color:var(--text);font-size:14px}
        .text-red{color:#ef4444!important}
        .text-green{color:var(--green)!important}
        .profile-quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        @media(max-width:600px){.profile-quick-grid{grid-template-columns:repeat(2,1fr);gap:10px}}
        .quick-tile{height:100px;border:1px solid var(--border);border-radius:20px;padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-size:12px;font-weight:700;color:var(--text2);background:var(--card);cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s;text-decoration:none;font-family:inherit}
        .quick-tile:hover{transform:translateY(-2px);box-shadow:var(--shadow-soft);border-color:rgba(var(--accent-rgb),0.2);color:var(--text)}
        .quick-tile i{font-size:20px}
        .page-head-sm{display:flex;align-items:center;gap:8px;margin-bottom:20px}
        .page-head-sm h2{font-size:20px;font-weight:800;margin:0}
        .pill-btn{height:32px;padding:0 14px;border-radius:99px;border:1.5px solid var(--border);background:transparent;color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;transition:all .13s;font-family:inherit;white-space:nowrap}
        .pill-btn.active{background:var(--text);color:var(--bg);border-color:var(--text)}
        .pill-btn:hover:not(.active){border-color:var(--text)}
        .search-wrap{position:relative}
        .search-wrap input{width:100%;height:40px;padding:0 14px 0 36px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:13px;outline:none;transition:border-color .13s}
        .search-wrap input:focus{border-color:var(--accent)}
        .tg-btn{width:40px;height:22px;border-radius:99px;border:none;background:var(--border);cursor:pointer;position:relative;flex-shrink:0;transition:background .2s;padding:0}
        .tg-btn .tg-knob{width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:3px;left:3px;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,.15)}
        .tg-btn .tg-knob.on{left:21px;background:var(--accent)}
        .tg-btn:has(.on){background:rgba(var(--accent-rgb),.2)}
        .btn-outline{height:34px;padding:0 14px;border-radius:99px;border:1.5px solid var(--border);background:transparent;color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .13s;font-family:inherit}
        .btn-outline:hover{border-color:var(--text);color:var(--text)}
        .btn-sm{height:30px;padding:0 12px;font-size:11px}
        .dash-btn{height:48px;padding:0 24px;border-radius:var(--radius-sm);border:none;background:var(--text);color:var(--bg);font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .15s,opacity .15s;font-family:inherit}
        .dash-btn:hover{opacity:.9}.dash-btn:active{transform:scale(0.97)}
        .dash-input{width:100%;height:48px;padding:0 16px;border:1px solid var(--border);border-radius:16px;background:var(--card);color:var(--text);font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;font-family:inherit;box-sizing:border-box}
        .dash-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(var(--accent-rgb),0.1)}
        .skeleton{background:var(--bg2);border-radius:var(--radius-sm);animation:pulse 1.5s ease-in-out infinite;min-height:16px}
        @keyframes pulse{0%{opacity:.6}50%{opacity:.3}100%{opacity:.6}}
        .onboarding-banner{display:flex;align-items:center;gap:12px;padding:16px 20px;background:rgba(var(--accent-rgb),.08);border:1px solid rgba(var(--accent-rgb),.15);border-radius:var(--radius);margin-bottom:12px;font-size:13px}
        .onboarding-banner .ob-msg{flex:1;color:var(--text)}
        .onboarding-banner .ob-btn{height:32px;padding:0 14px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit}
        .onboarding-banner .ob-close{width:28px;height:28px;border:none;background:none;color:var(--text3);cursor:pointer;display:grid;place-items:center;font-size:16px;flex-shrink:0}
      `}</style>

      {/* Onboarding banners */}
      {!loading && !authUser?.walletAddress && (
        <div className="onboarding-banner">
          <i className="ti ti-wallet" style={{color:'var(--accent)',fontSize:20}} />
          <span className="ob-msg">Connect your wallet to unlock full features</span>
          <button className="ob-btn" onClick={() => setShowWalletOptions(true)}>Connect Wallet</button>
          <button className="ob-close" onClick={e => ((e.currentTarget.closest('.onboarding-banner') as HTMLElement)!.style.display='none')}><i className="ti ti-x" /></button>
        </div>
      )}
      {!loading && !authUser?.isEmailVerified && (
        <div className="onboarding-banner">
          <i className="ti ti-mail" style={{color:'#f59e0b',fontSize:20}} />
          <span className="ob-msg">{verifMsg || 'Verify your email address to receive account notifications'}</span>
          <button className="ob-btn" onClick={async () => {
            if (verifSending) return;
            setVerifSending(true);
            setVerifMsg('');
            try {
              await apiRequest('/auth/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email: authUser?.email }),
              });
              setVerifMsg(<> <i className="ti ti-circle-check" style={{color:'var(--green)'}} /> Verification email sent! Check your inbox.</>);
              setTimeout(() => setVerifMsg(''), 8000);
            } catch (err: any) {
              setVerifMsg(<> <i className="ti ti-circle-x" style={{color:'var(--red)'}} /> {err?.message || 'Failed to send. Please try again.'}</>);
            } finally {
              setVerifSending(false);
            }
          }} disabled={verifSending}>
            {verifSending ? 'Sending...' : 'Resend Email'}
          </button>
          <button className="ob-close" onClick={e => ((e.currentTarget.closest('.onboarding-banner') as HTMLElement)!.style.display='none')}><i className="ti ti-x" /></button>
        </div>
      )}
      {!loading && !authUser?.bankAccount && (
        <div className="onboarding-banner">
          <i className="ti ti-building-bank" style={{color:'#f59e0b',fontSize:20}} />
          <span className="ob-msg">Add a bank account to withdraw in Naira</span>
          <button className="ob-btn" onClick={() => { setTab('profile'); setEditingBank(true); }}>Add Bank Account</button>
          <button className="ob-close" onClick={e => ((e.currentTarget.closest('.onboarding-banner') as HTMLElement)!.style.display='none')}><i className="ti ti-x" /></button>
        </div>
      )}
      {!loading && !isKycVerified && (
        <div className="onboarding-banner">
          <i className="ti ti-shield-check" style={{color:'var(--red)',fontSize:20}} />
          <span className="ob-msg">Complete identity verification to withdraw</span>
          <button className="ob-btn" onClick={() => setShowKyc(true)}>Verify Now</button>
          <button className="ob-close" onClick={e => ((e.currentTarget.closest('.onboarding-banner') as HTMLElement)!.style.display='none')}><i className="ti ti-x" /></button>
        </div>
      )}

      {/* Post email verification banner */}
      {searchParams.get('verified') === 'true' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', marginBottom: 12,
          background: 'rgba(var(--green-rgb),0.08)',
          border: '1px solid rgba(22,163,74,0.25)',
          borderRadius: 12
        }}>
          <i className="ti ti-circle-check" style={{ fontSize: 22, color: 'var(--green)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--green)' }}>
              Email Verified! <i className="ti ti-sparkles" style={{color:'var(--green)',marginLeft:6}} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              Your account is confirmed. Review your details below and complete your profile.
            </div>
          </div>
          <button
            onClick={() => {
              const p = new URLSearchParams(window.location.search)
              p.delete('verified')
              window.history.replaceState({}, '', `${window.location.pathname}${p.toString() ? '?' + p.toString() : ''}`)
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}
          >
            <i className="ti ti-x" />
          </button>
        </div>
      )}

      {/* Post KYC submission banner */}
      {searchParams.get('kyc') === 'submitted' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', marginBottom: 12,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 12
        }}>
          <i className="ti ti-shield-check" style={{ fontSize: 22, color: '#b45309', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#b45309' }}>
              KYC Submitted for Review
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              We'll notify you within 24 hours once your identity is verified. Your details are saved below.
            </div>
          </div>
          <button
            onClick={() => {
              const p = new URLSearchParams(window.location.search)
              p.delete('kyc')
              window.history.replaceState({}, '', `${window.location.pathname}${p.toString() ? '?' + p.toString() : ''}`)
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}
          >
            <i className="ti ti-x" />
          </button>
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar" ref={tabBarRef}>
        {(tabs || []).map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => tabNav(t.id)}>
            <i className={`ti ti-${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Profile (default) */}
      {tab === "profile" && (
        <>
          {/* 2-column grid */}
          <div className="prof-grid">
            {/* LEFT: Account Information */}
            <div className="profile-card">
              <div className="profile-card-head">
                <span><Icon n="wallet" s={15} /> Account Information</span>
                {loading ? <span className="skeleton" style={{width:60,height:14}} /> : null}
              </div>
              <div className="profile-card-body">
                {/* Wallet address row */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px dashed var(--border)',fontSize:13}}>
                  <span style={{color:'var(--text2)',fontWeight:600}}>Wallet Address</span>
                  {loading ? (
                    <span className="skeleton" style={{width:120,height:14}} />
                  ) : hasWallet ? (
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontFamily:'monospace',fontSize:12,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:6,padding:'4px 10px'}}>{shortAddr}</span>
                      <CopyBtn text={walletAddress} />
                    </div>
                  ) : (
                    <span style={{color:'var(--text3)',fontSize:12}}>Not connected</span>
                  )}
                </div>

                {/* Full Name row */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px dashed var(--border)',fontSize:13}}>
                  <span style={{color:'var(--text2)',fontWeight:600}}>Full Name</span>
                  {loading ? (
                    <span className="skeleton" style={{width:120,height:14}} />
                  ) : (
                    <span style={{fontWeight:700}}>{user?.firstName || 'User'} {user?.lastName || ''}</span>
                  )}
                </div>

                {/* Show all balances toggle */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px dashed var(--border)',fontSize:13}}>
                  <span style={{color:'var(--text2)',fontWeight:600}}>
                    Show all balances
                    {!hasWallet && <span style={{marginLeft:6,fontSize:11,color:'var(--text3)',fontWeight:400}}>(connect wallet)</span>}
                  </span>
                  <Toggle on={showBal} set={setShowBal} />
                </div>

                {showBal && (
                  <>
                    {/* OGA Balance */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px dashed var(--border)',fontSize:16}}>
                      <span style={{fontWeight:800}}>
                        {loading ? <span className="skeleton" style={{width:80,height:16}} /> : <>
                           {Number(totalNgn).toLocaleString()} <span style={{color:'var(--accent)'}}>$PAY</span>
                        </>}
                      </span>
                      {!loading && <span style={{fontSize:12,color:'var(--text2)'}}>≈ {fmt(ngnBal, "NGN")}</span>}
                    </div>

                    {/* Quick actions */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,margin:'14px 0'}}>
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center'}} onClick={() => navigate('/wallet')}><Icon n="logout" s={14} c="var(--bg)" /> Withdraw</button>
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center'}} onClick={() => navigate('/wallet')}><Icon n="plus" s={14} c="var(--bg)" /> Deposit</button>
                    </div>

                    {hasWallet && (
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center',marginBottom:10,background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}} onClick={() => navigate('/wallet')}>
                        <Icon n="transfer" s={14} /> Swap
                      </button>
                    )}

                    {!hasWallet && (
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center',marginBottom:10,background:'var(--accent)'}} onClick={() => setShowWalletOptions(true)}>
                        <Icon n="wallet" s={14} c="#fff" /> Connect Wallet
                      </button>
                    )}

                    {hasWallet && (
                      <>
                        <button className="dash-btn" style={{width:'100%',justifyContent:'center',marginBottom:10,background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}} onClick={handleGeneratePairCode} disabled={generatingPair}>
                          <Icon n="device-mobile" s={14} /> {generatingPair ? 'Generating…' : 'Pair Device'}
                        </button>
                        {pairCode && (
                          <div style={{textAlign:'center',padding:'12px',marginBottom:10,background:'var(--bg2)',borderRadius:10,fontSize:12}}>
                            <div style={{fontSize:10,color:'var(--text3)',marginBottom:4,fontWeight:600}}>Pairing Code (expires in 5 min)</div>
                            <div style={{fontSize:24,fontWeight:900,letterSpacing:6,color:'var(--accent)',fontFamily:'monospace'}}>{pairCode}</div>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(pairCode); toast('Code copied!') }} style={{marginTop:6,fontSize:11,color:'var(--text2)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',fontFamily:'inherit'}}>Copy code</button>
                          </div>
                        )}
                        <button className="dash-btn" style={{width:'100%',justifyContent:'center',marginBottom:10,background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}} onClick={() => setShowWalletOptions(true)}>
                          <Icon n="link" s={14} /> Link Extra Wallet
                        </button>

                        {/* Auto Swap */}
                        <div style={{padding:'13px 0 8px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:800}}>Auto Swap</div>
                            <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.45}}>Auto-convert earnings to preferred token</div>
                            <div style={{display:'inline-flex',alignItems:'center',gap:5,border:'1.5px solid var(--border)',borderRadius:99,padding:'3px 10px',fontSize:12,fontWeight:700,marginTop:8}}>
                              <span>SOL</span><span style={{color:'var(--text3)'}}>·</span><span>USDC</span><span style={{color:'var(--text3)'}}>·</span><span>NGN</span>
                            </div>
                          </div>
                          <Toggle on={swBal} set={setSwBal} />
                        </div>
                        <div style={{fontSize:11,color:'var(--text3)',marginTop:8}}>
                          <a href="/wallet" style={{color:'var(--accent)',textDecoration:'none'}}>View my withdrawals</a>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Bank Account / Virtual Account Section */}
                <div id="bank-section" style={{ padding: '13px 0 0', borderTop: '1px solid var(--border)', marginTop: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Bank Account (NGN)</div>
                    {accountNumber && !editingBank && (
                      <button className="btn-outline btn-sm" onClick={() => setEditingBank(true)}>
                        <Icon n="edit" s={12} /> Edit
                      </button>
                    )}
                  </div>

                  {/* If user has manually saved bank account — show it locked */}
                  {!editingBank && accountNumber ? (
                    <div>
                      <div className="stat-row" style={{ borderBottom: 'none', padding: '6px 0' }}>
                        <span className="stat-label">Bank</span>
                        <span className="stat-val">{bankName}</span>
                      </div>
                      <div className="stat-row" style={{ borderBottom: 'none', padding: '6px 0' }}>
                        <span className="stat-label">Account Name</span>
                        <span className="stat-val">{accountName}</span>
                      </div>
                      <div className="stat-row" style={{ borderBottom: 'none', padding: '6px 0' }}>
                        <span className="stat-label">Account Number</span>
                        <span className="stat-val" style={{ fontFamily: 'monospace', fontSize: 14 }}>{accountNumber}</span>
                      </div>
                    </div>

                  ) : editingBank ? (
                    /* Manual edit form — keep existing */
                    <div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Account Number</label>
                        <input className="dash-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="0123456789" />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Bank Name</label>
                        <input className="dash-input" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Access Bank" />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Account Name</label>
                        <input className="dash-input" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="John Doe" />
                      </div>
                      {bankMsg && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{bankMsg}</div>}
                      <button className="dash-btn" onClick={saveBank} disabled={savingBank} style={{ opacity: savingBank ? 0.6 : 1 }}>
                        {savingBank ? 'Saving...' : 'Save Bank Account'}
                      </button>
                    </div>

                  ) : (
                    /* No bank account — show VirtualAccountCard to auto-create one */
                    <div>
                      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>
                        No bank account linked. Create a free virtual account instantly or add your own.
                      </p>

                      {/* Virtual account creator */}
                      <VirtualAccountCard />

                      {/* Option to add manual bank account instead */}
                      <div style={{ textAlign: 'center', margin: '10px 0 4px', fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                        — or —
                      </div>
                      <button
                        onClick={() => setEditingBank(true)}
                        style={{ width: '100%', border: 'none', background: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', padding: '8px 0' }}
                      >
                        + Add my own bank account manually
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Profile Card */}
            <div  className="profile-card">
              <div  className="profile-card-head">
                <span><Icon n="user" s={15} /> Profile</span>
                <button className="btn-outline btn-sm" onClick={() => {
                  setEditForm({
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || '',
                    username: user?.username || '',
                    bio: profileData?.workerProfile?.bio || '',
                    avatarUrl: user?.avatarUrl || '',
                  });
                  setEditErrors({});
                  setUsernameCheck('idle');
                  setShowEdit(true);
                }}>
                  <Icon n="edit" s={12} /> Edit
                </button>
              </div>
              <div  className="profile-card-body">
                {/* User info */}
                <div style={{display:'flex',alignItems:'center',gap:14,paddingBottom:14,borderBottom:'1px solid var(--border)',marginBottom:14}}>
                  {loading ? (
                    <>
                      <span className="skeleton" style={{width:64,height:64,borderRadius:'50%',display:'inline-block'}} />
                      <div><span className="skeleton" style={{width:120,height:16,display:'block',marginBottom:6}} /><span className="skeleton" style={{width:80,height:12,display:'block'}} /></div>
                    </>
                  ) : (
                    <>
                      <div style={{width:64,height:64,borderRadius:'50%',background:'var(--text)',color:'var(--bg)',fontSize:22,fontWeight:800,display:'grid',placeItems:'center',flexShrink:0}}>
                        {user?.avatarUrl ? <img src={user.avatarUrl} alt="" loading="lazy" style={{width:64,height:64,borderRadius:'50%',objectFit:'cover'}} /> : (user?.firstName?.[0] || 'U') + (user?.lastName?.[0] || '')}
                      </div>
                      <div>
                        <div style={{fontSize:17,fontWeight:800}}>{user?.firstName || 'User'} {user?.lastName || ''}</div>
                        <div style={{fontSize:13,color:'var(--text2)'}}>@{user?.username || 'user'}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Bio */}
                {!loading && (profileData?.workerProfile?.bio || profileData?.bio) && (
                  <div style={{fontSize:13,lineHeight:1.5,marginBottom:14}}>
                    {profileData.workerProfile?.bio || profileData.bio}
                  </div>
                )}

                {/* Followers */}
                <div style={{display:'flex',gap:20,fontSize:13,fontWeight:700,paddingBottom:14,borderBottom:'1px solid var(--border)',marginBottom:14}}>
                  <span>{profileData?._count?.taskSubmissions || 0} <span style={{fontWeight:400,color:'var(--text2)'}}>Submissions</span></span>
                  <span>{profileData?._count?.tasksCreated || 0} <span style={{fontWeight:400,color:'var(--text2)'}}>Tasks Created</span></span>
                </div>

                {/* Stats */}
                {loading ? (
                  <div><span className="skeleton" style={{width:'100%',height:14,display:'block',marginBottom:8}} /><span className="skeleton" style={{width:'80%',height:14,display:'block',marginBottom:8}} /><span className="skeleton" style={{width:'60%',height:14,display:'block'}} /></div>
                ) : (
                  <>
                    <StatRow label="Rank" val={profileData?.workerProfile?.level || 'Beginner'} info onInfoClick={() => setShowInfo('rank')} />
                    <StatRow label="OgaScore" val={profileData?.workerProfile?.reputationScore?.toFixed(1) || '0.0'} info onInfoClick={() => setShowInfo('ogaScore')} />
                    <StatRow label="Tasks Completed" val={profileData?.workerProfile?.tasksCompleted ?? 0} />
                    <StatRow label="Success Rate" val={profileData?.workerProfile?.successRate ? profileData.workerProfile.successRate + '%' : '0%'} info onInfoClick={() => setShowInfo('successRate')} />
                    <StatRow label="Total Earned" val={profileData?.workerProfile?.totalEarned ? fmt(Number(profileData.workerProfile.totalEarned), "NGN") : fmt(0, "NGN")} />
                    <StatRow label="Avg Rating" val={profileData?.workerProfile?.avgRating?.toFixed(1) || '0.0'} info />
                    <StatRow label="Nickname" val={profileData?.workerProfile?.nickname || '-'} />
                    <StatRow label="Skills" val={profileData?.workerProfile?.skills?.length ? profileData.workerProfile.skills.slice(0,3).join(', ')+(profileData.workerProfile.skills.length>3?' +' + (profileData.workerProfile.skills.length - 3):'') : '-'} />
                    <StatRow label="Categories" val={profileData?.workerProfile?.categories?.length ? profileData.workerProfile.categories.join(', ') : '-'} />
                    <StatRow label="Human Verified" val={isKycVerified ? 'Yes' : 'No'} valClass={isKycVerified ? 'yes' : 'no'} info onInfoClick={() => setShowInfo('humanVerified')} />
                    {!isKycVerified && (
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center',marginTop:8}} onClick={() => setShowKyc(true)}>
                        <Icon n="shield-check" s={14} c="var(--bg)" /> Verify Identity (KYC)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Referral Link - full width */}
          <div className="profile-card prof-full" style={{marginBottom:20}}>
            <div className="card-head"><span><Icon n="affiliate" s={15} /> Your Referral Link</span></div>
            <div className="card-body">
              {/* Referral Tier Badge */}
              {referralStats?.referralTier && !loading && (() => {
                const tierConfigs: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
                  bronze: { icon: 'ti ti-medal', label: 'Bronze', color: '#CD7F32', bg: 'rgba(205,127,50,0.08)', border: 'rgba(205,127,50,0.2)' },
                  silver: { icon: 'ti ti-medal-2', label: 'Silver', color: '#A8A8A8', bg: 'rgba(168,168,168,0.08)', border: 'rgba(168,168,168,0.2)' },
                  gold:   { icon: 'ti ti-medal', label: 'Gold', color: '#F5A623', bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.2)' },
                };
                const tc = tierConfigs[referralStats.referralTier];
                if (!tc) return null;
                return (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600,
                    padding: '4px 10px', borderRadius: 20, marginBottom: 12,
                    background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                  }}>
                    {tc.icon} {tc.label} Referrer<InfoBtn text="Your referral tier is based on how many of your referred users have completed their first task. Bronze: 5+ paid referrals, Silver: 10+, Gold: 20 (max)." />
                  </div>
                );
              })()}
              {loading ? (
                <span className="skeleton" style={{width:'60%',height:14,display:'inline-block'}} />
              ) : refUrl ? (
                <>
                  <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontFamily:'monospace',fontSize:12,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{refUrl}</span>
                    <CopyBtn text={refUrl} />
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button className="dash-btn" style={{background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}} onClick={() => window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent('Join me on OgaPay! '+refUrl), '_blank')}>
                      <XIcon size={14} /> Post on X
                    </button>
                  </div>
                </>
              ) : (
                <div style={{fontSize:12,color:'var(--text3)'}}>Generate your referral link by completing your profile.</div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div style={{marginTop:24,marginBottom:20}}>
            <div style={{fontSize:15,fontWeight:800,marginBottom:12,color:'var(--text)'}}>Quick Links</div>
            <div className="profile-quick-grid">
              {QUICK.map((q,i) => (
                <a className="quick-tile" key={i} onClick={() => {
                  if (q.page === 'blog') navigate('/blog');
                  else if (q.page === 'vault') navigate('/vault');
                  else if (q.page === 'create') navigate('/create');
                  else if (q.page === 'tasks') navigate('/tasks');
                  else if (q.page === 'monitor') navigate('/job-monitor');
                  else if (q.page === 'manage') navigate('/manage-jobs');
                  else if (q.page === 'bookmarks') navigate('/bookmarks');
                }}>
                  <Icon n={q.icon} s={22} c="var(--text2)" />
                  {q.label}
                </a>
              ))}
            </div>
          </div>

          {/* Withdrawal History */}
          <div  className="profile-card prof-full" style={{marginBottom:20}}>
            <div className="card-head"><span><Icon n="history" s={15} /> Withdrawal History</span></div>
            <div style={{overflowX:'auto'}}>
              {loading ? (
                <div className="loading"><span className="spinner" /> Loading...</div>
              ) : withdrawals.length === 0 ? (
                <div style={{textAlign:'center',color:'var(--text3)',padding:'28px 16px',fontSize:13}}>
                  <Icon n="history-off" s={28} c="var(--text3)" />
                  <div style={{marginTop:8}}>No withdrawals yet</div>
                </div>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr>
                      <th style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--text2)',padding:'12px 16px',borderBottom:'1px solid var(--border)',textAlign:'left'}}>Amount</th>
                      <th style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--text2)',padding:'12px 16px',borderBottom:'1px solid var(--border)',textAlign:'left'}}>Transaction</th>
                      <th style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--text2)',padding:'12px 16px',borderBottom:'1px solid var(--border)',textAlign:'left'}}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w: any,i: number) => (
                      <tr key={w.id || i}>
                        <td style={{padding:'13px 16px',fontSize:13,color:'var(--text2)',borderBottom:'1px solid var(--border)',fontWeight:700}}>
                          {w.currency || 'NGN'} {Math.abs(Number(w.amount || 0)).toLocaleString()}
                        </td>
                        <td style={{padding:'13px 16px',fontSize:12,color:'var(--text2)',borderBottom:'1px solid var(--border)',fontFamily:'monospace'}}>{w.reference || w.id || '—'}</td>
                        <td style={{padding:'13px 16px',fontSize:13,color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>{formatTimeAgo(w.createdAt || w.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Swap History */}
          <div className="card prof-full" style={{marginBottom:20}}>
            <div className="card-head"><span><Icon n="transfer" s={15} /> Swap History</span></div>
            <div style={{overflowX:'auto'}}>
              <div style={{textAlign:'center',color:'var(--text3)',padding:'28px 16px',fontSize:13}}>
                <Icon n="transfer" s={28} c="var(--text3)" />
                <div style={{marginTop:8}}>No swaps yet</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Profile Modal */}
      {showEdit && (
        <div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={() => setShowEdit(false)}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,maxWidth:520,width:'100%',padding:28,maxHeight:'90vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h3 style={{fontFamily:'Outfit',fontSize:20,fontWeight:800,margin:0}}><i className="ti ti-user-edit" style={{color:'var(--accent)',marginRight:8}} />Edit Profile</h3>
              <button style={{width:32,height:32,border:'1px solid var(--border)',borderRadius:8,background:'var(--bg2)',cursor:'pointer',display:'grid',placeItems:'center',color:'var(--text3)',fontSize:18}} onClick={() => setShowEdit(false)}>
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Avatar */}
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
              <div style={{width:72,height:72,borderRadius:'50%',background:'var(--bg2)',border:'2px solid var(--border)',overflow:'hidden',flexShrink:0,display:'grid',placeItems:'center'}}>
                {editForm.avatarUrl ? (
                  <img src={editForm.avatarUrl} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                ) : (
                  <span style={{fontSize:24,fontWeight:800,color:'var(--text3)'}}>{(editForm.firstName?.[0] || 'U') + (editForm.lastName?.[0] || '')}</span>
                )}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Profile Photo</div>
                <label style={{display:'inline-flex',alignItems:'center',gap:6,height:34,padding:'0 14px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--bg2)',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--text2)',fontFamily:'inherit'}}>
                  <i className="ti ti-camera" /> Upload Photo
                  <input type="file" accept="image/*" style={{display:'none'}}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // Validate file size (max 5MB)
                      if (file.size > 5 * 1024 * 1024) {
                        setEditErrors(prev => ({...prev, avatar: 'Image must be under 5MB'}));
                        return;
                      }
                      try {
                        const url = await uploadImage(file, 'avatars');
                        setEditForm(f => ({...f, avatarUrl: url}));
                      } catch {
                        const el = document.getElementById('appToast');
                        if (el) { el.textContent = 'Image upload failed. Try a smaller file or paste a URL instead.'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3500); }
                      }
                    }} />
                </label>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Upload a photo from your device, or paste a URL below</div>
                <input type="text" placeholder="https://example.com/photo.jpg" style={{width:'100%',marginTop:8,padding:'6px 10px',border:'1px solid var(--border)',borderRadius:6,fontSize:12,background:'var(--bg2)',color:'var(--text)',outline:'none'}}
                  value={editForm.avatarUrl} onChange={e => setEditForm(f => ({...f, avatarUrl: e.target.value}))} />
              </div>
            </div>

            {/* First & Last Name */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.04em'}}>First Name</label>
                <input className="dash-input" value={editForm.firstName} onChange={e => setEditForm(f => ({...f, firstName: e.target.value}))} placeholder="John" />
              </div>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.04em'}}>Last Name</label>
                <input className="dash-input" value={editForm.lastName} onChange={e => setEditForm(f => ({...f, lastName: e.target.value}))} placeholder="Doe" />
              </div>
            </div>

            {/* Username */}
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.04em'}}>Username</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{flex:1,position:'relative'}}>
                  <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'var(--text3)',fontWeight:600}}>@</span>
                  <input className="dash-input" style={{paddingLeft:28}} value={editForm.username} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9_]/g,'').toLowerCase();
                      setEditForm(f => ({...f, username: val}));
                      setEditErrors(e => ({...e, username: ''}));
                      if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
                      if (val && val !== (user?.username || '')) {
                        setUsernameCheck('checking');
                        usernameCheckTimer.current = setTimeout(async () => {
                          try {
                            const result = await apiRequest<any>('/users/directory/list?search=' + encodeURIComponent(val) + '&limit=1').catch(() => null);
                            const users = result?.data || result || [];
                            const taken = users.some((u: any) => u.username?.toLowerCase() === val);
                            setUsernameCheck(taken ? 'taken' : 'available');
                          } catch { setUsernameCheck('idle'); }
                        }, 600);
                      } else {
                        setUsernameCheck('idle');
                      }
                    }}
                    placeholder="username" />
                </div>
                {usernameCheck === 'checking' && <span className="spinner" style={{width:16,height:16,borderWidth:2}} />}
                {usernameCheck === 'available' && <i className="ti ti-check" style={{color:'var(--green)',fontSize:18}} />}
                {usernameCheck === 'taken' && <i className="ti ti-x" style={{color:'var(--red)',fontSize:18}} />}
              </div>
              {usernameCheck === 'taken' && <div style={{fontSize:11,color:'var(--red)',marginTop:4}}>Username is taken</div>}
              {usernameCheck === 'available' && <div style={{fontSize:11,color:'var(--green)',marginTop:4}}>Username is available</div>}
              {editErrors.username && <div style={{fontSize:11,color:'var(--red)',marginTop:4}}>{editErrors.username}</div>}
            </div>

            {/* Bio */}
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.04em'}}>
                Bio <span style={{fontWeight:400,textTransform:'none'}}>({editForm.bio.length}/160)</span>
              </label>
              <textarea className="dash-input" style={{height:80,padding:'10px 14px',resize:'vertical',fontFamily:'inherit',lineHeight:1.5}}
                value={editForm.bio} onChange={e => {
                  if (e.target.value.length <= 160) setEditForm(f => ({...f, bio: e.target.value}));
                }} placeholder="Tell task posters about yourself..." />
              {editErrors.bio && <div style={{fontSize:11,color:'var(--red)',marginTop:4}}>{editErrors.bio}</div>}
            </div>

            {editErrors.general && <div style={{fontSize:12,color:'var(--red)',marginBottom:12,textAlign:'center'}}>{editErrors.general}</div>}

            {/* Actions */}
            <div style={{display:'flex',gap:12}}>
              <button className="dash-btn" style={{flex:1,justifyContent:'center',opacity:savingProfile?0.6:1}} disabled={savingProfile}
                onClick={async () => {
                  if (!editForm.firstName.trim()) { setEditErrors({firstName:'First name is required'}); return; }
                  if (!editForm.username.trim()) { setEditErrors({username:'Username is required'}); return; }
                  if (usernameCheck === 'taken') { setEditErrors({username:'This username is taken'}); return; }
                  setSavingProfile(true); setEditErrors({});
                  try {
                    const body: Record<string, any> = {};
                    if (editForm.firstName !== (user?.firstName || '')) body.firstName = editForm.firstName;
                    if (editForm.lastName !== (user?.lastName || '')) body.lastName = editForm.lastName;
                    if (editForm.username !== (user?.username || '')) body.username = editForm.username;
                    if (editForm.avatarUrl !== (user?.avatarUrl || '') && editForm.avatarUrl && !editForm.avatarUrl.startsWith('data:')) body.avatarUrl = editForm.avatarUrl;
                    if (editForm.bio !== (profileData?.workerProfile?.bio || '')) body.bio = editForm.bio;

                    if (Object.keys(body).length > 0) {
                      const updated = await apiRequest('/users/me', {
                        method: 'PATCH',
                        body: JSON.stringify(body),
                      }).catch(() => null);
                      if (!updated) throw new Error('Failed to update profile');
                      const userData = await apiRequest('/users/me').catch(() => null);
                      if (userData) setProfileData(userData);
                    }

                    setShowEdit(false);
                    toast('Profile updated successfully');
                    refreshUser();
                  } catch (err: any) {
                    setEditErrors({general: err.message || 'Failed to save'});
                  }
                  setSavingProfile(false);
                }}>
                {savingProfile ? <><span className="spinner" style={{width:14,height:14,borderWidth:2}} /> Saving...</> : <><i className="ti ti-check" /> Save Changes</>}
              </button>
              <button className="btn-outline" style={{flex:1,justifyContent:'center'}} onClick={() => setShowEdit(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Modal */}
      {showKyc && (
        <div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={() => setShowKyc(false)}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,maxWidth:480,width:'100%',padding:28}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{fontFamily:'Outfit',fontSize:18,fontWeight:800,margin:0}}>Identity Verification (KYC)</h3>
              <button style={{width:32,height:32,border:'1px solid var(--border)',borderRadius:8,background:'var(--bg2)',cursor:'pointer',display:'grid',placeItems:'center',color:'var(--text3)',fontSize:18}} onClick={() => setShowKyc(false)}>
                <i className="ti ti-x" />
              </button>
            </div>

            {kycStep === "idle" && (
              <div>
                <p style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginBottom:20}}>
                  Verify your identity to start earning and withdrawing. Start with your NIN to reach Level 1, then upgrade with your BVN for Level 2.
                </p>

                {(() => {
                  const fallback = kycStatus || profileData?.kyc || {}
                  const s = fallback.status
                  const t = fallback.kycTier ?? 0
                  const isApproved = s === 'APPROVED'
                  const isPending = s === 'SUBMITTED' || s === 'PENDING'
                  const noRecord = !kycStatus && !profileData?.kyc

                  return (<>
                    {isApproved && (
                      <div style={{background:'var(--green)10',border:'1px solid var(--green)30',borderRadius:12,padding:12,marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                        <i className="ti ti-shield-check" style={{fontSize:20,color:'var(--green)'}} />
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:'var(--green)'}}>Level {t} Verified</div>
                          <div style={{fontSize:11,color:'var(--text3)'}}>
                            {t >= 2
                              ? 'Full verification. Withdrawal limit: ₦20,000.'
                              : 'Basic verification. Withdrawal limit: ₦10,000. Add BVN to upgrade to Level 2.'}
                          </div>
                        </div>
                      </div>
                    )}
                    {isPending && (
                      <div style={{background:'var(--warning)10',border:'1px solid #F59E0B30',borderRadius:12,padding:12,marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                        <i className="ti ti-clock-hourglass" style={{fontSize:20,color:'#F59E0B'}} />
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:'#F59E0B'}}>Pending Review</div>
                          <div style={{fontSize:11,color:'var(--text3)'}}>Your KYC is being reviewed. You'll be notified when approved.</div>
                        </div>
                      </div>
                    )}

                    <div style={{display:'grid',gap:8,marginBottom:20}}>
                      {[
                        {level:1,label:'Level 1 — NIN',desc:'Verify your NIN to start earning and withdraw up to ₦10,000',action:'nin',icon:'id'},
                        {level:2,label:'Level 2 — BVN',desc:'Add your BVN for ₦20,000 withdrawal limit and full badge',action:'bvn',icon:'shield-check'},
                      ].map(li => {
                        const isDone = li.action === 'nin' ? t >= 1 : t >= 2
                        return (
                        <div key={li.level} onClick={() => { if (!isDone || li.action === 'nin' ? t < 2 : false) setKycStep(li.action); else if (li.action === 'nin' && t >= 2) setKycStep('nin'); else if (li.action === 'bvn' && !isDone) setKycStep('bvn'); }} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,cursor:!isDone||li.action==='nin'?'pointer':'default',background:isDone?'var(--green)08':'var(--bg2)',border:'1px solid '+(isDone?'var(--green)20':'var(--border)'),transition:'all .15s'}}
                          onMouseEnter={e => { if (!isDone || li.action === 'nin') (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = isDone ? 'var(--green)20' : 'var(--border)' }}>
                          <i className={'ti ti-' + li.icon} style={{fontSize:18,color:isDone?'var(--green)':!isDone||li.action==='nin'?'var(--accent)':'var(--text3)'}} />
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,fontWeight:700,color:isDone?'var(--green)':'var(--text)'}}>{li.label}</div>
                            <div style={{fontSize:11,color:'var(--text3)'}}>{isDone?'Completed — ' + li.desc:li.desc}</div>
                          </div>
                          {isDone ? <i className="ti ti-check-circle" style={{fontSize:18,color:'var(--green)'}} /> : <i className="ti ti-chevron-right" style={{fontSize:16,color:'var(--text3)'}} />}
                        </div>
                      )})}
                    </div>

                    {noRecord && (
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center'}} onClick={() => setKycStep("nin")}>
                        Start with NIN
                      </button>
                    )}
                    {isApproved && t < 2 && (
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center',background:'var(--accent)',color:'#fff',border:'none'}} onClick={() => setKycStep("bvn")}>
                        Upgrade to Level 2 (BVN)
                      </button>
                    )}
                    {isPending && (
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center',opacity:0.6}} disabled>
                        <i className="ti ti-clock-hourglass" /> Pending Review
                      </button>
                    )}
                    {isApproved && t >= 2 && (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}>
                        <button className="dash-btn" style={{justifyContent:'center',background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}} onClick={() => setKycStep("nin")}>
                          <i className="ti ti-id" /> Add NIN
                        </button>
                        <button className="dash-btn" style={{justifyContent:'center',background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}} onClick={() => setKycStep("document")}>
                          <i className="ti ti-upload" /> Upload ID
                        </button>
                      </div>
                    )}
                    {isApproved && (
                      <p style={{fontSize:11,color:'var(--green)',textAlign:'center',marginTop:12}}>
                        <i className="ti ti-check-circle" style={{fontSize:12}} /> Verified · Level {t}
                      </p>
                    )}
                  </>);
                })()}

                <p style={{fontSize:11,color:'var(--text3)',textAlign:'center',marginTop:12}}>
                  Your data is encrypted and securely processed.
                </p>
              </div>
            )}

            {kycStep === "document" && (
              <div>
                <p style={{fontSize:13,color:'var(--text2)',marginBottom:16}}>
                  Upload a valid government ID (NIN slip, Passport, or Driver's License).
                </p>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:6}}>ID Document</label>
                  <div style={{
                    border: '2px dashed var(--border)', borderRadius: 12, padding: 24, textAlign: 'center',
                    cursor: 'pointer', background: 'var(--bg2)', transition: 'border-color .2s'
                  }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    onClick={() => document.getElementById('kyc-doc-input')?.click()}>
                    {kycDocumentPreview ? (
                      <img loading="lazy" src={kycDocumentPreview} alt="ID preview" style={{maxHeight:160,maxWidth:'100%',borderRadius:8,objectFit:'contain',marginBottom:8}} />
                    ) : (
                      <>
                        <i className="ti ti-upload" style={{fontSize:32,color:'var(--text3)',display:'block',marginBottom:8}} />
                        <span style={{fontSize:13,fontWeight:700,color:'var(--text2)',display:'block'}}>Click to upload ID document</span>
                        <span style={{fontSize:11,color:'var(--text3)',marginTop:4,display:'block'}}>PNG, JPG, or PDF (max 5MB)</span>
                      </>
                    )}
                  </div>
                  <input id="kyc-doc-input" type="file" accept="image/*,.pdf" style={{display:'none'}}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 5 * 1024 * 1024) { setKycMsg('File must be under 5MB'); return }
                      setKycDocument(file)
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader()
                        reader.onload = (ev) => setKycDocumentPreview(ev.target?.result as string)
                        reader.readAsDataURL(file)
                      } else {
                        setKycDocumentPreview('')
                      }
                      setKycMsg('')
                    }} />
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn-outline" style={{flex:1,justifyContent:'center'}} onClick={() => setKycStep("idle")}>
                    Back
                  </button>
                  <button className="dash-btn" style={{flex:1,justifyContent:'center',opacity:kycDocument?1:0.5,fontSize:12}}
                    disabled={!kycDocument}
                    onClick={async () => {
                      if (!kycDocument) return
                      setKycUploading(true); setKycMsg('')
                      try {
                        const token = localStorage.getItem('ogapay_access_token')
                        const formData = new FormData()
                        formData.append('document', kycDocument)
                        const res = await fetch(`${API_BASE}/kyc/documents/id_front`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                          body: formData,
                        })
                        const json = await res.json()
                        if (!res.ok) throw new Error(json?.message || 'Upload failed')
                        localStorage.setItem('ogapay_kyc_document_url', json.data?.url || json.url)
                        setKycDocument(null); setKycDocumentPreview('')
                        setKycMsg('ID uploaded. Now complete your identity number step.')
                        // Next step depends on current tier
                        const userTier = kycStatus?.kycTier ?? profileData?.kyc?.kycTier ?? 0
                        const next = userTier >= 1 ? 'bvn' : 'nin'
                        setKycStep(next)
                      } catch (err: any) {
                        setKycMsg(err.message || 'Upload failed. Please try again.')
                      }
                      setKycUploading(false)
                    }}>
                    {kycUploading ? 'Uploading...' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            {kycStep === "nin" && (
              <div>
                <p style={{fontSize:13,color:'var(--text2)',marginBottom:16}}>
                  Enter your NIN and date of birth to verify. No selfie or document upload needed.
                </p>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:6}}>NIN (National Identification Number)</label>
                  <input className="dash-input" value={idNumber} onChange={e => setIdNumber(e.target.value.replace(/\D/g,'').slice(0,11))}
                    placeholder="Enter 11-digit NIN" maxLength={11}
                    style={{fontSize:16,letterSpacing:2,fontWeight:700,textAlign:'center'}} />
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:6}}>Date of Birth</label>
                  <input className="dash-input" type="date" value={kycDob} onChange={e => setKycDob(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    style={{fontSize:14,fontWeight:600}} />
                </div>
                {kycMsg && <div style={{fontSize:12,color:kycMsg.includes('successful')||kycMsg.includes('verified')?'var(--green)':'var(--red)',marginBottom:12}}>{kycMsg}</div>}
                <button className="dash-btn" style={{width:'100%',justifyContent:'center',opacity:idNumber.length!==11||!kycDob?0.5:1}}
                  disabled={idNumber.length!==11 || !kycDob || kycLoading}
                  onClick={async () => {
                    if (idNumber.length !== 11 || !kycDob) return;
                    setKycLoading(true); setKycMsg("");
                    try {
                      const json = await apiRequest<any>('/kyc/submit', {
                        method: 'POST',
                        body: JSON.stringify({ idType: 'NIN', idNumber: idNumber, dateOfBirth: new Date(kycDob).toISOString() }),
                      }).catch(() => null);
                      if (json?.status === 'APPROVED' || json?.status === 'SUBMITTED') {
                        const message = json.message || "NIN verified successfully!";
                        setKycMsg(message);
                        setIdNumber('');
                        refreshUser?.();
                        setKycStep("submitted");
                        setTimeout(() => loadProfile(), 500);
                      } else {
                        setKycMsg(json?.message || json?.error || "Verification failed");
                      }
                    } catch(e:any) { setKycMsg(e?.message || "Service unavailable. Try again later."); }
                    setKycLoading(false);
                  }}>
                  {kycLoading ? <><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} /> Verifying...</> : <><Icon n="shield-check" s={16} /> Verify NIN (Level 1)</>}
                </button>
                <button style={{display:'block',margin:'12px auto 0',border:'none',background:'none',fontSize:12,color:'var(--text3)',cursor:'pointer'}}
                  onClick={() => { setKycStep("idle"); setKycMsg(""); }}>
                  Back
                </button>
              </div>
            )}

            {kycStep === "bvn" && (
              <div>
                <p style={{fontSize:13,color:'var(--text2)',marginBottom:16}}>
                  Add your BVN to upgrade to Level 2. This increases your withdrawal limit to ₦20,000 and unlocks full features.
                </p>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:6}}>Date of Birth</label>
                  <input className="dash-input" type="date" value={kycDob} onChange={e => setKycDob(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    style={{fontSize:14,fontWeight:600}} />
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:6}}>BVN</label>
                  <input className="dash-input" value={idNumber} onChange={e => setIdNumber(e.target.value.replace(/\D/g,'').slice(0,11))}
                    placeholder="Enter 11-digit BVN" maxLength={11}
                    style={{fontSize:16,letterSpacing:2,fontWeight:700,textAlign:'center'}} />
                </div>
                {kycMsg && <div style={{fontSize:12,color:kycMsg.includes('successful')||kycMsg.includes('verified')?'var(--green)':'var(--red)',marginBottom:12}}>{kycMsg}</div>}
                <button className="dash-btn" style={{width:'100%',justifyContent:'center',opacity:idNumber.length!==11||!kycDob?0.5:1}}
                  disabled={idNumber.length!==11 || !kycDob || kycLoading}
                  onClick={async () => {
                    if (idNumber.length !== 11 || !kycDob) return;
                    setKycLoading(true); setKycMsg("");
                    try {
                      const json = await apiRequest<any>('/kyc/submit', {
                        method: 'POST',
                        body: JSON.stringify({ idType: 'BVN', idNumber: idNumber, dateOfBirth: new Date(kycDob).toISOString() }),
                      }).catch(() => null);
                      if (json?.status === 'APPROVED' || json?.status === 'SUBMITTED') {
                        const message = json.message || "BVN verified successfully!";
                        setKycMsg(message);
                        setIdNumber('');
                        refreshUser?.();
                        setKycStep("submitted");
                        setTimeout(() => loadProfile(), 500);
                      } else {
                        setKycMsg(json?.message || json?.error || "Verification failed");
                      }
                    } catch(e:any) { setKycMsg(e?.message || "Service unavailable. Try again later."); }
                    setKycLoading(false);
                  }}>
                  {kycLoading ? <><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} /> Verifying...</> : <><Icon n="shield-check" s={16} /> Upgrade to Level 2 (BVN)</>}
                </button>
                <button style={{display:'block',margin:'12px auto 0',border:'none',background:'none',fontSize:12,color:'var(--text3)',cursor:'pointer'}}
                  onClick={() => { setKycStep("idle"); setKycMsg(""); }}>
                  Back
                </button>
              </div>
            )}

            {kycStep === "submitted" && (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:'var(--green)18',display:'grid',placeItems:'center',margin:'0 auto 16px'}}>
                  <i className="ti ti-shield-check" style={{fontSize:32,color:'var(--green)'}} />
                </div>
                <h3 style={{fontFamily:'Outfit',fontSize:17,fontWeight:800,margin:'0 0 8px'}}>Verification Successful</h3>
                <p style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>
                  {kycMsg || 'Your identity has been verified!'}
                </p>
                <button className="dash-btn" style={{marginTop:20}} onClick={() => {
                  setShowKyc(false);
                  refreshUser?.();
                  setTimeout(() => loadProfile(), 500);
                }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
{showWalletOptions && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}
          onClick={() => setShowWalletOptions(false)}>
          <div onClick={e => e.stopPropagation()} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:24,maxWidth:380,width:'90%'}}>
            <h3 style={{margin:'0 0 4px',fontSize:16,fontWeight:800}}>Connect a Solana Wallet</h3>
            <p style={{color:'var(--text2)',fontSize:13,margin:'0 0 16px',lineHeight:1.5}}>
              Select a wallet provider to connect. You'll be asked to sign a message to verify ownership.
            </p>
            <div style={{display:'grid',gap:10}}>
              {[
                { id:'phantom', label:'Phantom', icon:'brand-phantom' },
                { id:'backpack', label:'Backpack', icon:'brand-backpack' },
                { id:'solflare', label:'Solflare', icon:'brand-flare' },
              ].map(p => {
                const installed = detectedWallets.includes(p.id);
                return (
                  <button key={p.id}
                    onClick={() => connectWallet(p.id)}
                    disabled={!installed || connecting === p.id}
                    style={{
                      display:'flex',alignItems:'center',gap:12,padding:'14px 16px',
                      borderRadius:10,border:'1.5px solid var(--border)',
                      background:'var(--bg2)',cursor:installed && connecting !== p.id ? 'pointer' : 'default',
                      fontFamily:'inherit',fontSize:13,fontWeight:700,color:'var(--text)',
                      opacity:installed ? 1 : 0.5,transition:'border-color .13s',
                    }}>
                    <div style={{width:32,height:32,borderRadius:8,background:'var(--card)',display:'grid',placeItems:'center',flexShrink:0}}>
                      <Icon n={p.icon} s={18} />
                    </div>
                    <span style={{flex:1,textAlign:'left'}}>{p.label}</span>
                    {connecting === p.id && <span className="spinner" style={{width:16,height:16,borderWidth:2}} />}
                    {!installed && <span style={{fontSize:10,color:'var(--text3)',fontWeight:400}}>Not installed</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowWalletOptions(false)}
              style={{width:'100%',marginTop:12,height:38,borderRadius:10,border:'1px solid var(--border)',
                background:'transparent',color:'var(--text2)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Info Modal ── */}
      {showInfo && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={() => setShowInfo(null)}>
          <div style={{background:'var(--card)',borderRadius:14,padding:24,maxWidth:460,width:'90%',position:'relative'}} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowInfo(null)} style={{position:'absolute',top:16,right:16,background:'none',border:'none',fontSize:24,cursor:'pointer',color:'var(--text2)'}}><i className="ti ti-x" /></button>

            {showInfo === 'ogaScore' && (
              <>
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
              </>
            )}

            {showInfo === 'successRate' && (
              <div className="wjd-info-overlay" onClick={() => setShowInfo(null)}>
                <div className="wjd-info-panel" onClick={e => e.stopPropagation()}>
                  <div className="wjd-info-header"><div className="wjd-info-header-title"><Icon n="trending-up" s={15} /> Success Rate</div><button className="wjd-info-close" onClick={() => setShowInfo(null)}><i className="ti ti-x" /></button></div>
                  <div className="wjd-info-body"><p style={{fontSize:13,lineHeight:1.7,margin:0,color:'var(--text2)'}}>Your success rate is the percentage of your submitted tasks that were approved: approved / (approved + rejected) × 100. A high success rate improves your OgaScore and helps you qualify for higher-paying tasks.</p></div>
                </div>
              </div>
            )}
            {showInfo === 'avgRating' && (
              <div className="wjd-info-overlay" onClick={() => setShowInfo(null)}>
                <div className="wjd-info-panel" onClick={e => e.stopPropagation()}>
                  <div className="wjd-info-header"><div className="wjd-info-header-title"><Icon n="star" s={15} /> Avg Rating</div><button className="wjd-info-close" onClick={() => setShowInfo(null)}><i className="ti ti-x" /></button></div>
                  <div className="wjd-info-body"><p style={{fontSize:13,lineHeight:1.7,margin:0,color:'var(--text2)'}}>Your average rating is calculated from reviews left by task creators after you complete a task. Ratings range from 1–5 stars. Consistently high ratings unlock higher task levels (Advanced, Expert, Legend).</p></div>
                </div>
              </div>
            )}
            {showInfo === 'humanVerified' && (
              <>
                <h2 style={{fontSize:18,fontWeight:900,marginBottom:16}}>What is Human Verified?</h2>
                <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
                  Human Verified means you've completed <strong>VeryAI</strong> — a biometric proof-of-reality check that confirms you are a real human, not a bot.
                </p>
                <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
                  Why it matters: Some tasks require Human Verified status as a trust signal. Task creators use it to filter out bots and ensure real people are completing their work.
                </p>
                <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
                  How to get it: Go to <strong>Settings → Connected Accounts</strong> and click "Verify" on the Human Verified (VeryAI) entry. You'll be redirected to the VeryAI app for a quick biometric scan.
                </p>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:6}}>Also adds +10 to your OgaScore</div>
              </>
            )}

            {showInfo === 'rank' && (
              <>
                <h2 style={{fontSize:18,fontWeight:900,marginBottom:16}}>What is Rank?</h2>
                <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
                  Your Rank (level) reflects your experience and standing on OgaPay. It's determined by your OgaScore, tasks completed, success rate, and overall platform activity.
                </p>
                <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
                  Higher ranks unlock access to exclusive tasks, premium communities, and higher reward opportunities. Keep completing tasks and building your reputation to level up.
                </p>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:6}}>Ranks: Beginner → Intermediate → Advanced → Expert → Legend</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab: Earnings */}
      {tab === "earnings" && <TabEarningsContent />}

      {/* Tab: My Tasks */}
      {tab === "my-tasks" && <TabMyTasksContent />}

      {/* Tab: Referrals */}
      {tab === "referrals" && <TabReferralsContent />}

      {/* Tab: Notifications */}
      {tab === "notifications" && <TabNotificationsContent />}

      {/* Tab: Worker Portal */}
      {tab === "portal" && <TabWorkerPortalContent />}

    </Layout>
    </div>
  );
}
