import { useState, useEffect } from 'react'
import Layout from '../components/Layout'

const ACCENT = '#191C6B'

const SECTIONS = [
  { id: 'information-we-collect', title: 'Information We Collect', icon: 'ti ti-database' },
  { id: 'how-we-use', title: 'How We Use Your Information', icon: 'ti ti-info-circle' },
  { id: 'sharing', title: 'Sharing Your Information', icon: 'ti ti-share' },
  { id: 'data-storage', title: 'Data Storage & Security', icon: 'ti ti-shield-lock' },
  { id: 'cookies', title: 'Cookies & Tracking', icon: 'ti ti-cookie' },
  { id: 'your-rights', title: 'Your Rights', icon: 'ti ti-user-check' },
  { id: 'kyc', title: 'KYC & Identity Verification', icon: 'ti ti-id' },
  { id: 'wallet-crypto', title: 'Wallet & Crypto Data', icon: 'ti ti-coin' },
  { id: 'children', title: "Children's Privacy", icon: 'ti ti-users' },
  { id: 'changes', title: 'Changes to This Policy', icon: 'ti ti-refresh' },
  { id: 'contact', title: 'Contact Us', icon: 'ti ti-mail' },
]

export default function Privacy() {
  const [activeSection, setActiveSection] = useState('')
  const [mobileTocOpen, setMobileTocOpen] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    )
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    setMobileTocOpen(false)
  }

  return (
    <Layout sidebar={false}>
      <style>{`
        .pp-page{max-width:100%!important;padding:0}
        .pp-hero{text-align:center;padding:48px 20px 40px;border-bottom:1px solid var(--border);background:var(--bg2)}
        .pp-hero h1{font-family:Outfit;font-size:36px;font-weight:900;margin:0 0 6px;color:var(--text)}
        .pp-hero .pp-date{color:var(--text3);font-size:13px;margin:0 0 10px}
        .pp-hero p{color:var(--text2);font-size:14px;margin:0 auto;max-width:600px;line-height:1.6}
        .pp-layout{display:grid;grid-template-columns:240px 1fr;gap:40px;max-width:1100px;margin:0 auto;padding:40px 20px 60px}
        @media(max-width:900px){.pp-layout{grid-template-columns:1fr}}

        /* ── Table of Contents ── */
        .pp-toc{position:sticky;top:80px;height:fit-content;max-height:calc(100vh - 120px);overflow-y:auto}
        .pp-toc-title{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:12px}
        .pp-toc-list{display:flex;flex-direction:column;gap:2px}
        .pp-toc-link{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;color:var(--text2);text-decoration:none;transition:all .15s;border-left:3px solid transparent;cursor:pointer;background:none;width:100%;text-align:left;font-family:inherit}
        .pp-toc-link:hover{color:var(--text);background:var(--bg2)}
        .pp-toc-link.active{color:${ACCENT};border-left-color:${ACCENT};background:rgba(25,28,107,.04)}
        .pp-toc-link .toc-num{color:${ACCENT};font-weight:800;font-size:11px;width:18px;flex-shrink:0}

        /* ── Mobile TOC dropdown ── */
        .pp-toc-mobile{display:none;margin-bottom:20px}
        @media(max-width:900px){.pp-toc-mobile{display:block}.pp-toc-desktop{display:none}}
        .pp-toc-mobile-btn{width:100%;height:44px;display:flex;align-items:center;gap:8px;padding:0 14px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:${ACCENT};font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
        .pp-toc-mobile-btn i{margin-left:auto;transition:transform .2s}
        .pp-toc-mobile-btn.open i{transform:rotate(180deg)}
        .pp-toc-dropdown{background:var(--card);border:1px solid var(--border);border-radius:10px;margin-top:4px;overflow:hidden;display:none}
        .pp-toc-dropdown.open{display:block}
        .pp-toc-dropdown button{width:100%;display:flex;align-items:center;gap:8px;padding:10px 14px;border:none;background:none;font-size:12px;font-weight:600;color:var(--text2);cursor:pointer;font-family:inherit;text-align:left;transition:all .1s}
        .pp-toc-dropdown button:hover{background:var(--bg2);color:${ACCENT}}
        .pp-toc-dropdown button .toc-num{color:${ACCENT};font-weight:800;font-size:11px;width:18px;flex-shrink:0}

        /* ── Content sections ── */
        .pp-content{min-width:0}
        .pp-section{margin-bottom:40px;scroll-margin-top:80px}
        .pp-section-header{display:flex;align-items:center;gap:12px;margin-bottom:14px}
        .pp-section-header .pp-num{width:32px;height:32px;border-radius:8px;background:${ACCENT};color:#fff;display:grid;place-items:center;font-size:13px;font-weight:900;flex-shrink:0}
        .pp-section-header h2{font-family:Outfit;font-size:20px;font-weight:900;margin:0;color:var(--text)}
        .pp-body{font-size:14px;line-height:1.75;color:var(--text2)}
        .pp-body p{margin:0 0 12px}
        .pp-body ul{margin:0 0 12px;padding-left:20px}
        .pp-body li{margin-bottom:6px}
        .pp-body strong{color:var(--text)}
        .pp-body .pp-highlight{background:rgba(25,28,107,.06);border-left:3px solid ${ACCENT};padding:12px 16px;border-radius:0 8px 8px 0;margin:14px 0;font-size:13px}
        .pp-body .pp-highlight strong{color:${ACCENT}}

        @media(max-width:600px){
          .pp-hero h1{font-size:26px}
          .pp-layout{padding:24px 16px 40px}
          .pp-section-header h2{font-size:17px}
        }
      `}</style>

      <div className="pp-page">
        {/* ── Hero ── */}
        <div className="pp-hero">
          <h1>Privacy Policy</h1>
          <p className="pp-date">Last update: June 2026</p>
          <p>OgaPay Technologies Ltd. (&lsquo;OgaPay&rsquo;, &lsquo;we&rsquo;, &lsquo;our&rsquo;) is committed to protecting your personal data. This policy explains how we collect, use, and protect your information when you use our platform.</p>
        </div>

        <div className="pp-layout">
          {/* ── TOC Desktop ── */}
          <nav className="pp-toc pp-toc-desktop">
            <div className="pp-toc-title">On this page</div>
            <div className="pp-toc-list">
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  className={`pp-toc-link ${activeSection === s.id ? 'active' : ''}`}
                  onClick={() => scrollTo(s.id)}
                >
                  <span className="toc-num">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </button>
              ))}
            </div>
          </nav>

          {/* ── TOC Mobile ── */}
          <div className="pp-toc-mobile">
            <button
              className={`pp-toc-mobile-btn ${mobileTocOpen ? 'open' : ''}`}
              onClick={() => setMobileTocOpen(o => !o)}
            >
              <i className="ti ti-list" />
              Jump to section
              <i className="ti ti-chevron-down" />
            </button>
            <div className={`pp-toc-dropdown ${mobileTocOpen ? 'open' : ''}`}>
              {SECTIONS.map((s, i) => (
                <button key={s.id} onClick={() => scrollTo(s.id)}>
                  <span className="toc-num">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* ── Content ── */}
          <div className="pp-content">
            {/* 1 */}
            <section id="information-we-collect" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">1</span>
                <h2>Information We Collect</h2>
              </div>
              <div className="pp-body">
                <p>We collect information you provide directly to us when you create an account, complete your profile, submit KYC documents, or communicate with us. This includes:</p>
                <ul>
                  <li><strong>Account information</strong> — your full name, email address, phone number, username, and profile photo</li>
                  <li><strong>Identity information</strong> — BVN, NIN, government-issued ID (International Passport, Driver License, or National ID) for KYC verification</li>
                  <li><strong>Financial information</strong> — bank account details (bank name, account number, account name), Solana wallet addresses, and transaction history</li>
                  <li><strong>Usage data</strong> — pages you visit, tasks you view and complete, IP address, browser type, device information, and operating system</li>
                  <li><strong>Communications</strong> — messages sent through our platform, support tickets, and emails exchanged with our team</li>
                </ul>
                <div className="pp-highlight">
                  <strong>Note:</strong> We only collect data that is necessary to operate the OgaPay platform and provide our services to you.
                </div>
              </div>
            </section>

            {/* 2 */}
            <section id="how-we-use" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">2</span>
                <h2>How We Use Your Information</h2>
              </div>
              <div className="pp-body">
                <p>We use the information we collect for the following purposes:</p>
                <ul>
                  <li>To create and manage your OgaPay account</li>
                  <li>To process task payments, rewards, and withdrawals</li>
                  <li>To verify your identity through KYC checks</li>
                  <li>To prevent fraud, abuse, and unauthorised access to the platform</li>
                  <li>To send you notifications about tasks, earnings, withdrawals, and platform updates</li>
                  <li>To improve our services, user experience, and platform performance</li>
                  <li>To comply with legal obligations and regulatory requirements in Nigeria</li>
                </ul>
                <p>We do <strong>not</strong> use your personal data for automated decision-making that significantly affects you without human review.</p>
              </div>
            </section>

            {/* 3 */}
            <section id="sharing" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">3</span>
                <h2>Sharing Your Information</h2>
              </div>
              <div className="pp-body">
                <p>We take your privacy seriously and do <strong>not</strong> sell your personal data to third parties. We share your information only in the following circumstances:</p>
                <ul>
                  <li><strong>Payment processors</strong> — Paystack and Flutterwave process NGN bank transfers. They receive your bank account details and transaction amount.</li>
                  <li><strong>KYC verification</strong> — Dojah (a Nigeria-licensed identity verification provider) processes your ID documents and BVN for verification.</li>
                  <li><strong>Cloud infrastructure</strong> — Railway and Supabase host our servers and database. Data is stored securely with industry-standard encryption.</li>
                  <li><strong>Task creators</strong> — When you apply for a task, the creator can see your username and public profile. They do not see your email, phone number, or financial details.</li>
                  <li><strong>Legal compliance</strong> — We may share information if required by law, court order, or government regulation in Nigeria.</li>
                </ul>
                <div className="pp-highlight">
                  <strong>Your data is never sold.</strong> We do not share your information with advertisers, data brokers, or any third party for marketing purposes.
                </div>
              </div>
            </section>

            {/* 4 */}
            <section id="data-storage" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">4</span>
                <h2>Data Storage &amp; Security</h2>
              </div>
              <div className="pp-body">
                <p>We implement industry-standard security measures to protect your data:</p>
                <ul>
                  <li><strong>Encryption in transit</strong> — all data transmitted between your browser and our servers is encrypted using HTTPS/TLS</li>
                  <li><strong>Encryption at rest</strong> — your data is stored in secure, encrypted databases hosted by Supabase and Railway</li>
                  <li><strong>Password security</strong> — passwords are hashed using bcrypt and never stored in plain text</li>
                  <li><strong>Access control</strong> — only authorised personnel have access to user data, and access is logged and audited</li>
                </ul>
                <p>We retain your personal data for as long as your account is active. After account deletion, we retain certain data for up to <strong>5 years</strong> to comply with Nigerian legal and regulatory requirements. After this period, all data is permanently deleted.</p>
              </div>
            </section>

            {/* 5 */}
            <section id="cookies" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">5</span>
                <h2>Cookies &amp; Tracking</h2>
              </div>
              <div className="pp-body">
                <p>OgaPay uses minimal cookies strictly for platform functionality:</p>
                <ul>
                  <li><strong>Essential cookies</strong> — required for authentication and keeping you logged in. These cannot be disabled without affecting your ability to use the platform.</li>
                  <li><strong>Session cookies</strong> — temporary cookies that expire when you close your browser</li>
                </ul>
                <p>We do <strong>not</strong> use advertising cookies, third-party tracking cookies, or analytics scripts that track your behaviour across other websites. Your browsing activity on OgaPay stays on OgaPay.</p>
                <p>You can manage cookie preferences through your browser settings. However, disabling essential cookies may prevent you from logging in or using certain features.</p>
              </div>
            </section>

            {/* 6 */}
            <section id="your-rights" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">6</span>
                <h2>Your Rights</h2>
              </div>
              <div className="pp-body">
                <p>Under the Nigeria Data Protection Regulation (NDPR) and applicable privacy laws, you have the following rights:</p>
                <ul>
                  <li><strong>Right to access</strong> — request a copy of the personal data we hold about you</li>
                  <li><strong>Right to rectification</strong> — request correction of inaccurate or incomplete data</li>
                  <li><strong>Right to deletion</strong> — request deletion of your account and associated data</li>
                  <li><strong>Right to data portability</strong> — request an export of your data in a structured format</li>
                  <li><strong>Right to withdraw consent</strong> — withdraw consent for data processing at any time</li>
                  <li><strong>Right to object</strong> — object to the processing of your data for certain purposes</li>
                </ul>
                <p>To exercise any of these rights, email us at <strong>privacy@ogapay.com</strong>. We will respond within 48 hours and process your request within 30 days.</p>
              </div>
            </section>

            {/* 7 */}
            <section id="kyc" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">7</span>
                <h2>KYC &amp; Identity Verification</h2>
              </div>
              <div className="pp-body">
                <p>Know Your Customer (KYC) verification is required to use certain features on OgaPay:</p>
                <ul>
                  <li>KYC is required for withdrawals above &#x20A6;10,000 and for creating tasks as a poster</li>
                  <li>We partner with <strong>Dojah</strong>, a Nigeria-licensed KYC provider, to verify your identity documents</li>
                  <li>Submitted ID documents are stored securely and used exclusively for identity verification</li>
                  <li>Documents are deleted after verification is complete unless retention is required by law</li>
                  <li>Your BVN is used only for identity verification and is never shared with third parties</li>
                </ul>
                <div className="pp-highlight">
                  <strong>Document security:</strong> All ID documents are transmitted over encrypted channels (HTTPS) and stored with restricted access. Only our compliance team can view submitted documents.
                </div>
              </div>
            </section>

            {/* 8 */}
            <section id="wallet-crypto" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">8</span>
                <h2>Wallet &amp; Crypto Data</h2>
              </div>
              <div className="pp-body">
                <p>OgaPay integrates with Solana blockchain wallets to process USDC and SOL payments. Here is how we handle crypto-related data:</p>
                <ul>
                  <li>Solana wallet addresses are stored in your profile to facilitate USDC payments and withdrawals</li>
                  <li>Wallet addresses are <strong>public by nature</strong> on the blockchain. Other users may see your wallet address when they interact with you on-chain</li>
                  <li>We do <strong>not</strong> store your private keys, seed phrases, or any wallet credentials. Your wallet remains fully under your control</li>
                  <li>On-chain transactions (USDC/SOL transfers) are permanent and recorded on the Solana blockchain. These cannot be deleted or reversed</li>
                  <li>We do not share your wallet address with any third party except as required to process blockchain transactions</li>
                </ul>
              </div>
            </section>

            {/* 9 */}
            <section id="children" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">9</span>
                <h2>Children&rsquo;s Privacy</h2>
              </div>
              <div className="pp-body">
                <p>OgaPay is not intended for users under the age of 18. We do not knowingly collect personal data from minors.</p>
                <p>If you are a parent or guardian and believe that your child has registered on OgaPay without your consent, please contact us immediately at <strong>privacy@ogapay.com</strong> with the subject line &lsquo;Minor Account&rsquo;.</p>
                <p>Upon verification, we will delete the account and all associated data within 7 days.</p>
              </div>
            </section>

            {/* 10 */}
            <section id="changes" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">10</span>
                <h2>Changes to This Policy</h2>
              </div>
              <div className="pp-body">
                <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or operational needs.</p>
                <ul>
                  <li>We will notify you of material changes via email and in-app notification at least 7 days before the changes take effect</li>
                  <li>The &lsquo;Last update&rsquo; date at the top of this page will reflect the most recent revision</li>
                  <li>Continued use of the OgaPay platform after changes take effect constitutes your acceptance of the updated policy</li>
                  <li>If you do not agree with the changes, you may delete your account before the effective date</li>
                </ul>
              </div>
            </section>

            {/* 11 */}
            <section id="contact" className="pp-section">
              <div className="pp-section-header">
                <span className="pp-num">11</span>
                <h2>Contact Us</h2>
              </div>
              <div className="pp-body">
                <p>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:</p>
                <ul>
                  <li><strong>Email:</strong> <a href="mailto:privacy@ogapay.com" style={{ color: ACCENT, fontWeight: 700, textDecoration: 'none' }}>privacy@ogapay.com</a></li>
                  <li><strong>Support:</strong> <a href="mailto:support@ogapay.com" style={{ color: ACCENT, fontWeight: 700, textDecoration: 'none' }}>support@ogapay.com</a></li>
                  <li><strong>Address:</strong> OgaPay Technologies Ltd., Lagos, Nigeria</li>
                  <li><strong>Response time:</strong> We aim to respond to all inquiries within 48 hours</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  )
}
