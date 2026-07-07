import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'

function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <span className="flex" style={{ color: 'var(--text)' }}>
      <Logo size={size} />
    </span>
  )
}

const footerSocialLinks: Record<string, string> = {
  "brand-x": "https://x.com/Ogapayhq",
  "brand-telegram": "https://t.me/ogapay",
  "brand-instagram": "https://instagram.com/ogapayhq?igsh=ajJrZzJ3Z2tjMXZm",
  "brand-facebook": "https://www.facebook.com/share/18bRPkuPVy/",
  "brand-tiktok": "https://tiktok.com/@ogapay"
}

const footerLinkHrefs: Record<string, string> = {
  "Browse Jobs": "/tasks",
  "Categories": "/tasks",
  "Worker Store": "/store",
  "Create Task": "/create",
  "Worker Portal": "/worker-portal",
  "Campaigns": "/campaigns",
  "Vault": "/vault",
  "Leaderboard": "/leaderboard",
  "About": "/about",
  "Blog": "/blog",
  "FAQ": "/faq",
  "Support": "/support",
  "Terms": "/terms",
  "Privacy": "/privacy",
  "Documentation": "https://github.com/tomwlee904-sys/Ogapay/tree/main/docs",
  "Roadmap": "/roadmap",
  "Getting Started": "/",
}

const footerCols = [
  {
    title: "Marketplace",
    links: ["Browse Jobs", "Categories", "Worker Store", "Create Task"],
  },
  {
    title: "Platform",
    links: ["Worker Portal", "Campaigns", "Vault", "Leaderboard"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "FAQ", "Support", "Terms", "Privacy"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Roadmap", "Getting Started"],
  },
]

function TablerIcon({ name, size = 15 }: { name: string; size?: number }) {
  return <i className={`ti ti-${name}`} style={{ fontSize: size }} />
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

export default function Footer() {
  const isMobile = useIsMobile()
  return (
    <footer className="footer-rich" style={{ position: 'relative', overflow: 'hidden', paddingTop: 60 }}>

      {/* Wave SVG */}
      <svg
        className="absolute left-0 w-full pointer-events-none"
        style={{ height: 200, top: 100, '--wave-drift': isMobile ? '40px' : '100px', '--wave-drift-2': isMobile ? '30px' : '80px' } as React.CSSProperties}
        viewBox="0 0 1440 200"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path fill="none" className="fw1" strokeWidth="60"
          d="M-100,80 C200,20 400,140 700,80 C1000,20 1200,140 1540,80" />
        <path fill="none" className="fw2" strokeWidth="50"
          d="M-100,100 C150,30 450,160 750,90 C1050,20 1250,140 1540,100" />
        <path fill="none" className="fw3" strokeWidth="55"
          d="M-100,55 C250,5 500,120 780,60 C1060,5 1300,130 1540,60" />
        <path fill="none" className="fw4" strokeWidth="40"
          d="M-100,130 C300,70 500,160 800,110 C1100,60 1300,150 1540,120" />
        <path fill="none" className="fw5" strokeWidth="40"
          d="M-100,30 C200,90 500,10 800,50 C1100,90 1300,30 1540,50" />
      </svg>

      <style>{`
        .fw1 { stroke: var(--accent); opacity: .07; animation: waveDrift1 18s ease-in-out infinite alternate; }
        .fw2 { stroke: var(--accent); opacity: .05; animation: waveDrift2 22s ease-in-out infinite alternate; }
        .fw3 { stroke: var(--accent); opacity: .04; animation: waveDrift1 26s ease-in-out infinite alternate; }
        .fw4 { stroke: var(--accent); opacity: .06; animation: waveDrift2 20s ease-in-out infinite alternate; }
        .fw5 { stroke: var(--accent); opacity: .04; animation: waveDrift1 24s ease-in-out infinite alternate; }
        [data-theme="dark"] .fw1 { stroke: var(--accent); opacity: .14; }
        [data-theme="dark"] .fw2 { stroke: var(--accent); opacity: .10; }
        [data-theme="dark"] .fw3 { stroke: var(--accent); opacity: .08; }
        [data-theme="dark"] .fw4 { stroke: var(--accent); opacity: .16; }
        [data-theme="dark"] .fw5 { stroke: var(--accent); opacity: .09; }
        @keyframes waveDrift1 {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-1 * var(--wave-drift, 100px))); }
        }
        @keyframes waveDrift2 {
          0% { transform: translateX(0); }
          100% { transform: translateX(var(--wave-drift-2, 80px)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fw1, .fw2, .fw3, .fw4, .fw5 {
            animation: none;
          }
        }
        .footer-rich svg { filter: blur(1px); }
      `}</style>

      <div className="relative z-[1] footer-main">
        {/* Social Icons — centered row above columns */}
        <div className="footer-social-row">
          {Object.entries(footerSocialLinks).map(([ic, href]) => (
            <a key={ic} href={href} target="_blank" rel="noopener noreferrer" className="footer-social-btn">
              <TablerIcon name={ic} size={18} />
            </a>
          ))}
        </div>

        {/* Navigation Columns */}
        <div className="footer-grid">
          {footerCols.map(col => (
            <div key={col.title} className="footer-col">
              <h4 className="footer-col-title">{col.title}</h4>
              <nav className="footer-col-nav">
                {col.links.map(l => {
                  const href = footerLinkHrefs[l] || "/"
                  return href.startsWith('http') ? (
                    <a key={l} href={href} target="_blank" rel="noopener noreferrer" className="footer-link">{l}</a>
                  ) : (
                    <Link key={l} to={href} className="footer-link">{l}</Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Divider + Copyright */}
        <div className="footer-divider" />
        <div className="footer-copyright">
          © 2026 OgaPay Technologies Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
