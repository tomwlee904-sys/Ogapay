// @ts-nocheck
// Fix: client-side PKCE flow — get Supabase session, exchange with backend for app tokens, redirect to dashboard
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { persistAuthSession } from "../lib/api";

export default function AuthCallback() {
  const [status, setStatus] = useState("processing");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback(attempt = 0) {
      try {
        // Wait for Supabase to process URL hash params (PKCE flow auto-detection)
        await new Promise(r => setTimeout(r, attempt === 0 ? 1500 : 800));

        const { data: { session }, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session) {
          // Step 1: Exchange Supabase session for backend app tokens
          let appTokens = null;
          let appUser = null;

          try {
            const exchangeRes = await fetch(
              'https://ogapay-production.up.railway.app/api/v1/auth/google/exchange',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: session.access_token }),
              }
            );

            if (exchangeRes.ok) {
              const exchangeData = await exchangeRes.json();
              const result = exchangeData.data || exchangeData;
              appTokens = result.tokens;
              appUser = result.user;
              console.log('Backend session synced successfully');
            } else {
              console.warn('Backend exchange failed, using Supabase session directly');
            }
          } catch (exchangeErr) {
            console.warn('Backend exchange error, using Supabase session directly:', exchangeErr.message);
          }

          if (appTokens && appTokens.refreshToken && appTokens.accessToken) {
            // Use backend app tokens
            persistAuthSession({
              user: appUser,
              tokens: { accessToken: appTokens.accessToken, refreshToken: appTokens.refreshToken },
            });
          } else {
            // Fallback: use Supabase session tokens directly
            localStorage.setItem("ogapay_access_token", session.access_token);
            if (session.refresh_token) {
              localStorage.setItem("ogapay_refresh_token", session.refresh_token);
            }
            localStorage.setItem("ogapay-authenticated", "true");
          }

          // Store user display info
          const userMeta = session.user?.user_metadata || {};
          const fullName = userMeta.full_name || userMeta.name || session.user.email?.split("@")[0] || "User";
          const parts = fullName.trim().split(/\s+/);
          // Only set ogapay_user display name if backend didn't already store a proper user
          if (!appUser) {
            localStorage.setItem("ogapay_user", JSON.stringify({
              id: session.user.id,
              firstName: parts[0],
              lastName: parts.slice(1).join(" ") || "",
              email: session.user.email,
              avatar: userMeta.avatar_url || "",
            }));
          }


          // Auto-sync Google profile to backend on first login if fields are empty
          if (appTokens && appTokens.accessToken) {
            try {
              const meta = session.user?.user_metadata || {};
              const fullName = meta.full_name || meta.name || '';
              const parts = fullName.trim().split(/\s+/);
              const firstName = parts[0] || '';
              const lastName = parts.slice(1).join(' ') || '';
              const avatarUrl = meta.avatar_url || meta.picture || '';

              // Only sync if we have Google data to populate
              if (firstName || avatarUrl) {
                // Check current profile first
                const profileRes = await fetch(
                  'https://ogapay-production.up.railway.app/api/v1/users/me',
                  { headers: { 'Authorization': 'Bearer ' + appTokens.accessToken } }
                );
                if (profileRes.ok) {
                  const profileData = await profileRes.json();
                  const current = profileData.data || profileData;
                  const updateBody: Record<string, string> = {};

                  // Only populate empty fields
                  if (!current.firstName && firstName) updateBody.firstName = firstName;
                  if (!current.lastName && lastName) updateBody.lastName = lastName;
                  if (!current.avatarUrl && avatarUrl) updateBody.avatarUrl = avatarUrl;

                  if (Object.keys(updateBody).length > 0) {
                    await fetch(
                      'https://ogapay-production.up.railway.app/api/v1/users/me',
                      {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': 'Bearer ' + appTokens.accessToken,
                        },
                        body: JSON.stringify(updateBody),
                      }
                    );
                  }
                }
              }
            } catch (syncErr) {
              console.warn('Profile sync skipped:', syncErr.message);
            }
          }

          if (!localStorage.getItem("ogapay_is_new_user")) {
            localStorage.setItem("ogapay_is_new_user", "true");
          }

          setStatus("redirecting");
          window.location.href = "/dashboard";
        } else {
          // Retry once if hash is present
          if (attempt < 2 && window.location.hash) {
            return handleCallback(attempt + 1);
          }
          if (error) console.error("Auth error:", error);
          const stored = localStorage.getItem("ogapay-authenticated");
          if (stored === "true") {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/login?error=no_session";
          }
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
        maxWidth: 460,
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
        <p style={{ color: "#66738a", fontSize: 14, margin: "0 0 12px" }}>
          {msg.sub}
        </p>
      </div>
    </div>
  );
}
