// Client-side PKCE flow: get the Supabase session, exchange it with the backend
// for app tokens, then go back to the page the sign-in started on (login-14).
// A brand-new account first gets the sign-in sheet's last step (name, country,
// what brings you here) over this page (login-23).
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { API_BASE, persistAuthSession } from "../lib/api";
import { trackSignUpConversion } from "../lib/ads";
import { openSignIn, safeRedirect, SIGN_IN_ERROR_KEY } from "../lib/signin";

// Page the user was heading to before Google (set by the sign-in dialog)
function afterLogin() {
  const to = sessionStorage.getItem("ogapay_after_login");
  sessionStorage.removeItem("ogapay_after_login");
  return safeRedirect(to) || "/dashboard";
}

// Google sign-in didn't finish: say why on /login instead of signing in with
// the bare Google session (that ended in "Your session ended" again and again,
// and a closed account never saw why) (2026-11-10)
async function failSignIn(message: string) {
  try { sessionStorage.setItem(SIGN_IN_ERROR_KEY, message) } catch { /* private mode */ }
  try { await supabase.auth.signOut({ scope: "local" }) } catch { /* nothing to clear */ }
  window.location.href = "/login?error=google_failed";
}

// The server's reason, or a plain one when the answer isn't from OgaPay (a 502 page)
async function exchangeError(res: Response) {
  let msg = "";
  try { const j = JSON.parse(await res.text()); msg = j?.message || j?.error || ""; } catch { /* not JSON */ }
  if (res.status === 429) return "Too many sign-ins from your network right now. Please wait a few minutes and try again.";
  if (msg && res.status < 500) return msg;
  return "OgaPay is busy right now. Please try again in a minute.";
}

export default function AuthCallback() {
  const [status, setStatus] = useState("processing");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback(attempt = 0) {
      try {
        // Supabase reads the code in the address itself (getSession waits for
        // that); look again shortly only if it isn't there yet. It used to wait
        // a fixed 1.5 s first on every sign-in (login-14).
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 500));

        const { data: { session }, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session) {
          // Step 1: Exchange Supabase session for backend app tokens
          let appTokens = null;
          let appUser = null;

          // Tried twice when the network drops (slow mobile data)
          let exchangeRes: Response | null = null;
          for (let i = 0; i < 2 && !exchangeRes; i++) {
            try {
              exchangeRes = await fetch(
                API_BASE + '/auth/google/exchange',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  // The referral link's code (saved by /ref/:code), for a brand-new account
                  body: JSON.stringify({ access_token: session.access_token, referralCode: (() => { try { return localStorage.getItem('ogapay_referral') || undefined } catch { return undefined } })() }),
                }
              );
            } catch (exchangeErr) {
              console.warn('Backend exchange error:', (exchangeErr as Error).message);
            }
          }
          if (cancelled) return;
          if (!exchangeRes) return failSignIn("Couldn't reach OgaPay. Check your connection and try Google again.");
          if (!exchangeRes.ok) return failSignIn(await exchangeError(exchangeRes));

          let result: any = null;
          try { const exchangeData = JSON.parse(await exchangeRes.text()); result = exchangeData?.data || exchangeData; } catch { /* not JSON */ }
          if (!result) return failSignIn("OgaPay is busy right now. Please try again in a minute.");

          // The account has 2FA on: ask for the code here, no tokens until then
          if (result.requiresTwoFactor && result.challengeToken) {
            try { await supabase.auth.signOut({ scope: "local" }); } catch { /* nothing to clear */ }
            setStatus("twofa");
            openSignIn({ view: "twofa", challenge: { token: result.challengeToken, userId: result.userId }, redirect: afterLogin(), closeTo: "/" });
            return;
          }

          appTokens = result.tokens;
          appUser = result.user;
          if (!appTokens?.accessToken || !appTokens?.refreshToken) return failSignIn("Google sign-in didn't finish. Please try again.");
          // Google Ads sign-up conversion: only when this Google sign-in made the
          // account (the server sends isNewUser on that one exchange only)
          if (result.isNewUser) trackSignUpConversion(appUser?.id);

          if (!result.isNewUser) persistAuthSession({
            user: appUser,
            tokens: { accessToken: appTokens.accessToken, refreshToken: appTokens.refreshToken },
          });

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
                  API_BASE + '/users/me',
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
                      API_BASE + '/users/me',
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
              console.warn('Profile sync skipped:', (syncErr as Error).message);
            }
          }

          if (!localStorage.getItem("ogapay_is_new_user")) {
            localStorage.setItem("ogapay_is_new_user", "true");
          }

          // A new account: its last step in the sign-in sheet, which then signs
          // in on this device and opens the page it started from (no reload).
          // Closing or skipping it signs in all the same.
          if (result.isNewUser) {
            setStatus("profile");
            openSignIn({ view: "profile", pending: { user: appUser, tokens: appTokens, isNewUser: true }, redirect: afterLogin(), closeTo: "/dashboard" });
            return;
          }

          setStatus("redirecting");
          window.location.href = afterLogin();
        } else {
          // Look again while the address still has Google's answer in it
          if (attempt < 3 && (window.location.hash || /[?&]code=/.test(window.location.search))) {
            return handleCallback(attempt + 1);
          }
          if (error) console.error("Auth error:", error);
          const stored = localStorage.getItem("ogapay-authenticated");
          if (stored === "true") {
            window.location.href = afterLogin();
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
    redirecting: { text: "Signed in", sub: "Taking you back to OgaPay..." },
    profile: { text: "One last step", sub: "Tell us a little about you to finish." },
    error: { text: "Something went wrong", sub: "Redirecting to login..." },
    twofa: { text: "One more step", sub: "Enter your two-factor code to finish signing in." },
  };

  const msg = statusMessages[status as keyof typeof statusMessages] || statusMessages.processing;

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      fontFamily: "'Inter', sans-serif",
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
        {status === "twofa" || status === "profile" ? null : status === "processing" || status === "redirecting" ? (
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
