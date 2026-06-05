// @ts-nocheck
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
 
export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (data?.session) {
        localStorage.setItem("ogapay_access_token", data.session.access_token);
        localStorage.setItem("ogapay-authenticated", "true");
        localStorage.setItem("ogapay_user", JSON.stringify(data.session.user));
        window.location.href = "/dashboard";
      } else {
        console.error("Auth error:", error);
        window.location.href = "/login?error=verification_failed";
      }
    };

    handleCallback();
  }, []);
 
  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      fontFamily: "'DM Sans', sans-serif",
      background: "#fff",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 48, height: 48,
          border: "3px solid #4D5DFF",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 20px",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#66738a", fontSize: 15, margin: 0 }}>
          Verifying your account...
        </p>
      </div>
    </div>
  );
}
