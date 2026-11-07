import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from "../components/Layout";
import { apiRequest, API_BASE } from "../lib/api";
import { sharedGet } from "../lib/shared";
import { useCurrency } from "../context/CurrencyContext";
import { useMoney } from "../lib/useMoney";
import { useAuth } from "../context/AuthContext";
import { useWalletBalance } from "../context/WalletBalanceContext";

import { injectSkeletonStyles, SkeletonPage } from '../components/SkeletonLoader'
import { useToast } from '../components/Toast'
import bs58 from "bs58"
import VirtualAccountCard from '../components/VirtualAccountCard'
import SavedBanksList from '../components/SavedBanksList'
import FundWalletModal from '../components/FundWalletModal'
import ProfileQuickLinks from '../components/profile/ProfileQuickLinks'
import ProfileCommunitiesCard from '../components/profile/ProfileCommunitiesCard'
import ProfileConnectXCard from '../components/profile/ProfileConnectXCard'
import ProfilePortfolioCard from '../components/profile/ProfilePortfolioCard'
import ProfileWithdrawalsCard from '../components/profile/ProfileWithdrawalsCard'
import '../styles/profile-own.css'

/* ─── Icons ─── */
import TabNotificationsContent from '../components/ProfileNotificationsTab'
import TabReferralsContent from '../components/ProfileReferralsTab'
import TabMyTasksContent from '../components/ProfileMyTasksTab'
import TabEarningsContent from '../components/ProfileEarningsTab'
import { sized } from '../lib/img'
import { categoryLabel } from '../lib/categories'
import { xProfileOf } from '../lib/xprofile'
import { isPhone, openInWalletUrl, PHONE_WALLET_LINE, phoneWalletSignInLine, WALLET_APPS, type WalletAppId } from '../lib/walletApps'
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


// An on/off switch; `label` is what screen readers say it switches
function Toggle({ on, set, label }: { on: any; set: any; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} onClick={() => set((v: any) => !v)} className="tg-btn tap">
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

// Icon-only copy button that sits inside the referral link box
function RefCopy({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); };
  return (
    <button type="button" onClick={copy} className="pw-copy" aria-label={ok ? "Copied" : "Copy referral link"}>
      <Icon n={ok ? "check" : "copy"} s={16} c={ok ? "var(--green)" : "var(--text2)"} />
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
  const show = useMoney()
  const navigate = useNavigate();
  const { user: authUser, refreshUser } = useAuth();
  const { balances: walletBal, refresh: refreshWallet } = useWalletBalance();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  // ?tab=portal (the retired Worker Portal tab) falls back to the profile
  const [tab, setTab] = useState(() => { const t = searchParams.get("tab") || "profile"; return t === "portal" ? "profile" : t });
  const [showBal, setShowBal] = useState(false);
  const [fundModal, setFundModal] = useState<null | 'deposit' | 'withdraw'>(null);
  const [savingPref, setSavingPref] = useState(false);
  const [verifSending, setVerifSending] = useState(false);
  const [verifMsg, setVerifMsg] = useState<React.ReactNode>('');
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [editingBank, setEditingBank] = useState(false);
  const [moneyIn, setMoneyIn] = useState(false);
  const [moneyOut, setMoneyOut] = useState(false);
  // Saved withdrawal banks (Wallet → Money out); null until known, so the banner never flashes
  const [bankCount, setBankCount] = useState<number | null>(null);
  useEffect(() => {
    sharedGet<any[]>('/wallet/banks', 5000).then((d) => setBankCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
  }, []);
  const [savingBank, setSavingBank] = useState(false);
  const [bankMsg, setBankMsg] = useState("");
  const [kycDocument, setKycDocument] = useState<File | null>(null);
  const [kycDocumentPreview, setKycDocumentPreview] = useState("");
  const [kycUploading, setKycUploading] = useState(false);

  // ── Info Modal State ──
  const [showInfo, setShowInfo] = useState<string | null>(null);

  // ── API Data state ──
  const [profileData, setProfileData] = useState<any>(null);
  // Bumped when the add money / withdraw sheet closes, so Withdrawal History loads again
  const [wdKey, setWdKey] = useState(0);
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
      const [userData, refData, kycData] = await Promise.all([
        apiRequest<any>('/users/me').catch(() => null),
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
      if (refData) setReferralStats(refData);
      if (kycData) setKycStatus(kycData);
    } catch (err) {
      toast('Failed to load profile data', 'error');
    }
  };

  // After X is connected or refreshed: load the account again without the page
  // skeleton. If X gave the account its picture, the menus need it too (and the
  // account update that follows doesn't need to reload this page again).
  const quietUserUpdate = useRef(false);
  const reloadMe = async () => {
    const d = await apiRequest<any>('/users/me').catch(() => null);
    if (!d) return;
    const pictureChanged = (d.avatarUrl || null) !== (profileData?.avatarUrl || null);
    setProfileData(d);
    if (pictureChanged) {
      quietUserUpdate.current = true;
      Promise.resolve(refreshUser()).finally(() => setTimeout(() => { quietUserUpdate.current = false; }, 1000));
    }
  };

  // The skeleton only on the first load (or another account). Later account updates
  // reload quietly (2026-11-07): a withdrawal refreshes the account, and the skeleton
  // unmounted the Withdraw sheet, so its "Withdrawal requested" screen vanished and an
  // empty form came back (a member could send it twice).
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (quietUserUpdate.current) { quietUserUpdate.current = false; return; }
    const id = authUser?.id || null;
    const first = loadedFor.current === null || loadedFor.current !== id;
    loadedFor.current = id;
    if (first) setLoading(true);
    loadProfile().finally(() => { if (first) setLoading(false); });
  }, [authUser]);

  // Detect installed Solana wallets. Checked again each time the wallet list
  // opens: inside a wallet app's browser the wallet can be added after the
  // page has loaded. Newer Backpack versions put the Solana side on .solana.
  useEffect(() => {
    const found: string[] = [];
    if (typeof window !== "undefined") {
      if ((window as any).phantom?.solana?.isPhantom) found.push("phantom");
      if ((window as any).backpack?.isBackpack || (window as any).backpack?.solana) found.push("backpack");
      if ((window as any).solflare?.isSolflare) found.push("solflare");
    }
    setDetectedWallets(found);
  }, [showWalletOptions]);

  useEffect(() => {
    if (editingBank) {
      setMoneyOut(true);
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

  // Referral link
  const refCode = user?.referralCode || referralStats?.referralCode || '';
  const refUrl = refCode ? `${window.location.origin}/ref/${refCode}` : '';

  // KYC status
  // Verified = approved with a real tier (some old accounts were auto-approved at tier 0 and still need KYC)
  const isKycVerified = kycStatus?.status === 'APPROVED' && Number(kycStatus?.kycTier ?? 0) >= 1;
  const isHumanVerified = !!((authUser as any)?.humanVerified || profileData?.humanVerified);
  const lockedNgn = walletBal?.NGN?.lockedBalance ?? 0;

  // Saved preferences. The server merges what's sent into what's saved, so only the
  // changed key goes (2026-11-07): sending them all sent jobPush: null (never chosen),
  // which the server turns down ("Choose Off, My categories or All jobs"), so no
  // switch here could be saved by anyone who hadn't picked a job-alert setting
  const autoConvert = !!profileData?.preferences?.autoConvert;
  const isPublic = profileData?.isPublic !== false;
  const savePref = async (patch: Record<string, any>) => {
    if (savingPref) return;
    setSavingPref(true);
    try {
      if ('isPublic' in patch) {
        await apiRequest('/users/me', { method: 'PATCH', body: JSON.stringify({ isPublic: patch.isPublic }) });
        setProfileData((d: any) => ({ ...d, isPublic: patch.isPublic }));
      } else {
        await apiRequest('/users/me/preferences', { method: 'PATCH', body: JSON.stringify({ preferences: patch }) });
        setProfileData((d: any) => ({ ...d, preferences: { ...(d?.preferences || {}), ...patch } }));
      }
    } catch (e: any) {
      toast(e?.message || 'Could not save', 'error');
    }
    setSavingPref(false);
  };
  const flip = (current: boolean, key: string) => (u: any) => savePref({ [key]: typeof u === 'function' ? u(current) : u });

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
      else if (id === "backpack") wallet = (window as any).backpack?.solana || (window as any).backpack;
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
    { id: "store", label: "My Store", icon: "building-store" },
  ];
  const tabNav = (id: string) => {
    if (id === "store") { navigate("/my-store"); return; }
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

  // The top bar and bottom bar stay while the profile loads (2026-11-07)
  return loading ? <Layout><SkeletonPage /></Layout> : (
    <div className="page-fade-in">
    <Layout>
      <style>{`
        .pg{width:100%;max-width:calc(var(--container) + 2 * var(--gutter));margin:0 auto;padding:var(--page-top) var(--gutter) 60px}
        .page{max-width:100%!important;width:100%}
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
        .quick-tile:hover{transform:none;box-shadow:var(--shadow-soft);border-color:rgba(var(--accent-rgb),0.2);color:var(--text)}
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
        .dash-btn{height:var(--ctl-h-lg);padding:0 24px;border-radius:var(--r-ctl);border:none;background:var(--text);color:var(--bg);font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .15s,opacity .15s;font-family:inherit}
        .dash-btn:hover{opacity:.9}.dash-btn:active{transform:scale(0.97)}
        .dash-input{width:100%;height:48px;padding:0 16px;border:1px solid var(--border);border-radius:16px;background:var(--card);color:var(--text);font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;font-family:inherit;box-sizing:border-box}
        .dash-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(var(--accent-rgb),0.1)}
        .skeleton{background:var(--bg2);border-radius:var(--radius-sm);animation:pulse 1.5s ease-in-out infinite;min-height:16px}
        @keyframes pulse{0%{opacity:.6}50%{opacity:.3}100%{opacity:.6}}
        .onboarding-banner{display:flex;align-items:center;gap:12px;padding:16px 20px;background:rgba(var(--accent-rgb),.08);border:1px solid rgba(var(--accent-rgb),.15);border-radius:var(--radius);margin-bottom:12px;font-size:13px}
        .onboarding-banner .ob-msg{flex:1;color:var(--text)}
        .onboarding-banner .ob-btn{height:32px;padding:0 14px;border-radius:8px;border:none;background:var(--accent);color:var(--on-accent);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit}
        .onboarding-banner .ob-close{width:28px;height:28px;border:none;background:none;color:var(--text3);cursor:pointer;display:grid;place-items:center;font-size:16px;flex-shrink:0}
        /* Phones (2026-11-07): the button goes under the message so the text isn't squeezed */
        @media(max-width:767px){.onboarding-banner{flex-wrap:wrap;padding:12px 14px;gap:8px 12px}.onboarding-banner .ob-msg{flex:1 1 calc(100% - 72px)}.onboarding-banner .ob-close{order:2}.onboarding-banner .ob-btn{order:3;margin-left:32px}}
      `}</style>
      <div className="pg">

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
      {/* Withdrawals use the saved banks; the old profile field (bankAccount) is no longer filled in */}
      {!loading && bankCount === 0 && !authUser?.bankAccount && (
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
          <button className="ob-btn" onClick={() => navigate('/settings/verification')}>Verify Now</button>
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

      {/* Tab Bar: icon + label pills on wider screens; an equal icon-over-label grid on phones */}
      <div className="tab-bar" ref={tabBarRef}>
        {(tabs || []).map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''} tab-${t.id}`} onClick={() => tabNav(t.id)}>
            <i className={`ti ti-${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Profile (default). Laid out like wurk.fun's /profile: account on the
          left, profile on the right, then full-width quick links and histories */}
      {tab === "profile" && (
        <>
          <div className="pw-grid">
            <div className="pw-col pw-left">
            {/* Account Information */}
            <div className="profile-card pw-account">
              <div className="profile-card-head">
                <span><Icon n="wallet" s={15} /> Account Information</span>
                <a href="/wallet" className="pw-head-link" onClick={e => { e.preventDefault(); navigate('/wallet') }}>Wallet</a>
              </div>
              <div className="profile-card-body">
                {/* Wallet address row */}
                <div className="pw-line">
                  <span className="pw-line-l">Wallet address</span>
                  {hasWallet ? (
                    <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                      <span className="pw-addr">{shortAddr}</span>
                      <CopyBtn text={walletAddress} />
                    </div>
                  ) : (
                    <span style={{color:'var(--text3)',fontSize:12}}>Not connected</span>
                  )}
                </div>

                {/* Naira balance: always visible */}
                <div className="pw-bal">
                  <div>
                    <div className="pw-bal-k">Available</div>
                    <div className="pw-bal-v">{show(totalNgn)}</div>
                  </div>
                  {lockedNgn > 0 && <span style={{fontSize:12,color:'var(--text2)'}}>{show(lockedNgn)} held in escrow</span>}
                </div>

                {/* Main actions: equal buttons in one row */}
                <div className="pw-acts">
                  <button className="dash-btn" onClick={() => setFundModal('withdraw')}><Icon n="arrow-up-right" s={14} c="var(--bg)" /> Withdraw</button>
                  <button className="dash-btn" onClick={() => navigate('/deposit')}><Icon n="plus" s={14} c="var(--bg)" /> Deposit</button>
                </div>

                {/* Secondary wallet actions: two outlined buttons */}
                <div className={`pw-acts2 ${hasWallet ? '' : 'one'}`}>
                  {hasWallet ? (
                    <>
                      <button className="btn-outline" onClick={handleGeneratePairCode} disabled={generatingPair}>
                        <Icon n="device-mobile" s={14} /> {generatingPair ? 'Generating…' : 'Pair Device'}
                      </button>
                      <button className="btn-outline" onClick={() => setShowWalletOptions(true)}>
                        <Icon n="link" s={14} /> Link Extra Wallet
                      </button>
                    </>
                  ) : (
                    <button className="btn-outline" onClick={() => setShowWalletOptions(true)}>
                      <Icon n="wallet" s={14} /> Connect Solana wallet
                    </button>
                  )}
                </div>
                {pairCode && (
                  <div style={{textAlign:'center',padding:'12px',marginBottom:10,background:'var(--bg2)',borderRadius:10,fontSize:12}}>
                    <div style={{fontSize:12,color:'var(--text3)',marginBottom:4,fontWeight:600}}>Pairing Code (expires in 5 min)</div>
                    <div style={{fontSize:20,fontWeight:900,letterSpacing:3,color:'var(--text)',fontFamily:'monospace',wordBreak:'break-all'}}>{pairCode}</div>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(pairCode); toast('Code copied!') }} style={{marginTop:6,fontSize:11,color:'var(--text2)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',fontFamily:'inherit'}}>Copy code</button>
                  </div>
                )}

                {/* Settings toggles */}
                <div className="pw-toggle">
                  <div>
                    <div className="pw-toggle-t">Show all balances</div>
                    <div className="pw-toggle-d">USDC and SOL next to your naira.</div>
                  </div>
                  <Toggle on={showBal} set={setShowBal} label="Show all balances" />
                </div>
                {showBal && (
                  <div style={{padding:'0 0 8px'}}>
                    {[['USDC', usdcBal, 2], ['SOL', solBal, 4]].map(([c, v, d]: any) => (
                      <div key={c} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:14,borderBottom:'1px dashed var(--border)'}}>
                        <span style={{fontWeight:700}}>{c}</span>
                        <span style={{fontFamily:'var(--font-mono, monospace)'}}>{Number(v || 0).toFixed(d)}</span>
                      </div>
                    ))}
                    <a href="/wallet" style={{display:'inline-block',marginTop:8,fontSize:12,color:'var(--text)',fontWeight:700}}>Open wallet →</a>
                  </div>
                )}
                {/* Auto-convert (saved: preferences.autoConvert) */}
                <div className="pw-toggle">
                  <div>
                    <div className="pw-toggle-t">Auto-convert USDC</div>
                    <div className="pw-toggle-d">Turn new USDC you earn or deposit into naira as it arrives, at the live rate.</div>
                  </div>
                  <Toggle on={autoConvert} set={flip(autoConvert, 'autoConvert')} label="Auto-convert USDC" />
                </div>

                {/* Your two kinds of account, labelled like the Wallet so they can't be
                    mixed up: money in (the OgaPay account number to transfer to) and
                    money out (your own banks, where withdrawals go). Folded to keep
                    this card about as tall as the Profile card */}
                <div id="bank-section" className="pw-money">
                  <details className="pw-fold" open={moneyIn} onToggle={e => setMoneyIn((e.currentTarget as HTMLDetailsElement).open)}>
                    <summary>
                      <span className="wl-dir in pw-fold-ic"><i className="ti ti-arrow-down-left" /></span>
                      <span className="pw-fold-m"><b>Money in</b><small>Your OgaPay account number for transfers</small></span>
                      <i className="ti ti-chevron-down pw-fold-chev" />
                    </summary>
                    <div className="pw-fold-b"><VirtualAccountCard flush /></div>
                  </details>
                  <details className="pw-fold" open={moneyOut} onToggle={e => setMoneyOut((e.currentTarget as HTMLDetailsElement).open)}>
                    <summary>
                      <span className="wl-dir out pw-fold-ic"><i className="ti ti-arrow-up-right" /></span>
                      <span className="pw-fold-m"><b>Money out</b><small>{bankCount ? `Withdrawals go to ${bankCount} saved bank${bankCount === 1 ? '' : 's'}` : 'Add the bank withdrawals go to'}</small></span>
                      <i className="ti ti-chevron-down pw-fold-chev" />
                    </summary>
                    <div className="pw-fold-b">
                      <section className="ui-card wl-sec wl-dir-card" aria-labelledby="pf-out">
                        <h2 id="pf-out" className="wl-dir-title">Withdrawals go to</h2>
                        <SavedBanksList bare onCount={setBankCount} />
                      </section>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <div className="pw-communities"><ProfileCommunitiesCard /></div>
            </div>

            <div className="pw-col pw-right">
            {/* Profile */}
            <div className="profile-card pw-profile">
              <div className="profile-card-head">
                <span><Icon n="user" s={15} /> Profile</span>
                {/* One edit form for everyone: the Edit profile page, like Settings (2026-11-07) */}
                <button className="btn-outline btn-sm" onClick={() => navigate('/edit-profile')}>
                  <Icon n="edit" s={12} /> Edit
                </button>
              </div>
              <div className="profile-card-body">
                {/* Avatar, name, bio */}
                <div className="pw-who">
                  <div className="pw-av">
                    {user?.avatarUrl ? <img src={sized(user.avatarUrl, 64, true)} alt="" loading="lazy" /> : (user?.firstName?.[0] || 'U') + (user?.lastName?.[0] || '')}
                  </div>
                  <div style={{minWidth:0}}>
                    <div className="pw-name">{user?.firstName || 'User'} {user?.lastName || ''}</div>
                    <div className="pw-handle">@{user?.username || 'user'}</div>
                    {(profileData?.workerProfile?.bio || profileData?.bio) && (
                      <div className="pw-bio">{profileData.workerProfile?.bio || profileData.bio}</div>
                    )}
                  </div>
                </div>

                {/* Public profile */}
                <div className="pw-toggle" style={{borderTop:0,padding:'0 0 14px'}}>
                  <div style={{minWidth:0}}>
                    <div className="pw-toggle-t">Public profile {isPublic ? '' : '(private)'}</div>
                    {user?.username && <a href={`/user/${user.username}`} style={{fontSize:12,color:'var(--text2)'}}>ogapay.app/user/{user.username} →</a>}
                  </div>
                  <Toggle on={isPublic} set={flip(isPublic, 'isPublic')} label="Public profile" />
                </div>

                {/* Activity: counts on the left, status rows on the right */}
                <div className="pw-sec-h">Activity</div>
                <div className="pw-activity">
                  <div className="pw-counts">
                    {[
                      { ic: 'send', n: profileData?._count?.taskSubmissions || 0, l: 'Submissions' },
                      { ic: 'circle-check', n: profileData?.workerProfile?.tasksCompleted ?? 0, l: 'Tasks completed' },
                      { ic: 'clipboard-plus', n: profileData?._count?.tasksCreated || 0, l: 'Tasks created' },
                      { ic: 'trending-up', n: profileData?.workerProfile?.successRate ? profileData.workerProfile.successRate + '%' : '0%', l: 'Success rate', info: 'successRate' },
                      { ic: 'coin', n: profileData?.workerProfile?.totalEarned ? show(Number(profileData.workerProfile.totalEarned)) : show(0), l: 'Total earned' },
                    ].map(c => (
                      <div className="pw-count" key={c.l}>
                        <Icon n={c.ic} s={16} />
                        <b>{c.n}</b>
                        <span>{c.l}{c.info && (
                          <button className="pw-i" aria-label={`About ${c.l}`} onClick={() => setShowInfo(c.info as any)}><Icon n="info-circle" s={13} c="var(--text3)" /></button>
                        )}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pw-status">
                    <StatRow label="Rank" val={(l => l.charAt(0) + l.slice(1).toLowerCase())(String(profileData?.workerProfile?.level || 'BEGINNER'))} info onInfoClick={() => setShowInfo('rank')} />
                    {/* The same OgaScore the Dashboard, public profiles and job requirements use
                        (services/ogascore.service.js), not the old reputationScore formula */}
                    <StatRow label="OgaScore" val={profileData?.ogaScore ?? 0} info onInfoClick={() => setShowInfo('ogaScore')} />
                    {/* The Verify button lives on Settings > Verification; link straight to it */}
                    <StatRow label="Human verified" val={isHumanVerified ? 'Yes' : (
                      <a href="/settings/verification" className="pw-pill" onClick={e => { e.preventDefault(); navigate('/settings/verification') }}>Verify</a>
                    )} valClass={isHumanVerified ? 'yes' : ''} info onInfoClick={() => setShowInfo('humanVerified')} />
                    <StatRow label="Identity (KYC)" val={isKycVerified ? 'Verified' : (
                      <a href="/settings/verification" className="pw-pill" onClick={e => { e.preventDefault(); navigate('/settings/verification') }}>Verify</a>
                    )} valClass={isKycVerified ? 'yes' : ''} />
                    <StatRow label="Rating" val={profileData?.workerProfile?.totalRatings ? `${Number(profileData.workerProfile.avgRating || 0).toFixed(1)}/5 (${profileData.workerProfile.totalRatings})` : 'No ratings yet'} info onInfoClick={() => setShowInfo('avgRating')} />
                    <StatRow label="Skills" val={profileData?.workerProfile?.skills?.length ? profileData.workerProfile.skills.slice(0,3).join(', ')+(profileData.workerProfile.skills.length>3?' +' + (profileData.workerProfile.skills.length - 3):'') : '-'} />
                    <StatRow label="Categories" val={profileData?.workerProfile?.categories?.length ? profileData.workerProfile.categories.map((c: string) => categoryLabel(c)).join(', ') : '-'} />
                  </div>
                </div>

                {/* Referral link */}
                <div className="pw-ref">
                  <div className="pw-sec-h" style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    Your Referral Link
                    {referralStats?.referralTier && (() => {
                      const tierConfigs: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
                        bronze: { icon: 'ti ti-medal', label: 'Bronze', color: '#CD7F32', bg: 'rgba(205,127,50,0.08)', border: 'rgba(205,127,50,0.2)' },
                        silver: { icon: 'ti ti-medal-2', label: 'Silver', color: '#A8A8A8', bg: 'rgba(168,168,168,0.08)', border: 'rgba(168,168,168,0.2)' },
                        gold:   { icon: 'ti ti-medal', label: 'Gold', color: '#F5A623', bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.2)' },
                      };
                      const tc = tierConfigs[referralStats.referralTier];
                      if (!tc) return null;
                      return (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 12, fontWeight: 600, textTransform: 'none', letterSpacing: 0,
                          padding: '3px 10px', borderRadius: 20,
                          background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                        }}>
                          <i className={tc.icon} /> {tc.label} Referrer<InfoBtn text="Your referral tier is based on how many of your referred users have completed their first task. Bronze: 5+ paid referrals, Silver: 10+, Gold: 20 (max)." />
                        </span>
                      );
                    })()}
                  </div>
                  {refUrl ? (
                    <div className="pw-ref-row">
                      <div className="pw-ref-in">
                        <span>{refUrl}</span>
                        <RefCopy text={refUrl} />
                      </div>
                      <button className="dash-btn pw-ref-x" onClick={() => window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent('Join me on OgaPay! '+refUrl), '_blank')}>
                        <XIcon size={14} /> Post on X
                      </button>
                    </div>
                  ) : (
                    <div style={{fontSize:12,color:'var(--text3)'}}>Generate your referral link by completing your profile.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="pw-x"><ProfileConnectXCard connected={!!profileData?.twitterOAuthConnected} handle={profileData?.twitterOAuthHandle || profileData?.twitterUsername} profile={xProfileOf(profileData)} onChange={reloadMe} /></div>
            </div>
          </div>

          <div className="pw-full"><ProfileQuickLinks username={user?.username} /></div>

          <div className="pw-full"><ProfilePortfolioCard /></div>

          {/* Withdrawal History: every withdrawal, page by page, with its status */}
          <div className="pw-full"><ProfileWithdrawalsCard key={wdKey} /></div>

        </>
      )}

{showWalletOptions && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}
          onClick={() => setShowWalletOptions(false)}>
          <div onClick={e => e.stopPropagation()} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:24,maxWidth:380,width:'90%'}}>
            <h3 style={{margin:'0 0 4px',fontSize:16,fontWeight:800}}>Connect a Solana Wallet</h3>
            <p style={{color:'var(--text2)',fontSize:13,margin:'0 0 16px',lineHeight:1.5}}>
              Select a wallet provider to connect. You'll be asked to sign a message to verify ownership.
            </p>
            {isPhone() && detectedWallets.length === 0 && (<>
              <p style={{color:'var(--text)',fontSize:13,fontWeight:600,margin:'-6px 0 6px',lineHeight:1.5}}>{PHONE_WALLET_LINE}</p>
              {/* The wallet app's browser needs a fresh sign-in, and Google won't work there */}
              <p style={{color:'var(--text2)',fontSize:12.5,margin:'0 0 14px',lineHeight:1.5}}>
                {phoneWalletSignInLine(authUser?.hasPassword)}
                {authUser?.hasPassword === false && (<>
                  {' '}<button type="button" onClick={() => { setShowWalletOptions(false); navigate('/settings/security'); }}
                    style={{background:'none',border:'none',padding:0,font:'inherit',fontWeight:700,color:'var(--accent)',textDecoration:'underline',cursor:'pointer'}}>Set a password</button>
                </>)}
              </p>
            </>)}
            <div style={{display:'grid',gap:10}}>
              {[
                { id:'phantom', label:'Phantom', icon:'brand-phantom' },
                { id:'backpack', label:'Backpack', icon:'brand-backpack' },
                { id:'solflare', label:'Solflare', icon:'brand-flare' },
              ].map(p => {
                const installed = detectedWallets.includes(p.id);
                // Phone browsers never see the wallet apps, so "Not installed" was
                // wrong there: open this page inside the app, where it connects
                if (!installed && isPhone()) return (
                  <a key={p.id} href={openInWalletUrl(p.id as WalletAppId)}
                    style={{
                      display:'flex',alignItems:'center',gap:12,padding:'14px 16px',
                      borderRadius:10,border:'1.5px solid var(--border)',
                      background:'var(--bg2)',textDecoration:'none',
                      fontFamily:'inherit',fontSize:13,fontWeight:700,color:'var(--text)',
                    }}>
                    <img src={WALLET_APPS.find(w => w.id === p.id)?.icon} alt="" aria-hidden="true" width={32} height={32} style={{borderRadius:8,flexShrink:0}} />
                    <span style={{flex:1,textAlign:'left'}}>Open in {p.label}</span>
                    <Icon n="external-link" s={16} c="var(--text3)" />
                  </a>
                );
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
                    {!installed && <span style={{fontSize:12,color:'var(--text3)',fontWeight:400}}>Not installed</span>}
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
                  OgaScore (out of 66) shows how much of you we have verified. Some jobs need a minimum OgaScore.
                </p>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:8}}>What counts:</div>
                <ul style={{fontSize:12,color:'var(--text)',lineHeight:1.8,paddingLeft:18,margin:'0 0 4px'}}>
                  <li>Connected accounts: LinkedIn +10, X +8, GitHub +8, Google +5, Telegram +5</li>
                  <li>ID verification: Level 1 +10, Level 2 +10 more</li>
                  <li>Human verification +10</li>
                </ul>
                <p style={{fontSize:12,color:'var(--text2)',lineHeight:1.6,margin:'8px 0 0'}}>Nothing else changes it. Do these in Settings &rarr; Verification and Settings &rarr; Connections.</p>
              </>
            )}

            {showInfo === 'successRate' && (
              <div className="wjd-info-overlay" onClick={() => setShowInfo(null)}>
                <div className="wjd-info-panel" onClick={e => e.stopPropagation()}>
                  <div className="wjd-info-header"><div className="wjd-info-header-title"><Icon n="trending-up" s={15} /> Success Rate</div><button className="wjd-info-close" onClick={() => setShowInfo(null)}><i className="ti ti-x" /></button></div>
                  <div className="wjd-info-body"><p style={{fontSize:13,lineHeight:1.7,margin:0,color:'var(--text2)'}}>Your success rate is the percentage of your submitted tasks that were approved: approved / (approved + rejected) × 100. It shows how often your work gets approved. It doesn't change your OgaScore or your rank.</p></div>
                </div>
              </div>
            )}
            {/* Keep in sync with the backend: task.service reviewSubmission and calculateLevel */}
            {showInfo === 'avgRating' && (
              <>
                <h2 style={{fontSize:18,fontWeight:900,marginBottom:16}}>What is Rating?</h2>
                <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
                  When a job poster approves your work, they can give it 1 to 5 stars and a short note. Your rating is the average of those stars. The number in brackets is how many ratings you have.
                </p>
                <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
                  Higher ranks need a good rating as well as finished jobs: Advanced needs 4.0, Expert 4.5 and Legend 4.8, from a number of different job posters (Advanced 5, Expert 20, Legend 50). Each poster counts once in that rating, however many of your jobs they rated.
                </p>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:6}}>Your ratings and notes show on your public profile under Reviews.</div>
              </>
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
                  How to get it: Go to <strong>Settings → Verification</strong> and tap "Verify with VeryAI" for a quick palm scan in the VeryAI app. After the scan, go back to the browser page that opened VeryAI. Already scanned? Tap "Check again" there.
                </p>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:6}}>Also adds +10 to your OgaScore</div>
              </>
            )}

            {showInfo === 'rank' && (
              <>
                <h2 style={{fontSize:18,fontWeight:900,marginBottom:16}}>What is Rank?</h2>
                <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
                  Your Rank (level) reflects your experience on OgaPay. It comes from two things: how many jobs you've finished and your average rating from posters. Intermediate needs 10 finished jobs, Advanced 50 with a 4.0 rating, Expert 200 with 4.5, and Legend 500 with 4.8.
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


      {fundModal && (
        <FundWalletModal initialStep={fundModal} onClose={() => { setFundModal(null); refreshWallet(); setWdKey((k) => k + 1); }} onDone={() => { refreshWallet(); refreshUser(); }} />
      )}

      </div>
    </Layout>
    </div>
  );
}
