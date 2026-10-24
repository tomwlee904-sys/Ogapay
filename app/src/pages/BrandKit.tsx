import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { Logo } from '../components/Logo'
import '../styles/legal.css'

// /brand-kit: the OgaPay logo files for partners, press and creators, with a few
// simple rules for using them. Files live in public/ (brand/ holds the SVG marks).

// bg: the preview surface. light = a fixed light grey (the black mark needs it),
// dark = black (the white mark needs it), theme = the card colour
type Asset = { name: string; note: string; files: { label: string; href: string; file: string }[]; bg: 'light' | 'dark' | 'theme'; wide?: boolean; img: string }

const ASSETS: Asset[] = [
  {
    name: 'Mark, black',
    note: 'For light backgrounds. Vector, scales to any size.',
    img: '/brand/ogapay-mark-black.svg',
    bg: 'light',
    files: [
      { label: 'SVG', href: '/brand/ogapay-mark-black.svg', file: 'ogapay-mark-black.svg' },
      { label: 'PNG 512', href: '/logo-512.png', file: 'ogapay-logo-512.png' },
    ],
  },
  {
    name: 'Mark, white',
    note: 'For dark backgrounds and photos.',
    img: '/brand/ogapay-mark-white.svg',
    bg: 'dark',
    files: [
      { label: 'SVG', href: '/brand/ogapay-mark-white.svg', file: 'ogapay-mark-white.svg' },
      { label: 'SVG on black', href: '/brand/ogapay-mark-white-on-black.svg', file: 'ogapay-mark-white-on-black.svg' },
    ],
  },
  {
    name: 'App icon',
    note: 'Square icon as it shows on phones.',
    img: '/apple-touch-icon.png',
    bg: 'theme',
    files: [
      { label: 'PNG 512', href: '/apple-touch-icon.png', file: 'ogapay-app-icon-512.png' },
      { label: 'PNG 192', href: '/favicon-192.png', file: 'ogapay-app-icon-192.png' },
    ],
  },
  {
    name: 'Share image',
    note: 'The 1200 × 630 card used when OgaPay links are shared.',
    img: '/og-image.png',
    bg: 'theme',
    wide: true,
    files: [{ label: 'PNG 1200 × 630', href: '/og-image.png', file: 'ogapay-share-1200x630.png' }],
  },
]

const COLORS = [
  { name: 'Ink', hex: '#111111' },
  { name: 'Paper', hex: '#FAFAFA' },
  { name: 'Black', hex: '#0A0A0A' },
]

export default function BrandKit() {
  return (
    <Layout>
      <style>{`
        .bk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:28px}
        .bk-card{overflow:hidden;display:flex;flex-direction:column}
        .bk-prev{height:180px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--border)}
        .bk-prev.light{background:#f4f4f5;box-shadow:inset 0 0 0 1px rgba(0,0,0,.04)}
        .bk-prev.dark{background:#000;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
        .bk-prev.theme{background:var(--card2)}
        .bk-prev img{max-width:70%;max-height:140px;object-fit:contain}
        .bk-body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px}
        .bk-body h2{margin:0;font-size:16px;font-weight:600;color:var(--text)}
        .bk-body p{margin:0;font-size:13px;color:var(--text2);line-height:1.5}
        .bk-dl{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
        .bk-sec{margin-top:40px;max-width:720px}
        .bk-sec h2{margin:0 0 8px;font-size:18px;font-weight:600;color:var(--text)}
        .bk-sec li,.bk-sec p{font-size:14px;line-height:1.7;color:var(--text2)}
        .bk-colors{display:flex;gap:12px;flex-wrap:wrap}
        .bk-color{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:12px;padding:8px 12px;background:var(--card)}
        .bk-sw{width:32px;height:32px;border-radius:8px;border:1px solid var(--border2)}
        .bk-color b{display:block;font-size:13px;color:var(--text)}
        .bk-color span{font-size:12px;color:var(--text2);font-family:var(--font-mono)}
        /* Phone: the three square files 2 across with smaller previews; the share image full width */
        @media(max-width:767.98px){
          .bk-grid{gap:10px;margin-top:20px}
          .bk-card.wide{grid-column:1 / -1}
          .bk-prev{height:120px}
          .bk-prev img{max-height:84px}
          .bk-body{padding:12px}
          .bk-body h2{font-size:14.5px}
          .bk-body p{font-size:12.5px}
          .bk-dl .ui-btn{flex:1 1 auto;padding:0 10px}
        }
      `}</style>
      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-palette" /> Brand</span>
          <h1 className="ui-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Logo size={36} /> OgaPay brand kit</h1>
          <p className="ui-sub">Logo files for partners, press and creators who write about OgaPay. Download what you need below.</p>
        </header>

        <div className="bk-grid">
          {ASSETS.map((a) => (
            <div key={a.name} className={`ui-card bk-card${a.wide ? ' wide' : ''}`}>
              <div className={`bk-prev ${a.bg}`}><img src={a.img} alt={`OgaPay ${a.name.toLowerCase()}`} loading="lazy" /></div>
              <div className="bk-body">
                <h2>{a.name}</h2>
                <p>{a.note}</p>
                <div className="bk-dl">
                  {a.files.map((f) => (
                    <a key={f.href + f.label} className="ui-btn ui-btn-ghost ui-btn-sm" href={f.href} download={f.file}><i className="ti ti-download" aria-hidden="true" /> {f.label}</a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="bk-sec">
          <h2>Colours</h2>
          <div className="bk-colors">
            {COLORS.map((c) => (
              <div key={c.hex} className="bk-color"><div className="bk-sw" style={{ background: c.hex }} /><div><b>{c.name}</b><span>{c.hex}</span></div></div>
            ))}
          </div>
        </section>

        <section className="bk-sec lg-prose">
          <h2>Using the logo</h2>
          <ul>
            <li>Write the name as <b>OgaPay</b>: one word, capital O and P.</li>
            <li>Leave clear space around the mark at least a quarter of its width.</li>
            <li>Use the black mark on light backgrounds and the white mark on dark ones. Don't recolour, stretch, rotate or add effects.</li>
            <li>Don't use the logo in a way that suggests OgaPay sponsors or approves something it doesn't, or on a page that asks people for passwords or payments.</li>
          </ul>
          <p>Need something else, like a wordmark for print? <Link to="/support">Contact us through Support</Link>. See also our <Link to="/copyright">Copyright</Link> page.</p>
        </section>
      </div>
    </Layout>
  )
}
