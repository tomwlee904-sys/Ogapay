// @ts-nocheck
import { useState, useEffect } from "react";

const API_BASE = "https://ogapay-production.up.railway.app/api/v1";

/* ─── Icons ─────────────────────────────────────────────────────────────────── */
const I = ({ n, s = 18, c = "currentColor" }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0 }} />
);

/* ─── Logo ───────────────────────────────────────────────────────────────────── */
function LogoMark({ size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), overflow: "hidden", flexShrink: 0, boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
      <svg width={size} height={size} viewBox="0 0 512 512" fill="none" style={{ display: "block" }}>
        <rect width="512" height="512" fill="white"/>
        <rect x="98" y="98" width="107" height="107" rx="20" fill="black"/>
        <path d="M225 98H312C323 98 332 107 332 118V205H225V98Z" fill="black"/>
        <path d="M352 98H392C440 98 470 128 470 176V205H352V98Z" fill="black"/>
        <rect x="98" y="225" width="107" height="107" fill="black"/>
        <rect x="225" y="225" width="107" height="107" fill="black"/>
        <path d="M352 225H470V254C470 302 440 332 392 332H352V225Z" fill="black"/>
        <rect x="98" y="352" width="107" height="107" rx="20" fill="black"/>
        <path d="M225 352H312C323 352 332 361 332 372V439C332 450 323 459 312 459H225V352Z" fill="black"/>
      </svg>
    </div>
  );
}

/* ─── Auth Pages ─────────────────────────────────────────────────────────────── */
function RegisterPage({ onRegister, goLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password) return setError("All fields are required");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    setLoading(true);
    try {
      const parts = name.trim().split(/\s+/);
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: parts[0], lastName: parts.slice(1).join(" ") || "", email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Registration failed");
      onRegister(data.user || { name: name.trim(), email: email.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-inner">
          <div className="auth-left-brand">
            <LogoMark size={28} />
            <span>OgaPay</span>
          </div>
          <div className="auth-left-copy">
            <h2>Create your account</h2>
            <p>Join Nigeria's #1 microtask marketplace and start earning today.</p>
          </div>
          <div className="auth-left-stats">
            <div className="auth-stat">
              <span className="auth-stat-val">2.4M+</span>
              <span className="auth-stat-lbl">Paid Out</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-val">18K+</span>
              <span className="auth-stat-lbl">Workers</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-val">94K+</span>
              <span className="auth-stat-lbl">Tasks Done</span>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-box">
          <h1>Get started</h1>
          <p className="auth-sub">Create an account to start earning.</p>
          {error && <div className="auth-error"><I n="alert-circle" s={14} /> {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="af-group">
              <label>Full name</label>
              <input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            </div>
            <div className="af-group">
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="af-group">
              <label>Password</label>
              <input type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <button className="af-submit" type="submit" disabled={loading}>
              {loading ? <span className="af-spinner" /> : null}
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
          <p className="auth-switch">
            Already have an account? <a href="#" onClick={e => { e.preventDefault(); goLogin(); }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin, goRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("All fields are required");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Login failed");
      onLogin(data.user || { email: email.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-inner">
          <div className="auth-left-brand">
            <LogoMark size={28} />
            <span>OgaPay</span>
          </div>
          <div className="auth-left-copy">
            <h2>Welcome back</h2>
            <p>Sign in to your account and continue earning.</p>
          </div>
          <div className="auth-left-stats">
            <div className="auth-stat">
              <span className="auth-stat-val">2.4M+</span>
              <span className="auth-stat-lbl">Paid Out</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-val">18K+</span>
              <span className="auth-stat-lbl">Workers</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-val">94K+</span>
              <span className="auth-stat-lbl">Tasks Done</span>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-box">
          <h1>Sign in</h1>
          <p className="auth-sub">Welcome back to OgaPay.</p>
          {error && <div className="auth-error"><I n="alert-circle" s={14} /> {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="af-group">
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="af-group">
              <label>Password</label>
              <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <button className="af-submit" type="submit" disabled={loading}>
              {loading ? <span className="af-spinner" /> : null}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="auth-switch">
            Don't have an account? <a href="#" onClick={e => { e.preventDefault(); goRegister(); }}>Create one</a>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Root Auth Component ────────────────────────────────────────────────────── */
export default function OgaPayAuth() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ogapay_user");
      if (saved) { setUser(JSON.parse(saved)); setScreen("dashboard"); }
    } catch {}
  }, []);

  const handleRegister = (u) => {
    try { localStorage.setItem("ogapay_user", JSON.stringify(u)); } catch {}
    try { localStorage.setItem("ogapay-authenticated", "true"); } catch {}
    setUser(u);
    window.location.href = "/dashboard";
  };

  const handleLogin = (u) => {
    try { localStorage.setItem("ogapay_user", JSON.stringify(u)); } catch {}
    try { localStorage.setItem("ogapay-authenticated", "true"); } catch {}
    setUser(u);
    window.location.href = "/dashboard";
  };

  const handleLogout = () => {
    try { localStorage.removeItem("ogapay_user"); } catch {}
    try { localStorage.removeItem("ogapay-authenticated"); } catch {}
    setUser(null);
    setScreen("login");
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: "DM Sans", sans-serif; background: #fff; color: #111; overflow-x: hidden; margin: 0; }

        .auth-page {
          min-height: 100vh; display: grid;
          grid-template-columns: 1fr 1.1fr;
          background: #fff;
        }
        .auth-left {
          background: #000;
          padding: 48px 52px;
          display: flex; flex-direction: column;
          justify-content: space-between;
          position: relative; overflow: hidden;
        }
        .auth-left::before {
          content: "";
          position: absolute; inset: 0;
          background: radial-gradient(circle at 20% 20%, rgba(31,140,255,.15), transparent 40%),
                      radial-gradient(circle at 80% 80%, rgba(31,140,255,.1), transparent 40%);
          pointer-events: none;
        }
        .auth-left-inner { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; }
        .auth-left-brand {
          display: flex; align-items: center; gap: 12px;
          font-family: "Outfit", sans-serif; font-size: 22px; font-weight: 800;
          color: #fff;
        }
        .auth-left-copy { margin-top: auto; padding-bottom: 40px; }
        .auth-left-copy h2 {
          font-family: "Outfit", sans-serif;
          font-size: clamp(28px, 3vw, 42px); font-weight: 900;
          line-height: 1.05; letter-spacing: -1.5px; color: #fff; margin-bottom: 16px;
        }
        .auth-left-copy p { font-size: 15px; color: rgba(255,255,255,.55); line-height: 1.6; max-width: 340px; }
        .auth-left-stats { display: flex; gap: 28px; margin-top: auto; position: relative; z-index: 1; }
        .auth-stat-val {
          font-family: "Outfit", sans-serif; font-size: 26px; font-weight: 900;
          background: linear-gradient(90deg,#1F8CFF,#60A5FA);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          display: block;
        }
        .auth-stat-lbl { font-size: 11px; color: rgba(255,255,255,.4); font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }

        .auth-right {
          display: flex; align-items: center; justify-content: center;
          padding: 48px 52px; background: #fff;
        }
        .auth-form-box { width: 100%; max-width: 380px; }
        .auth-form-box h1 {
          font-family: "Outfit", sans-serif; font-size: 30px; font-weight: 900;
          letter-spacing: -1px; color: #111; margin-bottom: 6px;
        }
        .auth-sub { font-size: 14px; color: #71717a; margin-bottom: 28px; }
        .auth-error {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: 10px;
          background: #fef2f2; color: #dc2626;
          font-size: 13px; font-weight: 600; margin-bottom: 16px;
        }
        .af-group { margin-bottom: 18px; }
        .af-group label {
          display: block; font-size: 13px; font-weight: 700; color: #111;
          margin-bottom: 6px;
        }
        .af-group input {
          width: 100%; height: 46px; padding: 0 16px;
          border: 1.5px solid #e4e4e7; border-radius: 10px;
          font-size: 14px; font-family: "DM Sans", sans-serif;
          background: #fff; color: #111;
          transition: border-color .2s;
          outline: none;
        }
        .af-group input:focus { border-color: #1F8CFF; box-shadow: 0 0 0 3px rgba(31,140,255,.1); }
        .af-submit {
          width: 100%; height: 48px; margin-top: 8px;
          border: 0; border-radius: 10px;
          background: #1F8CFF; color: #fff;
          font-family: "DM Sans", sans-serif; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: all .2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .af-submit:hover { background: #1a7ae6; }
        .af-submit:disabled { opacity: .6; cursor: not-allowed; }
        .af-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff; border-radius: 50%;
          animation: afSpin .6s linear infinite;
          display: inline-block;
        }
        @keyframes afSpin { to { transform: rotate(360deg); } }
        .auth-switch { text-align: center; margin-top: 24px; font-size: 14px; color: #71717a; }
        .auth-switch a { color: #1F8CFF; font-weight: 700; text-decoration: none; }
        .auth-switch a:hover { text-decoration: underline; }

        @media (max-width: 768px) {
          .auth-page { grid-template-columns: 1fr; }
          .auth-left { display: none; }
          .auth-right { padding: 32px 24px; }
        }
      `}</style>
      {screen === "register" && <RegisterPage onRegister={handleRegister} goLogin={() => setScreen("login")} />}
      {screen === "login" && <LoginPage onLogin={handleLogin} goRegister={() => setScreen("register")} />}
    </>
  );
}
