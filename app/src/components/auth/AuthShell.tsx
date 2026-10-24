import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../Logo'

/* One frame for the sign-in helper pages (forgot password, reset password,
   verify email): the logo, a 420px card (top-aligned on phone, centred from
   768px) and one line of links. No marketing footer under a one-field form. */
export default function AuthShell({ eyebrow, title, sub, children }: { eyebrow?: ReactNode; title?: ReactNode; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="as-page">
      <style>{`
        .as-page{min-height:100dvh;display:flex;flex-direction:column;align-items:center;gap:20px;padding:24px var(--gutter) 32px;background:var(--bg);color:var(--text);font-family:var(--font)}
        .as-logo{display:inline-flex;align-items:center;gap:10px;min-height:44px;font-size:18px;font-weight:700;letter-spacing:-.02em;color:var(--text);text-decoration:none}
        .as-card{width:100%;max-width:420px;padding:28px}
        .as-card h1{margin:8px 0 6px;font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.25;color:var(--text)}
        .as-sub{margin:0 0 18px;font-size:14px;line-height:1.6;color:var(--text2)}
        .as-sub b{color:var(--text)}
        .as-legal{display:flex;gap:4px 16px;flex-wrap:wrap;justify-content:center;font-size:13px}
        .as-legal a{display:inline-flex;align-items:center;min-height:36px;color:var(--text2);text-decoration:none}
        .as-legal a:hover{color:var(--text);text-decoration:underline}
        .as-alert{margin:0 0 14px;padding:10px 14px;border-radius:var(--r-ctl);font-size:13px;line-height:1.5;color:var(--red);background:color-mix(in srgb,var(--red) 12%,transparent);border:1px solid color-mix(in srgb,var(--red) 30%,transparent)}
        .as-alert.ok{color:var(--green);background:color-mix(in srgb,var(--green) 12%,transparent);border-color:color-mix(in srgb,var(--green) 30%,transparent)}
        .as-field{margin-bottom:14px}
        .as-links{margin:14px 0 0;display:flex;justify-content:center}
        @media(min-width:768px){.as-page{justify-content:center;padding-top:32px}}
        @media(max-width:767.98px){.as-card{padding:22px 20px}}
      `}</style>
      <Link to="/" className="as-logo" aria-label="OgaPay home"><Logo size={30} /> OgaPay</Link>
      <main className="ui-card as-card">
        {eyebrow && <span className="ui-eyebrow">{eyebrow}</span>}
        {title && <h1>{title}</h1>}
        {sub && <p className="as-sub">{sub}</p>}
        {children}
      </main>
      <nav className="as-legal" aria-label="Help and legal">
        <Link to="/support">Support</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
      </nav>
    </div>
  )
}
