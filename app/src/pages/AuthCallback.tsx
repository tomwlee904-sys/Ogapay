// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const [status, setStatus] = useState("processing");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (cancelled) return;

        if (data?.session) {
          localStorage.setItem("ogapay_access_token", data.session.access_token);
          localStorage.setItem("ogapay-authenticated", "true");
          localStorage.setItem("ogapay_user", JSON.stringify(data.session.user));

          const userMeta = data.session.user?.user_metadata || {};
          const fullName = userMeta.full_name || userMeta.name || data.session.user.email?.split("@")[0] || "User";
          const parts = fullName.trim().split(/\s+/);
          localStorage.setItem("ogapay_user", JSON.stringify({
            firstName: parts[0],
            lastName: parts.slice(1).join(" ") || "",
            email: data.session.user.email,
            avatar: userMeta.avatar_url || "",
          }));

          if (!localStorage.getItem("ogapay_is_new_user")) {
            localStorage.setItem("ogapay_is_new_user", "true");
          }

          setStatus("redirecting");
          window.location.href = "/dashboard";
        } else {
          console.error("Auth error:", error);
          setStatus("error");
          setTimeout(() => {
            window.location.href = "/login?error=verification_failed";
          }, 3000);
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        if (!cancelled) {
          setStatus("error");
          setTimeout(() => {
            window.location.href = "/login?error=callback_error";
          }, 3000);
        }
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, []);

  const statusMessages = {
    processing: { text: "Verifying your account...", sub: "Please wait while we sign you in." },
    redirecting: { text: "Redirecting...", sub: "Taking you to your dashboard." },
    error: { text: "Something went wrong", sub: "Redirecting to login..." },
  };

  const msg = statusMessages[status] || statusMessages.processing;

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      fontFamily: "'DM Sans', sans-serif",
      background: "#f6f8fc",
    }}>
      <div style={{
        background: "#fff",
        border: "1px solid #e3e9f2",
        borderRadius: 14,
        padding: "32px 40px",
        textAlign: "center",
        maxWidth: 400,
        boxShadow: "0 18px 50px rgba(16,21,37,.1)",
      }}>
        {status === "processing" || status === "redirecting" ? (
          <div style={{
            width: 48, height: 48,
            border: "3px solid #4D5DFF",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 20px",
          }} />
        ) : (
          <div style={{
            width: 48, height: 48,
            borderRadius: "50%",
            background: status === "error" ? "#fee2e2" : "#fef3c7",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 20px",
            fontSize: 24,
          }}>
            {status === "error" ? "!" : "?"}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#101525", fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>
          {msg.text}
        </p>
        <p style={{ color: "#66738a", fontSize: 14, margin: 0 }}>
          {msg.sub}
        </p>
      </div>
    </div>
  );
}
