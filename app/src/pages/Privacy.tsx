import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import '../styles/profile-public.css'
import '../styles/legal.css'

// Privacy policy, ported from the June page. Statements were checked against how
// the platform works today (processors, KYC rules, what is public, retention) and
// corrected where the June text was wrong. Keep it in sync when those change.

const SECTIONS = [
  { id: 'collect', title: 'Information we collect' },
  { id: 'use', title: 'How we use it' },
  { id: 'public', title: 'What other people can see' },
  { id: 'sharing', title: 'Who we share it with' },
  { id: 'security', title: 'Storage, security and retention' },
  { id: 'cookies', title: 'Cookies and local storage' },
  { id: 'rights', title: 'Your rights' },
  { id: 'kyc', title: 'KYC and identity checks' },
  { id: 'crypto', title: 'Wallets and crypto' },
  { id: 'children', title: 'Children' },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact us' },
]

export default function Privacy() {
  const [active, setActive] = useState(SECTIONS[0].id)

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive(hit.target.id)
    }, { rootMargin: '-90px 0px -60% 0px' })
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])

  const go = (id: string) => {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
  }

  return (
    <Layout>
      <div className="up-wrap lg-wrap">
        <header className="lg-head">
          <div className="up-eyebrow">Legal</div>
          <h1>Privacy policy</h1>
          <p>Last updated: September 2026</p>
          <p className="lg-lead">OgaPay Technologies Ltd. ("OgaPay", "we", "us") runs the OgaPay marketplace. This policy explains what personal data we collect, why, who we share it with and the choices you have.</p>
        </header>

        <div className="lg-body">
          <nav className="lg-toc" aria-label="On this page">
            <div className="up-eyebrow">On this page</div>
            {SECTIONS.map((s, i) => (
              <button key={s.id} className={active === s.id ? 'on' : ''} onClick={() => go(s.id)}>
                <span>{String(i + 1).padStart(2, '0')}</span>{s.title}
              </button>
            ))}
          </nav>

          <article className="lg-text">
            <section id="collect">
              <h2><span>01</span>Information we collect</h2>
              <ul>
                <li><b>Account details:</b> name, email address, username, password (stored only as a bcrypt hash), profile photo and cover, and anything you add to your profile such as a bio, skills, portfolio and social links.</li>
                <li><b>Identity details for KYC:</b> your NIN, BVN or a government ID, date of birth and the documents you upload for verification.</li>
                <li><b>Payment details:</b> bank account name and number for withdrawals, Solana wallet addresses you add, and your transaction history on OgaPay.</li>
                <li><b>Activity on OgaPay:</b> jobs you post or apply for, work you submit, reviews, store listings and orders, community posts and chat messages, direct messages, and support tickets.</li>
                <li><b>Technical data:</b> IP address, browser and device type, and server logs created when you use the site.</li>
                <li><b>From sign-in providers:</b> if you sign in with Google, or connect your X (Twitter) account, we receive your basic profile from them (name, email or handle and profile picture).</li>
              </ul>
            </section>

            <section id="use">
              <h2><span>02</span>How we use it</h2>
              <ul>
                <li>To create and run your account and show your public profile.</li>
                <li>To hold job budgets in escrow, pay workers, process deposits, withdrawals and transfers, and share vault revenue with $PAY holders.</li>
                <li>To verify your identity (KYC) and to prevent fraud, abuse and duplicate accounts.</li>
                <li>To send you notifications and emails about your jobs, payments and account.</li>
                <li>To answer support tickets and resolve disputes.</li>
                <li>To meet our legal and regulatory obligations in Nigeria.</li>
              </ul>
              <p>We do not sell your personal data and we do not use it for advertising.</p>
            </section>

            <section id="public">
              <h2><span>03</span>What other people can see</h2>
              <p>Your public profile shows your name, username, photo, bio, skills, portfolio, reviews, job and store history, and your place on the leaderboard. Your earnings are shown only if you turn on "Show earnings" in Settings. Your email, phone number, bank details and KYC documents are never shown.</p>
              <p>You can make your profile private in <Link to="/settings">Settings</Link>. A private profile is hidden from search, the worker directory and the public leaderboard. People you work with can still see your username on the jobs you share, and anyone who knows your exact username can still send you money.</p>
              <p>Community chat messages can be read by every member of that community. Direct messages can be read by you and the other person, and by our team when we investigate a report or dispute.</p>
            </section>

            <section id="sharing">
              <h2><span>04</span>Who we share it with</h2>
              <p>We share personal data only with the service providers that help us run OgaPay, and only what they need:</p>
              <ul>
                <li><b>Paystack and Flutterwave</b> process naira deposits and bank withdrawals and receive your payment details and the amount.</li>
                <li><b>Dojah</b> checks your identity details and documents for KYC.</li>
                <li><b>Supabase</b> hosts our database and uploaded files. <b>Railway</b> runs our servers and <b>Vercel</b> hosts the website.</li>
                <li><b>Resend</b> delivers our emails.</li>
                <li><b>Google</b> and <b>X</b> if you choose to sign in with or connect those accounts.</li>
                <li><b>Solana</b>: crypto withdrawals are recorded on a public blockchain (see Wallets and crypto).</li>
              </ul>
              <p>We may also disclose information when the law, a court order or a regulator requires it, or to protect users from fraud.</p>
            </section>

            <section id="security">
              <h2><span>05</span>Storage, security and retention</h2>
              <ul>
                <li>All traffic between your browser and OgaPay is encrypted with HTTPS.</li>
                <li>Our database and files are stored with Supabase, which encrypts data at rest.</li>
                <li>Passwords are hashed with bcrypt; we can't see them.</li>
                <li>Only authorised OgaPay staff can access user data, and only to run the service, handle support, or investigate fraud.</li>
              </ul>
              <p>We keep your data while your account is open. When you delete your account in Settings we take your profile down and close your sign-in straight away. Records of payments, KYC and disputes are kept for as long as Nigerian law requires (generally up to 5 years). To have the rest of your personal data erased, email us (see Your rights).</p>
            </section>

            <section id="cookies">
              <h2><span>06</span>Cookies and local storage</h2>
              <p>OgaPay keeps you signed in by storing a login token in your browser's local storage, and remembers small preferences such as dark mode the same way. We do not use advertising cookies or third-party tracking scripts. Clearing your browser's site data signs you out.</p>
            </section>

            <section id="rights">
              <h2><span>07</span>Your rights</h2>
              <p>Under the Nigeria Data Protection Act 2023 you can ask us to:</p>
              <ul>
                <li>give you a copy of the personal data we hold about you;</li>
                <li>correct data that is wrong or incomplete (most of it you can edit yourself in <Link to="/settings">Settings</Link>);</li>
                <li>delete your account and data, apart from records we must keep by law;</li>
                <li>send your data to you in a machine-readable format;</li>
                <li>stop or restrict some processing, or withdraw consent you gave.</li>
              </ul>
              <p>Email <a href="mailto:privacy@ogapay.app">privacy@ogapay.app</a> from your account email. We reply within 48 hours and complete requests within 30 days. You can also complain to the Nigeria Data Protection Commission.</p>
            </section>

            <section id="kyc">
              <h2><span>08</span>KYC and identity checks</h2>
              <ul>
                <li>You need Level 1 verification (NIN) before you can withdraw money or send money to another user.</li>
                <li>Your details and documents are checked by Dojah, a Nigerian identity verification provider.</li>
                <li>We keep KYC records and documents with restricted access for as long as the law requires. They are used only for verification, fraud prevention and legal compliance.</li>
                <li>Your BVN and NIN are never shown to other users.</li>
              </ul>
            </section>

            <section id="crypto">
              <h2><span>09</span>Wallets and crypto</h2>
              <ul>
                <li>We store the Solana wallet addresses you add so we can send USDC or SOL withdrawals.</li>
                <li>We never ask for, or store, your private keys or seed phrase. Nobody from OgaPay will ever ask for them.</li>
                <li>Blockchain transactions are public and permanent. Anyone can see a withdrawal on the Solana network, and it can't be deleted or reversed.</li>
              </ul>
            </section>

            <section id="children">
              <h2><span>10</span>Children</h2>
              <p>OgaPay is only for people aged 18 or over. If you believe a child has created an account, email <a href="mailto:privacy@ogapay.app?subject=Minor%20account">privacy@ogapay.app</a> with the subject "Minor account" and we will close it and delete its data.</p>
            </section>

            <section id="changes">
              <h2><span>11</span>Changes to this policy</h2>
              <p>If we make a significant change we will tell you by email or in the app before it takes effect, and update the date at the top of this page. If you don't agree with a change you can close your account.</p>
            </section>

            <section id="contact">
              <h2><span>12</span>Contact us</h2>
              <ul>
                <li>Privacy questions and requests: <a href="mailto:privacy@ogapay.app">privacy@ogapay.app</a></li>
                <li>Everything else: <a href="mailto:support@ogapay.app">support@ogapay.app</a> or the <Link to="/support">help centre</Link></li>
                <li>OgaPay Technologies Ltd., Lagos, Nigeria</li>
              </ul>
            </section>
          </article>
        </div>
      </div>
    </Layout>
  )
}
