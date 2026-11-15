/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Cloudflare Turnstile site key; unset = no human check on sign-in forms
  readonly VITE_TURNSTILE_SITE_KEY?: string
}
