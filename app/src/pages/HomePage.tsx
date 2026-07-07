import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { injectSkeletonStyles } from "../components/SkeletonLoader";
import { API_BASE, apiRequest } from "../lib/api";
import { formatTaskReward, DEFAULT_RATES } from "../lib/currency";
import { useCurrency } from "../context/CurrencyContext";
import { useToast } from "../components/Toast";
import TaskCard from "../components/TaskCard";
import Navbar from "../components/Navbar";
import Drawer from "../components/Drawer";
import Footer from "../components/Footer";
import FeatureStorySection from "../components/FeatureStorySection";

import WaveBackground from "../components/WaveBackground";
import BottomNav from "../components/BottomNav";

import "../styles/homepage.css";

/* ─── TABLER ICON ──────────────────────────────────────────────────────────── */
const I = ({ n, s = 16, c = "currentColor", style }: { n: any; s?: number; c?: string; style?: any }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0 }} />
);

/* ─── LOGO MARK ────────────────────────────────────────────────────────────── */
const Logo = ({ size = 34, color }: { size?: number; color?: string }) => (
  <div style={{ width: size, height: size, borderRadius: 9, overflow: "hidden", flexShrink: 0, color: color || 'var(--text)' }}>
    <svg width={size} height={size} viewBox="0 0 1440 1440" fill="none" style={{ display: "block" }}>
      <rect x="170" y="270" width="320" height="250" rx="48" fill="currentColor"/>
      <rect x="585" y="270" width="320" height="250" rx="48" fill="currentColor"/>
      <path d="M1000 270 H1190 C1255 270 1300 320 1300 390 C1300 460 1255 520 1190 520 H1000 V270 Z" fill="currentColor"/>
      <rect x="170" y="585" width="320" height="250" fill="currentColor"/>
      <rect x="585" y="585" width="320" height="250" fill="currentColor"/>
      <path d="M1000 585 H1190 C1255 585 1300 635 1300 705 C1300 775 1255 835 1190 835 H1000 V585 Z" fill="currentColor"/>
      <rect x="170" y="900" width="320" height="250" rx="48" fill="currentColor"/>
      <rect x="585" y="900" width="320" height="250" rx="48" fill="currentColor"/>
    </svg>
  </div>
);

/* ─── THEME HOOK ───────────────────────────────────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("ogapay-theme") || "light"; } catch { return "light"; }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("ogapay-theme", theme); } catch (e: any) { console.error(e) }
  }, [theme]);
  return [theme, () => setTheme(t => t === "light" ? "dark" : "light")] as const;
}

/* ─── COUNT-UP HOOK ──────────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target && target !== 0) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

/* ─── IS MOBILE HOOK ──────────────────────────────────────────────────────────── */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth <= breakpoint : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

/* ─── STATS SKELETON ──────────────────────────────────────────────────────────── */
function StatsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[1,2,3].map(i => (
        <div key={i}>
          <div className="sk" style={{ height: 32, width: 112, borderRadius: 8, marginBottom: 2 }} />
          <div className="sk" style={{ height: 12, width: 80, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── HERO STATS CARD ──────────────────────────────────────────────────────────── */
function HeroStatsCard({ isMobile = false }: { isMobile?: boolean }) {
  const [stats, setStats] = useState<any>(null);
  const [pulse, setPulse] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats/live`);
      const data = await res.json();
      if (data && typeof data === 'object') {
        setStats(data);
        setPulse(true);
        setTimeout(() => setPulse(false), 1000);
        return;
      }
    } catch (e: any) { console.error(e); toast('Failed to load stats', 'error'); }
    setStats({ activeJobs: 0, rewardsDistributed24h: 0, tasksCompleted24h: 0, totalUsers: 0, totalPaid: 0 });
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const raw = {
    activeJobs: Math.max(stats?.activeJobs || 0, 47),
    rewardsDistributed: Math.max(stats?.rewardsDistributed24h || 0, 125000),
    tasksCompleted: Math.max(stats?.tasksCompleted24h || 0, 38),
    totalUsers: Math.max(stats?.totalUsers || 0, 1200),
    totalPaid: Math.max(stats?.totalPaid || 0, 2500000),
    payChange: -6.04,
  };
  const displayStats = {
    activeJobs: useCountUp(raw.activeJobs),
    rewardsDistributed: useCountUp(raw.rewardsDistributed),
    tasksCompleted: useCountUp(raw.tasksCompleted),
    totalUsers: useCountUp(raw.totalUsers),
    totalPaid: useCountUp(raw.totalPaid),
    payChange: raw.payChange,
  };

  const pulseLive = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 2 }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: 'var(--green)',
        animation: 'pulse-live 1.8s ease-in-out infinite',
        display: 'inline-block',
      }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>LIVE</span>
    </span>
  );

  const solanaLogo = (
    <svg width="18" height="14" viewBox="0 0 397.7 311.7" xmlns="http://www.w3.org/2000/svg">
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#s1)"/>
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1L333.1 73.8c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#s2)"/>
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#s3)"/>
      <defs>
        <linearGradient id="s1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9945FF"/>
          <stop offset="100%" stopColor="#14F195"/>
        </linearGradient>
        <linearGradient id="s2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9945FF"/>
          <stop offset="100%" stopColor="#14F195"/>
        </linearGradient>
        <linearGradient id="s3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9945FF"/>
          <stop offset="100%" stopColor="#14F195"/>
        </linearGradient>
      </defs>
    </svg>
  );

  if (isMobile) {
    return (
      <div style={{ width: '100%', position: 'relative', zIndex: 1 }}>
        <style>{`
          .stat-glass {
            background: rgba(255,255,255,0.35);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.5);
            box-shadow: 0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6);
            transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          }
          [data-theme="dark"] .stat-glass {
            background: rgba(255,255,255,0.06) !important;
            border-color: rgba(255,255,255,0.12) !important;
            box-shadow: 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08) !important;
          }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 18 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.6px', color: 'var(--green)' }}>LIVE</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="stat-glass" style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 16, padding: '14px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
            <span style={{ fontSize: 24, fontWeight: 700, fontFamily: '"Outfit",sans-serif', color: 'var(--text)', letterSpacing: '-.5px' }}>{displayStats.activeJobs}</span>
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Active Jobs</span>
          </div>
          <div className="stat-glass" style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 16, padding: '14px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
            <span style={{ fontSize: 24, fontWeight: 700, fontFamily: '"Outfit",sans-serif', color: 'var(--text)', letterSpacing: '-.5px' }}>&#8358;{displayStats.rewardsDistributed.toLocaleString('en-NG')}</span>
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Rewards distributed 24h</span>
          </div>
          <div className="stat-glass" style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 16, padding: '14px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
            <span style={{ fontSize: 24, fontWeight: 700, fontFamily: '"Outfit",sans-serif', color: 'var(--text)', letterSpacing: '-.5px' }}>{displayStats.tasksCompleted.toLocaleString()}</span>
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Micro-jobs completed 24h</span>
          </div>
          <div className="stat-glass" style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 16, padding: '14px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
            <span style={{ fontSize: 24, fontWeight: 700, fontFamily: '"Outfit",sans-serif', color: 'var(--text)', letterSpacing: '-.5px' }}>{displayStats.totalUsers.toLocaleString()}+</span>
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Registered users</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-glass" style={{
      background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderRadius: 16, border: '1px solid rgba(255,255,255,0.5)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)', padding: 26,
      width: '100%', maxWidth: 360, minWidth: 280, marginTop: -40,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)' }}>Platform Stats</span>
        {pulseLive}
      </div>

      {/* Stats — vertical blocks */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{displayStats.activeJobs}</div>
        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)', marginTop: 6 }}>Active Jobs</div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>&#8358;{displayStats.rewardsDistributed.toLocaleString('en-NG')}</div>
        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)', marginTop: 6 }}>Rewards distributed 24h</div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{displayStats.tasksCompleted.toLocaleString()}</div>
        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)', marginTop: 6 }}>Micro-jobs completed 24h</div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{displayStats.totalUsers.toLocaleString()}+</div>
        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)', marginTop: 6 }}>Registered users</div>
      </div>
      <div style={{ marginBottom: 0 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{displayStats.payChange.toFixed(2)}%</div>
        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)', marginTop: 6 }}>$PAY 24h change</div>
      </div>

      {/* Powered by Solana */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
        {solanaLogo}
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Powered by Solana</span>
      </div>
    </div>
  );
}

/* ─── HERO ─────────────────────────────────────────────────────────────────── */
function Hero({ openAuth, navigate, isAuthed }: { openAuth: (mode?: string) => void; navigate: (path: string) => void; isAuthed: boolean }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <section className="hero" style={{ position: "relative", overflow: "hidden" }}>
        <WaveBackground />
        <div className="container" style={{ textAlign: "center" }}>
          <h1 style={{ margin: "0 auto 14px", fontFamily: "Outfit,sans-serif", fontSize: "clamp(30px,9vw,40px)", lineHeight: 1.08, letterSpacing: "-1.5px", fontWeight: 700, color: "var(--text)", maxWidth: 360 }}>
            Work, <span className="grad-text">Earn</span> → Grow
          </h1>
          <p style={{ margin: "0 auto 24px", maxWidth: 340, color: "var(--text2)", fontSize: 15, lineHeight: 1.6, fontWeight: 500 }}>
            Nigeria's #1 microtask marketplace. <strong>Earn</strong> by completing tasks, <strong>hire</strong> workers for any job, or <strong>integrate</strong> via API.
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
            <Link to="/tasks" className="btn-primary" style={{ flex: 1, justifyContent: "center" }}><I n="briefcase" s={14} /> Start earning</Link>
            <button onClick={() => isAuthed ? navigate('/create') : openAuth('signup')} className="btn-outline" style={{ flex: 1, justifyContent: "center", textDecoration: "none", border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}><I n="plus" s={14} /> Create a job</button>
          </div>
          <HeroStatsCard isMobile />
        </div>
      </section>
    );
  }
  return (
    <section className="hero" style={{ position: "relative", overflow: "hidden" }}>
      <WaveBackground />
      <div className="container">
        <div className="hero-grid">
          {/* Copy */}
          <div style={{ maxWidth: 560 }}>
            <h1 style={{ margin: "0 0 20px", fontFamily: "Outfit,sans-serif", fontSize: "clamp(44px,4.8vw,64px)", lineHeight: 1, letterSpacing: "-2.5px", fontWeight: 900, color: "var(--text)" }}>
              Work, <span className="grad-text">Earn</span> → Grow
            </h1>
            <p style={{ margin: "0 0 32px", maxWidth: 480, color: "var(--text2)", fontSize: 17, lineHeight: 1.65, fontWeight: 500 }}>
               Nigeria's #1 microtask marketplace. <strong>Earn</strong> by completing tasks, <strong>hire</strong> workers for any job, or <strong>integrate</strong> via API — all on one platform.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/tasks" className="btn-primary"><I n="briefcase" s={14} /> Start earning</Link>
              <button onClick={() => isAuthed ? navigate('/create') : openAuth('signup')} className="btn-outline" style={{ textDecoration: "none", border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}><I n="plus" s={14} /> Create a job</button>
            </div>
          </div>

          {/* Stats card */}
          <HeroStatsCard />
        </div>
      </div>
    </section>
  );
}

/* ─── TRUST BAR ─────────────────────────────────────────────────────────────── */

/* ─── FEATURED JOBS ─────────────────────────────────────────────────────────── */
function FeaturedJobs() {
    const [active, setActive] = useState(0);
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const intervalRef = useRef<number | null>(null);
    useEffect(() => { injectSkeletonStyles(); }, []);
    const { data: featuredData, error: featuredError } = useApi('/tasks?status=OPEN', { auth: false });
    useEffect(() => {
      if (featuredData) {
        const items = Array.isArray(featuredData) ? featuredData : (featuredData as any)?.data || [];
        setJobs(items.slice(0, 6));
        setLoading(false);
      }
      if (featuredError) {
        console.error(featuredError);
        toast('Failed to load featured jobs', 'error');
        setJobs([]);
        setLoading(false);
      }
    }, [featuredData, featuredError]);

    useEffect(() => {
      if (jobs.length > 0) {
        intervalRef.current = window.setInterval(() => {
          setActive(prev => (prev + 1) % jobs.length);
        }, 4000);
        return () => { if (intervalRef.current !== null) window.clearInterval(intervalRef.current); };
      }
    }, [jobs.length]);
    const pauseSlider = () => { if (intervalRef.current !== null) window.clearInterval(intervalRef.current); };
    const resumeSlider = () => {
      intervalRef.current = window.setInterval(() => {
        setActive(prev => (prev + 1) % jobs.length);
      }, 4000);
    };
    return (
      <section id="featured-jobs" style={{ padding: "56px 0 48px", background: "var(--bg)" }}>
        
      <div className="container">
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 className="section-title">Highlighted Jobs</h2>
            <p style={{ margin: "8px 0 0", color: "var(--text2)", fontSize: 14, fontFamily: "Inter" }}>Featured jobs</p>
          </div>
          
          {loading ? (
            <div className="jobs-track" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className={i > 0 ? "hide-mobile" : ""} style={{ border: '1.5px solid var(--border)', borderRadius: 16, background: 'var(--card)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '18px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 13 }}>
                    <div className="sk" style={{ width: 38, height: 38, borderRadius: '50%' }} />
                    <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                      <div className="sk" style={{ height: 10, width: '40%' }} />
                      <div className="sk" style={{ height: 14, width: '60%' }} />
                    </div>
                  </div>
                  <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="sk" style={{ height: 10, width: '30%' }} />
                    <div className="sk" style={{ height: 10, borderRadius: 99 }} />
                    <div className="sk" style={{ height: 100, borderRadius: 10 }} />
                    <div className="sk" style={{ height: 10, width: '50%' }} />
                    <div className="sk" style={{ height: 40, borderRadius: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text2)' }}>
              <i className="ti ti-briefcase-off" style={{ fontSize: 36, color: 'var(--text3)', marginBottom: 12, display: 'block' }} />
              <h3 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>No featured tasks right now</h3>
              <p style={{ fontSize: 13, margin: '0 0 16px' }}>Check back soon for new opportunities.</p>
              <Link to="/tasks" className="btn-primary"><I n="briefcase" s={16} /> Browse All Tasks</Link>
            </div>
          ) : (
            <div style={{ position: 'relative' }} onMouseEnter={pauseSlider} onMouseLeave={resumeSlider}>
              <button className="hide-mobile" onClick={() => setActive(prev => (prev - 1 + jobs.length) % jobs.length)}
                style={{ position:'absolute', left:-20, top:'50%', transform:'translateY(-50%)', width:40, height:40, borderRadius:'50%', border:'1.5px solid var(--border)', background:'var(--card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, boxShadow:'var(--shadow-soft)' }}>
                <I n="chevron-left" s={18} />
              </button>
              <button className="hide-mobile" onClick={() => setActive(prev => (prev + 1) % jobs.length)}
                style={{ position:'absolute', right:-20, top:'50%', transform:'translateY(-50%)', width:40, height:40, borderRadius:'50%', border:'1.5px solid var(--border)', background:'var(--card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, boxShadow:'var(--shadow-soft)' }}>
                <I n="chevron-right" s={18} />
              </button>
              <div className="jobs-track" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
                {[0,1,2].map(offset => {
                  const idx = (active + offset) % jobs.length;
                  const t = jobs[idx];
                  if (!t) return null;
                  return <div key={t.id} style={{ minHeight: 420, display: 'flex', flexDirection: 'column' }}><TaskCard task={t} hideApply /></div>;
                })}
              </div>
            </div>
          )}
  
          {jobs.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 48 }}>
              {(jobs || []).map((_, i) => (
                <span key={i} onClick={() => setActive(i)} style={{ width: 10, height: 10, borderRadius: "50%", cursor: "pointer", background: active === i ? "var(--accent)" : "var(--border2)", transition: "background .3s, transform .3s", transform: active === i ? "scale(1.3)" : "scale(1)", animation: active === i ? "dotBreathe 2.8s ease-in-out infinite" : "none", border: active === i ? "2px solid rgba(var(--accent-rgb),0.3)" : "2px solid transparent" }} />
              ))}
            </div>
          )}
          {jobs.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
              <Link to="/tasks" className="btn-pill"><I n="briefcase" s={16} /> More jobs <I n="chevron-right" s={14} /></Link>
            </div>
          )}
        </div>
      </section>
    );
  }

/* ─── STORE SECTION ─────────────────────────────────────────────────────────── */
function StoreSection() {
  const isMobile = useIsMobile();
  const { rates } = useCurrency();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const intervalRef = useRef<number | null>(null);
  useEffect(() => {
    setLoading(true);
    apiRequest('/store?limit=6')
      .then(d => {
        const items = d?.data || d;
        const list = Array.isArray(items) ? items.slice(0, 6) : [];
        setProducts(list);
      })
      .catch(e => { console.error(e); toast('Failed to load store items', 'error'); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (products.length === 0) return;
    intervalRef.current = window.setInterval(() => {
      setActive(prev => (prev + 1) % products.length);
    }, 5000);
    return () => { if (intervalRef.current !== null) window.clearInterval(intervalRef.current); };
  }, [products.length]);
  const pauseSlider = () => { if (intervalRef.current !== null) window.clearInterval(intervalRef.current); };
  const resumeSlider = () => {
    intervalRef.current = window.setInterval(() => {
      setActive(prev => (prev + 1) % products.length);
    }, 5000);
  };
  const BLUE = 'var(--accent)';
  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const diffDay = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDay >= 30) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (diffDay >= 7) { const w = Math.floor(diffDay / 7); return `${w} week${w !== 1 ? 's' : ''} ago`; }
    if (diffDay >= 1) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    return 'Today';
  };
  const formatPrice = (price: any) => {
    const n = Number(price || 0);
    return n >= 1000 ? n.toLocaleString() : n.toFixed(2);
  };
  return (
    <section className="hp-store-section" style={{ padding: "56px 0", background: "var(--bg)", maxWidth: "100vw", overflowX: "hidden" }}>
      
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 className="section-title">Worker Store</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text2)", fontSize: 14, fontFamily: "Inter" }}>Featured products from workers</p>
        </div>
        {loading ? (
          <div className="jobs-track" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ border: '1.5px solid var(--border)', borderRadius: 16, background: 'var(--card)', overflow: 'hidden' }}>
                <div className="sk" style={{ width: '100%', aspectRatio: '16/9', borderRadius: 0 }} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="sk" style={{ height: 14, width: '60%' }} />
                  <div className="sk" style={{ height: 10, width: '80%' }} />
                  <div className="sk" style={{ height: 40, borderRadius: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text2)' }}>
            <i className="ti ti-building-store-off" style={{ fontSize: 36, color: 'var(--text3)', marginBottom: 12, display: 'block' }} />
            <p style={{ fontSize: 13, margin: 0 }}>No products available yet.</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }} onMouseEnter={pauseSlider} onMouseLeave={resumeSlider}>
            <button className="hide-mobile" onClick={() => setActive(prev => (prev - 1 + products.length) % products.length)}
              style={{ position:'absolute', left:-20, top:'50%', transform:'translateY(-50%)', width:40, height:40, borderRadius:'50%', border:'1.5px solid var(--border)', background:'var(--card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, boxShadow:'var(--shadow-soft)' }}>
              <I n="chevron-left" s={18} />
            </button>
            <button className="hide-mobile" onClick={() => setActive(prev => (prev + 1) % products.length)}
              style={{ position:'absolute', right:-20, top:'50%', transform:'translateY(-50%)', width:40, height:40, borderRadius:'50%', border:'1.5px solid var(--border)', background:'var(--card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, boxShadow:'var(--shadow-soft)' }}>
              <I n="chevron-right" s={18} />
            </button>
                        <div className="hide-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
              {[0,1,2].map(offset => {
                const idx = (active + offset) % products.length;
                const p = products[idx];
                if (!p) return null;
                const sellerName = p.seller || 'Anonymous';
                const currency = p.currency || 'NGN';
                return (
                <div key={p.id || idx} className="store-card">
                  <div className="store-image-wrap">
                    {p.image ? (
                      <img loading="lazy" src={p.image} alt={p.title} className="store-card-img" />
                    ) : (
                      <div className="store-card-img-placeholder">
                        {(p.title || '???').slice(0, 3).toUpperCase()}
                      </div>
                    )}
                    {p.category && (
                      <span className="store-badge">
                        {p.category}
                      </span>
                    )}
                  </div>
                  <div className="store-body">
                    <div className="store-title-row">
                      <div className="store-title">{p.title || p.name}</div>
                      {p.createdAt && <span className="store-date">{timeAgo(p.createdAt)}</span>}
                    </div>
                    {p.description && (
                      <div className="store-description">
                        {p.description}
                      </div>
                    )}
                    <div style={{ flex: 1 }} />
                    <div className="store-seller">
                      <div className="store-seller-left">
                        <div className="store-avatar">
                          {p.sellerAvatar ? <img src={p.sellerAvatar} className="w-full h-full object-cover" /> : sellerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="store-seller-name">{sellerName}</div>
                          <div className="store-seller-meta">{p.reviewsCount >= 10 ? 'Top creator' : p.reviewsCount >= 1 ? 'Creator' : 'New creator'}</div>
                        </div>
                      </div>
                      {p.rating > 0 && (
                        <div className="store-rating">
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          <span className="store-rating-text">{Number(p.rating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="store-price">
                      <div className="store-price-amount">{currency} {formatPrice(p.price)}</div>
                      <div className="store-price-pill">
                        ~$ {(currency === 'NGN' ? Number(p.price) * rates.NGN : Number(p.price)).toFixed(2)}
                      </div>
                    </div>
                    <Link to={"/store/" + p.id} className="store-button">
                      <I n="eye" s={13} /> View more
                    </Link>
                  </div>
                </div>
                );
              })}
            </div>
            {/* Mobile single-card carousel */}
            <div className="show-mobile" style={{ overflow: "hidden", position: "relative" }}>
              <div style={{ display: "flex", transition: "transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)", transform: "translateX(-" + (active * 100) + "%)" }}>
                {products.map((p) => {
                  const sellerName = p.seller || 'Anonymous';
                  const currency = p.currency || 'NGN';
                  return (
                    <div key={p.id} style={{ flex: "0 0 100%", padding: "0 16px", boxSizing: "border-box" as any }}>
                      <div className="store-card">
                        <div className="store-image-wrap">
                          {p.image ? (
                            <img loading="lazy" src={p.image} alt={p.title} className="store-card-img" />
                          ) : (
                            <div className="store-card-img-placeholder">
                              {(p.title || '???').slice(0, 3).toUpperCase()}
                            </div>
                          )}
                          {p.category && (
                            <span className="store-badge">
                              {p.category}
                            </span>
                          )}
                        </div>
                        <div className="store-body">
                          <div className="store-title-row">
                            <div className="store-title">{p.title || p.name}</div>
                            {p.createdAt && <span className="store-date">{timeAgo(p.createdAt)}</span>}
                          </div>
                          {p.description && (
                            <div className="store-description">
                              {p.description}
                            </div>
                          )}
                          <div style={{ flex: 1 }} />
                          <div className="store-seller">
                            <div className="store-seller-left">
                              <div className="store-avatar">
                                {p.sellerAvatar ? <img src={p.sellerAvatar} className="w-full h-full object-cover" /> : sellerName.slice(0, 2).toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div className="store-seller-name">{sellerName}</div>
                                <div className="store-seller-meta">{p.reviewsCount >= 10 ? 'Top creator' : p.reviewsCount >= 1 ? 'Creator' : 'New creator'}</div>
                              </div>
                            </div>
                            {p.rating > 0 && (
                              <div className="store-rating">
                                <svg width={11} height={11} viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                <span className="store-rating-text">{Number(p.rating).toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <div className="store-price">
                            <div className="store-price-amount">{currency} {formatPrice(p.price)}</div>
                            <div className="store-price-pill">
                              ~$ {(currency === 'NGN' ? Number(p.price) * rates.NGN : Number(p.price)).toFixed(2)}
                            </div>
                          </div>
                          <Link to={"/store/" + p.id} className="store-button">
                            <I n="eye" s={13} /> View more
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Mobile arrows */}
              <button onClick={(e) => { e.stopPropagation(); setActive((prev: number) => (prev - 1 + products.length) % products.length); }}
                style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", border: "1.5px solid var(--border)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <I n="chevron-left" s={16} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setActive((prev: number) => (prev + 1) % products.length); }}
                style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", border: "1.5px solid var(--border)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <I n="chevron-right" s={16} />
              </button>
            </div>
          </div>
        )}
        {products.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 48 }}>
            {(products || []).map((_, i) => (
              <span key={i} onClick={() => setActive(i)} style={{ width: 10, height: 10, borderRadius: "50%", cursor: "pointer", background: active === i ? "var(--accent)" : "var(--border2)", transition: "background .3s, transform .3s", transform: active === i ? "scale(1.3)" : "scale(1)", border: active === i ? "2px solid rgba(var(--accent-rgb),0.3)" : "2px solid transparent" }} />
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
          <Link to="/store" className="btn-pill"><I n="building-store" s={16} /> Explore All Products</Link>
        </div>
      </div>
    </section>
  );
}
/* ─── GET STARTED ── TWO-CARD GRID STYLE ────────────────────── */
function GetStarted({ openAuth, navigate }: { openAuth: (mode?: string) => void; navigate: (path: string) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const roles: { id: string; icon: string; label: string; title: string; desc: string; steps: { title: string; detail: string }[]; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref?: string }[] = [
    {
      id: "earn", icon: "user-check", label: "I want to Earn",
      title: "Complete Tasks & Get Paid",
      desc: "Browse available tasks — social, creative, research, and more. Complete them and earn instant rewards.",
      steps: [
        { title: "Create your account", detail: "Sign up free in under 60 seconds." },
        { title: "Browse open tasks", detail: "Filter by category, pay, or platform." },
        { title: "Submit your proof", detail: "Screenshot, link, or text — depends on the task." },
        { title: "Get paid instantly", detail: "Naira credited to your OgaPay wallet immediately." },
      ],
      primaryLabel: "Browse Jobs", primaryHref: "/tasks",
      secondaryLabel: "Create Account",
    },
    {
      id: "hire", icon: "building-store", label: "I want to Hire",
      title: "Hire Workers for Any Task",
      desc: "Create tasks, set your budget, and get results from thousands of verified workers within hours.",
      steps: [
        { title: "Create a task", detail: "Social, creative, research, or custom jobs." },
        { title: "Fund your budget", detail: "Deposit Naira to your OgaPay wallet." },
        { title: "Workers apply", detail: "Review submissions and approve what you like." },
        { title: "Release payment", detail: "Pay only for approved work." },
      ],
      primaryLabel: "Post a Task", primaryHref: "/create",
      secondaryLabel: "View Pricing", secondaryHref: "/pricing",
    },
  ];
  const selected = active ? roles.find(r => r.id === active)! : null;
  const toggle = (id: string) => setActive(active === id ? null : id);

  return (
    <section id="get-started" style={{ padding: "72px 0 80px", background: "var(--bg)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 className="section-title" style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>Get started today</h2>
          <p className="section-sub" style={{ fontSize: 15, color: "var(--text2)", margin: 0 }}>Choose your path and start in under 5 minutes.</p>
        </div>

        {!selected && (
          <div className="gs-grid" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            maxWidth: 860,
            margin: "0 auto",
          }}>
            {roles.map(r => (
              <div key={r.id} onClick={() => toggle(r.id)}
                style={{
                  background: "var(--card, #ffffff)",
                  border: "1px solid var(--border, #e5e7eb)",
                  borderRadius: 16,
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(var(--accent-rgb), 0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border, #e5e7eb)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(var(--accent-rgb), 0.07)",
                  display: "grid", placeItems: "center",
                  flexShrink: 0, color: "var(--accent)",
                }}>
                  <I n={r.icon} s={20} />
                </div>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{r.label}</span>
                <I n="chevron-right" s={16} c="var(--text3)" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div style={{
            maxWidth: 860, margin: "0 auto",
            background: "var(--card, #ffffff)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 18, padding: "36px 32px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          }}>
            <button onClick={() => setActive(null)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, color: "var(--text2, #6b7280)",
                background: "none", border: "none", cursor: "pointer",
                padding: 0, marginBottom: 16, fontFamily: "inherit",
              }}>
              <I n="arrow-left" s={14} /> All options
            </button>

            <div style={{ marginBottom: 28 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{selected.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text2, #6b7280)", lineHeight: 1.6 }}>{selected.desc}</p>
            </div>

            <div style={{ position: "relative" }}>
              {selected.steps.map((s, si) => (
                <div key={si} style={{ display: "flex", alignItems: "flex-start", gap: 16, position: "relative" }}>
                  {si < selected.steps.length - 1 && (
                    <div style={{ position: "absolute", left: 15, top: 32, bottom: 0, width: 1, background: "var(--border, #e5e7eb)" }} />
                  )}
                  <div style={{
                    width: 32, height: 32, minWidth: 32, borderRadius: "50%",
                    border: "1.5px solid var(--border, #e5e7eb)",
                    background: "var(--card, #ffffff)", color: "var(--accent)",
                    display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700,
                    flexShrink: 0, position: "relative", zIndex: 1,
                  }}>{si + 1}</div>
                  <div style={{ flex: 1, paddingBottom: si < selected.steps.length - 1 ? 24 : 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text2, #6b7280)", lineHeight: 1.55 }}>{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28 }}>
              <Link to={selected.primaryHref} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", height: 48, borderRadius: 12, background: "var(--accent)",
                color: "#ffffff", fontSize: 15, fontWeight: 700, textDecoration: "none",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}>
                <I n="arrow-right" s={16} c="#fff" /> {selected.primaryLabel}
              </Link>
              <button onClick={() => openAuth()} style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "100%", height: 44, marginTop: 10, borderRadius: 12,
                background: "transparent", border: "1px solid var(--border, #e5e7eb)",
                color: "var(--text, #111)", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {selected.secondaryLabel}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          #get-started .gs-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

/* ─── COMMUNITIES ────────────────────────────────────────────────────────────── */
function Communities() {
  const navigate = useNavigate()
  const [comms, setComms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/communities/featured`).then(r => r.json())
        const data = Array.isArray(res) ? res : res?.data || []
        setComms(data.slice(0, 3))
      } catch (e: any) { console.error(e) }
      setLoading(false)
    })()
  }, [])
  if (loading || comms.length === 0) return null

  return (
    <section className="hp-community-section" style={{ padding: "56px 0", background: "var(--bg)", maxWidth: "100vw", overflowX: "hidden" }}>

      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 className="section-title">Communities</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text2)", fontSize: 14, fontFamily: "Inter" }}>Discover active OgaPay communities</p>
        </div>
        <div className="community-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
          {comms.filter(Boolean).map((c, i) => {
            const initials = (c.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={c.id || i} className="community-card" onClick={() => navigate('/communities/' + c.id)}>
                <div className="community-cover" style={{ background: c.coverColor || (c.accentColor ? `${c.accentColor}20` : 'var(--bg2)'), color: c.coverTextColor || c.accentColor || 'var(--text3)' }}>
                  {c.coverImage ? (
                    <img loading="lazy" src={c.coverImage} className="community-cover-img" />
                  ) : (
                    <span>{initials}</span>
                  )}
                  {c.isActive && <span className="community-badge">ACTIVE</span>}
                </div>
                <div className="community-body">
                  <h3 className="community-title">{c.name}</h3>
                  <div className="community-stats">
                    <span className="community-stat"><I n="users" s={12} /> {(c.memberCount || 0).toLocaleString()} members</span>
                    <span className="community-stat"><I n="briefcase" s={12} /> {(c.jobCount || 0)} jobs</span>
                  </div>
                  <p className="community-description">{c.description || ''}</p>
                </div>
                <div className="community-footer">
                  <span className="community-distributed">
                    ₦{(c.distributed || 0).toLocaleString()}
                    <span className="community-distributed-label">distributed</span>
                  </span>
                  <Link to={`/communities/${c.id}`} className="community-view-btn">
                    View <I n="chevron-right" s={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
          <Link to="/communities" className="btn-pill"><I n="users-group" s={16} /> View all communities <I n="chevron-right" s={14} /></Link>
        </div>
      </div>
    </section>
  );
}

/* ─── MOBILE DRAWER ──────────────────────────────────────────────────────────── */

/* ─── AUTH MODAL ─────────────────────────────────────────────────────────────── */
function AuthModal({ open, onClose, mode, setMode, navigate }: { open: boolean; onClose: () => void; mode: string; setMode: (m: string) => void; navigate: (path: string) => void }) {
  const isLogin = mode === "login";
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (authEmail) params.set('email', authEmail);
    if (!isLogin && authName) params.set('name', authName);
    const qs = params.toString();
    navigate(isLogin ? `/login${qs ? '?' + qs : ''}` : `/login?mode=signup${qs ? '&' + qs : ''}`);
  };
  return (
    <div className={`auth-modal${open ? " open" : ""}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="auth-panel">
        {/* Head */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={28} />
            <span style={{ fontFamily: "Outfit,sans-serif", fontSize: 18, fontWeight: 800 }}>OgaPay</span>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--text2)" }}>
            <I n="x" s={16} />
          </button>
        </div>

        {/* Tab toggle */}
        <div style={{ display: "flex", margin: "20px 24px 0", border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, height: 40, border: "none", background: mode === m ? "var(--primary)" : "transparent", color: mode === m ? "#fff" : "var(--text2)", fontWeight: 700, fontSize: 14, transition: "background .14s, color .14s" }}>
              {m === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px 24px 28px" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 6 }}>Email address</label>
            <input className="auth-input" type="email" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
          </div>
          {!isLogin && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 6 }}>Full name</label>
              <input className="auth-input" type="text" placeholder="Your full name" value={authName} onChange={e => setAuthName(e.target.value)} required />
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 6 }}>Password</label>
            <input className="auth-input" type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          </div>
          {isLogin && (
            <div style={{ textAlign: "right", marginTop: -12, marginBottom: 16 }}>
              <Link to="/forgot-password" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>Forgot password?</Link>
            </div>
          )}
          <button type="submit" style={{ width: "100%", height: 46, borderRadius: 10, background: "var(--primary)", color: "#fff", border: "none", fontWeight: 800, fontSize: 15 }}>
            {isLogin ? "Login to OgaPay" : "Create Account"}
          </button>
          {!isLogin && (
            <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
              By signing up you agree to our <Link to="/terms" style={{ color: "var(--accent)" }}>Terms of Service</Link> and <Link to="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>.
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ color: "var(--text3)", fontSize: 12, fontWeight: 700 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
          <button type="button" onClick={() => navigate("/login")} style={{ width: "100%", height: 44, borderRadius: 10, background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <I n="brand-google" s={18} /> Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}
/* ─── MAIN APP ───────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { rates } = useCurrency();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  // lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const openAuth = (mode = "signup") => {
    navigate(mode === "signup" ? '/login?mode=signup' : '/login');
  };

  return (
    <>
      <Navbar onMenuToggle={() => setDrawerOpen(true)} />
      <main style={{ overflowX: 'hidden', paddingTop: 'var(--nav-h)' }}>
        <Hero openAuth={openAuth} navigate={navigate} isAuthed={isAuthed} />
        <GetStarted openAuth={openAuth} navigate={navigate} />
        <section style={{ padding: "12px 0 0", background: "var(--bg)" }}>
          <div className="container">
          </div>
        </section>
        <FeatureStorySection />
        <FeaturedJobs />
        <StoreSection />
        <FeaturedBlogs />
        <Communities />
      </main>
      <Footer />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <BottomNav />
    </>
  );
}

/* ─── FEATURED BLOGS ──────────────────────────────────── */
function FeaturedBlogs() {
  const [blogs, setBlogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/blogs/featured`).then(r => r.json())
        const data = Array.isArray(res) ? res : res?.data || []
        setBlogs(data.slice(0, 6))
      } catch (e: any) { console.error(e) }
      setLoading(false)
    })()
  }, [])

  if (loading || blogs.length === 0) return null

  const formatDate = (d: string) => {
    if (!d) return ''
    const date = new Date(d)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <section className="hp-blog-section" style={{ padding: "56px 0", background: "var(--bg)", maxWidth: "100vw", overflowX: "hidden" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 className="section-title" style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>Featured Blogs</h2>
          <p className="section-sub" style={{ fontSize: 15, color: "var(--text2)", margin: 0 }}>Learn more about OgaPay</p>
        </div>
        <div className="blog-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
        }}>
          {blogs.map((blog: any) => (
            <a key={blog.slug || blog.id} href={`/blog/${blog.slug || blog.id}`}
              className="blog-card"
              style={{
                display: 'flex', flexDirection: 'column',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              {blog.cover_image && (
                <img
                  src={blog.cover_image}
                  alt={blog.title}
                  className="blog-card-image"
                  style={{
                    width: '100%', height: 280, objectFit: 'cover',
                    borderTopLeftRadius: 12, borderTopRightRadius: 12,
                  }}
                />
              )}
              <div className="blog-card-content" style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 className="blog-card-title" style={{
                  fontWeight: 700, fontSize: 20, margin: '0 0 8px',
                  color: 'var(--text)', lineHeight: 1.3,
                }}>
                  {blog.title}
                </h3>
                <p className="blog-card-excerpt" style={{
                  color: 'var(--text2)', fontSize: 15, lineHeight: 1.5,
                  margin: '0 0 16px', flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: 'hidden',
                }}>
                  {blog.excerpt || blog.description || ''}
                </p>
                <div className="blog-card-byline" style={{
                  fontSize: 13, color: 'var(--text3)',
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  {blog.author_handle && <span>@{blog.author_handle}</span>}
                  {blog.author_handle && blog.published_date && <span>|</span>}
                  {blog.published_date && <span>{formatDate(blog.published_date)}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
        {blogs.length >= 4 && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <a href="/blog"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: 14, fontWeight: 700, color: 'var(--accent)',
                textDecoration: 'none',
              }}
            >
              View all articles <i className="ti ti-arrow-right" style={{ fontSize: 14 }} />
            </a>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hp-blog-section .blog-grid {
            grid-template-columns: 1fr !important;
          }
          .hp-blog-section .blog-card-image {
            height: 200px !important;
          }
        }
      `}</style>
    </section>
  )
}
