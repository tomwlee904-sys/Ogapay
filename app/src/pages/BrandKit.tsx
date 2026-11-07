import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { Logo } from '../components/Logo'

// /brand-kit: the OgaPay brand kit v1 (2026-11-07) for partners, press and
// creators: logo + wordmark, the mark, social images and patterns, colours, the
// Inter font and the supporting files. Files live in public/brand/ (same folders
// as the downloadable ZIP).

const B = '/brand'

type KitFile = { label: string; size: string; href: string }
type Asset = { name: string; note: string; img: string; dark?: boolean; wide?: boolean; files: KitFile[] }

const LOGOS: Asset[] = [
  {
    name: 'Logo + wordmark, black', note: 'For light backgrounds. Transparent background.', wide: true,
    img: `${B}/logos/svg/ogapay-lockup-black.svg`,
    files: [
      { label: 'SVG', size: '21 KB', href: `${B}/logos/svg/ogapay-lockup-black.svg` },
      { label: 'PNG 1200px', size: '24 KB', href: `${B}/logos/png/ogapay-lockup-black-1200.png` },
      { label: 'PNG 2400px', size: '60 KB', href: `${B}/logos/png/ogapay-lockup-black-2400.png` },
    ],
  },
  {
    name: 'Logo + wordmark, white', note: 'For dark backgrounds and photos. Transparent background.', dark: true, wide: true,
    img: `${B}/logos/svg/ogapay-lockup-white.svg`,
    files: [
      { label: 'SVG', size: '21 KB', href: `${B}/logos/svg/ogapay-lockup-white.svg` },
      { label: 'PNG 1200px', size: '23 KB', href: `${B}/logos/png/ogapay-lockup-white-1200.png` },
      { label: 'PNG 2400px', size: '54 KB', href: `${B}/logos/png/ogapay-lockup-white-2400.png` },
    ],
  },
  {
    name: 'Wordmark, black', note: 'The name on its own, for light backgrounds.', wide: true,
    img: `${B}/logos/svg/ogapay-wordmark-black.svg`,
    files: [
      { label: 'SVG', size: '12 KB', href: `${B}/logos/svg/ogapay-wordmark-black.svg` },
      { label: 'PNG 1200px', size: '26 KB', href: `${B}/logos/png/ogapay-wordmark-black-1200.png` },
      { label: 'PNG 2400px', size: '65 KB', href: `${B}/logos/png/ogapay-wordmark-black-2400.png` },
    ],
  },
  {
    name: 'Wordmark, white', note: 'The name on its own, for dark backgrounds.', dark: true, wide: true,
    img: `${B}/logos/svg/ogapay-wordmark-white.svg`,
    files: [
      { label: 'SVG', size: '12 KB', href: `${B}/logos/svg/ogapay-wordmark-white.svg` },
      { label: 'PNG 1200px', size: '24 KB', href: `${B}/logos/png/ogapay-wordmark-white-1200.png` },
      { label: 'PNG 2400px', size: '57 KB', href: `${B}/logos/png/ogapay-wordmark-white-2400.png` },
    ],
  },
]

const MARKS: Asset[] = [
  {
    name: 'OgaPay mark, black', note: 'The symbol on its own, for light backgrounds.',
    img: `${B}/logos/svg/ogapay-mark-black.svg`,
    files: [
      { label: 'SVG', size: '9 KB', href: `${B}/logos/svg/ogapay-mark-black.svg` },
      { label: 'PNG 1024px', size: '35 KB', href: `${B}/logos/png/ogapay-mark-black-1024.png` },
      { label: 'PNG 2048px', size: '100 KB', href: `${B}/logos/png/ogapay-mark-black-2048.png` },
    ],
  },
  {
    name: 'OgaPay mark, white', note: 'The symbol on its own, for dark backgrounds.', dark: true,
    img: `${B}/logos/svg/ogapay-mark-white.svg`,
    files: [
      { label: 'SVG', size: '9 KB', href: `${B}/logos/svg/ogapay-mark-white.svg` },
      { label: 'PNG 1024px', size: '26 KB', href: `${B}/logos/png/ogapay-mark-white-1024.png` },
      { label: 'PNG 2048px', size: '61 KB', href: `${B}/logos/png/ogapay-mark-white-2048.png` },
    ],
  },
]

const SOCIAL: Asset[] = [
  { name: 'Profile image, dark', note: '1080 × 1080, for social profiles.', img: `${B}/social/ogapay-avatar-dark.png`, files: [{ label: 'PNG', size: '38 KB', href: `${B}/social/ogapay-avatar-dark.png` }] },
  { name: 'Profile image, light', note: '1080 × 1080, for social profiles.', img: `${B}/social/ogapay-avatar-light.png`, files: [{ label: 'PNG', size: '27 KB', href: `${B}/social/ogapay-avatar-light.png` }] },
  { name: 'Brand pattern, dark', note: 'For slides, banners and posts.', dark: true, img: `${B}/patterns/ogapay-corner-dark.svg`, files: [{ label: 'SVG', size: '187 KB', href: `${B}/patterns/ogapay-corner-dark.svg` }] },
  { name: 'Brand pattern, light', note: 'For slides, banners and posts.', img: `${B}/patterns/ogapay-corner-light.svg`, files: [{ label: 'SVG', size: '187 KB', href: `${B}/patterns/ogapay-corner-light.svg` }] },
]

const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Soft grey', hex: '#F5F5F5' },
]

const FILES: KitFile[] = [
  { label: 'Brand guide (PDF)', size: '95 KB', href: `${B}/guides/OgaPay_Brand_Guide.pdf` },
  { label: 'Original logo artwork', size: '53 KB', href: `${B}/original/ogapay-supplied-logo.jpg` },
  { label: 'Inter, desktop font (TTF)', size: '859 KB', href: `${B}/fonts/InterVariable.ttf` },
  { label: 'Inter, web font (WOFF2)', size: '344 KB', href: `${B}/fonts/InterVariable.woff2` },
  { label: 'Font licence', size: '4 KB', href: `${B}/fonts/Inter-LICENSE.txt` },
  { label: 'CSS colour tokens', size: '1 KB', href: `${B}/tokens/ogapay.css` },
  { label: 'JSON design tokens', size: '1 KB', href: `${B}/tokens/ogapay.tokens.json` },
  { label: 'Usage notes', size: '2 KB', href: `${B}/usage-notes.txt` },
]

const ZIP = { href: `${B}/OgaPay_Brand_Kit_v1.zip`, size: '1.5 MB' }

const nameOf = (href: string) => href.split('/').pop() || 'ogapay'

function Cards({ items }: { items: Asset[] }) {
  return (
    <div className="bk-grid">
      {items.map((a) => (
        <div key={a.name} className="bk-card">
          <div className={`bk-prev${a.dark ? ' dark' : ''}${a.wide ? ' wide' : ''}`}><img src={a.img} alt={`OgaPay ${a.name.toLowerCase()}`} loading="lazy" /></div>
          <div className="bk-body">
            <h3>{a.name}</h3>
            <p>{a.note}</p>
            <div className="bk-dl">
              {a.files.map((f) => (
                <a key={f.href} href={f.href} download={nameOf(f.href)}><i className="ti ti-download" aria-hidden="true" /> {f.label} <span>{f.size}</span></a>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ZipButton() {
  return (
    <a className="ui-btn ui-btn-dark bk-zip" href={ZIP.href} download="OgaPay_Brand_Kit_v1.zip">
      <i className="ti ti-download" aria-hidden="true" /> Download brand kit <span>ZIP · {ZIP.size}</span>
    </a>
  )
}

export default function BrandKit() {
  const [copied, setCopied] = useState('')
  const copy = (hex: string) => {
    navigator.clipboard?.writeText(hex).then(() => { setCopied(hex); setTimeout(() => setCopied(''), 1500) }).catch(() => {})
  }
  return (
    <Layout>
      <style>{`
        .bk-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:16px}
        @media(max-width:700px){.bk-grid{grid-template-columns:1fr}}
        .bk-card{border:1px solid var(--border);border-radius:14px;background:var(--card);overflow:hidden;display:flex;flex-direction:column}
        .bk-prev{height:180px;display:flex;align-items:center;justify-content:center;background:#fff;border-bottom:1px solid var(--border);padding:16px}
        .bk-prev.dark{background:#000}
        .bk-prev img{max-width:60%;max-height:130px;object-fit:contain}
        .bk-prev.wide img{max-width:80%;max-height:90px}
        .bk-body{padding:14px 16px;display:flex;flex-direction:column;gap:8px}
        .bk-body h3{margin:0;font-size:16px;font-weight:700;color:var(--text)}
        .bk-body p{margin:0;font-size:13px;color:var(--text2);line-height:1.5}
        .bk-dl{display:flex;gap:8px;flex-wrap:wrap}
        .bk-dl a{min-height:44px;padding:0 14px;border-radius:99px;border:1.5px solid var(--border);display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--text);text-decoration:none}
        .bk-dl a span{font-weight:500;color:var(--text3)}
        .bk-dl a:hover{border-color:var(--text)}
        .bk-sec{margin-top:40px}
        .bk-sec>h2{margin:0 0 4px;font-size:18px;font-weight:650;color:var(--text)}
        .bk-sec>p,.bk-sec li{font-size:14px;line-height:1.7;color:var(--text2)}
        .bk-sec>p{margin:0}
        .bk-zip{display:inline-flex;align-items:center;gap:8px;margin-top:16px;min-height:44px}
        .bk-zip span{font-weight:500;opacity:.75}
        .bk-colors{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}
        .bk-color{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:12px;padding:8px 12px;background:var(--card);min-height:44px;cursor:pointer;font:inherit;text-align:left}
        .bk-sw{width:32px;height:32px;border-radius:8px;border:1px solid var(--border)}
        .bk-color b{display:block;font-size:13px;color:var(--text)}
        .bk-color span{font-size:12px;color:var(--text3);font-family:ui-monospace,monospace}
        .bk-type{margin-top:16px;border:1px solid var(--border);border-radius:14px;background:var(--card);padding:20px}
        .bk-type .big{font-family:Inter,system-ui,sans-serif;font-size:40px;font-weight:700;letter-spacing:-.02em;color:var(--text);line-height:1.1}
        .bk-files{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:16px}
        @media(max-width:700px){.bk-files{grid-template-columns:1fr}}
        .bk-files a{min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 14px;border:1px solid var(--border);border-radius:12px;background:var(--card);font-size:14px;font-weight:600;color:var(--text);text-decoration:none}
        .bk-files a span{font-weight:500;font-size:12px;color:var(--text3)}
        .bk-files a:hover{border-color:var(--text)}
      `}</style>
      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-palette" /> Brand</span>
          <h1 className="ui-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Logo size={36} /> OgaPay brand kit</h1>
          <p className="ui-sub">Our identity, ready to use. Black and white logos, transparent PNGs, SVGs, brand patterns, the Inter font and a visual guide, for partners, press and creators.</p>
          <ZipButton />
        </header>

        <section className="bk-sec">
          <h2>Logo + wordmark</h2>
          <p>The OgaPay signature and wordmark, in black and white.</p>
          <Cards items={LOGOS} />
        </section>

        <section className="bk-sec">
          <h2>Standalone marks</h2>
          <p>The OgaPay symbol. Keep its proportions, rounded corners and diagonal cuts intact.</p>
          <Cards items={MARKS} />
        </section>

        <section className="bk-sec">
          <h2>Social and patterns</h2>
          <p>For profiles, presentations and posts about OgaPay.</p>
          <Cards items={SOCIAL} />
        </section>

        <section className="bk-sec">
          <h2>Colour and typography</h2>
          <p>A simple black and white look. Tap a colour to copy its code.</p>
          <div className="bk-colors">
            {COLORS.map((c) => (
              <button key={c.hex} type="button" className="bk-color" onClick={() => copy(c.hex)} aria-label={`Copy ${c.name} ${c.hex}`}>
                <div className="bk-sw" style={{ background: c.hex }} /><div><b>{c.name}</b><span>{copied === c.hex ? 'Copied' : c.hex}</span></div>
              </button>
            ))}
          </div>
          <div className="bk-type">
            <div className="big">Earn your way.</div>
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--text2)' }}>Inter is the typeface for brand posts and documents: clear, direct and easy to read.</p>
            <div className="bk-dl" style={{ marginTop: 12 }}>
              <a href={`${B}/fonts/InterVariable.ttf`} download="InterVariable.ttf"><i className="ti ti-download" aria-hidden="true" /> Download Inter <span>859 KB</span></a>
              <a href={`${B}/fonts/Inter-LICENSE.txt`} download="Inter-LICENSE.txt"><i className="ti ti-download" aria-hidden="true" /> Font licence <span>4 KB</span></a>
            </div>
          </div>
        </section>

        <section className="bk-sec">
          <h2>Using the logo</h2>
          <ul>
            <li>Write the name as <b>OgaPay</b>: one word, capital O and P.</li>
            <li>Give the logo clear space all around it.</li>
            <li>Use black on light backgrounds and white on dark ones.</li>
            <li>Don't stretch, rotate, redraw, retype, recolour or add effects to the logo.</li>
            <li>Don't use the logo in a way that suggests OgaPay sponsors or approves something it doesn't, or on a page that asks people for passwords or payments.</li>
          </ul>
        </section>

        <section className="bk-sec">
          <h2>Supporting files</h2>
          <p>The original artwork, the brand guide, fonts and files for designers and developers.</p>
          <div className="bk-files">
            {FILES.map((f) => (
              <a key={f.href} href={f.href} download={nameOf(f.href)}>{f.label} <span>{f.size}</span></a>
            ))}
          </div>
          <ZipButton />
          <p style={{ marginTop: 16 }}>Need something else? <Link to="/support">Contact us through Support</Link>. See also our <Link to="/copyright">Copyright</Link> page.</p>
        </section>
      </div>
    </Layout>
  )
}
