import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage'

// Software license: OgaPay's own code is not open source; the open-source parts
// it is built with keep their own licenses (read from each package, Oct 2026).
// Keep the lists in step with package.json when dependencies change.

const WEBSITE: [string, string][] = [
  ['React, React DOM', 'MIT'], ['React Router', 'MIT'], ['SWR', 'MIT'], ['Recharts', 'MIT'], ['Framer Motion', 'MIT'],
  ['Tabler Icons', 'MIT'], ['qrcode.react', 'ISC'], ['browser-image-compression', 'MIT'], ['Supabase JS', 'MIT'],
  ['Solana web3.js', 'MIT'], ['bs58', 'MIT'], ['Flutterwave React', 'MIT'], ['Vite and vite-plugin-pwa', 'MIT'],
]
const API: [string, string][] = [
  ['Express', 'MIT'], ['Prisma', 'Apache-2.0'], ['axios', 'MIT'], ['bcryptjs', 'MIT'], ['jsonwebtoken', 'MIT'], ['helmet', 'MIT'],
  ['cors', 'MIT'], ['morgan', 'MIT'], ['multer', 'MIT'], ['node-cron', 'ISC'], ['nodemailer', 'MIT-0'], ['otplib', 'MIT'],
  ['winston', 'MIT'], ['zod', 'MIT'], ['uuid', 'MIT'], ['express-rate-limit', 'MIT'], ['express-async-errors', 'ISC'],
  ['dotenv', 'BSD-2-Clause'], ['Solana web3.js and SPL Token', 'MIT, Apache-2.0'], ['tweetnacl', 'Unlicense'], ['groq-sdk', 'Apache-2.0'],
  ['qrcode', 'MIT'], ['ws', 'MIT'],
]
const FONTS: [string, string][] = [['Inter', 'SIL Open Font License 1.1'], ['JetBrains Mono', 'SIL Open Font License 1.1'], ['Tabler Icons webfont', 'MIT']]

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div className="ui-card lc-table">
      {rows.map(([n, l]) => <div key={n}><span>{n}</span><b>{l}</b></div>)}
    </div>
  )
}

export default function License() {
  return (
    <LegalPage title="Software license" updated="6 October 2026">
      <style>{`
        .lc-table{margin:12px 0 0;padding:4px 18px;max-width:720px}
        .lc-table div{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:11px 0;border-bottom:1px solid var(--border);font-size:13.5px}
        .lc-table div:last-child{border-bottom:0}
        .lc-table span{color:var(--text)}
        .lc-table b{font:500 12px var(--font-mono);color:var(--text2);text-align:right}
        .lc-label{margin:18px 0 0 !important;font-weight:600;color:var(--text) !important}
      `}</style>
        <section>
          <h2><span>01</span>OgaPay's software</h2>
          <p>
            The OgaPay website, app and API, and the code behind them, are owned by OgaPay Technologies Ltd. They are not open
            source: you may use OgaPay as a service, but copying, modifying or redistributing its code isn't allowed without our
            written permission. Using the service is covered by the <Link to="/terms">Terms</Link>.
          </p>
        </section>

        <section>
          <h2><span>02</span>Developer API</h2>
          <p>
            You may build your own tools on the public OgaPay API with your own API key, as described on the{' '}
            <Link to="/developer">developer page</Link>. Your code stays yours.
          </p>
        </section>

        <section>
          <h2><span>03</span>Open-source software we use</h2>
          <p>OgaPay is built with open-source software. Each package keeps its own license; we're grateful to the people who make them.</p>
          <p className="lc-label">Website and app</p>
          <Table rows={WEBSITE} />
          <p className="lc-label">API</p>
          <Table rows={API} />
          <p className="lc-label">Fonts and icons</p>
          <Table rows={FONTS} />
        </section>

        <section>
          <h2><span>04</span>Questions</h2>
          <p>Write to <a href="mailto:support@ogapay.app">support@ogapay.app</a>. For who owns the content on OgaPay, see <Link to="/copyright">Copyright</Link>.</p>
        </section>
    </LegalPage>
  )
}
