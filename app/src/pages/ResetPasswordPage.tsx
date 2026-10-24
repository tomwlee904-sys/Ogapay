import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";
import AuthShell from "../components/auth/AuthShell";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Same rules as sign-up (the server checks them too)
    if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Use at least 8 characters, with a capital letter and a number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(data.message || "Something went wrong");
      }
    } catch {
      setError("Couldn't reach OgaPay. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // A broken or expired link: one clear way to get a new one
  if (!token || !userId) {
    return (
      <AuthShell eyebrow="Password" title="This reset link doesn't work" sub="Reset links expire after a while, or the link was cut short in your email. Get a new one below.">
        <Link to="/forgot-password" className="ui-btn ui-btn-dark ui-btn-lg" style={{ width: "100%" }}>Send me a new link</Link>
        <p className="as-links"><Link to="/login" className="ui-btn ui-btn-text">Back to sign in</Link></p>
      </AuthShell>
    );
  }

  if (submitted) {
    return (
      <AuthShell eyebrow="Password" title="Password changed" sub="You can sign in with your new password. Taking you to sign in…">
        <Link to="/login" className="ui-btn ui-btn-dark ui-btn-lg" style={{ width: "100%" }}>Sign in</Link>
      </AuthShell>
    );
  }

  const eye = (
    <button type="button" className="ui-btn ui-btn-text ui-btn-icon" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide passwords" : "Show passwords"}
      style={{ position: "absolute", right: 0, top: 0 }}>
      <i className={`ti ti-eye${showPw ? "-off" : ""}`} aria-hidden="true" />
    </button>
  );

  return (
    <AuthShell eyebrow="Password" title="Set a new password" sub="Choose a new password for your OgaPay account.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="as-field">
          <label className="ui-label" htmlFor="rp-pw">New password</label>
          <div style={{ position: "relative" }}>
            <input id="rp-pw" className="ui-input" type={showPw ? "text" : "password"} autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 48 }} autoFocus aria-describedby="rp-hint" />
            {eye}
          </div>
          <p className="ui-hint" id="rp-hint">At least 8 characters, with a capital letter and a number.</p>
        </div>
        <div className="as-field">
          <label className="ui-label" htmlFor="rp-pw2">Repeat the new password</label>
          <input id="rp-pw2" className="ui-input" type={showPw ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        {error && <p className="as-alert" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className={`ui-btn ui-btn-dark ui-btn-lg${loading ? " is-loading" : ""}`} style={{ width: "100%" }}>Save new password</button>
      </form>
      <p className="as-links"><Link to="/login" className="ui-btn ui-btn-text">Back to sign in</Link></p>
    </AuthShell>
  );
}
