import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from "../components/Layout";
import LoadError from "../components/LoadError";
import { apiRequest } from "../lib/api";
import { sharedGet } from "../lib/shared";
import { useMoney } from "../lib/useMoney";
import { useAuth } from "../context/AuthContext";
import { useWalletBalance } from "../context/WalletBalanceContext";

import { injectSkeletonStyles } from '../components/SkeletonLoader'
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

import TabReferralsContent from '../components/ProfileReferralsTab'
import TabMyTasksContent from '../components/ProfileMyTasksTab'
import TabEarningsContent from '../components/ProfileEarningsTab'
import { sized } from '../lib/img'
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

// "Finish setting up" folded to one line (this browser only)
const SETUP_FOLD_KEY = "ogapay_profile_setup_folded";

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
    <button type="button" onClick={copy} className="ui-btn ui-btn-ghost ui-btn-sm">
      <Icon n={ok ? "check" : "copy"} s={14} c={ok ? "var(--green)" : "var(--text2)"} />
      {ok ? "Copied!" : "Copy"}
    </button>
  );
}

// Icon-only copy button that sits inside the referral link box
function RefCopy({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); };
  return (
    <button type="button" onClick={copy} className="pw-copy tap" aria-label={ok ? "Copied" : "Copy referral link"}>
      <Icon n={ok ? "check" : "copy"} s={16} c={ok ? "var(--green)" : "var(--text2)"} />
    </button>
  );
}

function StatRow({ label, val, info, valClass, onInfoClick }: { label: any; val: any; info?: any; valClass?: any; onInfoClick?: () => void }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}{info && (
        <button type="button" className="pw-i tap" aria-label={`About ${typeof label === 'string' ? label : 'this'}`} onClick={e => { e.stopPropagation(); onInfoClick?.() }}>
          <Icon n="info-circle" s={14} c="var(--text3)" />
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

  // ── Info Modal State ──
  const [showInfo, setShowInfo] = useState<string | null>(null);

  // "Finish setting up" folded to one line
  const [setupFolded, setSetupFolded] = useState(() => { try { return localStorage.getItem(SETUP_FOLD_KEY) === "1" } catch { return false } });
  const foldSetup = (v: boolean) => { setSetupFolded(v); try { localStorage.setItem(SETUP_FOLD_KEY, v ? "1" : "0") } catch { /* private window */ } };

  // ── API Data state ──
  const [profileData, setProfileData] = useState<any>(null);
  // Your account (/users/me) didn't load: show "couldn't load", never a placeholder name
  const [loadFailed, setLoadFailed] = useState(false);
  // Bumped when the add money / withdraw sheet closes, so Withdrawal History loads again
  const [wdKey, setWdKey] = useState(0);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [detectedWallets, setDetectedWallets] = useState<string[]>([]);
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // ── Fetch all data on mount & when authUser changes (e.g. wallet connected on Dashboard) ──
  const loadProfile = async () => {
    try {
      const [userData, refData, kycData] = await Promise.all([
        apiRequest<any>('/users/me').catch(() => null),
        apiRequest<any>('/users/referrals/stats').catch(() => null),
        apiRequest<any>('/kyc/status').catch(() => null),
      ]);
      // Keep what was already shown if a later reload fails; only an account
      // that never loaded counts as "couldn't load"
      setLoadFailed(!userData && !profileData);
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

  useEffect(() => {
    if (quietUserUpdate.current) { quietUserUpdate.current = false; return; }
    setLoading(true);
    loadProfile().finally(() => setLoading(false));
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

  // Saved preferences (PATCH replaces the whole object, so merge first)
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
        const preferences = { ...(profileData?.preferences || {}), ...patch };
        await apiRequest('/users/me/preferences', { method: 'PATCH', body: JSON.stringify({ preferences }) });
        setProfileData((d: any) => ({ ...d, preferences }));
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

  // The same text tabs at every size. Notifications (the Alerts tab) and My
  // Store (a page of its own) were tabs here; old ?tab= links go to their pages.
  const tabs = [
    { id: "profile", label: "Profile", icon: "user" },
    { id: "earnings", label: "Earnings", icon: "currency-dollar" },
    { id: "my-tasks", label: "My tasks", icon: "clipboard-list" },
    { id: "referrals", label: "Referrals", icon: "affiliate" },
  ];
  useEffect(() => {
    if (tab === "notifications") navigate("/notifications", { replace: true });
    else if (tab === "store") navigate("/my-store", { replace: true });
  }, [tab]);

  // Resend the email verification link (Finish setting up)
  const resendEmail = async () => {
    if (verifSending) return;
    setVerifSending(true);
    setVerifMsg('');
    try {
      await apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: authUser?.email }),
      });
      setVerifMsg(<><i className="ti ti-circle-check" style={{color:'var(--green)'}} /> Sent. Check your inbox.</>);
      setTimeout(() => setVerifMsg(''), 8000);
    } catch (err: any) {
      setVerifMsg(<><i className="ti ti-circle-x" style={{color:'var(--red)'}} /> {err?.message || "Couldn't send it. Try again."}</>);
    } finally {
      setVerifSending(false);
    }
  };

  // One "Finish setting up" card in place of the old banners, most important
  // first. Withdrawals use the saved banks (the old profile bankAccount field is
  // no longer filled in); the bank count is null until known, so it never flashes.
  const setupSteps: { id: string; done: boolean; optional?: boolean; icon: string; title: string; sub: React.ReactNode; action: string; go: () => void }[] = [
    { id: "kyc", done: isKycVerified, icon: "shield-check", title: "Verify your identity", sub: "Needed before you can withdraw", action: "Verify", go: () => navigate('/settings/verification') },
    { id: "bank", done: bankCount === null || bankCount > 0 || !!authUser?.bankAccount, icon: "building-bank", title: "Add a bank account", sub: "Where your naira withdrawals go", action: "Add", go: () => { setTab('profile'); setEditingBank(true); } },
    { id: "email", done: !!authUser?.isEmailVerified, icon: "mail", title: "Verify your email", sub: verifMsg || "Open the link we emailed you, so you get job and payment alerts", action: verifSending ? "Sending…" : "Resend", go: resendEmail },
    { id: "wallet", done: !!authUser?.walletAddress, optional: true, icon: "wallet", title: "Connect a Solana wallet", sub: "Optional, for USDC and SOL", action: "Connect", go: () => setShowWalletOptions(true) },
  ];
  const setupLeft = setupSteps.filter((s) => !s.done);
  const setupDone = setupSteps.length - setupLeft.length;
  // Hidden once everything that matters is done (the wallet is optional)
  const showSetup = !!profileData && setupLeft.some((s) => !s.optional);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Your profile";
  const initials = ((user?.firstName?.[0] || user?.username?.[0] || "?") + (user?.lastName?.[0] || "")).toUpperCase();
  const rankName = (l => l.charAt(0) + l.slice(1).toLowerCase())(String(profileData?.workerProfile?.level || 'BEGINNER'));
  const bio = profileData?.workerProfile?.bio || profileData?.bio || "";

  if (loading) {
    return (
      <Layout>
        <div className="pf-page" aria-busy="true">
          <div className="pf-head">
            <div className="pf-who">
              <span className="pf-av ui-sk" />
              <div className="pf-id"><div className="ui-sk" style={{ height: 26, width: 180, borderRadius: 8 }} /><div className="ui-sk" style={{ height: 14, width: 110, marginTop: 10, borderRadius: 6 }} /></div>
            </div>
          </div>
          <div className="ui-sk" style={{ height: 52, marginBottom: 20 }} />
          <div className="ui-sk" style={{ height: 360 }} />
        </div>
      </Layout>
    );
  }

  return (
    <div className="page-fade-in">
    <Layout>
      <div className="pf-page">

      {loadFailed ? (
        <LoadError what="your profile" onRetry={() => { setLoading(true); loadProfile().finally(() => setLoading(false)); }} />
      ) : (<>
      {/* Who you are: the first thing on the Profile tab */}
      <header className="pf-head">
        <div className="pf-who">
          <span className="pf-av">
            {user?.avatarUrl ? <img src={sized(user.avatarUrl, 128, true)} alt="" /> : initials}
          </span>
          <div className="pf-id">
            <h1 className="pf-name">{fullName}</h1>
            {user?.username && <div className="pf-handle">@{user.username}</div>}
            {bio && <p className="pf-bio">{bio}</p>}
            <div className="pf-chips">
              <button type="button" className="pf-chip" onClick={() => setShowInfo('rank')} aria-label={`Rank: ${rankName}. What is rank?`}><i className="ti ti-trophy" aria-hidden="true" /> {rankName}</button>
              <button type="button" className="pf-chip" onClick={() => setShowInfo('ogaScore')} aria-label={`OgaScore ${profileData?.ogaScore ?? 0}. What is OgaScore?`}><i className="ti ti-shield-check" aria-hidden="true" /> OgaScore {profileData?.ogaScore ?? 0}</button>
              {user?.username && <Link className="pf-chip pf-chip-pub" to={`/user/${user.username}`}><i className="ti ti-external-link" aria-hidden="true" /> Public profile</Link>}
            </div>
          </div>
        </div>
        <div className="pf-head-acts">
          {user?.username && <Link className="ui-btn ui-btn-ghost pf-pub" to={`/user/${user.username}`}><i className="ti ti-external-link" aria-hidden="true" /> View public profile</Link>}
          <Link className="ui-btn ui-btn-dark pf-edit" to="/edit-profile" aria-label="Edit profile"><i className="ti ti-pencil" aria-hidden="true" /><span>Edit profile</span></Link>
        </div>
      </header>

      {/* After the email link: confirmation */}
      {searchParams.get('verified') === 'true' && (
        <div className="pf-notice ok" role="status">
          <i className="ti ti-circle-check" aria-hidden="true" />
          <div><b>Email verified</b><span>Your account is confirmed. Check your details below.</span></div>
          <button type="button" className="pf-notice-x tap" aria-label="Dismiss" onClick={() => {
            const p = new URLSearchParams(window.location.search)
            p.delete('verified')
            window.history.replaceState({}, '', `${window.location.pathname}${p.toString() ? '?' + p.toString() : ''}`)
          }}><i className="ti ti-x" /></button>
        </div>
      )}

      {/* After sending ID documents */}
      {searchParams.get('kyc') === 'submitted' && (
        <div className="pf-notice warn" role="status">
          <i className="ti ti-shield-check" aria-hidden="true" />
          <div><b>ID sent for review</b><span>We'll let you know within 24 hours once your identity is checked.</span></div>
          <button type="button" className="pf-notice-x tap" aria-label="Dismiss" onClick={() => {
            const p = new URLSearchParams(window.location.search)
            p.delete('kyc')
            window.history.replaceState({}, '', `${window.location.pathname}${p.toString() ? '?' + p.toString() : ''}`)
          }}><i className="ti ti-x" /></button>
        </div>
      )}

      {/* Finish setting up: one card, most important step first */}
      {showSetup && (
        <section className="ui-card pf-setup" aria-labelledby="pf-setup-h">
          <div className="pf-setup-head">
            <div style={{ minWidth: 0 }}>
              <h2 id="pf-setup-h">Finish setting up</h2>
              <p>{setupDone} of {setupSteps.length} done</p>
            </div>
            <button type="button" className="ui-btn ui-btn-text ui-btn-sm" aria-expanded={!setupFolded} aria-controls="pf-steps" onClick={() => foldSetup(!setupFolded)}>
              {setupFolded ? `Show ${setupLeft.length} step${setupLeft.length === 1 ? '' : 's'}` : 'Hide'}
            </button>
          </div>
          <div className="pf-setup-bar" aria-hidden="true"><span style={{ width: `${(setupDone / setupSteps.length) * 100}%` }} /></div>
          {!setupFolded && (
            <ul className="pf-steps" id="pf-steps">
              {setupLeft.map((s) => (
                <li key={s.id}>
                  <button type="button" className="pf-step" onClick={s.go} disabled={s.id === 'email' && verifSending}>
                    <span className="pf-step-ic"><i className={`ti ti-${s.icon}`} aria-hidden="true" /></span>
                    <span className="pf-step-m"><b>{s.title}</b><small>{s.sub}</small></span>
                    <span className="pf-step-go">{s.action}<i className="ti ti-chevron-right" aria-hidden="true" /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      </>)}

      {/* Tabs: the same four at every size */}
      <div className="tab-bar" role="tablist" aria-label="Profile sections">
        {tabs.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <i className={`ti ti-${t.icon}`} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Profile (default). Balance and communities on the left, profile and
          X on the right (two columns from tablet), then portfolio and withdrawals */}
      {tab === "profile" && !loadFailed && (
        <>
          <div className="pw-grid">
            <div className="pw-col pw-left">
            {/* Balance: naira first; crypto in its own fold */}
            <div className="profile-card pw-account">
              <div className="profile-card-head">
                <span><Icon n="wallet" s={15} /> Balance</span>
                <Link to="/wallet" className="pw-head-link">Wallet</Link>
              </div>
              <div className="profile-card-body">
                {/* Naira balance: always visible */}
                <div className="pw-bal">
                  <div>
                    <div className="pw-bal-k">Available</div>
                    <div className="pw-bal-v">{show(totalNgn)}</div>
                  </div>
                  {lockedNgn > 0 && <span className="pw-bal-held">{show(lockedNgn)} held in escrow</span>}
                </div>

                {/* Main actions: equal buttons in one row */}
                <div className="pw-acts">
                  <button type="button" className="ui-btn ui-btn-dark ui-btn-lg" onClick={() => setFundModal('withdraw')}><i className="ti ti-logout" aria-hidden="true" /> Withdraw</button>
                  <button type="button" className="ui-btn ui-btn-ghost ui-btn-lg" onClick={() => navigate('/deposit')}><i className="ti ti-plus" aria-hidden="true" /> Deposit</button>
                </div>

                {/* Your two kinds of account, labelled like the Wallet so they can't be
                    mixed up: money in (the OgaPay account number to transfer to) and
                    money out (your own banks, where withdrawals go). Then the crypto
                    side (Solana wallet, USDC and SOL) folded away */}
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
                  <details className="pw-fold">
                    <summary>
                      <span className="pw-fold-ic pw-crypto-ic"><i className="ti ti-currency-solana" /></span>
                      <span className="pw-fold-m"><b>Crypto (USDC and SOL)</b><small>{hasWallet ? `Solana wallet ${shortAddr}` : 'No Solana wallet connected'}</small></span>
                      <i className="ti ti-chevron-down pw-fold-chev" />
                    </summary>
                    <div className="pw-fold-b">
                      {/* Wallet address row */}
                      <div className="pw-line">
                        <span className="pw-line-l">Wallet address</span>
                        {hasWallet ? (
                          <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                            <span className="pw-addr">{shortAddr}</span>
                            <CopyBtn text={walletAddress} />
                          </div>
                        ) : (
                          <span style={{color:'var(--text3)',fontSize:13}}>Not connected</span>
                        )}
                      </div>

                      {/* Wallet actions: two outlined buttons */}
                      <div className={`pw-acts2 ${hasWallet ? '' : 'one'}`}>
                        {hasWallet ? (
                          <>
                            <Link className="ui-btn ui-btn-ghost" to="/pair-device">
                              <Icon n="device-mobile" s={15} /> Pair a device
                            </Link>
                            <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setShowWalletOptions(true)}>
                              <Icon n="link" s={15} /> Link another wallet
                            </button>
                          </>
                        ) : (
                          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setShowWalletOptions(true)}>
                            <Icon n="wallet" s={15} /> Connect Solana wallet
                          </button>
                        )}
                      </div>

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
                          <Link to="/wallet" style={{display:'inline-block',marginTop:8,fontSize:13,color:'var(--text)',fontWeight:700}}>Open wallet →</Link>
                        </div>
                      )}
                      {/* Auto-convert (saved: preferences.autoConvert) */}
                      <div className="pw-toggle">
                        <div>
                          <div className="pw-toggle-t">Auto-convert USDC</div>
                          <div className="pw-toggle-d">Turn USDC you earn into naira automatically, at the current rate.</div>
                        </div>
                        <Toggle on={autoConvert} set={flip(autoConvert, 'autoConvert')} label="Auto-convert USDC" />
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <div className="pw-communities"><ProfileCommunitiesCard /></div>
            </div>

            <div className="pw-col pw-right">
            {/* Profile: reputation (name and photo are in the header above) */}
            <div className="profile-card pw-profile">
              <div className="profile-card-head">
                <span><Icon n="user" s={15} /> Profile</span>
                <Link to="/edit-profile" className="pw-head-link">Edit</Link>
              </div>
              <div className="profile-card-body">
                {/* Public profile */}
                <div className="pw-toggle pw-toggle-first">
                  <div style={{minWidth:0}}>
                    <div className="pw-toggle-t">Public profile {isPublic ? '' : '(private)'}</div>
                    {user?.username && <Link to={`/user/${user.username}`} className="pw-toggle-d">ogapay.app/user/{user.username} →</Link>}
                  </div>
                  <Toggle on={isPublic} set={flip(isPublic, 'isPublic')} label="Public profile" />
                </div>

                {/* Activity: total earned first, then the counts and status rows */}
                <div className="pw-sec-h">Activity</div>
                <div className="pw-activity">
                  <div className="pw-counts">
                    {[
                      { ic: 'coin', n: profileData?.workerProfile?.totalEarned ? show(Number(profileData.workerProfile.totalEarned)) : show(0), l: 'Total earned', lead: true },
                      { ic: 'send', n: profileData?._count?.taskSubmissions || 0, l: 'Submissions' },
                      { ic: 'circle-check', n: profileData?.workerProfile?.tasksCompleted ?? 0, l: 'Tasks completed' },
                      { ic: 'clipboard-plus', n: profileData?._count?.tasksCreated || 0, l: 'Tasks created' },
                      { ic: 'trending-up', n: profileData?.workerProfile?.successRate ? profileData.workerProfile.successRate + '%' : '0%', l: 'Success rate', info: 'successRate' },
                    ].map(c => (
                      <div className={`pw-count${c.lead ? ' lead' : ''}`} key={c.l}>
                        <Icon n={c.ic} s={16} />
                        <b>{c.n}</b>
                        <span>{c.l}{c.info && (
                          <button type="button" className="pw-i tap" aria-label={`About ${c.l}`} onClick={() => setShowInfo(c.info as any)}><Icon n="info-circle" s={14} c="var(--text3)" /></button>
                        )}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pw-status">
                    {/* The Verify button lives on Settings > Verification; link straight to it */}
                    <StatRow label="Human verified" val={isHumanVerified ? 'Yes' : (
                      <Link to="/settings/verification" className="pw-pill tap">Verify</Link>
                    )} valClass={isHumanVerified ? 'yes' : ''} info onInfoClick={() => setShowInfo('humanVerified')} />
                    <StatRow label="Identity (KYC)" val={isKycVerified ? 'Verified' : (
                      <Link to="/settings/verification" className="pw-pill tap">Verify</Link>
                    )} valClass={isKycVerified ? 'yes' : ''} />
                    <StatRow label="Rating" val={profileData?.workerProfile?.totalRatings ? `${Number(profileData.workerProfile.avgRating || 0).toFixed(1)}/5 (${profileData.workerProfile.totalRatings})` : 'No ratings yet'} info onInfoClick={() => setShowInfo('avgRating')} />
                    <StatRow label="Skills" val={profileData?.workerProfile?.skills?.length ? profileData.workerProfile.skills.slice(0,3).join(', ')+(profileData.workerProfile.skills.length>3?' +' + (profileData.workerProfile.skills.length - 3):'') : (
                      <Link to="/edit-profile" className="pw-pill tap">Add</Link>
                    )} />
                    <StatRow label="Categories" val={profileData?.workerProfile?.categories?.length ? profileData.workerProfile.categories.join(', ') : (
                      <Link to="/edit-profile" className="pw-pill tap">Add</Link>
                    )} />
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
                      <button type="button" className="ui-btn ui-btn-ghost pw-ref-x" onClick={() => window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent('Join me on OgaPay! '+refUrl), '_blank')}>
                        <XIcon size={14} /> Post on X
                      </button>
                    </div>
                  ) : (
                    <div style={{fontSize:13,color:'var(--text2)'}}>Your referral link shows here once your account has a referral code. <Link to="/referrals" style={{color:'var(--text)',fontWeight:600}}>Referrals</Link></div>
                  )}
                </div>
              </div>
            </div>

            <div className="pw-x"><ProfileConnectXCard connected={!!profileData?.twitterOAuthConnected} handle={profileData?.twitterOAuthHandle || profileData?.twitterUsername} profile={xProfileOf(profileData)} onChange={reloadMe} /></div>
            </div>
          </div>

          {/* Shortcuts (tablet and desktop; on phones the menu and the bottom bar have them) */}
          <div className="pw-full pw-quick"><ProfileQuickLinks username={user?.username} /></div>

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
                      background:'var(--card2)',textDecoration:'none',
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
                      background:'var(--card2)',cursor:installed && connecting !== p.id ? 'pointer' : 'default',
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



      {fundModal && (
        <FundWalletModal initialStep={fundModal} onClose={() => { setFundModal(null); refreshWallet(); setWdKey((k) => k + 1); }} onDone={() => { refreshWallet(); refreshUser(); }} />
      )}

      </div>
    </Layout>
    </div>
  );
}
