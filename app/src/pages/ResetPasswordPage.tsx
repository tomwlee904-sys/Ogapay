import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token || !userId) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
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
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => navigate("/?login=1"), 3000);
      } else {
        setError(data.message || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 18, padding: "32px 28px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.06)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>OgaPay</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
            Reset your password
          </h1>
          <p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>
            {submitted ? "Done!" : "Enter your new password below."}
          </p>
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: 8, fontSize: 12, color: "#991b1b", marginBottom: 16, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 8, fontSize: 12, color: "#166534", marginBottom: 16, fontWeight: 600,
          }}>
            {message}
          </div>
        )}

        {!submitted && token && userId && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 4 }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="auth-input"
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 4 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="auth-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", height: 48, borderRadius: 12,
                background: "var(--accent)", color: "#fff", border: "none",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {!submitted && (!token || !userId) && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
              Please use the link from your email.
            </p>
            <a href="/" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>Go to Home</a>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href="/?login=1" style={{ fontSize: 12, color: "var(--text3)", textDecoration: "underline" }}>
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
