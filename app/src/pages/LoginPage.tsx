// @ts-nocheck
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import womanSvg from "../assets/woman.svg";
import { supabase } from "../lib/supabaseClient";
import { API_BASE, apiRequest } from "../lib/api";

function LogoMark({ inverse = false }) {
  const fill = inverse ? "#030341" : "white";
  const stroke = inverse ? "white" : "black";
  return (
    <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill={fill} />
      <rect x="98" y="98" width="107" height="107" rx="20" fill={stroke} />
      <path d="M225 98H312C323 98 332 107 332 118V205H225V98Z" fill={stroke} />
      <path d="M352 98H392C440 98 470 128 470 176V205H352V98Z" fill={stroke} />
      <rect x="98" y="225" width="107" height="107" fill={stroke} />
      <rect x="225" y="225" width="107" height="107" fill={stroke} />
      <path d="M352 225H470V254C470 302 440 332 392 332H352V225Z" fill={stroke} />
      <rect x="98" y="352" width="107" height="107" rx="20" fill={stroke} />
      <path d="M225 352H312C323 352 332 361 332 372V439C332 450 323 459 312 459H225V352Z" fill={stroke} />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const { login, isAuthed } = useAuth();
  
  // FIX 1: Better theme initialization
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ogapay-theme");
      if (saved) return saved;
      // Check system preference
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    }
    return "light";
  });
  
  const [view, setView] = useState("default");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [signupMsg, setSignupMsg] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [loading, setLoading] = useState("");

  // FIX 1: Sync theme on mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("ogapay-theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setView("signup");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setLoginMsg("Please enter your email and password.");
      return;
    }
    setLoading("login");
    setLoginMsg("");
    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        auth: false,
        body: { email: loginEmail.trim(), password: loginPassword },
      });

      
      // Try ALL possible token locations
      const possibleToken = 
        result?.tokens?.accessToken || 
        result?.tokens?.token ||
        result?.session?.accessToken ||
        result?.session?.token ||
        result?.accessToken ||
        result?.token ||
        result?.data?.accessToken ||
        result?.data?.token ||
        result?.data?.tokens?.accessToken ||
        null;
      
      const possibleRefresh = 
        result?.tokens?.refreshToken || 
        result?.session?.refreshToken ||
        result?.refreshToken ||
        result?.data?.refreshToken ||
        result?.data?.tokens?.refreshToken ||
        possibleToken; // fallback: use access token as refresh
      

      
      const loginPayload = {
        user: result.user || result,
        tokens: possibleToken ? { accessToken: possibleToken, refreshToken: possibleRefresh || possibleToken } : undefined,
      };
            login(loginPayload);
      window.location.href = "/dashboard";
    } catch (err) {
      setLoginMsg(err.message);
      setLoading("");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setSignupMsg("Please fill in all fields.");
      return;
    }
    if (signupPassword.length < 8) {
      setSignupMsg("Password must be at least 8 characters.");
      return;
    }
    const parts = signupName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || firstName;
    setLoading("signup");
    setSignupMsg("");
    try {
      const result = await apiRequest("/auth/signup", {
        method: "POST",
        auth: false,
        body: { firstName, lastName, email: signupEmail.trim(), password: signupPassword, username: signupEmail.split("@")[0] },
      });
            const authPayload = {
        user: result.user || result,
        tokens: result.tokens || result.session,
      };
            login(authPayload);
      localStorage.setItem("ogapay_is_new_user", "true");
      window.location.href = "/dashboard";
    } catch (err) {
      setSignupMsg(err.message);
    } finally {
      setLoading("");
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetMsg("Please enter your email address.");
      return;
    }
    setLoading("reset");
    setResetMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Something went wrong.");
      setResetMsg("If that email is registered, you will receive a reset link.");
      setLoading("");
    } catch (err) {
      setResetMsg(err.message);
      setLoading("");
    }
  };

  const show = (v) => setView(v);

  return <>
    <style>{`
      /* ── LOGIN PAGE SPECIFIC STYLES ── */
      .login-wrapper {
        width: 100%;
        max-width: 1350px;
        display: grid;
        grid-template-columns: 45% 55%;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 80px rgba(3,3,65,.14), 0 8px 32px rgba(3,3,65,.08);
        min-height: 880px;
        background: #fff;
        margin: 0 auto;
        position: relative;
      }
      .left {
        background: #030341;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        padding: 24px 36px 0;
        color: #fff;
        min-height: 880px;
      }
      .left-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
      .particles { position: absolute; inset: 0; }
      .particles span {
        position: absolute;
        width: 4px; height: 4px;
        border-radius: 50%;
        background: rgba(77,93,255,.3);
        animation: loginFloat 8s ease-in-out infinite;
      }
      .particles span:nth-child(1) { top: 18%; left: 12%; animation-delay: 0s; width: 5px; height: 5px; }
      .particles span:nth-child(2) { top: 42%; left: 68%; animation-delay: 2s; }
      .particles span:nth-child(3) { top: 65%; left: 22%; animation-delay: 4s; width: 6px; height: 6px; }
      .particles span:nth-child(4) { top: 28%; left: 78%; animation-delay: 1s; }
      .particles span:nth-child(5) { top: 72%; left: 52%; animation-delay: 3s; width: 5px; height: 5px; }
      .particles span:nth-child(6) { top: 12%; left: 44%; animation-delay: 5s; }
      .particles span:nth-child(7) { top: 55%; left: 8%; animation-delay: 2.5s; width: 3px; height: 3px; }
      .particles span:nth-child(8) { top: 85%; left: 74%; animation-delay: 4.5s; width: 5px; height: 5px; }
      .particles span:nth-child(9) { top: 22%; left: 45%; animation-delay: 1.5s; width: 3px; height: 3px; }
      .particles span:nth-child(10) { top: 50%; left: 82%; animation-delay: 3.5s; width: 4px; height: 4px; }
      .particles span:nth-child(11) { top: 78%; left: 35%; animation-delay: 5.5s; width: 3px; height: 3px; }
      .particles span:nth-child(12) { top: 35%; left: 15%; animation-delay: .8s; width: 5px; height: 5px; }
      @keyframes loginFloat { 0%,100%{transform:translateY(0) scale(1);opacity:.3} 50%{transform:translateY(-18px) scale(1.2);opacity:.6} }
      .wave {
        position: absolute;
        bottom: -15%; left: -15%;
        width: 130%; height: 400px;
        background: radial-gradient(ellipse at 50% 100%,rgba(77,93,255,.15),transparent 60%);
        opacity: .8;
        animation: wavePulse 6s ease-in-out infinite;
      }
      @keyframes wavePulse { 0%,100%{opacity:.5} 50%{opacity:.9} }
      .left-content { position: relative; z-index: 3; display: flex; flex-direction: column; flex: 0 0 auto; }
      .logo { display: flex; align-items: center; gap: 10px; font-family: "Outfit",sans-serif; font-size: 18px; font-weight: 800; margin-bottom: 16px; }
      .logo svg { width: 32px; height: 32px; border-radius: 8px; overflow: hidden; }
      .logo span { color: #fff; }
      .copy { flex: 0 0 auto; margin-bottom: 12px; }
      .copy h1 { font-family: "Outfit",sans-serif; font-size: clamp(32px,3.6vw,48px); font-weight: 900; line-height: 1.05; letter-spacing: -1.2px; margin: 0 0 4px; }
      .copy h1 span { display: block; }
      .glow { position: relative; display: inline-block; color: #fff; }
      .glow::after {
        content: "Repeat.";
        position: absolute; inset: 0;
        color: rgba(77,93,255,.7);
        filter: blur(10px);
        animation: pulseGlow 3s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes pulseGlow { 0%,100%{opacity:.4} 50%{opacity:.9} }
      .copy p { font-size: 15px; line-height: 1.55; color: rgba(255,255,255,.7); margin: 6px 0 12px; max-width: 420px; }
      .features { display: grid; gap: 7px; margin-bottom: 0; }
      .feature { display: flex; align-items: center; gap: 14px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,.85); }
      .feature svg { width: 22px; height: 22px; stroke: #4D5DFF; stroke-width: 2; fill: none; flex-shrink: 0; }
      .woman { position: relative; flex: 1; min-height: 300px; z-index: 1; display: flex; align-items: flex-start; justify-content: center; overflow: hidden; pointer-events: none; width: 100%; }
      .woman-fade { position: absolute; top: 0; left: 0; right: 0; height: 12%; z-index: 2; background: linear-gradient(to bottom,rgba(3,3,65,0.06),transparent 100%); pointer-events: none; }
      .stats-card {
        position: absolute; z-index: 10; display: flex; align-items: center; gap: 14px;
        padding: 18px 22px; background: rgba(255,255,255,.12);
        border: 1px solid rgba(77,93,255,.35); border-radius: 16px;
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        bottom: 36px; left: 32px; max-width: 270px; box-shadow: 0 8px 32px rgba(0,0,0,.3);
      }
      .stats-card .chart { width: 40px; height: 40px; display: grid; place-items: center; }
      .stats-card .chart svg { width: 36px; height: 36px; }
      .stats-card strong { display: block; font-family: "Outfit",sans-serif; font-size: 20px; font-weight: 900; line-height: 1; }
      .stats-card span { display: block; color: rgba(255,255,255,.65); font-size: 12px; font-weight: 600; margin-top: 4px; }
      .right { background: #fff; padding: 48px 48px 40px; display: flex; flex-direction: column; justify-content: center; min-height: 880px; }
      .right-inner { max-width: 400px; margin: 0 auto; width: 100%; }
      .right h2 { font-family: "Outfit",sans-serif; font-size: 32px; font-weight: 900; letter-spacing: -.8px; color: #0F172A; margin: 0 0 6px; }
      .right .sub { color: #66738a; font-size: 15px; margin: 0 0 28px; line-height: 1.5; }
      .auth-btns { display: flex; flex-direction: column; gap: 12px; }
      .auth-btn {
        display: flex; align-items: center; gap: 14px; height: 64px; padding: 0 20px;
        border: 1.5px solid #e3e9f2; border-radius: 16px; background: #fff;
        cursor: pointer; transition: all .2s; text-align: left; width: 100%; font: inherit;
      }
      .auth-btn:hover { border-color: #4D5DFF; box-shadow: 0 4px 16px rgba(77,93,255,.1); background: #fafbff; }
      .auth-btn-icon { width: 28px; height: 28px; display: grid; place-items: center; flex-shrink: 0; }
      .auth-btn-icon svg { width: 24px; height: 24px; }
      .auth-btn strong { font-size: 15px; font-weight: 600; color: #0F172A; }
      /* FIX 3: Add style for create account button */
      .auth-btn.create-account-btn {
        background: linear-gradient(135deg, #4D5DFF 0%, #667bff 100%);
        color: white;
        border: none;
        justify-content: center;
        text-align: center;
      }
      .auth-btn.create-account-btn strong {
        color: white;
      }
      .auth-btn.create-account-btn:hover {
        background: linear-gradient(135deg, #3d4feb 0%, #5568e8 100%);
        box-shadow: 0 6px 20px rgba(77,93,255,.25);
      }
      .divider {
        display: flex; align-items: center; gap: 16px; margin: 24px 0;
        color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
      }
      .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: #e3e9f2; }
      .security {
        border-top: 1px solid #e3e9f2; padding-top: 20px; margin-top: auto;
        display: flex; align-items: flex-start; gap: 12px;
      }
      .security svg { width: 20px; height: 20px; stroke: #94a3b8; stroke-width: 1.8; fill: none; flex-shrink: 0; margin-top: 1px; }
      .security strong { display: block; font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 2px; }
      .security span { font-size: 12px; color: #94a3b8; line-height: 1.4; }
      @media(max-width: 768px) {
        .login-wrapper { grid-template-columns: 1fr; min-height: auto; border-radius: 16px; }
        .left { min-height: auto; padding: 20px 20px 0; display: none; }
        .right { min-height: auto; padding: 32px 20px; }
        .right h2 { font-size: 28px; }
        .auth-btn { height: 56px; }
        .stats-card { display: none; }
        .woman { display: none; }
      }
      @media(max-width: 480px) {
        .right { padding: 24px 16px; }
        .auth-btn { height: 54px; gap: 12px; padding: 0 12px; border-radius: 14px; }
        .right h2 { font-size: 24px; }
      }
    `}</style>
    <header className="nav">
      <div className="nav-inner">
        <a className="brand" href="/" aria-label="OgaPay home">
          <span className="logo-mark"><LogoMark /></span>
          <span>Oga<span>Pay</span></span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a className="nav-link" href="/"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg>Home</a>
          <a className="nav-link" href="/tasks"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Tasks</a>
          <a className="nav-link" href="/store"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 1 1-8 0"/></svg>Store</a>

        </nav>
        <div className="nav-actions">
          <a className="wallet-btn" href="/login"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M3 10h18M7 15h.01"/></svg>Login</a>
          <a className="wallet-btn" href="/login?mode=signup">Get Started</a>
          {/* FIX 2: Add proper theme toggle with icon */}
          <button 
            className="icon-btn" 
            onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} 
            aria-label="Toggle dark mode"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              border: '1.5px solid #e3e9f2',
              background: theme === 'dark' ? '#4D5DFF' : '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all .2s'
            }}
          >
            {theme === 'dark' ? (
              <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="#4D5DFF" viewBox="0 0 24 24">
                <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
    <main style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 24px",minHeight:"calc(100vh - 60px)"}}>
      <div className="login-wrapper">
        {/* LEFT PANEL */}
        <div className="left">
          <div className="left-bg">
            <div className="particles">
              {Array.from({length: 12}, (_, i) => <span key={i} />)}
            </div>
            <div className="wave"></div>
          </div>
          <div className="left-content">
            <div className="logo">
              <LogoMark inverse />
              <span>OgaPay</span>
            </div>
            <div className="copy">
              <h1>
                <span>Work.</span>
                <span>Earn.</span>
                <span className="glow">Repeat.</span>
              </h1>
              <p>The modern earning marketplace for tasks, communities and rewards.</p>
              <div className="features">
                <div className="feature">
                  <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Complete simple tasks and earn rewards
                </div>
                <div className="feature">
                  <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Instant payouts in Naira and USDC
                </div>
                <div className="feature">
                  <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.74"/></svg>
                  Join verified communities
                </div>
                <div className="feature">
                  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>
                  Promote products and grow faster
                </div>
              </div>
            </div>
          </div>
          <div className="woman">
            <div className="woman-fade"></div>
            <img src={womanSvg} alt="" loading="lazy" style={{width:'110%',height:'auto',flexShrink:0,display:'block',marginTop:'-120px'}} />
          </div>
          <div className="stats-card">
            <div className="chart">
              <svg viewBox="0 0 36 36" fill="none"><path d="M4 28 L10 20 L16 24 L24 10 L32 14" stroke="#4D5DFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="24" cy="10" r="2" fill="#4D5DFF"/></svg>
            </div>
            <div>
              <strong>24,390+</strong>
              <span>Active Workers</span>
            </div>
          </div>
        </div>
        {/* RIGHT PANEL */}
        <div className="right">
          <div className="right-inner">
            {view === "default" && (
              <>
                <h2>Welcome Back</h2>
                <p className="sub">Sign in to continue earning with OgaPay</p>
                <div className="auth-btns">
                  {/* FIX 3: Add Create Account button below Google */}
                  <button className="auth-btn create-account-btn" onClick={() => show("signup")}>
                    <strong>Create Account</strong>
                  </button>
                  <button className="auth-btn" onClick={async () => { 
  try { 
    await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: window.location.origin + '/auth/callback' } 
    }); 
  } catch(e) { 
    console.warn('Supabase OAuth failed, trying backend redirect:', e.message);
    try {
      // Fallback: use backend /auth/google endpoint
      window.location.href = API_BASE + '/auth/google';
    } catch(e2) {
      window.location.href = '/login?error=auth_init_failed';
    }
  } 
}}>
                    <span className="auth-btn-icon"><GoogleIcon /></span>
                    <strong>Continue with Google</strong>
                  </button>
                  <button className="auth-btn" onClick={() => show("email")}>
                    <span className="auth-btn-icon">
                      <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M22 7l-10 6L2 7"/></svg>
                    </span>
                    <strong>Continue with Email</strong>
                  </button>
                  <button className="auth-btn" onClick={() => show("wallet")}>
                    <span className="auth-btn-icon">
                      <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="3"/><path d="M18 12h.01M4 12h4"/></svg>
                    </span>
                    <strong>Connect Wallet</strong>
                  </button>
                </div>
                <a href="#" onClick={(e) => { e.preventDefault(); show("forgot"); }} style={{display:'block',textAlign:'center',margin:'8px 0 4px',color:'#4D5DFF',fontSize:'14px',fontWeight:'600',textDecoration:'none'}}>Forgot password?</a>
                <div className="divider">OR</div>
                <p style={{textAlign:'center',margin:0,fontSize:'14px',color:'#66738a'}}>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); show("email"); }} style={{color:'#4D5DFF',fontWeight:700,textDecoration:'none'}}>Sign in</a></p>
              </>
            )}
            {view === "email" && (
              <form onSubmit={handleLogin}>
                <h2>Welcome Back</h2>
                <p className="sub">Sign in to continue earning with OgaPay</p>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Email address" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid #e3e9f2',borderRadius:'12px',fontSize:'14px',marginBottom:'12px',fontFamily:'inherit'}} />
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid #e3e9f2',borderRadius:'12px',fontSize:'14px',marginBottom:'16px',fontFamily:'inherit'}} />
                <button type="submit" disabled={loading === "login"} style={{width:'100%',height:'56px',border:'none',borderRadius:'14px',background:'#4D5DFF',color:'#fff',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>{loading === "login" ? <><i class="ti ti-loader" style={{animation:'spin 1s linear infinite',display:'inline-block'}} /> Signing in...</> : 'Sign In'}</button>
                {loginMsg && <p style={{fontSize:'13px',color:'#dc2626',margin:'10px 0 0',textAlign:'center'}}>{loginMsg}</p>}
                <p style={{textAlign:'center',margin:'14px 0 0'}}><a href="#" onClick={(e) => { e.preventDefault(); show("default"); }} style={{color:'#4D5DFF',fontSize:'13px',fontWeight:'600',textDecoration:'none'}}>Back to options</a></p>
              </form>
            )}
            {view === "signup" && (
              <form onSubmit={handleSignup}>
                <h2>Create account</h2>
                <p className="sub">Join OgaPay to start earning or promoting.</p>
                <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Full name" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid #e3e9f2',borderRadius:'12px',fontSize:'14px',marginBottom:'12px',fontFamily:'inherit'}} />
                <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="Email address" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid #e3e9f2',borderRadius:'12px',fontSize:'14px',marginBottom:'12px',fontFamily:'inherit'}} />
                <input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Password (min 8 chars, uppercase + number)" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid #e3e9f2',borderRadius:'12px',fontSize:'14px',marginBottom:'16px',fontFamily:'inherit'}} />
                <button type="submit" disabled={loading === "signup"} style={{width:'100%',height:'56px',border:'none',borderRadius:'14px',background:'#4D5DFF',color:'#fff',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>{loading === "signup" ? <><i class="ti ti-loader" style={{animation:'spin 1s linear infinite',display:'inline-block'}} /> Creating...</> : 'Create Account'}</button>
                {signupMsg && <p style={{fontSize:'13px',color:'#dc2626',margin:'10px 0 0',textAlign:'center'}}>{signupMsg}</p>}
                <p style={{textAlign:'center',margin:'14px 0 0'}}><a href="#" onClick={(e) => { e.preventDefault(); show("default"); }} style={{color:'#4D5DFF',fontSize:'13px',fontWeight:'600',textDecoration:'none'}}>Back to options</a></p>
              </form>
            )}
            {view === "wallet" && (
              <div>
                <h2>Connect Wallet</h2>
                <p className="sub">Connect your wallet to sign in.</p>
                <div style={{padding:'24px 0',textAlign:'center',border:'1.5px dashed #e3e9f2',borderRadius:'14px',marginBottom:'16px'}}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4D5DFF" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="3"/><path d="M18 12h.01M4 12h4"/></svg>
                  <p style={{color:'#66738a',fontSize:'14px',margin:'12px 0 0'}}>Connect your wallet SDK or Web3 provider to this action.</p>
                </div>
                <button style={{width:'100%',height:'56px',border:'none',borderRadius:'14px',background:'#4D5DFF',color:'#fff',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>Connect Wallet</button>
                <p style={{textAlign:'center',margin:'14px 0 0'}}><a href="#" onClick={(e) => { e.preventDefault(); show("default"); }} style={{color:'#4D5DFF',fontSize:'13px',fontWeight:'600',textDecoration:'none'}}>Back to options</a></p>
              </div>
            )}
            {view === "forgot" && (
              <form onSubmit={handleReset}>
                <h2>Reset Password</h2>
                <p className="sub">Enter your email address and we'll send you a link to reset your password.</p>
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Enter your email" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid #e3e9f2',borderRadius:'12px',fontSize:'14px',marginBottom:'16px',fontFamily:'inherit'}} />
                <button type="submit" disabled={loading === "reset"} style={{width:'100%',height:'56px',border:'none',borderRadius:'14px',background:'#4D5DFF',color:'#fff',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>{loading === "reset" ? <><i class="ti ti-loader" style={{animation:'spin 1s linear infinite',display:'inline-block'}} /> Sending...</> : 'Send Reset Link'}</button>
                {resetMsg && <p style={{fontSize:'13px',color: resetMsg.includes("receive") ? '#16a34a' : '#66738a',margin:'12px 0 0',textAlign:'center'}}>{resetMsg}</p>}
                <p style={{textAlign:'center',margin:'12px 0 0'}}><a href="#" onClick={(e) => { e.preventDefault(); show("default"); }} style={{color:'#4D5DFF',fontSize:'13px',fontWeight:'600',textDecoration:'none'}}>Back to options</a></p>
              </form>
            )}
            <div className="security">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              <div>
                <strong>Your security is our priority.</strong>
                <span>We never share your data with third parties.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </>;
}
