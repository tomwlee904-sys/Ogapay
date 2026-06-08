// @ts-nocheck
function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
      <rect width="512" height="512" fill="var(--primary)" />
      <rect x="98" y="98" width="107" height="107" rx="20" fill="var(--bg)" />
      <path d="M225 98H312C323 98 332 107 332 118V205H225V98Z" fill="var(--bg)" />
      <path d="M352 98H392C440 98 470 128 470 176V205H352V98Z" fill="var(--bg)" />
      <rect x="98" y="225" width="107" height="107" fill="var(--bg)" />
      <rect x="225" y="225" width="107" height="107" fill="var(--bg)" />
      <path d="M352 225H470V254C470 302 440 332 392 332H352V225Z" fill="var(--bg)" />
      <rect x="98" y="352" width="107" height="107" rx="20" fill="var(--bg)" />
      <path d="M225 352H312C323 352 332 361 332 372V439C332 450 323 459 312 459H225V352Z" fill="var(--bg)" />
    </svg>
  )
}

const footerSocialLinks: Record<string, string> = {
  "brand-x": "https://x.com/ogapay",
  "brand-telegram": "https://t.me/ogapay",
  "brand-instagram": "https://instagram.com/ogapay",
  "brand-tiktok": "https://tiktok.com/@ogapay"
}

const footerLinkHrefs: Record<string, string> = {
  "Browse Jobs": "/tasks", "Task Categories": "/tasks", "Leaderboard": "/leaderboard",
  "Worker Portal": "/worker-portal", "Create Task": "/create", "Communities": "/communities",
  "About": "/about", "Blog": "/blog",
  "FAQ": "/faq", "Terms": "/terms",
  "Privacy": "/privacy",
  "Developer": "/developer",
  }

const footerCols = [
  { title: "Earn", links: ["Browse Jobs", "Task Categories", "Leaderboard", "Worker Portal"] },
  { title: "Post", links: ["Create Task", "Campaigns", "Communities", "Analytics"] },
  { title: "Company", links: ["About", "Blog", "FAQ", "Support", "Terms", "Privacy", "Developer", "Roadmap"] },
]

function TablerIcon({ name, size = 15 }: { name: string; size?: number }) {
  return <i className={`ti ti-${name}`} style={{ fontSize: size }} />
}

export default function Footer() {
  return (
    <footer className="footer-rich">
      <div className="footer-content">
        <div>
          <div className="footer-logo" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Outfit,sans-serif", fontSize: 18, fontWeight: 800 }}>
            <LogoMark size={26} /> OgaPay
          </div>
          <p>Nigeria's microtask marketplace — work, earn, and grow your income.</p>
          <div className="social-icons">
            {Object.entries(footerSocialLinks).map(([ic, href]) => (
              <a key={ic} href={href} target="_blank" rel="noopener noreferrer">
                <TablerIcon name={ic} />
              </a>
            ))}
          </div>
        </div>
        {footerCols.map(col => (
          <div key={col.title}>
            <h4>{col.title}</h4>
            <nav>
              {col.links.map(l => (
                <a key={l} href={footerLinkHrefs[l] || "/"}>{l}</a>
              ))}
            </nav>
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© 2026 OgaPay Technologies Ltd. All rights reserved.</span>
        <span>Made with care for the gig economy.</span>
      </div>
    </footer>
  )
}
