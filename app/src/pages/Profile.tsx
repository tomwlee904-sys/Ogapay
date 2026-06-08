import { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom'
import Layout from "../components/Layout";
import { apiRequest } from "../lib/api";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { uploadImage } from '../lib/upload'

/* ─── Icons ─── */
const Icon = ({ n, s = 16, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
);

const XIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--text)">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.739l7.727-8.833L1.255 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

/* ─── Static data ─── */
const CHART_7 = ["Thu","Fri","Sat","Sun","Mon","Tue","Wed"].map(d => ({ day: d, val: 0 }));
const CHART_30 = Array.from({ length: 30 }, (_, i) => ({ day: `D${i+1}`, val: 0 }));
const DONUT_CATS = [
  { name: "Jobs", color: "#22c55e" },
  { name: "Referrals", color: "#a855f7" },
  { name: "Tips", color: "#191C6B" },
  { name: "Vault", color: "#f59e0b" },
];
const QUICK = [
  { icon: "activity", label: "Job Monitor", page: "monitor" },
  { icon: "safe", label: "Vault", page: "vault" },
  { icon: "file-text", label: "Blogs", page: "blog" },
  { icon: "briefcase", label: "Available Jobs", page: "tasks" },
  { icon: "bookmark", label: "Bookmarks", page: "bookmarks" },
  { icon: "circle-plus", label: "Create Job", page: "create" },
  { icon: "briefcase", label: "Manage Jobs", page: "manage" },
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

/* ─── Toast helper ─── */
function showToast(msg: string) {
  const el = document.getElementById('appToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

/* ─── Sub Pages (tabs) ─── */
function MyJobsTab() {
  const [form, setForm] = useState({ type: "active", search: "" });
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
                        const data = await apiRequest('/tasks/my/submissions').catch(() => null);
                        if (data) {
                          const list = Array.isArray(data) ? data : data?.data || data?.tasks || [];
                          setJobs(list);
                        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = jobs.filter(j => {
    if (form.type === 'active') return j.status === 'APPLIED' || j.status === 'PENDING';
    if (form.type === 'pending') return j.status === 'PENDING';
    if (form.type === 'completed') return j.status === 'APPROVED' || j.status === 'REJECTED';
    return true;
  }).filter(j => {
    if (!form.search) return true;
    const q = form.search.toLowerCase();
    return (j.task?.title || '').toLowerCase().includes(q);
  });

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
      {loading ? (
        <div className="loading"><span className="spinner" /> Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card card-sm" style={{textAlign:'center',padding:'48px 20px',color:'var(--text3)',fontSize:13}}>
          <Icon n="briefcase-off" s={32} c="var(--text3)" />
          <div style={{marginTop:12}}>No jobs found</div>
        </div>
      ) : (
        <div style={{ display:"grid", gap:12 }}>
          {filtered.map((j,i) => {
            const task = j.task || {};
            const reward = Number(task.reward || 0);
            const currency = task.currency || 'NGN';
            const pct = task.maxWorkers ? Math.round(((task.currentWorkers || 0) / task.maxWorkers) * 100) : 0;
            return (
              <div className="card card-sm" key={j.id || i}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{task.title || 'Untitled Task'}</div>
                    <div style={{ fontSize:11, color:"var(--text2)", fontWeight:600 }}>{(j.status || '').replace(/_/g, ' ')}</div>
                    {task.description && <div style={{ fontSize:12, color:"var(--text2)", marginTop:6 }}>{task.description}</div>}
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div className="text-green" style={{ fontFamily:"Outfit,sans-serif", fontSize:18, fontWeight:800 }}>
                      {currency} {Number(reward).toLocaleString()}
                    </div>
                    {task.maxWorkers && <div style={{ fontSize:11, color:"var(--text3)" }}>{task.currentWorkers || 0}/{task.maxWorkers} slots</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReferralsTab({ initialStats }: { initialStats?: any }) {
  const [stats, setStats] = useState<any>(initialStats ?? null);
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    if (initialStats) return;
    (async () => {
      try {
        const data = await apiRequest('/users/referrals/stats').catch(() => null);
        if (data) setStats(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="sub-page">
      <div className="page-head-sm"><Icon n="users" s={20} /><h2>Referrals</h2></div>
      {loading ? (
        <div className="loading"><span className="spinner" /> Loading...</div>
      ) : stats ? (
        <div className="card card-sm">
          <div className="card-body">
            <StatRow label="Total Referrals" val={stats.totalReferrals ?? stats.total ?? 0} />
            <StatRow label="Active Referrals" val={stats.activeReferrals ?? stats.active ?? 0} />
            <StatRow label="Referral Earnings" val={`NGN ${Number(stats.totalEarnings || stats.earnings || 0).toLocaleString()}`} />
            <StatRow label="Referral Code" val={stats.referralCode || '—'} />
          </div>
        </div>
      ) : (
        <div className="card card-sm" style={{textAlign:'center',padding:'48px 20px',color:'var(--text3)',fontSize:13}}>
          <Icon n="users-off" s={32} c="var(--text3)" />
          <div style={{marginTop:12}}>No referral data yet</div>
        </div>
      )}
    </div>
  );
}

function AlertsTab() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest('/notifications').catch(() => null);
        if (Array.isArray(data)) setNotifications(data);
        else if (data?.data && Array.isArray(data.data)) setNotifications(data.data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="sub-page">
      <div className="page-head-sm"><Icon n="bell" s={20} /><h2>Alerts</h2></div>
      {loading ? (
        <div className="loading"><span className="spinner" /> Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="card card-sm" style={{textAlign:'center',padding:'48px 20px',color:'var(--text3)',fontSize:13}}>
          <Icon n="bell-off" s={32} c="var(--text3)" />
          <div style={{marginTop:12}}>No notifications yet</div>
        </div>
      ) : (
        <div style={{display:'grid',gap:8}}>
          {notifications.map((n,i) => (
            <div className="card card-sm" key={n.id || i} style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
              <Icon n={n.icon || 'bell'} s={18} c="var(--accent)" />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13}}>{n.title || n.message}</div>
                {n.description && <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{n.description}</div>}
              </div>
              <div style={{fontSize:10,color:'var(--text3)',whiteSpace:'nowrap'}}>{formatTimeAgo(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Profile Component ─── */
export default function Profile() {
  const { fmt, preferredCurrency } = useCurrency()
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [tab, setTab] = useState("profile");
  const [showBal, setShowBal] = useState(false);
  const [swBal, setSwBal] = useState(false);
  const [earnPeriod, setEarnPeriod] = useState("7d");
  const [subPage, setSubPage] = useState(null);
  const [accountNumber, setAccountNumber] = useState(() => localStorage.getItem('ogapay_bank_account') || "");
  const [bankName, setBankName] = useState(() => localStorage.getItem('ogapay_bank_name') || "");
  const [accountName, setAccountName] = useState(() => localStorage.getItem('ogapay_account_name') || "");
  const [editingBank, setEditingBank] = useState(!localStorage.getItem('ogapay_bank_account'));
  const [savingBank, setSavingBank] = useState(false);
  const [bankMsg, setBankMsg] = useState("");
  const [showKyc, setShowKyc] = useState(false);
  const [bvnNumber, setBvnNumber] = useState("");
  const [kycStep, setKycStep] = useState("idle");
  const [kycMsg, setKycMsg] = useState("");
  const [kycLoading, setKycLoading] = useState(false);
  const [kycDocument, setKycDocument] = useState<File | null>(null);
  const [kycDocumentPreview, setKycDocumentPreview] = useState("");
  const [kycUploading, setKycUploading] = useState(false);

  // ── Edit Profile Modal State ──
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', username: '', bio: '', avatarUrl: '' });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── API Data state ──
  const [profileData, setProfileData] = useState<any>(null);
  const [walletBal, setWalletBal] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch all data on mount ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [userData, balData, txData, refData, kycData] = await Promise.all([
          apiRequest('/users/me').catch(() => null),
          apiRequest('/wallet/balance').catch(() => null),
          apiRequest('/users/transactions/history').catch(() => null),
          apiRequest('/users/referrals/stats').catch(() => null),
          apiRequest('/kyc/status').catch(() => null),
        ]);
        if (userData) {
          setProfileData(userData);
          // Load bank details from backend if available
          if (userData.bankAccount) setAccountNumber(userData.bankAccount);
          if (userData.bankName) setBankName(userData.bankName);
          if (userData.accountName) setAccountName(userData.accountName);
        }
        if (balData) setWalletBal(balData);
        if (txData) setTransactions(Array.isArray(txData) ? txData : txData?.data || []);
        if (refData) setReferralStats(refData);
        if (kycData) setKycStatus(kycData);
      } catch (err) {
        showToast('Failed to load profile data');
      }
      setLoading(false);
    })();
  }, []);

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

  // Computed wallet info
  const wallets = user?.wallets || [];
  const cryptoWallet = wallets.find((w: any) => w.currency !== 'NGN');
  const walletAddress = cryptoWallet?.walletAddress || '';
  const shortAddr = walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : '';
  const hasWallet = !!walletAddress;

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
  const swaps: any[] = [];  // No swap endpoint yet

  // Referral link
  const refCode = user?.referralCode || referralStats?.referralCode || '';
  const refUrl = refCode ? `https://ogapay.vercel.app/ref/${refCode}` : '';

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
      localStorage.setItem('ogapay_bank_account', accountNumber);
      localStorage.setItem('ogapay_bank_name', bankName);
      localStorage.setItem('ogapay_account_name', accountName);
      setEditingBank(false);
      setSavingBank(false);
      showToast('Bank account saved');
    } catch (err) {
      setBankMsg('Failed to save bank details. Please try again.');
      setSavingBank(false);
    }
  };

  // Chart data
  const chartData = earnPeriod === '7d' ? CHART_7 : CHART_30;

  const tabs = [
    { id: "profile", label: "Profile", icon: "user" },
    { id: "earnings", label: "Earnings", icon: "currency-dollar" },
    { id: "jobs", label: "My Jobs", icon: "briefcase" },
    { id: "referrals", label: "Referrals", icon: "users" },
    { id: "alerts", label: "Alerts", icon: "bell" },
    { id: "portal", label: "Worker Portal", icon: "layout-dashboard" },
  ];

  // Navigate for subpages
  if (subPage === "blog") { navigate('/blog'); return null; }
  if (subPage === "monitor") { navigate('/tasks'); return null; }
  if (subPage === "vault") { navigate('/vault'); return null; }
  if (subPage === "create") { navigate('/create'); return null; }
  if (subPage === "bookmarks") { navigate('/bookmarks'); return null; }
  if (subPage === "portal") { setTab("portal"); setSubPage(null); }

  // Render tab content
  if (tab === "jobs") { navigate('/manage-jobs'); return null; }
  if (tab === "referrals") return <Layout><div className="pg"><ReferralsTab initialStats={referralStats} /></div></Layout>;
  if (tab === "alerts") return <Layout><div className="pg"><AlertsTab /></div></Layout>;
  if (tab === "portal") { navigate('/worker-portal'); return null; }

  return (
    <Layout>
      <style>{`
        .pg{width:100%;max-width:100%;margin:0 auto;padding:0 16px 60px}
        .page{max-width:100%!important;width:100%}
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
        .text-red{color:#ef4444!important}
        .text-green{color:#16a34a!important}
        .quick-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:24px}
        @media(max-width:700px){.quick-grid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:480px){.quick-grid{grid-template-columns:repeat(2,1fr)}}
        .quick-tile{border:1.5px solid var(--border);border-radius:12px;padding:16px 10px;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12px;font-weight:700;color:var(--text2);background:var(--card);cursor:pointer;transition:border-color .13s,color .13s;text-decoration:none}
        .quick-tile:hover{border-color:var(--border2);color:var(--text)}
        .quick-tile i{font-size:22px}
        .earn-card{background:var(--card);border:1px solid var(--border);border-radius:14px;margin-bottom:24px;overflow:hidden}
        .earn-top{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:18px 20px;border-bottom:1px solid var(--border)}
        @media(max-width:600px){.earn-top{grid-template-columns:1fr}}
        .earn-chart{padding:16px 20px 20px}
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
        .tg-btn:has(.on){background:rgba(31,140,255,.2)}
        .btn-outline{height:34px;padding:0 14px;border-radius:99px;border:1.5px solid var(--border);background:transparent;color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .13s;font-family:inherit}
        .btn-outline:hover{border-color:var(--text);color:var(--text)}
        .btn-sm{height:30px;padding:0 12px;font-size:11px}
        .dash-btn{height:40px;padding:0 18px;border-radius:99px;border:none;background:var(--text);color:var(--bg);font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:opacity .13s;font-family:inherit}
        .dash-btn:hover{opacity:.85}
        .dash-input{width:100%;height:42px;padding:0 14px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:14px;outline:none;transition:border-color .13s;font-family:inherit}
        .dash-input:focus{border-color:var(--accent)}
        .sub-page{max-width:860px}
        .sub-page .card-body .stat-row:first-child{padding-top:0}
        .sub-page .card-body .stat-row:last-child{border-bottom:none}
        .form-row-group{display:flex;gap:8px;flex-wrap:wrap}
        .skeleton{background:var(--bg2);border-radius:8px;animation:pulse 1.5s ease-in-out infinite;min-height:16px}
        @keyframes pulse{0%{opacity:.6}50%{opacity:.3}100%{opacity:.6}}
        .onboarding-banner{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(31,140,255,.08);border:1px solid rgba(31,140,255,.15);border-radius:12px;margin-bottom:12px;font-size:13px}
        .onboarding-banner .ob-msg{flex:1;color:var(--text)}
        .onboarding-banner .ob-btn{height:32px;padding:0 14px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit}
        .onboarding-banner .ob-close{width:28px;height:28px;border:none;background:none;color:var(--text3);cursor:pointer;display:grid;place-items:center;font-size:16px;flex-shrink:0}
      `}</style>

      {/* Onboarding banners */}
      {!loading && !hasWallet && (
        <div className="onboarding-banner">
          <i className="ti ti-wallet" style={{color:'var(--accent)',fontSize:20}} />
          <span className="ob-msg">Connect your wallet to unlock full features</span>
          <button className="ob-btn" onClick={() => navigate('/wallet')}>Connect Wallet</button>
          <button className="ob-close" onClick={e => (e.currentTarget.closest('.onboarding-banner')!.style.display='none')}><i className="ti ti-x" /></button>
        </div>
      )}
      {!loading && !accountNumber && (
        <div className="onboarding-banner">
          <i className="ti ti-building-bank" style={{color:'#f59e0b',fontSize:20}} />
          <span className="ob-msg">Add a bank account to withdraw in Naira</span>
          <button className="ob-btn" onClick={() => setEditingBank(true)}>Add Bank Account</button>
          <button className="ob-close" onClick={e => (e.currentTarget.closest('.onboarding-banner')!.style.display='none')}><i className="ti ti-x" /></button>
        </div>
      )}
      {!loading && !isKycVerified && (
        <div className="onboarding-banner">
          <i className="ti ti-shield-check" style={{color:'#DC2626',fontSize:20}} />
          <span className="ob-msg">Complete identity verification to withdraw</span>
          <button className="ob-btn" onClick={() => setShowKyc(true)}>Verify Now</button>
          <button className="ob-close" onClick={e => (e.currentTarget.closest('.onboarding-banner')!.style.display='none')}><i className="ti ti-x" /></button>
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => t.id === 'portal' ? navigate('/worker-portal') : setTab(t.id)}>
            <i className={`ti ti-${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Earnings */}
      {tab === "earnings" && (
        <div>
          <div className="earn-card">
            <div className="earn-top">
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text3)',marginBottom:4}}>TOTAL EARNED</div>
                <div style={{fontFamily:'Outfit',fontSize:32,fontWeight:900,color:'var(--text)'}}>
                  {loading ? <span className="skeleton" style={{width:120,display:'inline-block'}} /> : fmt(earningsTotal, "NGN")}
                </div>
                <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>
                  ≈ ${Number(usdcBal || 0).toFixed(2)} USDC
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="form-row-group" style={{justifyContent:'flex-end',marginBottom:12}}>
                  {['7d','30d'].map(p => (
                    <button key={p} className={`pill-btn ${earnPeriod===p?'active':''}`} onClick={() => setEarnPeriod(p)}>{p}</button>
                  ))}
                </div>
                <div style={{display:'flex',gap:16,justifyContent:'flex-end',flexWrap:'wrap'}}>
                  {DONUT_CATS.map(c => (
                    <div key={c.name} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text2)'}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:c.color,display:'inline-block'}} />
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="earn-chart">
              <div style={{height:180,width:'100%'}}>
                {loading ? (
                  <div className="loading"><span className="spinner" /></div>
                ) : earningsTotal === 0 ? (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text3)',fontSize:13,gap:8}}>
                    <i className="ti ti-chart-bar-off" /> No earnings data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{fontSize:11,fill:'var(--text3)'}} axisLine={{stroke:'var(--border)'}} tickLine={false} />
                      <YAxis tick={{fontSize:11,fill:'var(--text3)'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} />
                      <Line type="monotone" dataKey="val" stroke="#191C6B" strokeWidth={2} dot={{fill:'#191C6B',r:3}} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Profile (default) */}
      {tab === "profile" && (
        <>
          {/* 2-column grid */}
          <div className="prof-grid">
            {/* LEFT: Account Information */}
            <div className="card">
              <div className="card-head">
                <span><Icon n="wallet" s={15} /> Account Information</span>
                {loading ? <span className="skeleton" style={{width:60,height:14}} /> : null}
              </div>
              <div className="card-body">
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
                          {Number(totalNgn).toLocaleString()} <span style={{color:'#191C6B'}}>$OGA</span>
                        </>}
                      </span>
                      {!loading && <span style={{fontSize:12,color:'var(--text2)'}}>≈ {fmt(ngnBal, "NGN")}</span>}
                    </div>

                    {/* Quick actions */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,margin:'14px 0'}}>
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center'}}><Icon n="logout" s={14} c="var(--bg)" /> Withdraw</button>
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center'}}><Icon n="plus" s={14} c="var(--bg)" /> Deposit</button>
                    </div>

                    {hasWallet && (
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center',marginBottom:10,background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}}>
                        <Icon n="transfer" s={14} /> Swap
                      </button>
                    )}

                    {!hasWallet && (
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center',marginBottom:10,background:'var(--accent)'}}>
                        <Icon n="wallet" s={14} c="#fff" /> Connect Wallet
                      </button>
                    )}

                    {hasWallet && (
                      <>
                        <button className="dash-btn" style={{width:'100%',justifyContent:'center',marginBottom:10,background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}}>
                          <Icon n="device-mobile" s={14} /> Pair Device
                        </button>
                        <button className="dash-btn" style={{width:'100%',justifyContent:'center',marginBottom:10,background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}}>
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
                          Min swap: 0.01 SOL — <a href="#" style={{color:'var(--accent)',textDecoration:'none'}} onClick={e => {e.preventDefault(); setSubPage('withdrawals')}}>View my withdrawals</a>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Bank Account Section */}
                <div style={{padding:'13px 0 0',borderTop:'1px solid var(--border)',marginTop:13}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:800}}>Bank Account (NGN)</div>
                    {accountNumber && !editingBank && (
                      <button className="btn-outline btn-sm" onClick={() => setEditingBank(true)}>
                        <Icon n="edit" s={12} /> Edit
                      </button>
                    )}
                  </div>
                  {editingBank ? (
                    <div>
                      <div style={{marginBottom:10}}>
                        <label style={{fontSize:11,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:4}}>Account Number</label>
                        <input className="dash-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g,''))} placeholder="0123456789" />
                      </div>
                      <div style={{marginBottom:10}}>
                        <label style={{fontSize:11,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:4}}>Bank Name</label>
                        <input className="dash-input" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Access Bank" />
                      </div>
                      <div style={{marginBottom:10}}>
                        <label style={{fontSize:11,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:4}}>Account Name</label>
                        <input className="dash-input" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="John Doe" />
                      </div>
                      {bankMsg && <div style={{fontSize:12,color:'#DC2626',marginBottom:8}}>{bankMsg}</div>}
                      <button className="dash-btn" onClick={saveBank} disabled={savingBank} style={{opacity:savingBank?0.6:1}}>
                        {savingBank ? 'Saving...' : 'Save Bank Account'}
                      </button>
                    </div>
                  ) : accountNumber ? (
                    <div>
                      <div className="stat-row" style={{borderBottom:'none',padding:'6px 0'}}>
                        <span className="stat-label">Bank</span>
                        <span className="stat-val">{bankName}</span>
                      </div>
                      <div className="stat-row" style={{borderBottom:'none',padding:'6px 0'}}>
                        <span className="stat-label">Account Name</span>
                        <span className="stat-val">{accountName}</span>
                      </div>
                      <div className="stat-row" style={{borderBottom:'none',padding:'6px 0'}}>
                        <span className="stat-label">Account Number</span>
                        <span className="stat-val" style={{fontFamily:'monospace',fontSize:14}}>{accountNumber}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{fontSize:12,color:'var(--text3)'}}>No bank account linked. 
                      <button style={{border:'none',background:'none',color:'var(--accent)',fontWeight:700,cursor:'pointer',fontSize:12,fontFamily:'inherit'}} onClick={() => setEditingBank(true)}>Add one now</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Profile Card */}
            <div className="card">
              <div className="card-head">
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
              <div className="card-body">
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
                    <StatRow label="Rank" val={profileData?.workerProfile?.level || 'Beginner'} />
                    <StatRow label="Sorsa Score" val={profileData?.workerProfile?.reputationScore?.toFixed(1) || '0.0'} info />
                    <StatRow label="Tasks Completed" val={profileData?.workerProfile?.tasksCompleted ?? 0} />
                    <StatRow label="Success Rate" val={profileData?.workerProfile?.successRate ? profileData.workerProfile.successRate + '%' : '0%'} />
                    <StatRow label="Total Earned" val={profileData?.workerProfile?.totalEarned ? fmt(Number(profileData.workerProfile.totalEarned), "NGN") : fmt(0, "NGN")} />
                    <StatRow label="Avg Rating" val={profileData?.workerProfile?.avgRating?.toFixed(1) || '0.0'} info />
                    <StatRow label="Verified X Account" val={profileData?.x_connected ? 'Yes' : 'No'} valClass={profileData?.x_connected ? 'yes' : 'no'} />
                    {!profileData?.x_connected && (
                      <button className="dash-btn" style={{width:'100%',justifyContent:'center',marginTop:10,background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}}>
                        <XIcon size={14} /> Connect X Account
                      </button>
                    )}
                    <StatRow label="Seeker User" val={profileData?.role === 'POSTER' ? 'Yes' : 'No'} valClass={profileData?.role === 'POSTER' ? 'yes' : 'no'} />
                    <StatRow label="Human Verified" val={isKycVerified ? 'Yes' : 'No'} valClass={isKycVerified ? 'yes' : 'no'} />
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
          <div className="card prof-full" style={{marginBottom:20}}>
            <div className="card-head"><span><Icon n="affiliate" s={15} /> Your Referral Link</span></div>
            <div className="card-body">
              {loading ? (
                <span className="skeleton" style={{width:'60%',height:14,display:'inline-block'}} />
              ) : refUrl ? (
                <>
                  <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:9,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontFamily:'monospace',fontSize:12,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{refUrl}</span>
                    <CopyBtn text={refUrl} />
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button className="dash-btn" style={{background:'transparent',border:'1.5px solid var(--border)',color:'var(--text)'}}>
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
          <div className="quick-grid" style={{marginBottom:24}}>
            {QUICK.map((q,i) => (
              <a className="quick-tile" key={i} onClick={() => {
                if (q.page === 'blog') navigate('/blog');
                else if (q.page === 'vault') navigate('/vault');
                else if (q.page === 'create') navigate('/create');
                else if (q.page === 'tasks') navigate('/tasks');
                else if (q.page === 'monitor') navigate('/tasks');
                else if (q.page === 'manage') navigate('/manage-jobs');
                else if (q.page === 'bookmarks') navigate('/bookmarks');
                else setSubPage(q.page);
              }}>
                <Icon n={q.icon} s={22} c="var(--text2)" />
                {q.label}
              </a>
            ))}
          </div>

          {/* Withdrawal History */}
          <div className="card prof-full" style={{marginBottom:20}}>
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
                            const result = await apiRequest('/users/directory/list?search=' + encodeURIComponent(val) + '&limit=1').catch(() => null);
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
                {usernameCheck === 'available' && <i className="ti ti-check" style={{color:'#16a34a',fontSize:18}} />}
                {usernameCheck === 'taken' && <i className="ti ti-x" style={{color:'#DC2626',fontSize:18}} />}
              </div>
              {usernameCheck === 'taken' && <div style={{fontSize:11,color:'#DC2626',marginTop:4}}>Username is taken</div>}
              {usernameCheck === 'available' && <div style={{fontSize:11,color:'#16a34a',marginTop:4}}>Username is available</div>}
              {editErrors.username && <div style={{fontSize:11,color:'#DC2626',marginTop:4}}>{editErrors.username}</div>}
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
              {editErrors.bio && <div style={{fontSize:11,color:'#DC2626',marginTop:4}}>{editErrors.bio}</div>}
            </div>

            {editErrors.general && <div style={{fontSize:12,color:'#DC2626',marginBottom:12,textAlign:'center'}}>{editErrors.general}</div>}

            {/* Actions */}
            <div style={{display:'flex',gap:12}}>
              <button className="dash-btn" style={{flex:1,justifyContent:'center',opacity:savingProfile?0.6:1}} disabled={savingProfile}
                onClick={async () => {
                  if (!editForm.firstName.trim()) { setEditErrors({firstName:'First name is required'}); return; }
                  if (!editForm.username.trim()) { setEditErrors({username:'Username is required'}); return; }
                  if (usernameCheck === 'taken') { setEditErrors({username:'This username is taken'}); return; }
                  setSavingProfile(true); setEditErrors({});
                  try {
                    const body: Record<string, string> = {};
                    if (editForm.firstName !== (user?.firstName || '')) body.firstName = editForm.firstName;
                    if (editForm.lastName !== (user?.lastName || '')) body.lastName = editForm.lastName;
                    if (editForm.username !== (user?.username || '')) body.username = editForm.username;
                    if (editForm.avatarUrl !== (user?.avatarUrl || '') && editForm.avatarUrl && !editForm.avatarUrl.startsWith('data:')) body.avatarUrl = editForm.avatarUrl;

                    // Bio is on workerProfile
                    let bioChanged = editForm.bio !== (profileData?.workerProfile?.bio || '');
                    
                    if (Object.keys(body).length > 0) {
                      const updated = await apiRequest('/users/me', {
                        method: 'PATCH',
                        body: JSON.stringify(body),
                      }).catch(() => null);
                      if (!updated) throw new Error('Failed to update profile');
                      const userData = await apiRequest('/users/me').catch(() => null);
                      if (userData) setProfileData(userData);
                    }

                    if (bioChanged) {
                      const bioRes = await apiRequest('/users/me', {
                        method: 'PATCH',
                        body: JSON.stringify({ bio: editForm.bio }),
                      }).catch(() => null);
                      if (!bioRes) throw new Error('Failed to update profile');
                    }

                    setShowEdit(false);
                    showToast('Profile updated successfully');
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
                  Verify your identity to unlock withdrawals and access all features. 
                  You'll need a valid government ID (NIN, BVN, or Passport).
                </p>
                <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:10}}>Required for verification:</div>
                  {["Valid government ID (NIN, BVN, Passport)","Selfie photo matching your ID","Nigerian phone number"].map((item,i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text2)'}}>
                      <i className="ti ti-check" style={{color:'#16a34a',fontSize:14}} /> {item}
                    </div>
                  ))}
                </div>
                <button className="dash-btn" style={{width:'100%',justifyContent:'center'}} onClick={() => setKycStep("document")}>
                  <Icon n="shield-check" s={16} /> Start Verification
                </button>
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
                  <label style={{fontSize:12,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:6}}>Government ID</label>
                  <div style={{
                    border: '2px dashed var(--border)', borderRadius: 12, padding: 24, textAlign: 'center',
                    cursor: 'pointer', background: 'var(--bg2)', transition: 'border-color .2s'
                  }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#121566' }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    onClick={() => document.getElementById('kyc-doc-input')?.click()}>
                    {kycDocumentPreview ? (
                      <img src={kycDocumentPreview} alt="ID preview" style={{maxHeight:160,maxWidth:'100%',borderRadius:8,objectFit:'contain',marginBottom:8}} />
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
                      // Show preview for images
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
                      setKycUploading(true)
                      setKycMsg('')
                      try {
                        const url = await uploadImage(kycDocument, 'kyc-docs')
                        // Store the uploaded document URL and move to BVN step
                        localStorage.setItem('ogapay_kyc_document_url', url)
                        setKycDocument(null)
                        setKycDocumentPreview('')
                        setKycMsg('ID uploaded successfully. Now enter your BVN.')
                        setKycStep("bvn")
                      } catch (err) {
                        setKycMsg('Failed to upload document. Please try again.')
                      }
                      setKycUploading(false)
                    }}>
                    {kycUploading ? 'Uploading...' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            {kycStep === "bvn" && (
              <div>
                <p style={{fontSize:13,color:'var(--text2)',marginBottom:16}}>
                  Enter your BVN to verify your identity.
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
                      const json = await apiRequest('/kyc/submit', {
                        method: 'POST',
                        body: JSON.stringify({ idType: 'BVN', idNumber: bvnNumber, dateOfBirth: new Date().toISOString() }),
                      }).catch(() => null);
                      if (json && json.success) {
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
                <button className="dash-btn" style={{marginTop:20}} onClick={() => setShowKyc(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

    </Layout>
  );
}
