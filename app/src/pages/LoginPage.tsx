import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import womanSvg from "../assets/woman.svg";
import { supabase } from "../lib/supabaseClient";
import { API_BASE, apiRequest } from "../lib/api";
import Drawer from "../components/Drawer";
import { Logo } from "../components/Logo";

function LogoMark({ inverse = false }) {
  return (
    <span style={{ color: inverse ? '#191C6B' : '#fff', display: 'flex' }}>
      <Logo size={32} />
    </span>
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
  const { login, isAuthed, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Show branded loader while auth state is being determined
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fff', flexDirection: 'column', gap: 16 }}>
        <Logo size={48} />
        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(25,28,107,0.2)', borderTopColor: '#191C6B' }} />
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthed) {
    return <Navigate to="/dashboard" replace />;
  }
  
  const [drawerOpen, setDrawerOpen] = useState(false);

  // lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);
  
  const [view, setView] = useState("default");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem("ogapay_remember_email") || "");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [signupMsg, setSignupMsg] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [loading, setLoading] = useState("");
  const [walletSub, setWalletSub] = useState("default");
  const [txRef, setTxRef] = useState("");
  const [txMsg, setTxMsg] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [pairMsg, setPairMsg] = useState("");
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [signupShowPw, setSignupShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem("ogapay_remember_email"));

  // ── 2FA Challenge ──────────────────────────────────────────────────────────
  const [show2FAChallenge, setShow2FAChallenge] = useState(false)
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [twoFactorUserId, setTwoFactorUserId] = useState('')
  const [twoFactorChallengeCode, setTwoFactorChallengeCode] = useState('')
  const [twoFactorChallengeError, setTwoFactorChallengeError] = useState('')
  const [verifying2FAChallenge, setVerifying2FAChallenge] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setView("signup");
    const ref = params.get("ref");
    if (ref) localStorage.setItem("ogapay_referral", ref);
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setLoginMsg("Please enter your email and password.");
      return;
    }
    setLoading("login");
    setLoginMsg("");
    try {
      const result = await apiRequest<any>("/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });

      // Check if 2FA is required
      if (result?.requiresTwoFactor && result?.challengeToken) {
        setTwoFactorToken(result.challengeToken)
        setTwoFactorUserId(result.userId)
        setShow2FAChallenge(true)
        setLoading("")
        return
      }

      
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
      if (rememberMe) {
        localStorage.setItem("ogapay_remember_email", loginEmail.trim());
      } else {
        localStorage.removeItem("ogapay_remember_email");
      }
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setLoginMsg(err.message);
      setLoading("");
    }
  };

  // ── 2FA Challenge Submit ───────────────────────────────────────────────────
  const handle2FAChallenge = async (e: any) => {
    e.preventDefault();
    if (!twoFactorChallengeCode.trim() || twoFactorChallengeCode.length < 6) {
      setTwoFactorChallengeError('Enter your 6-digit authentication code')
      return
    }
    setVerifying2FAChallenge(true)
    setTwoFactorChallengeError('')
    try {
      const result = await apiRequest<any>('/auth/2fa/challenge', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          challengeToken: twoFactorToken,
          userId: twoFactorUserId,
          token: twoFactorChallengeCode.trim(),
        }),
      })

      const possibleToken =
        result?.tokens?.accessToken ||
        result?.tokens?.token ||
        result?.accessToken ||
        result?.token ||
        null

      const possibleRefresh =
        result?.tokens?.refreshToken ||
        result?.refreshToken ||
        possibleToken

      const loginPayload = {
        user: result.user || result,
        tokens: possibleToken ? { accessToken: possibleToken, refreshToken: possibleRefresh || possibleToken } : undefined,
      }
      login(loginPayload)
      navigate('/dashboard')
    } catch (err: any) {
      setTwoFactorChallengeError(err.message || 'Invalid code')
    } finally {
      setVerifying2FAChallenge(false)
    }
  }

  const handleSignup = async (e: any) => {
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
      const refCode = localStorage.getItem("ogapay_referral") || "";
      const body: any = { firstName, lastName, email: signupEmail.trim(), password: signupPassword, username: signupEmail.split("@")[0] };
      if (refCode) body.referralCode = refCode;
      const result = await apiRequest<any>("/auth/signup", {
        method: "POST",
        auth: false,
        body: JSON.stringify(body),
      });
            const authPayload = {
        user: result.user || result,
        tokens: result.tokens || result.session,
      };
            login(authPayload);
      localStorage.setItem("ogapay_is_new_user", "true");
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setSignupMsg(err.message);
    } finally {
      setLoading("");
    }
  };

  const handleReset = async (e: any) => {
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
    } catch (err: any) {
      setResetMsg(err.message);
      setLoading("");
    }
  };

  const show = (v: string) => { setView(v); if (v === "wallet") setWalletSub("default"); if (v === "default") setAuthMode("signin"); if (v === "signup") setAuthMode("signup"); };

  const handleTxLogin = async (e: any) => {
    e.preventDefault();
    if (!txRef.trim()) { setTxMsg("Please enter a transaction reference."); return; }
    setLoading("tx");
    setTxMsg("");
    try {
      const result = await apiRequest<any>("/auth/tx-login", {
        method: "POST", auth: false,
        body: JSON.stringify({ reference: txRef.trim() })
      });
      const possibleToken = result?.accessToken || result?.token || result?.data?.accessToken || result?.tokens?.accessToken;
      const loginPayload = {
        user: result.user || result,
        tokens: possibleToken ? { accessToken: possibleToken, refreshToken: result?.refreshToken || result?.tokens?.refreshToken || possibleToken } : undefined,
      };
      login(loginPayload);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setTxMsg(err.message);
      setLoading("");
    }
  };

  const handlePairDevice = async (e: any) => {
    e.preventDefault();
    if (!pairCode.trim()) { setPairMsg("Please enter a pairing code."); return; }
    setLoading("pair");
    setPairMsg("");
    try {
      const result = await apiRequest<any>("/auth/pair", {
        method: "POST", auth: false,
        body: JSON.stringify({ code: pairCode.trim() })
      });
      const possibleToken = result?.accessToken || result?.token || result?.data?.accessToken || result?.tokens?.accessToken;
      const loginPayload = {
        user: result.user || result,
        tokens: possibleToken ? { accessToken: possibleToken, refreshToken: result?.refreshToken || result?.tokens?.refreshToken || possibleToken } : undefined,
      };
      login(loginPayload);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setPairMsg(err.message);
      setLoading("");
    }
  };

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
        min-height: 0;
        background: #fff;
        margin: 0 auto;
        position: relative;
      }
      .left {
        background: #191C6B;
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
        background: rgba(var(--accent-rgb),.3);
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
        background: radial-gradient(ellipse at 50% 100%,rgba(var(--accent-rgb),.15),transparent 60%);
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
        color: rgba(var(--accent-rgb),.7);
        filter: blur(10px);
        animation: pulseGlow 3s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes pulseGlow { 0%,100%{opacity:.4} 50%{opacity:.9} }
      .copy p { font-size: 15px; line-height: 1.55; color: rgba(255,255,255,.7); margin: 6px 0 12px; max-width: 420px; }
      .features { display: grid; gap: 7px; margin-bottom: 0; }
      .feature { display: flex; align-items: center; gap: 14px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,.85); }
      .feature svg { width: 22px; height: 22px; stroke: var(--accent); stroke-width: 2; fill: none; flex-shrink: 0; }
      .woman { position: relative; flex: 1; min-height: 300px; z-index: 1; display: flex; align-items: flex-start; justify-content: center; overflow: hidden; pointer-events: none; width: 100%; }
      .woman-fade { position: absolute; top: 0; left: 0; right: 0; height: 12%; z-index: 2; background: linear-gradient(to bottom,rgba(3,3,65,0.06),transparent 100%); pointer-events: none; }
      .stats-card {
        position: absolute; z-index: 10; display: flex; align-items: center; gap: 14px;
        padding: 18px 22px; background: rgba(255,255,255,.12);
        border: 1px solid rgba(var(--accent-rgb),.35); border-radius: 16px;
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        bottom: 36px; left: 32px; max-width: 270px; box-shadow: 0 8px 32px rgba(0,0,0,.3);
      }
      .stats-card .chart { width: 40px; height: 40px; display: grid; place-items: center; }
      .stats-card .chart svg { width: 36px; height: 36px; }
      .stats-card strong { display: block; font-family: "Outfit",sans-serif; font-size: 20px; font-weight: 900; line-height: 1; }
      .stats-card span { display: block; color: rgba(255,255,255,.65); font-size: 12px; font-weight: 600; margin-top: 4px; }
      .right { background: #fff; padding: 40px 48px; display: flex; flex-direction: column; justify-content: center; min-height: 880px; }
      .right-inner { max-width: 400px; margin: 0 auto; width: 100%; }
      .right h2 { font-family: "Outfit",sans-serif; font-size: 32px; font-weight: 900; letter-spacing: -.8px; color: var(--text); margin: 0 0 6px; }
      .right .sub { color: var(--text2); font-size: 15px; margin: 0 0 28px; line-height: 1.5; }
      .auth-btns { display: flex; flex-direction: column; gap: 12px; }
      .auth-btn {
        display: flex; align-items: center; gap: 14px; height: 64px; padding: 0 20px;
        border: 1.5px solid var(--border); border-radius: 16px; background: #fff;
        cursor: pointer; transition: all .2s; text-align: left; width: 100%; font: inherit;
      }
      .auth-btn:hover { border-color: var(--accent); box-shadow: 0 4px 16px rgba(var(--accent-rgb),.1); background: #fafbff; }
      .auth-btn-icon { width: 28px; height: 28px; display: grid; place-items: center; flex-shrink: 0; }
      .auth-btn-icon svg { width: 24px; height: 24px; }
      .auth-btn strong { font-size: 15px; font-weight: 600; color: var(--text); }
      /* FIX 3: Add style for create account button */
      .auth-btn.create-account-btn {
        background: linear-gradient(135deg, var(--accent) 0%, #667bff 100%);
        color: white;
        border: none;
        justify-content: center;
        text-align: center;
      }
      .auth-btn.create-account-btn strong {
        color: white;
      }
      .auth-btn.create-account-btn:hover {
        background: linear-gradient(135deg, var(--accent) 0%, #5568e8 100%);
        box-shadow: 0 6px 20px rgba(var(--accent-rgb),.25);
      }
      .divider {
        display: flex; align-items: center; gap: 16px; margin: 24px 0;
        color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
      }
      .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--border); }
      .security {
        border-top: 1px solid var(--border); padding-top: 20px; margin-top: auto;
        display: flex; align-items: flex-start; gap: 12px;
      }
      .security svg { width: 20px; height: 20px; stroke: #94a3b8; stroke-width: 1.8; fill: none; flex-shrink: 0; margin-top: 1px; }
      .security strong { display: block; font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
      .security span { font-size: 12px; color: #94a3b8; line-height: 1.4; }
      @media(max-width: 768px) {
        .login-wrapper { grid-template-columns: 1fr; min-height: auto; border-radius: 16px; box-shadow: none; }
        .left { display: none !important; }
        .right { min-height: auto; padding: 24px 20px; }
        .right h2 { font-size: 26px; }
        .right .sub { margin-bottom: 20px; font-size: 14px; }
        .auth-btn { height: 54px; }
        .stats-card { display: none; }
        .woman { display: none; }
        .security { display: none; }
      }
      @media(max-width: 480px) {
        .right { padding: 20px 16px; }
        .auth-btn { height: 50px; gap: 10px; padding: 0 12px; border-radius: 12px; }
        .right h2 { font-size: 22px; }
        .right .sub { margin-bottom: 16px; }
      }
      [data-theme="dark"] .login-wrapper { background: var(--card); box-shadow: 0 24px 80px rgba(0,0,0,.3), 0 8px 32px rgba(0,0,0,.2); }
      [data-theme="dark"] .right { background: var(--card); }
      [data-theme="dark"] .right h2 { color: var(--text); }
      [data-theme="dark"] .right .sub { color: var(--text2); }
      [data-theme="dark"] .auth-btn { background: var(--card); border-color: var(--border); }
      [data-theme="dark"] .auth-btn:hover { background: var(--bg2); border-color: var(--accent); }
      [data-theme="dark"] .auth-btn strong { color: var(--text); }
      [data-theme="dark"] .divider { color: var(--text3); }
      [data-theme="dark"] .divider::before, [data-theme="dark"] .divider::after { background: var(--border); }
      [data-theme="dark"] .security { border-top-color: var(--border); }
      [data-theme="dark"] .security strong { color: var(--text); }
      [data-theme="dark"] .security span { color: var(--text3); }
      [data-theme="dark"] .security svg { stroke: var(--text3); }
      [data-theme="dark"] .woman-fade { background: linear-gradient(to bottom,rgba(0,0,0,0.12),transparent 100%); }
    `}</style>
    {/* Minimalist header — no nav links on login page */}
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
      background: 'var(--bg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: '"Outfit",sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
        <Logo size={28} />
        <span>OgaPay</span>
      </div>
      <button onClick={() => setDrawerOpen(true)} style={{
        width: 34, height: 34, border: 'none', borderRadius: 8,
        background: 'transparent', color: 'var(--text2)',
        cursor: 'pointer', display: 'grid', placeItems: 'center',
        marginLeft: 'auto', fontSize: 20,
      }}>
        <i className="ti ti-menu-2" />
      </button>
    </div>
    <main style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"12px 16px",minHeight:"calc(100dvh)",boxSizing:"border-box"}}>
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
              <svg viewBox="0 0 36 36" fill="none"><path d="M4 28 L10 20 L16 24 L24 10 L32 14" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="24" cy="10" r="2" fill="var(--accent)"/></svg>
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
            {view === "default" && authMode === "signin" && (
              <>
                <h2>Welcome Back</h2>
                <p className="sub">Sign in to continue earning with OgaPay</p>
                <div className="auth-btns">
                  <button className="auth-btn" onClick={() => show("email")}>
                    <span className="auth-btn-icon">
                      <i className="ti ti-mail" style={{fontSize:20}} />
                    </span>
                    <strong>Sign In</strong>
                  </button>
                  <button className="auth-btn" onClick={async () => { 
  try { 
    await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: window.location.origin + '/auth/callback' } 
    }); 
  } catch(e: any) { 
    console.warn('Supabase OAuth failed, trying backend redirect:', e.message);
    try {
      window.location.href = API_BASE + '/auth/google';
    } catch(e2: any) {
      window.location.href = '/login?error=auth_init_failed';
    }
  } 
}}>
                    <span className="auth-btn-icon"><GoogleIcon /></span>
                    <strong>Continue with Google</strong>
                  </button>
                  <button className="auth-btn" onClick={() => show("wallet")}>
                    <span className="auth-btn-icon" style={{color:'var(--accent)'}}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 8V5a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4"/>
                        <path d="M18 13h-3a2 2 0 0 1 0-4h3"/>
                        <circle cx="17.5" cy="12" r=".5" fill="currentColor"/>
                      </svg>
                    </span>
                    <strong>Connect Wallet</strong>
                  </button>
                </div>
                <div className="divider">OR</div>
                <p style={{textAlign:'center',margin:0,fontSize:'14px',color:'var(--text2)'}}>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode("signup"); }} style={{color:'var(--accent)',fontWeight:700,textDecoration:'none'}}>Create one</a></p>
              </>
            )}
            {view === "default" && authMode === "signup" && (
              <>
                <h2>Create your account</h2>
                <p className="sub">Join OgaPay to start earning or promoting.</p>
                <div className="auth-btns">
                  <button className="auth-btn" onClick={() => show("signup")}>
                    <span className="auth-btn-icon">
                      <i className="ti ti-mail" style={{fontSize:20}} />
                    </span>
                    <strong>Create Account</strong>
                  </button>
                  <button className="auth-btn" onClick={async () => { 
  try { 
    await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: window.location.origin + '/auth/callback' } 
    }); 
  } catch(e: any) { 
    console.warn('Supabase OAuth failed, trying backend redirect:', e.message);
    try {
      window.location.href = API_BASE + '/auth/google';
    } catch(e2: any) {
      window.location.href = '/login?error=auth_init_failed';
    }
  } 
}}>
                    <span className="auth-btn-icon"><GoogleIcon /></span>
                    <strong>Continue with Google</strong>
                  </button>
                  <button className="auth-btn" onClick={() => show("wallet")}>
                    <span className="auth-btn-icon" style={{color:'var(--accent)'}}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 8V5a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4"/>
                        <path d="M18 13h-3a2 2 0 0 1 0-4h3"/>
                        <circle cx="17.5" cy="12" r=".5" fill="currentColor"/>
                      </svg>
                    </span>
                    <strong>Connect Wallet</strong>
                  </button>
                </div>
                <div className="divider">OR</div>
                <p style={{textAlign:'center',margin:0,fontSize:'14px',color:'var(--text2)'}}>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode("signin"); }} style={{color:'var(--accent)',fontWeight:700,textDecoration:'none'}}>Sign in</a></p>
              </>
            )}
            {view === "email" && (
              <form onSubmit={handleLogin}>
                <h2>Welcome Back</h2>
                <p className="sub">Sign in to continue earning with OgaPay</p>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Email address" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid var(--border)',borderRadius:'12px',fontSize:'14px',marginBottom:'12px',fontFamily:'inherit'}} />
                <div style={{position:'relative',width:'100%',marginBottom:'4px'}}>
                  <input type={loginShowPw?'text':'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" style={{width:'100%',height:'56px',padding:'0 48px 0 16px',border:'1.5px solid var(--border)',borderRadius:'12px',fontSize:'14px',fontFamily:'inherit',boxSizing:'border-box'}} />
                  <button type="button" onClick={() => setLoginShowPw(!loginShowPw)} tabIndex={-1} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',padding:'4px',color:'var(--text3)',fontSize:'18px',display:'flex',alignItems:'center'}}>{loginShowPw ? <i className="ti ti-eye-off" /> : <i className="ti ti-eye" />}</button>
                </div>
                <label style={{display:'flex',alignItems:'center',gap:'8px',margin:'0 0 8px',fontSize:'13px',color:'var(--text2)',cursor:'pointer'}}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{accentColor:'var(--accent)',width:'16px',height:'16px',cursor:'pointer'}} />
                  Remember me
                </label>
                <div style={{textAlign:'right',marginBottom: 16}}>
                  <a href="#" onClick={(e) => { e.preventDefault(); show("forgot"); }} style={{color:'var(--accent)',fontSize:'13px',fontWeight:'600',textDecoration:'none'}}>Forgot password?</a>
                </div>
                <button type="submit" disabled={loading === "login"} style={{width:'100%',height:'56px',border:'none',borderRadius:'14px',background:'var(--accent)',color:'#fff',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>{loading === "login" ? <><i className="ti ti-loader" style={{animation:'spin 1s linear infinite',display:'inline-block'}} /> Signing in...</> : 'Sign In'}</button>
                {loginMsg && <p style={{fontSize:'13px',color:'#dc2626',margin:'10px 0 0',textAlign:'center'}}>{loginMsg}</p>}
                <p style={{textAlign:'center',margin:'14px 0 0'}}><a href="#" onClick={(e) => { e.preventDefault(); show("default"); }} style={{color:'var(--accent)',fontSize:'13px',fontWeight:'600',textDecoration:'none'}}>Back to options</a></p>
              </form>
            )}
            {view === "signup" && (
              <form onSubmit={handleSignup}>
                <h2>Create account</h2>
                <p className="sub">Join OgaPay to start earning or promoting.</p>
                <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Full name" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid var(--border)',borderRadius:'12px',fontSize:'14px',marginBottom:'12px',fontFamily:'inherit'}} />
                <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="Email address" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid var(--border)',borderRadius:'12px',fontSize:'14px',marginBottom:'12px',fontFamily:'inherit'}} />
                <div style={{position:'relative',width:'100%',marginBottom:'16px'}}>
                  <input type={signupShowPw?'text':'password'} value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Password (min 8 characters)" style={{width:'100%',height:'56px',padding:'0 48px 0 16px',border:'1.5px solid var(--border)',borderRadius:'12px',fontSize:'14px',fontFamily:'inherit',boxSizing:'border-box'}} />
                  <button type="button" onClick={() => setSignupShowPw(!signupShowPw)} tabIndex={-1} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',padding:'4px',color:'var(--text3)',fontSize:'18px',display:'flex',alignItems:'center'}}>{signupShowPw ? <i className="ti ti-eye-off" /> : <i className="ti ti-eye" />}</button>
                </div>
                <button type="submit" disabled={loading === "signup"} style={{width:'100%',height:'56px',border:'none',borderRadius:'14px',background:'var(--accent)',color:'#fff',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>{loading === "signup" ? <><i className="ti ti-loader" style={{animation:'spin 1s linear infinite',display:'inline-block'}} /> Creating...</> : 'Create Account'}</button>
                {signupMsg && <p style={{fontSize:'13px',color:'#dc2626',margin:'10px 0 0',textAlign:'center'}}>{signupMsg}</p>}
                <p style={{textAlign:'center',margin:'14px 0 0'}}><a href="#" onClick={(e) => { e.preventDefault(); show("default"); }} style={{color:'var(--accent)',fontSize:'13px',fontWeight:'600',textDecoration:'none'}}>Back to options</a></p>
              </form>
            )}
            {view === "wallet" && walletSub === "default" && (
              <div>
                <h2>Connect Wallet</h2>
                <p className="sub">Link your wallet or sign in another way.</p>
                <div className="auth-btns">
                  <button className="auth-btn" onClick={() => setWalletSub("transaction")}>
                    <span className="auth-btn-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </span>
                    <strong>Verify with Transaction ID</strong>
                  </button>
                  <button className="auth-btn" onClick={() => setWalletSub("pair")}>
                    <span className="auth-btn-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11v6"/><path d="M9 14h6"/></svg>
                    </span>
                    <strong>Pair a Device</strong>
                  </button>
                </div>
                <p style={{textAlign:'center',margin:'14px 0 0'}}><a href="#" onClick={(e) => { e.preventDefault(); show("default"); }} style={{color:'var(--accent)',fontSize:'13px',fontWeight:'600',textDecoration:'none'}}>Back to options</a></p>
              </div>
            )}
            {view === "wallet" && walletSub === "transaction" && (
              <form onSubmit={handleTxLogin}>
                <h2>Verify with Transaction ID</h2>
                <p className="sub">Enter a transaction reference sent to your email or phone.</p>
                <input type="text" value={txRef} onChange={e => setTxRef(e.target.value)} placeholder="Transaction reference" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid var(--border)',borderRadius:'12px',fontSize:'14px',marginBottom:'12px',fontFamily:'inherit'}} />
                <button type="submit" disabled={loading === "tx"} style={{width:'100%',height:'56px',border:'none',borderRadius:'14px',background:'var(--accent)',color:'#fff',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>{loading === "tx" ? 'Verifying...' : 'Verify & Sign In'}</button>
                {txMsg && <p style={{fontSize:'13px',color:'#dc2626',margin:'10px 0 0',textAlign:'center'}}>{txMsg}</p>}
                <p style={{textAlign:'center',margin:'14px 0 0'}}><a href="#" onClick={(e) => { e.preventDefault(); setWalletSub("default"); }} style={{color:'var(--accent)',fontSize:'13px',fontWeight:'600',textDecoration:'none'}}>Back</a></p>
              </form>
            )}
            {view === "wallet" && walletSub === "pair" && (
              <div>
                <h2>Pair Device</h2>
                <p>Enter your pairing code to sign in</p>

                <input value={pairCode} onChange={e => setPairCode(e.target.value)}
                  placeholder="Enter pairing code"
                  style={{width:'100%',padding:'10px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--bg)',marginBottom:12,fontFamily:'inherit'}} />

                <button onClick={handlePairDevice} style={{width:'100%',padding:'12px',borderRadius:8,background:'var(--accent)',color:'#fff',border:'none',fontWeight:700,cursor:'pointer',marginBottom:12}}>
                  Login
                </button>

                {/* Info Box */}
                <div style={{background:'rgba(var(--accent-rgb),0.1)',border:'1px solid rgba(var(--accent-rgb),0.3)',borderRadius:8,padding:12,marginBottom:12}}>
                  <div style={{fontWeight:700,color:'var(--accent)',marginBottom:4}}>Need a pairing code?</div>
                  <div style={{fontSize:12,color:'var(--text2)'}}>Sign in to your account → Go to Profile → Select "Device Pair" to generate a code</div>
                </div>

                {/* Expiry Info */}
                <div style={{fontSize:11,color:'var(--text3)',textAlign:'center',marginBottom:12}}>
                  Codes expire after 5 minutes - Single use only
                </div>

                <button onClick={() => setWalletSub("default")} style={{width:'100%',padding:'12px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',fontWeight:700,cursor:'pointer'}}>
                  Back
                </button>
              </div>
            )}
            {view === "forgot" && (
              <form onSubmit={handleReset}>
                <h2>Reset Password</h2>
                <p className="sub">Enter your email address and we'll send you a link to reset your password.</p>
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Enter your email" style={{width:'100%',height:'56px',padding:'0 16px',border:'1.5px solid var(--border)',borderRadius:'12px',fontSize:'14px',marginBottom:'16px',fontFamily:'inherit'}} />
                <button type="submit" disabled={loading === "reset"} style={{width:'100%',height:'56px',border:'none',borderRadius:'14px',background:'var(--accent)',color:'#fff',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>{loading === "reset" ? <><i className="ti ti-loader" style={{animation:'spin 1s linear infinite',display:'inline-block'}} /> Sending...</> : 'Send Reset Link'}</button>
                {resetMsg && <p style={{fontSize:'13px',color: resetMsg.includes("receive") ? 'var(--green)' : 'var(--text2)',margin:'12px 0 0',textAlign:'center'}}>{resetMsg}</p>}
                <p style={{textAlign:'center',margin:'12px 0 0'}}><a href="#" onClick={(e) => { e.preventDefault(); show("default"); }} style={{color:'var(--accent)',fontSize:'13px',fontWeight:'600',textDecoration:'none'}}>Back to options</a></p>
              </form>
            )}
            {show2FAChallenge && (
              <form onSubmit={handle2FAChallenge} style={{ textAlign: 'center' }}>
                <h2>Two-Factor Authentication</h2>
                <p className="sub" style={{ marginBottom: 20 }}>
                  Enter the 6-digit code from your authenticator app to continue.
                </p>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  value={twoFactorChallengeCode}
                  onChange={e => setTwoFactorChallengeCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={{
                    width: 180, height: 52, padding: '0 12px', borderRadius: 12,
                    border: '1.5px solid var(--border)', background: 'var(--card)',
                    fontSize: 22, fontWeight: 700, textAlign: 'center',
                    fontFamily: 'monospace', letterSpacing: 6, marginBottom: 16,
                  }}
                />
                <button type="submit" disabled={verifying2FAChallenge || twoFactorChallengeCode.length < 6}
                  style={{
                    width: '100%', height: 48, border: 'none', borderRadius: 14,
                    background: verifying2FAChallenge ? 'var(--accent-dim)' : 'var(--accent)',
                    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    opacity: twoFactorChallengeCode.length < 6 ? 0.6 : 1,
                  }}>
                  {verifying2FAChallenge ? 'Verifying…' : 'Verify & Sign In'}
                </button>
                {twoFactorChallengeError && (
                  <p style={{ fontSize: 13, color: '#dc2626', margin: '10px 0 0' }}>{twoFactorChallengeError}</p>
                )}
                <p style={{ textAlign: 'center', margin: '14px 0 0' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShow2FAChallenge(false); setTwoFactorChallengeCode(''); setTwoFactorChallengeError(''); }}
                    style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    Back to sign in
                  </a>
                </p>
              </form>
            )}
            <div className="security">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              <div>
                <strong>Secured by Flutterwave</strong>
                <span>256-bit encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
  </>;
}

