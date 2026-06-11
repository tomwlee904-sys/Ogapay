// @ts-nocheck
// Fix: client-side PKCE flow — get Supabase session, exchange with backend for app tokens, redirect to dashboard
// Also handles fallback: signup via backend with random password, or Supabase-only fallback
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { persistAuthSession } from "../lib/api";

const BACKEND_URL = "https://ogapay-production.up.railway.app/api/v1";

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
          let appTokens = null;
          let appUser = null;

          // Step 1: Try exchange Supabase session for backend app tokens
          try {
            const exchangeRes = await fetch(
              BACKEND_URL + '/auth/google/exchange',
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
                          } else {
              console.warn('Backend exchange returned', exchangeRes.status, '- will try signup fallback');
            }
          } catch (exchangeErr) {
            console.warn('Backend exchange error:', exchangeErr.message);
          }

          // Step 2: If exchange failed, try signup with random password to generate backend JWTs
          if (!(appTokens && appTokens.accessToken) && session) {
            const userMeta = session.user?.user_metadata || {};
            const fullName = userMeta.full_name || userMeta.name || session.user.email?.split("@")[0] || "User";
            const nParts = fullName.trim().split(/\s+/);
            const randomPw = Math.random().toString(36).slice(2) + 'A1' + Math.random().toString(36).slice(2);

            try {
              const signupRes = await fetch(BACKEND_URL + '/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: session.user.email,
                  password: randomPw,
                  firstName: userMeta.given_name || nParts[0] || 'User',
                  lastName: userMeta.family_name || nParts.slice(1).join(' ') || '',
                  username: (session.user.email || 'user').split('@')[0],
                  role: 'WORKER',
                  avatarUrl: userMeta.avatar_url || userMeta.picture || '',
                }),
              });

              if (signupRes.ok) {
                const signupData = await signupRes.json();
                const signupResult = signupData.data || signupData;
                if (signupResult?.tokens?.accessToken) {
                  appTokens = signupResult.tokens;
                  appUser = signupResult.user;
                                    // Store the random password so user can login with email/password too
                  try { localStorage.setItem("ogapay_temp_pw", randomPw); } catch {}
                }
              } else {
                // Signup failed — user already exists in backend (previous Google signup or email signup)
                // We'll store Supabase tokens and use Supabase fallback auth
                const errBody = await signupRes.json().catch(() => ({}));
                console.warn('Backend signup failed:', errBody.message || signupRes.status);
                              }
            } catch (signupErr) {
              console.warn('Backend signup network error:', signupErr.message);
            }
          }

          if (appTokens && appTokens.accessToken) {
            // Use backend app tokens
            persistAuthSession({
              user: appUser,
              tokens: {
                accessToken: appTokens.accessToken,
                refreshToken: appTokens.refreshToken || appTokens.accessToken,
              },
            });
            localStorage.removeItem("ogapay_auth_provider");
          } else {
            // Fallback: store Supabase session tokens + set provider flag
            localStorage.setItem("ogapay_access_token", session.access_token);
            if (session.refresh_token) {
              localStorage.setItem("ogapay_refresh_token", session.refresh_token);
            }
            localStorage.setItem("ogapay-authenticated", "true");
            localStorage.setItem("ogapay_auth_provider", "supabase");
          }

          // Store user display info
          const userMeta = session.user?.user_metadata || {};
          const fullName = userMeta.full_name || userMeta.name || session.user.email?.split("@")[0] || "User";
          const nParts = fullName.trim().split(/\s+/);

          if (!appUser) {
            localStorage.setItem("ogapay_user", JSON.stringify({
              id: session.user.id,
              firstName: nParts[0],
              lastName: nParts.slice(1).join(" ") || "",
              email: session.user.email,
              avatar: userMeta.avatar_url || "",
            }));
          }

          // Store Supabase user data for fallback verification
          localStorage.setItem("ogapay_supabase_user", JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            emailVerified: !!session.user.email_confirmed_at,
            userMetadata: userMeta || {},
          }));

          // Auto-sync Google profile to backend (runs even if appUser exists to catch missing avatarUrl)
          if (appTokens && appTokens.accessToken) {
            try {
              const meta = session.user?.user_metadata || {};
              const gName = meta.full_name || meta.name || '';
              const gParts = gName.trim().split(/\s+/);
              const firstName = meta.given_name || gParts[0] || '';
              const lastName = meta.family_name || gParts.slice(1).join(' ') || '';
              const avatarUrl = meta.avatar_url || meta.picture || '';

              if (firstName || lastName || avatarUrl) {
                const profileRes = await fetch(BACKEND_URL + '/users/me', {
                  headers: { 'Authorization': 'Bearer ' + appTokens.accessToken }
                });
                if (profileRes.ok) {
                  const profileData = await profileRes.json();
                  const current = profileData.data || profileData;
                  const updateBody: Record<string, string> = {};

                  if (!current.firstName && firstName) updateBody.firstName = firstName;
                  if (!current.lastName && lastName) updateBody.lastName = lastName;
                  if (!current.avatarUrl && avatarUrl) updateBody.avatarUrl = avatarUrl;

                  if (Object.keys(updateBody).length > 0) {
                    await fetch(BACKEND_URL + '/users/me', {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + appTokens.accessToken,
                      },
                      body: JSON.stringify(updateBody),
                    });
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
          const stored = localStorage.getItem("ogapay-authenticated");
          if (stored === "true") {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/login?error=no_session";
          }
        }
      } catch (err) {
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
