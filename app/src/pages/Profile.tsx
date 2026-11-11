import { useState, useEffect, useRef, Suspense, lazy, Component, type ReactNode } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from "../components/Layout";
import { apiRequest, API_BASE } from "../lib/api";
import { sharedGet, dropShared } from "../lib/shared";
import { useCurrency } from "../context/CurrencyContext";
import { useMoney } from "../lib/useMoney";
import { useAuth } from "../context/AuthContext";
import { useWalletBalance } from "../context/WalletBalanceContext";

import { injectSkeletonStyles, SkeletonTab } from '../components/SkeletonLoader'
import { useToast } from '../components/Toast'
import VirtualAccountCard from '../components/VirtualAccountCard'
import SavedBanksList from '../components/SavedBanksList'
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
import { resendOutcome } from '../lib/resendLink'
import { xProfileOf } from '../lib/xprofile'
import { jobsEarnedIn } from '../lib/earnings'
import { isPhone, openInWalletUrl, PHONE_WALLET_LINE, phoneWalletSignInLine, WALLET_APPS, type WalletAppId } from '../lib/walletApps'
import { isStaleBuildError, reloadForUpdate } from '../lib/staleBuild'
// The Solana code (about 68KB) loads only when the Withdraw sheet opens or a wallet
// is linked, not with the page (2026-11-07). The Withdraw sheet's code is fetched
// once the page is idle (and on a press of Withdraw), so the sheet opens at once.
// A failed download can be tried again; it reloads the page only when online, as
// offline looks the same as an old version after a deploy.
let fundModalLoad: Promise<typeof import('../components/FundWalletModal')> | null = null
const loadFundModal = () => (fundModalLoad ??= import('../components/FundWalletModal').catch((err) => { fundModalLoad = null; throw err }))
const makeFundModal = () => lazy(() => loadFundModal().catch((err) => {
  if (navigator.onLine && isStaleBuildError(err) && reloadForUpdate()) return new Promise<never>(() => {})
  throw err
}))
// When the Withdraw sheet's code can't download: closes it with a message instead
// of the whole-site error screen. Any other error goes on to the site's error screen
class SheetBoundary extends Component<{ onError: () => void; children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown }
  static getDerivedStateFromError(error: unknown) { return { error } }
  componentDidCatch(err: unknown) { if (isStaleBuildError(err)) this.props.onError() }
  render() {
    if (this.state.error && !isStaleBuildError(this.state.error)) throw this.state.error
    return this.state.error ? null : this.props.children
  }
}
const Icon = ({ n, s = 16, c }: { n: any; s?: number; c?: any }) => (
  <i className={`ti ti-${n}`} aria-hidden="true" style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
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

// Copy to the clipboard; false when the browser refuses (wallet in-app browsers
// often do), so "Copied!" only shows when it really worked (2026-11-07)
async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
const COPY_FAILED = "Couldn't copy - press and hold to copy";

// failMsg/onFail: for text that isn't shown in full (the short wallet address)
function CopyBtn({ text, failMsg, onFail }: { text: any; failMsg?: string; onFail?: () => void }) {
  const [ok, setOk] = useState(false);
  const { toast } = useToast();
  const copy = async () => {
    if (!(await copyText(String(text)))) { toast(failMsg || COPY_FAILED, 'error'); onFail?.(); return; }
    setOk(true); setTimeout(() => setOk(false), 1800);
  };
  return (
    <button onClick={copy} className="btn-outline btn-sm">
      <Icon n={ok ? "check" : "copy"} s={14} c={ok ? "var(--green)" : "var(--text2)"} />
      {ok ? "Copied!" : "Copy"}
    </button>
  );
}

// Icon-only copy button that sits inside the referral link box
function RefCopy({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const { toast } = useToast();
  const copy = async () => {
    if (!(await copyText(text))) { toast(COPY_FAILED, 'error'); return; }
    setOk(true); setTimeout(() => setOk(false), 1800);
  };
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
        // Named for screen readers, and "tap" gives it a bigger invisible tap area (2026-11-07)
        <button type="button" className="tap" aria-label={`About ${label}`} onClick={e => { e.stopPropagation(); onInfoClick?.() }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: 3 }}>
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
// Opens on a tap or click; only a real mouse opens it on hover. On Android the tap's
// fake hover opened it and the tap closed it again, so it needed two taps. Kept
// inside the screen, and a tap anywhere else closes it (2026-11-07)
function InfoBtn({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [left, setLeft] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const open = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      const w = Math.min(240, window.innerWidth - 32);
      setLeft(Math.min(Math.max(16, r.left + r.width / 2 - w / 2), window.innerWidth - 16 - w) - r.left);
    }
    setShow(true);
  };
  useEffect(() => {
    if (!show) return;
    const onDown = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setShow(false) };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [show]);
  return (
    <span ref={ref} className="tap" role="button" tabIndex={0} aria-label="More info" aria-expanded={show}
      style={{ position: "relative", display: "inline-flex", marginLeft: 4, verticalAlign: "middle" }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (show) setShow(false); else open() } }}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") open() }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setShow(false) }}
      onClick={(e) => { e.stopPropagation(); if (show) setShow(false); else open() }}>
      <i className="ti ti-info-circle" aria-hidden="true" style={{ fontSize: 14, color: "var(--text3)", cursor: "pointer" }} />
      {show && (
        <div role="tooltip" aria-live="polite" style={{
          position: "absolute", bottom: "calc(100% + 6px)", left,
          background: "var(--text)", color: "var(--card)",
          fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 8,
          whiteSpace: "normal", width: "min(240px, calc(100vw - 32px))", zIndex: 99, pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

// Highest OgaScore: every point in services/ogascore.service.js POINTS (MAX_SCORE), 2026-11-07
const OGA_SCORE_MAX = 66;

/* ─── Main Profile Component ─── */
// ── Inject skeleton styles on mount ──
export default function Profile() {
  useEffect(() => { injectSkeletonStyles(); }, []);
  const { fmt, preferredCurrency, convert } = useCurrency()
  const show = useMoney()
  const navigate = useNavigate();
  const { user: authUser, refreshUser } = useAuth();
  const { balances: walletBal, refresh: refreshWallet, loading: balLoading, error: balError } = useWalletBalance();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  // ?tab=portal (the retired Worker Portal tab) falls back to the profile
  const [tab, setTab] = useState(() => { const t = searchParams.get("tab") || "profile"; return t === "portal" ? "profile" : t });
  const [showBal, setShowBal] = useState(false);
  const [showFullAddr, setShowFullAddr] = useState(false);
  const [fundModal, setFundModal] = useState<null | 'deposit' | 'withdraw'>(null);
  // Made again after a failed download, as React keeps a failed lazy load failed
  const [FundWalletModal, setFundWalletModal] = useState(makeFundModal);
  const [verifSending, setVerifSending] = useState(false);
  const [verifMsg, setVerifMsg] = useState<React.ReactNode>('');
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [editingBank, setEditingBank] = useState(false);
  const [moneyIn, setMoneyIn] = useState(false);
  const [moneyOut, setMoneyOut] = useState(false);
  // Saved withdrawal banks (Wallet → Money out); null until known, so the banner never flashes.
  // banksAsked: the first answer came (or failed), so the banners can show (2026-11-07)
  const [bankCount, setBankCount] = useState<number | null>(null);
  const [banksAsked, setBanksAsked] = useState(false);
  const loadBankCount = () => {
    sharedGet<any[]>('/wallet/banks', 5000).then((d) => setBankCount(Array.isArray(d) ? d.length : 0)).catch(() => {}).finally(() => setBanksAsked(true));
  };
  useEffect(loadBankCount, []);
  // /wallet/summary per currency: withdrawals on their way and money earned from jobs.
  // undefined while it loads, null if it failed. Loaded again with each new balance
  // (once it has arrived, not while it loads) and only on the Profile tab, which
  // is the only one that uses it (2026-11-07)
  const [walletSum, setWalletSum] = useState<Record<string, any> | null | undefined>(undefined);
  const onProfileTab = tab === 'profile';
  useEffect(() => {
    if (balLoading || !onProfileTab) return;
    let live = true;
    apiRequest<any>('/wallet/summary')
      .then((d) => { if (live) setWalletSum(d && typeof d === 'object' ? d : null) })
      .catch(() => { if (live) setWalletSum((s) => s ?? null) });
    return () => { live = false };
  }, [walletBal, balLoading, onProfileTab]);
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
  // undefined while /kyc/status loads, null if it failed: the KYC banner and Identity
  // row wait for it, so verified members never see a false "not verified" (2026-11-07)
  const [kycStatus, setKycStatus] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);
  // /users/me failed and there's no profile to show: an error card with Try again,
  // not "User @user", zero counts and banners that may be false (2026-11-08)
  const [loadFailed, setLoadFailed] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [detectedWallets, setDetectedWallets] = useState<string[]>([]);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [generatingPair, setGeneratingPair] = useState(false);
  // Hides the pairing code after 5 minutes; cleared for a new code so the old timer
  // can't wipe it early, and when the page closes (2026-11-07)
  const pairTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(pairTimer.current), []);

  // ── Fetch all data on mount & when authUser changes (e.g. wallet connected on Dashboard) ──
  // Only /users/me holds the page back; referral stats and KYC fill in when they
  // arrive. A failed call keeps what was there before (2026-11-07)
  const loadProfile = async () => {
    apiRequest<any>('/users/referrals/stats').then((d) => { if (d) setReferralStats(d) }).catch(() => {});
    apiRequest<any>('/kyc/status').then((d) => setKycStatus((s: any) => d || (s ?? null))).catch(() => setKycStatus((s: any) => s ?? null));
    try {
      const userData = await apiRequest<any>('/users/me').catch(() => null);
      setLoadFailed(!userData);
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
    } catch (err) {
      toast('Failed to load profile data', 'error');
    }
  };
  const retryProfile = () => {
    setLoading(true);
    loadProfile().finally(() => setLoading(false));
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
    // Another account: nor the last one's profile, if this one fails to load (2026-11-08)
    if (loadedFor.current !== null && loadedFor.current !== id) setProfileData(null);
    loadedFor.current = id;
    // Another account: don't show the last one's KYC or referral tier meanwhile
    if (first) { setLoading(true); setKycStatus(undefined); setReferralStats(null); }
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

  // "Add Bank Account" banner: open Money out and scroll to it on every tap. It used
  // to go through editingBank, which never went back to false, so only the first tap worked (2026-11-07)
  const openMoneyOut = () => {
    setTab('profile');
    setMoneyOut(true);
    setTimeout(() => document.getElementById('bank-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

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
  const addPill = (label: string) => (
    <a href="/edit-profile" className="pw-pill" aria-label={label} onClick={e => { e.preventDefault(); navigate('/edit-profile') }}>Add</a>
  );

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
  // Locked money is job escrow and store orders plus bank withdrawals waiting to be
  // paid: show them apart, as the Wallet page does (2026-11-07). Without the summary
  // we can't tell them apart, so it just says "on hold".
  const onItsWay = walletSum ? Math.min(lockedNgn, Number(walletSum.NGN?.withdrawing) || 0) : 0;
  const onHold = Math.max(0, lockedNgn - onItsWay);
  const ghana = authUser?.country === 'GH';

  // Success rate from the counts /users/me returns (the saved successRate was never
  // updated before 2026-11-10, so it read 0%); "—" until something was approved or rejected (2026-11-07)
  const wp = profileData?.workerProfile;
  const decided = (Number(wp?.tasksCompleted) || 0) + (Number(wp?.tasksRejected) || 0);
  const successRate = decided ? Math.round((Number(wp?.tasksCompleted) || 0) / decided * 100) + '%' : '—';
  // Earned from jobs: each currency's lifetime job pay from /wallet/summary in naira,
  // the same figure as "From jobs" on the Earnings tab (vault payouts no longer in it,
  // 2026-11-08). workerProfile.totalEarned adds USDC straight onto naira (2026-11-07)
  const jobsEarned = jobsEarnedIn(walletSum, convert);

  // What the top bar's "Total" is made of: all the naira (available + held) plus the
  // other currencies in naira, so the gap with Available is explained (2026-11-08)
  const otherNgn = walletBal ? (['USDC', 'USDT', 'SOL'] as const).reduce((t, c) => {
    const v = Number(walletBal[c]?.balance) || 0;
    const n = v ? convert(v, c, 'NGN') : 0;
    return t + (Number.isFinite(n) ? n : 0);
  }, 0) : 0;
  const totalAll = (Number(walletBal?.NGN?.balance) || 0) + otherNgn;
  const [balSpin, setBalSpin] = useState(false);
  const reloadBalance = async () => {
    if (balSpin) return;
    setBalSpin(true);
    try { await refreshWallet(); } finally { setBalSpin(false); }
  };

  // Saved preferences. The server merges what's sent into what's saved, so only the
  // changed key goes (2026-11-07): sending them all sent jobPush: null (never chosen),
  // which the server turns down ("Choose Off, My categories or All jobs"), so no
  // switch here could be saved by anyone who hadn't picked a job-alert setting
  const autoConvert = !!profileData?.preferences?.autoConvert;
  const isPublic = profileData?.isPublic !== false;
  // One lock per switch (2026-11-07): a shared lock dropped a quick tap on the other switch
  const savingPref = useRef(new Set<string>());
  const savePref = async (patch: Record<string, any>) => {
    const key = Object.keys(patch)[0];
    if (savingPref.current.has(key)) return;
    savingPref.current.add(key);
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
    savingPref.current.delete(key);
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

  // Connects a wallet, or changes it: an account has one wallet, so a new one
  // replaces the old (which then can't sign in). Nothing is saved until the wallet
  // has signed: /wallet/verify checks the signature and only then saves the address.
  // The page used to save it first with POST /users/wallet, so a refused signature
  // still showed the wallet as connected while wallet sign-in didn't work (2026-11-08)
  async function connectWallet(id: string) {
    if (!detectedWallets.includes(id)) return;
    setConnecting(id);
    // Fetched before the wallet asks to sign, so the member doesn't wait for it after
    // signing, and an old-version reload can't throw away a signature (2026-11-07)
    const bs58Load = import('bs58').catch((err) => { if (navigator.onLine && isStaleBuildError(err)) reloadForUpdate(); throw err });
    bs58Load.catch(() => {});
    try {
      let wallet: any;
      if (id === "phantom") wallet = (window as any).phantom?.solana;
      else if (id === "backpack") wallet = (window as any).backpack?.solana || (window as any).backpack;
      else if (id === "solflare") wallet = (window as any).solflare;
      if (!wallet?.connect) { setConnecting(null); return; }

      let pubKey = wallet.publicKey?.toString();
      if (!pubKey) {
        const resp = await wallet.connect();
        pubKey = resp?.publicKey?.toString() || wallet.publicKey?.toString();
      }
      if (!pubKey) throw new Error("No public key");
      // Signing with the wallet already shown is allowed: many were typed in before
      // a signature was needed and can't sign in until they're signed once. The
      // server keeps it and replaces nothing (2026-11-08)

      // purpose 'link': the message names this account and ogapay.app (2026-11-08)
      const nonceRes = await apiRequest<{ nonce: string; message: string }>("/wallet/nonce", {
        method: "POST",
        body: JSON.stringify({ wallet: pubKey, purpose: 'link' }),
      });
      if (!nonceRes?.nonce) throw new Error("No nonce received");

      const encodedMessage = new TextEncoder().encode(nonceRes.message);
      const signedResult = await wallet.signMessage(encodedMessage);
      const signatureBytes = signedResult?.signature ?? signedResult;
      const bs58 = (await bs58Load).default;
      const signature = bs58.encode(signatureBytes);

      const res = await apiRequest<{ wallet?: string; replaced?: string | null }>("/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ wallet: pubKey, signature, provider: id }),
      });

      await refreshUser()
      await loadProfile()
      setShowWalletOptions(false)
      // From the server's answer: signing the same wallet again replaces nothing (2026-11-08)
      const changed = res && 'replaced' in res ? !!res.replaced : hasWallet && pubKey !== walletAddress
      toast(changed ? 'Wallet changed. Your old wallet can no longer sign in.' : hasWallet ? 'Wallet confirmed. You can sign in with it.' : 'Wallet connected!')
    } catch (e: any) {
      // A refused signature saves nothing, so the old wallet (if any) still works
      const msg = e?.message || String(e) || "Wallet verification failed";
      toast(/reject|denied|cancel/i.test(msg) ? 'Not signed, so nothing was changed.' : msg, 'error');
    }
    setConnecting(null);
  }

  const handleGeneratePairCode = async () => {
    setGeneratingPair(true)
    try {
      const data: any = await apiRequest('/devices/pair/generate', { method: 'POST' })
      if (data?.code) {
        setPairCode(data.code)
        clearTimeout(pairTimer.current)
        pairTimer.current = setTimeout(() => setPairCode(''), 5 * 60 * 1000)
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

  // Fetch the Withdraw sheet's code once the profile has loaded and the page is idle
  useEffect(() => {
    if (loading) return;
    const w = window as any;
    const run = () => { loadFundModal().catch(() => {}) };
    if (w.requestIdleCallback) { const h = w.requestIdleCallback(run, { timeout: 4000 }); return () => w.cancelIdleCallback(h) }
    const t = setTimeout(run, 2000);
    return () => clearTimeout(t);
  }, [loading]);

  // The banners show together once KYC and the saved banks are known, so the tab bar
  // moves down once, not two or three times as each answer arrives (2026-11-07)
  const bannersReady = kycStatus !== undefined && banksAsked && !!profileData;

  // Banners (2026-11-08): only one shows, in this order: identity check, bank,
  // email, then the crypto wallet, which only shows to members who chose USDC or
  // Both as their money display (naira members don't need one). A closed banner
  // stays closed for 30 days on this device, so it doesn't come back every visit.
  const bannerKey = (id: string) => `ogapay_banner_closed_${authUser?.id || ''}_${id}`;
  const readClosed = () => {
    const out: Record<string, boolean> = {};
    for (const id of ['kyc', 'bank', 'email', 'wallet']) {
      try {
        const at = Number(localStorage.getItem(bannerKey(id)) || 0);
        out[id] = at > 0 && Date.now() - at < 30 * 86400000;
      } catch { out[id] = false; }
    }
    return out;
  };
  const [closedBanners, setClosedBanners] = useState<Record<string, boolean>>(readClosed);
  useEffect(() => { setClosedBanners(readClosed()); }, [authUser?.id]);
  const dismissBanner = (id: string) => {
    setClosedBanners((c) => ({ ...c, [id]: true }));
    try { localStorage.setItem(bannerKey(id), String(Date.now())); } catch { /* private window: closed until the page reloads */ }
  };
  const banner = !bannersReady ? null : ([
    ['kyc', !!kycStatus && !isKycVerified],
    // Withdrawals use the saved banks; the old profile field (bankAccount) is no longer
    // filled in. Not for Ghana members, who withdraw to MoMo (2026-11-07)
    ['bank', !ghana && bankCount === 0 && !authUser?.bankAccount],
    ['email', !authUser?.isEmailVerified],
    ['wallet', !authUser?.walletAddress && (preferredCurrency === 'USDC' || preferredCurrency === 'BOTH')],
  ] as const).find(([id, on]) => on && !closedBanners[id])?.[0] ?? null;

  // One Layout while loading and after (2026-11-07): the top bar, bottom bar and tab bar
  // stay mounted, and only the profile body swaps from its skeleton
  return (
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

      {/* Onboarding banner: one at a time (2026-11-08) */}
      {banner === 'kyc' && (
        <div className="onboarding-banner">
          <i className="ti ti-shield-check" aria-hidden="true" style={{color:'var(--red)',fontSize:20}} />
          <span className="ob-msg">Complete identity verification to withdraw</span>
          <button className="ob-btn" onClick={() => navigate('/settings/verification')}>Verify Now</button>
          <button type="button" className="ob-close" aria-label="Close" onClick={() => dismissBanner('kyc')}><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
      )}
      {banner === 'bank' && (
        <div className="onboarding-banner">
          <i className="ti ti-building-bank" aria-hidden="true" style={{color:'#f59e0b',fontSize:20}} />
          <span className="ob-msg">Add a bank account to withdraw in Naira</span>
          <button className="ob-btn" onClick={openMoneyOut}>Add Bank Account</button>
          <button type="button" className="ob-close" aria-label="Close" onClick={() => dismissBanner('bank')}><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
      )}
      {banner === 'email' && (
        <div className="onboarding-banner">
          <i className="ti ti-mail" aria-hidden="true" style={{color:'#f59e0b',fontSize:20}} />
          <span className="ob-msg">{verifMsg || 'Verify your email address to receive account notifications'}</span>
          <button className="ob-btn" onClick={async () => {
            if (verifSending) return;
            setVerifSending(true);
            setVerifMsg('');
            // The server's own reason: already verified, one a minute, or couldn't send (ver-14)
            const r = await apiRequest('/auth/resend-verification', {
              method: 'POST',
              body: JSON.stringify({ email: authUser?.email }),
            }).then((d) => resendOutcome(d), (e) => resendOutcome(null, e));
            setVerifMsg(<> <i className={`ti ${r.tone === 'err' ? 'ti-circle-x' : 'ti-circle-check'}`} aria-hidden="true" style={{color: r.tone === 'err' ? 'var(--red)' : 'var(--green)'}} /> {r.text}</>);
            if (r.tone === 'ok') setTimeout(() => setVerifMsg(''), 8000);
            setVerifSending(false);
          }} disabled={verifSending}>
            {verifSending ? 'Sending...' : 'Resend Email'}
          </button>
          <button type="button" className="ob-close" aria-label="Close" onClick={() => dismissBanner('email')}><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
      )}
      {banner === 'wallet' && (
        <div className="onboarding-banner">
          <i className="ti ti-wallet" aria-hidden="true" style={{color:'var(--accent)',fontSize:20}} />
          <span className="ob-msg">Connect a Solana wallet to get paid in USDC and sign in with it</span>
          <button className="ob-btn" onClick={() => setShowWalletOptions(true)}>Connect Wallet</button>
          <button type="button" className="ob-close" aria-label="Close" onClick={() => dismissBanner('wallet')}><i className="ti ti-x" aria-hidden="true" /></button>
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
          <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: 22, color: 'var(--green)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--green)' }}>
              Email Verified! <i className="ti ti-sparkles" aria-hidden="true" style={{color:'var(--green)',marginLeft:6}} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              Your account is confirmed. Review your details below and complete your profile.
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              const p = new URLSearchParams(window.location.search)
              p.delete('verified')
              window.history.replaceState({}, '', `${window.location.pathname}${p.toString() ? '?' + p.toString() : ''}`)
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}
          >
            <i className="ti ti-x" aria-hidden="true" />
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
          <i className="ti ti-shield-check" aria-hidden="true" style={{ fontSize: 22, color: '#b45309', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#b45309' }}>
              KYC Submitted for Review
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              We'll notify you within 24 hours once your identity is verified. Your details are saved below.
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              const p = new URLSearchParams(window.location.search)
              p.delete('kyc')
              window.history.replaceState({}, '', `${window.location.pathname}${p.toString() ? '?' + p.toString() : ''}`)
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Tab Bar: icon + label pills on wider screens; an equal icon-over-label grid on phones */}
      <div className="tab-bar" ref={tabBarRef}>
        {(tabs || []).map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''} tab-${t.id}`} onClick={() => tabNav(t.id)}>
            <i className={`ti ti-${t.icon}`} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Profile (default). Laid out like wurk.fun's /profile: account on the
          left, profile on the right, then full-width quick links and histories */}
      {tab === "profile" && (loading ? (
        // Shaped like the two profile cards
        <div className="pw-grid">
          <div className="pw-col"><div className="profile-card"><div className="profile-card-body"><SkeletonTab title rows={4} /></div></div></div>
          <div className="pw-col"><div className="profile-card"><div className="profile-card-body"><SkeletonTab title rows={6} /></div></div></div>
        </div>
      ) : !profileData && loadFailed ? (
        // The profile couldn't load: say so, with Try again (2026-11-08)
        <div className="profile-card" role="alert">
          <div className="profile-card-body" style={{textAlign:'center',padding:'32px 20px'}}>
            <Icon n="cloud-off" s={28} c="var(--text3)" />
            <div style={{fontSize:15,fontWeight:800,color:'var(--text)',margin:'10px 0 4px'}}>Couldn't load your profile</div>
            <div style={{fontSize:13,color:'var(--text2)',margin:'0 0 16px'}}>Check your connection and try again.</div>
            <button type="button" className="dash-btn" onClick={retryProfile}><Icon n="refresh" s={16} c="var(--bg)" /> Try again</button>
          </div>
        </div>
      ) : (
        <div className="page-fade-in">
          <div className="pw-grid">
            <div className="pw-col pw-left">
            {/* Account Information */}
            <div className="profile-card pw-account">
              <div className="profile-card-head">
                <span><Icon n="wallet" s={16} /> Account Information</span>
                {/* Refresh: to check whether a bank transfer has arrived (2026-11-08) */}
                <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                  <button type="button" className="pw-refresh tap" aria-label="Refresh balance" title="Refresh balance" onClick={reloadBalance} disabled={balSpin}>
                    <i className={`ti ti-refresh${balSpin ? ' pw-spin' : ''}`} aria-hidden="true" />
                  </button>
                  <a href="/wallet" className="pw-head-link" onClick={e => { e.preventDefault(); navigate('/wallet') }}>Wallet</a>
                </span>
              </div>
              <div className="profile-card-body">
                {/* Wallet address row */}
                <div className="pw-line">
                  <span className="pw-line-l">Wallet address</span>
                  {hasWallet ? (
                    <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                      <span className="pw-addr">{shortAddr}</span>
                      <CopyBtn text={walletAddress} failMsg="Couldn't copy - press and hold the full address below to copy it" onFail={() => setShowFullAddr(true)} />
                    </div>
                  ) : (
                    <span style={{color:'var(--text3)',fontSize:12}}>Not connected</span>
                  )}
                </div>
                {/* Only the short form shows above, so a failed copy shows the full address to copy by hand (2026-11-07) */}
                {hasWallet && showFullAddr && (
                  <div style={{fontFamily:'monospace',fontSize:12,color:'var(--text)',wordBreak:'break-all',userSelect:'all',WebkitUserSelect:'all',padding:'8px 10px',margin:'6px 0',background:'var(--bg2)',borderRadius:8}}>{walletAddress}</div>
                )}

                {/* Naira balance: always visible */}
                <div className="pw-bal">
                  <div>
                    <div className="pw-bal-k">Available</div>
                    {/* "—" until the balance loads, with Try again if it failed, never a false ₦0 (2026-11-07) */}
                    <div className="pw-bal-v">{walletBal ? show(totalNgn) : '—'}</div>
                  </div>
                  {!walletBal && balError && !balLoading && (
                    <button className="pw-pill" onClick={() => refreshWallet()}>Try again</button>
                  )}
                  {/* Nothing until the summary answers, so the words don't change a moment later;
                      "on hold" only if it failed. marginLeft keeps it on the right when it wraps
                      under the balance on phones (2026-11-07) */}
                  {lockedNgn > 0 && walletSum !== undefined && (
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2,marginLeft:'auto'}}>
                      {walletSum ? (
                        <>
                          {onHold > 0 && <span style={{fontSize:12,color:'var(--text2)'}}>{show(onHold)} held for jobs and orders</span>}
                          {onItsWay > 0 && <span style={{fontSize:12,color:'var(--text2)'}}>{show(onItsWay)} on its way to {ghana ? 'your MoMo or bank' : 'your bank'}</span>}
                        </>
                      ) : (
                        <span style={{fontSize:12,color:'var(--text2)'}}>{show(lockedNgn)} on hold</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Why the top bar's Total can be more than Available (2026-11-08) */}
                {walletBal && (lockedNgn > 0 || otherNgn >= 1) && (
                  <div className="pw-bal-note">
                    Total {show(totalAll)} = {show(totalNgn)} available{lockedNgn > 0 ? ` + ${show(lockedNgn)} held` : ''}{otherNgn >= 1 ? ` + ${show(otherNgn)} in USDC, USDT and SOL` : ''}
                  </div>
                )}

                {/* Main actions: equal buttons in one row */}
                <div className="pw-acts">
                  <button className="dash-btn" onPointerDown={() => { loadFundModal().catch(() => {}) }} onClick={() => setFundModal('withdraw')}><Icon n="arrow-up-right" s={14} c="var(--bg)" /> Withdraw</button>
                  <button className="dash-btn" onClick={() => navigate('/deposit')}><Icon n="plus" s={14} c="var(--bg)" /> Deposit</button>
                </div>

                {/* Secondary wallet actions: two outlined buttons */}
                <div className={`pw-acts2 ${hasWallet ? '' : 'one'}`}>
                  {hasWallet ? (
                    <>
                      <button className="btn-outline" onClick={handleGeneratePairCode} disabled={generatingPair}>
                        <Icon n="device-mobile" s={14} /> {generatingPair ? 'Generating…' : 'Pair Device'}
                      </button>
                      {/* One wallet per account: a new one replaces it (2026-11-08) */}
                      <button className="btn-outline" onClick={() => setShowWalletOptions(true)}>
                        <Icon n="arrows-exchange" s={14} /> Change wallet
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
                    <button type="button" onClick={async () => { if (await copyText(pairCode)) toast('Code copied!'); else toast(COPY_FAILED, 'error') }} style={{marginTop:6,fontSize:11,color:'var(--text2)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',fontFamily:'inherit'}}>Copy code</button>
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
                      <span className="wl-dir in pw-fold-ic"><i className="ti ti-arrow-down-left" aria-hidden="true" /></span>
                      <span className="pw-fold-m"><b>Money in</b><small>Your OgaPay account number for transfers</small></span>
                      <i className="ti ti-chevron-down pw-fold-chev" aria-hidden="true" />
                    </summary>
                    <div className="pw-fold-b"><VirtualAccountCard flush /></div>
                  </details>
                  <details className="pw-fold" open={moneyOut} onToggle={e => setMoneyOut((e.currentTarget as HTMLDetailsElement).open)}>
                    <summary>
                      <span className="wl-dir out pw-fold-ic"><i className="ti ti-arrow-up-right" aria-hidden="true" /></span>
                      <span className="pw-fold-m"><b>Money out</b><small>{bankCount ? `Withdrawals go to ${bankCount} saved bank${bankCount === 1 ? '' : 's'}` : 'Add the bank withdrawals go to'}</small></span>
                      <i className="ti ti-chevron-down pw-fold-chev" aria-hidden="true" />
                    </summary>
                    <div className="pw-fold-b">
                      <section className="ui-card wl-sec wl-dir-card" aria-labelledby="pf-out">
                        <h2 id="pf-out" className="wl-dir-title">Withdrawals go to</h2>
                        <SavedBanksList key={wdKey} bare onCount={setBankCount} />
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
                <span><Icon n="user" s={16} /> Profile</span>
                {/* One edit form for everyone: the Edit profile page, like Settings (2026-11-07) */}
                <button className="btn-outline btn-sm" onClick={() => navigate('/edit-profile')}>
                  <Icon n="edit" s={14} /> Edit
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
                    {(profileData?.workerProfile?.bio || profileData?.bio) ? (
                      <div className="pw-bio">{profileData.workerProfile?.bio || profileData.bio}</div>
                    ) : (
                      // An empty bio says how to add one (2026-11-08)
                      <a href="/edit-profile" className="pw-bio pw-empty" onClick={e => { e.preventDefault(); navigate('/edit-profile') }}>No bio yet. Add one</a>
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
                      { ic: 'trending-up', n: successRate, l: 'Success rate', info: 'successRate' },
                      { ic: 'coin', n: jobsEarned === null ? '—' : show(jobsEarned), l: 'Earned from jobs' },
                    ].map(c => (
                      <div className="pw-count" key={c.l}>
                        <Icon n={c.ic} s={16} />
                        <b>{c.n}</b>
                        <span>{c.l}{c.info && (
                          <button type="button" className="pw-i tap" aria-label={`About ${c.l}`} onClick={() => setShowInfo(c.info as any)}><Icon n="info-circle" s={14} c="var(--text3)" /></button>
                        )}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pw-status">
                    <StatRow label="Rank" val={(l => l.charAt(0) + l.slice(1).toLowerCase())(String(profileData?.workerProfile?.level || 'BEGINNER'))} info onInfoClick={() => setShowInfo('rank')} />
                    {/* The same OgaScore the Dashboard, public profiles and job requirements use
                        (services/ogascore.service.js), not the old reputationScore formula */}
                    <StatRow label="OgaScore" val={`${profileData?.ogaScore ?? 0} / ${OGA_SCORE_MAX}`} info onInfoClick={() => setShowInfo('ogaScore')} />
                    {/* The Verify button lives on Settings > Verification; link straight to it */}
                    <StatRow label="Human verified" val={isHumanVerified ? 'Yes' : (
                      <a href="/settings/verification" className="pw-pill" onClick={e => { e.preventDefault(); navigate('/settings/verification') }}>Verify</a>
                    )} valClass={isHumanVerified ? 'yes' : ''} info onInfoClick={() => setShowInfo('humanVerified')} />
                    <StatRow label="Identity (KYC)" val={kycStatus === undefined ? '…' : isKycVerified ? 'Verified' : kycStatus === null ? '—' : (
                      <a href="/settings/verification" className="pw-pill" onClick={e => { e.preventDefault(); navigate('/settings/verification') }}>Verify</a>
                    )} valClass={isKycVerified ? 'yes' : ''} />
                    <StatRow label="Rating" val={profileData?.workerProfile?.totalRatings ? `${Number(profileData.workerProfile.avgRating || 0).toFixed(1)}/5 (${profileData.workerProfile.totalRatings})` : 'No ratings yet'} info onInfoClick={() => setShowInfo('avgRating')} />
                    {/* Empty: an "Add" pill to the Edit profile page (2026-11-08) */}
                    <StatRow label="Skills" val={profileData?.workerProfile?.skills?.length ? profileData.workerProfile.skills.slice(0,3).join(', ')+(profileData.workerProfile.skills.length>3?' +' + (profileData.workerProfile.skills.length - 3):'') : addPill('Add skills')} />
                    <StatRow label="Categories" val={profileData?.workerProfile?.categories?.length ? profileData.workerProfile.categories.map((c: string) => categoryLabel(c)).join(', ') : addPill('Add categories')} />
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
                          <i className={tc.icon} aria-hidden="true" /> {tc.label} Referrer<InfoBtn text="Your referral tier is based on how many of your referred users have completed their first task. Bronze: 5+ paid referrals, Silver: 10+, Gold: 20 (max)." />
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
          <div className="pw-full"><ProfileWithdrawalsCard key={wdKey} onWithdraw={() => { loadFundModal().catch(() => {}); setFundModal('withdraw') }} /></div>

        </div>
      ))}

{showWalletOptions && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}
          onClick={() => setShowWalletOptions(false)}>
          <div onClick={e => e.stopPropagation()} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:24,maxWidth:380,width:'90%'}}>
            <h3 style={{margin:'0 0 4px',fontSize:16,fontWeight:800}}>{hasWallet ? 'Change wallet' : 'Connect a Solana Wallet'}</h3>
            <p style={{color:'var(--text2)',fontSize:13,margin:'0 0 16px',lineHeight:1.5}}>
              {hasWallet ? 'Pick the new wallet.' : 'Select a wallet provider to connect.'} You'll be asked to sign a message to prove it's yours. Nothing is saved until you sign.
            </p>
            {/* An account has one wallet: say so before it is replaced (2026-11-08) */}
            {hasWallet && (
              <div role="note" style={{display:'flex',gap:8,alignItems:'flex-start',padding:'10px 12px',margin:'-4px 0 14px',borderRadius:10,background:'color-mix(in srgb, #f59e0b 12%, transparent)',color:'var(--text)',fontSize:13,lineHeight:1.5}}>
                <Icon n="alert-triangle" s={16} c="#b45309" />
                <span>Your current wallet ({shortAddr}) will be replaced and can no longer be used to sign in.</span>
              </div>
            )}
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
                      <Icon n={p.icon} s={20} />
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
            <button type="button" aria-label="Close" onClick={() => setShowInfo(null)} style={{position:'absolute',top:16,right:16,background:'none',border:'none',fontSize:24,cursor:'pointer',color:'var(--text2)'}}><i className="ti ti-x" aria-hidden="true" /></button>

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

            {/* Laid out like the other info pop-ups: the wjd-info-* styles only exist on the job page (2026-11-07) */}
            {showInfo === 'successRate' && (
              <>
                <h2 style={{fontSize:18,fontWeight:900,marginBottom:16}}>What is Success rate?</h2>
                <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
                  Your success rate is the percentage of your submitted tasks that were approved: approved / (approved + rejected) × 100. It shows how often your work gets approved. It doesn't change your OgaScore or your rank.
                </p>
              </>
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
        // A bank added in the Withdraw sheet shows in Money out (the list loads again with
        // wdKey) and the "Add Bank Account" banner goes away (2026-11-07)
        // A tap on the loading cover closes it; if the code can't download, the sheet
        // closes with a message and the next tap tries again (2026-11-07)
        <SheetBoundary onError={() => { setFundModal(null); setFundWalletModal(() => makeFundModal()); toast("Couldn't open. Check your connection and try again", 'error'); }}>
        <Suspense fallback={<div onClick={() => setFundModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'grid',placeItems:'center',zIndex:1000}}><span className="spinner" aria-label="Loading" /></div>}>
          <FundWalletModal initialStep={fundModal} onClose={() => { setFundModal(null); refreshWallet(); dropShared('/wallet/banks'); loadBankCount(); setWdKey((k) => k + 1); }} onDone={() => { refreshWallet(); refreshUser(); }} />
        </Suspense>
        </SheetBoundary>
      )}

      </div>
    </Layout>
  );
}
