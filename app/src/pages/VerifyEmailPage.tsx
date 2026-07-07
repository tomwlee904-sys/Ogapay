import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";

type Step = "checking" | "form" | "code-sent" | "success" | "expired" | "error";

export default function VerifyEmailPage() {
  const [step, setStep] = useState<Step>("checking");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userId = params.get("userId");
    if (!token || !userId) {
      setStep("form");
      return;
    }
    fetch(`${API_BASE}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStep("success");
          localStorage.setItem("ogapay_email_verified", "true");
          setTimeout(() => { navigate("/dashboard"); }, 3000);
        } else {
          setStep(data.message?.toLowerCase().includes("expired") ? "expired" : "error");
        }
      })
      .catch(() => setStep("error"));
  }, []);

  const handleSendCode = async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    setStatusMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to send");
      setStep("code-sent");
    } catch (e: any) {
      setStatusMsg(e.message);
    }
    setSending(false);
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || verifying) return;
    setVerifying(true);
    setStatusMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("success");
        localStorage.setItem("ogapay_email_verified", "true");
        setTimeout(() => { navigate("/dashboard"); }, 3000);
      } else {
        setStatusMsg(data.message || "Invalid code");
      }
    } catch (e: any) {
      setStatusMsg(e.message || "Verification failed");
    }
    setVerifying(false);
  };

  const busy = sending || verifying;

  if (step === "checking") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--text)", borderRadius: "50%", animation: "vspin 0.8s linear infinite" }} />
        <style>{`@keyframes vspin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", fontFamily: "inherit" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
          <i className="ti ti-circle-check" style={{ fontSize: 48, color: "var(--green)", marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>Email verified!</h2>
          <p style={{ fontSize: 14, color: "var(--text2)", margin: 0 }}>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", fontFamily: "inherit", padding: 16 }}>
      <style>{`@keyframes vspin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ width: "100%", maxWidth: 420, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, boxShadow: "0 10px 40px rgba(0,0,0,.08)" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", marginBottom: 20, fontSize: 20 }}>
          <i className="ti ti-mail" />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Verify Email</h2>
        <p style={{ fontSize: 13, color: "var(--text3)", margin: "0 0 24px", lineHeight: 1.5 }}>
          {step === "form" && "Enter your email to receive a verification code."}
          {step === "code-sent" && "Enter the code sent to your email."}
          {(step === "expired" || step === "error") && "The link expired or is invalid. Verify with a code instead."}
        </p>

        {step !== "code-sent" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              style={{ width: "100%", height: 46, padding: "0 14px", boxSizing: "border-box", border: "1.5px solid var(--border)", borderRadius: 12, background: "var(--bg)", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
          </div>
        )}

        {step === "code-sent" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Verification Code</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)}
              placeholder="Enter the code from your email"
              style={{ width: "100%", height: 46, padding: "0 14px", boxSizing: "border-box", border: "1.5px solid var(--border)", borderRadius: 12, background: "var(--bg)", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit", letterSpacing: 4, fontWeight: 700 }} />
          </div>
        )}

        {statusMsg && (
          <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: statusMsg.includes("sent") ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)", color: statusMsg.includes("sent") ? "var(--green)" : "#ef4444", border: `1px solid ${statusMsg.includes("sent") ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.3)"}`, marginBottom: 16 }}>
            {statusMsg}
          </div>
        )}

        <button type="button" onClick={step === "code-sent" ? handleVerifyCode : handleSendCode} disabled={busy || (step === "code-sent" ? !code.trim() : !email.trim())}
          style={{ width: "100%", height: 48, borderRadius: 12, border: "none", background: busy ? "var(--border)" : "var(--text)", color: "var(--card)", fontSize: 15, fontWeight: 800, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16, opacity: (!busy && ((step === "code-sent" && !code.trim()) || (step !== "code-sent" && !email.trim()))) ? 0.5 : 1 }}>
          {busy ? "Please wait..." : step === "code-sent" ? "Verify Email" : "Send Code"}
        </button>

        {step === "code-sent" && (
          <button type="button" onClick={() => { setStep("form"); setCode(""); setStatusMsg("") }}
            style={{ width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text2)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
            Change email
          </button>
        )}

        {(step === "form" || step === "expired" || step === "error") && (
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--text3)" }}>
            <a href="/settings" style={{ color: "var(--text)", fontWeight: 700 }}>Settings</a>
            <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
            <a href="/login" style={{ color: "var(--text)", fontWeight: 700 }}>Sign In</a>
          </div>
        )}

        {step === "code-sent" && (
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--text3)" }}>
            Didn't get it?{" "}
            <button type="button" onClick={handleSendCode} disabled={sending}
              style={{ background: "none", border: "none", color: "var(--text)", fontWeight: 700, cursor: sending ? "wait" : "pointer", fontSize: 12, fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>
              {sending ? "Sending..." : "Resend code"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}