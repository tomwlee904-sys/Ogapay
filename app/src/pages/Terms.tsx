import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import '../styles/profile-public.css'
import '../styles/legal.css'

// Terms of Service. Written from how the platform works today (escrow, 10% fee,
// 72-hour auto-approval, KYC withdrawal limits, withdrawal minimum and fee,
// contests, creators, store buyer protection, developer API, vault). Keep the
// numbers in sync with the code when they change, and have a lawyer review
// before relying on it.

const SECTIONS = [
  { id: 'about', title: 'Who we are and these terms' },
  { id: 'account', title: 'Your account' },
  { id: 'kyc', title: 'Identity checks and limits' },
  { id: 'posting', title: 'Posting jobs' },
  { id: 'contests', title: 'Contests' },
  { id: 'working', title: 'Doing jobs' },
  { id: 'creators', title: 'Creators and audiences' },
  { id: 'money', title: 'Your wallet, deposits and withdrawals' },
  { id: 'store', title: 'The store' },
  { id: 'communities', title: 'Communities and the blog' },
  { id: 'developers', title: 'Developers and AI agents' },
  { id: 'vault', title: 'The vault and $PAY' },
  { id: 'conduct', title: 'Rules of conduct' },
  { id: 'disputes', title: 'Reports and disputes' },
  { id: 'suspension', title: 'Suspension and closing accounts' },
  { id: 'liability', title: 'Our responsibility to you' },
  { id: 'changes', title: 'Changes, law and contact' },
]

const n = (id: string) => String(SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, '0')

export default function Terms() {
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
          <h1>Terms of Service</h1>
          <p>Last updated: 9 October 2026</p>
          <p className="lg-lead">These terms are the agreement between you and OgaPay Technologies Ltd. ("OgaPay", "we", "us") for using the OgaPay marketplace, where people post paid jobs, do them, hire creators, and buy and sell services. By creating an account or using OgaPay you accept them. If you don't, please don't use OgaPay.</p>
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
            <section id="about">
              <h2><span>{n('about')}</span>Who we are and these terms</h2>
              <p>OgaPay connects people who need small jobs done ("posters") with people who do them ("workers"), lets businesses hire creators, and lets people sell products and services in the store. We hold money for jobs and orders, move it when work is approved or an order is received, and keep a record of every payment in your wallet.</p>
              <p>How we handle your personal data is explained in our <Link to="/privacy">Privacy policy</Link>, which is part of these terms.</p>
            </section>

            <section id="account">
              <h2><span>{n('account')}</span>Your account</h2>
              <ul>
                <li>You must be 18 or over and able to enter a binding agreement.</li>
                <li>One account per person. Give accurate details and keep them up to date.</li>
                <li>Keep your password and sign-in methods safe. Turn on two-factor authentication (2FA) in Settings; with it on, sending or withdrawing money needs a code from your authenticator app.</li>
                <li>You are responsible for what happens on your account. If you think someone else has got in, change your password and contact us straight away.</li>
              </ul>
            </section>

            <section id="kyc">
              <h2><span>{n('kyc')}</span>Identity checks and limits</h2>
              <p>To withdraw money, send money to other users, get your own account number, and take some jobs, you need to verify your identity (KYC). The more you verify, the more you can withdraw in a day:</p>
              <ul>
                <li>Level 1 (a bank account in your name, confirmed with your bank through our payment partner; or your NIN, confirmed with the National Identity Management Commission (NIMC) through Didit, or checked by our team when that isn't possible): up to ₦5,000 a day. If you verify with a bank account, bank withdrawals only go to accounts in your name.</li>
                <li>Level 2 (an ID document and a selfie, checked by our verification partner Didit): up to ₦10,000 a day</li>
                <li>Level 3 (ID documents, checked by our team through support): up to ₦50,000 a day</li>
              </ul>
              <p>A day means the 24 hours before each withdrawal. Bank and crypto withdrawals count together, crypto at the naira rate on the day; ones that fail or are rejected don't count. We may ask for more information, refuse a check, or remove a verification we later find was wrong. Using someone else's identity is not allowed.</p>
            </section>

            <section id="posting">
              <h2><span>{n('posting')}</span>Posting jobs</h2>
              <ul>
                <li><b>You pay up front.</b> When you post a job, the reward for every place plus our platform fee (currently 10% of the rewards) is taken from your wallet. The rewards are held in escrow until work is approved. Amounts are rounded to the kobo (or 6 decimal places for USDC and SOL).</li>
                <li><b>Who can take part.</b> You can limit a job to verified people, people with a verified X account, a connected wallet, a minimum rank or OgaScore, a minimum verified audience (see Creators), or members of a community you run. Requirements are checked when someone applies; they don't guarantee the quality of the work.</li>
                <li><b>Review work promptly.</b> When a worker submits, you approve or reject it. We remind you 24 hours after a submission; if you still haven't reviewed it 72 hours after it was sent, it is approved automatically and the worker is paid.</li>
                <li><b>Rejecting work.</b> Only reject work that doesn't meet what your job asked for, and say why. Rejections can be reported and reviewed.</li>
                <li><b>Cancelling and closing.</b> You can cancel a job before anyone has taken a place; everything held for it, including the fee, goes back to your wallet. When a job closes or ends with places unused, the unused rewards and the matching part of the fee go back to your wallet. Rewards for approved work are not returned.</li>
                <li><b>What you can't post:</b> anything illegal, deceptive or harmful; jobs asking workers to break the law or another platform's rules; requests for passwords, codes or personal financial details; adult content; and jobs that are really advertising a scheme or asking workers to pay you.</li>
              </ul>
            </section>

            <section id="contests">
              <h2><span>{n('contests')}</span>Contests</h2>
              <ul>
                <li>In a contest you set a prize for each place. All the prizes plus the platform fee are held when the contest goes live.</li>
                <li>When entries close you have 3 days to rank the winners from the entries that follow your brief. If you don't, the earliest entries that weren't rejected win, in the order they were sent, so the prizes are always paid.</li>
                <li>Prizes for places with no eligible entry, and the matching part of the fee, go back to your wallet. A contest that gets no entries is refunded in full.</li>
                <li>Entrants must send their own original work. By entering, you allow the poster to use the winning entry for the purpose the brief describes, unless the brief says otherwise.</li>
              </ul>
            </section>

            <section id="working">
              <h2><span>{n('working')}</span>Doing jobs</h2>
              <ul>
                <li>Only apply for jobs you can do, and meet any requirements the poster set.</li>
                <li>Submit genuine proof of your own work. Faked, copied or automated submissions will be rejected and can get your account suspended.</li>
                <li>When a job's places are all taken, it pauses for 24 hours so the people who took a place can send their work; anyone who hasn't submitted by then loses their place.</li>
                <li>You're paid into your wallet when the poster approves your work, or automatically 72 hours after you sent it if nobody reviewed it.</li>
                <li>You are an independent person doing individual jobs, not an employee of OgaPay or of the poster. You're responsible for any tax on what you earn.</li>
                <li>Where a job involves another website or app (for example a social network), you're responsible for following that service's rules.</li>
              </ul>
            </section>

            <section id="creators">
              <h2><span>{n('creators')}</span>Creators and audiences</h2>
              <ul>
                <li>You can add your audience on X, Instagram, TikTok, YouTube and Facebook. Only add accounts you own and control.</li>
                <li>Your X follower count is read from X when you connect your account. For the other platforms you send your username, your follower count and a screenshot of your profile, and our team checks them. Counts must be true at the time you send them; faked or bought audiences are not allowed.</li>
                <li>We decide whether to verify an audience, and we may correct a count, refuse it, or remove a verification at any time, for example if the account changes hands or the count was wrong. Jobs that need a minimum audience rely on these counts.</li>
                <li>Your audiences appear on your profile and in the creators directory only if you turn that on in Settings, Creator. You can turn it off at any time.</li>
                <li>When you promote something for a job, follow the rules of the platform you post on and the law, including labelling paid promotions where they require it.</li>
              </ul>
            </section>

            <section id="money">
              <h2><span>{n('money')}</span>Your wallet, deposits and withdrawals</h2>
              <ul>
                <li><b>Balances.</b> Your wallet can hold naira (NGN) and crypto (USDC, SOL). Money held for your jobs, your store orders or a withdrawal in progress isn't available to spend.</li>
                <li><b>Adding money.</b> By bank transfer to your own account number, by card, USSD or bank app through our payment partners, or with USDC on Solana. Money is added once the payment is confirmed. Payments made to the wrong account or reference may take longer to trace.</li>
                <li><b>Withdrawing to a bank.</b> The minimum is ₦5,000 or its equivalent and the fee is 1.5% (at least ₦100); both are shown before you confirm. Bank withdrawals are paid by our team, usually within 24 hours. Withdraw only to accounts in your own name.</li>
                <li><b>Crypto.</b> Crypto withdrawals cost 1%, are sent on the Solana network straight away and can't be reversed. Check the address; we can't recover crypto sent to a wrong address.</li>
                <li><b>Sending to other users</b> is free, instant and final once sent.</li>
                <li><b>Mistakes and reversals.</b> If money reaches your wallet by mistake or through a payment that is later reversed or found to be fraudulent, we may take it back or hold it while we check.</li>
                <li>We may pause a payment or withdrawal to prevent fraud or to meet a legal duty, and will tell you why where we're allowed to.</li>
              </ul>
            </section>

            <section id="store">
              <h2><span>{n('store')}</span>The store</h2>
              <ul>
                <li>Sellers are responsible for what they sell: describe it honestly, deliver what was promised, and only sell things they have the right to sell. Selling in the store is free; sellers receive the full price.</li>
                <li><b>Buyer protection.</b> When you buy, the price is taken from your wallet and held by OgaPay, and a chat opens with the seller to arrange delivery. The seller is paid when you confirm you received the order, or 3 days after they mark it delivered if you haven't reported a problem.</li>
                <li>If something is wrong, choose Report a problem before then: the payment stays held while we look at both sides, then we either refund you or pay the seller. Until the seller starts work you can cancel and get your money back, and the seller can refund you at any time while the payment is held.</li>
                <li>OgaPay also sells a few items of its own: a Premium badge and a worker frame (shown on your profile for as long as your account is in good standing), Priority Support (your tickets go to the top of our queue for 30 days) and Task Boost (one of your open jobs is listed first for 24 hours). They take effect straight away and aren't refundable once applied.</li>
              </ul>
            </section>

            <section id="communities">
              <h2><span>{n('communities')}</span>Communities and the blog</h2>
              <ul>
                <li>People who create or run a community are responsible for what is posted in it and for any jobs they post only for its members. We may remove content or close a community that breaks these terms.</li>
                <li>Anything you write on the blog, in comments or in community chats must be your own or something you have the right to share. You allow OgaPay to show it on OgaPay and in links to it. Articles from users are reviewed before they're published, and we may decline or remove them.</li>
                <li>Tips you send to a writer are final once sent.</li>
              </ul>
            </section>

            <section id="developers">
              <h2><span>{n('developers')}</span>Developers and AI agents</h2>
              <ul>
                <li>You can create API keys in Settings to let your app or AI agent use OgaPay for you. You are responsible for everything done with your keys, as if you had done it yourself.</li>
                <li>A key with write access can post jobs paid from your wallet into escrow, approve or reject work and cancel jobs. No key can withdraw money or send it to other users.</li>
                <li>Keep keys secret and revoke a key at once if it may have leaked. Respect the rate limits and spending caps; we may limit or revoke keys that are abused or that put other users at risk.</li>
              </ul>
            </section>

            <section id="vault">
              <h2><span>{n('vault')}</span>The vault and $PAY</h2>
              <p>Part of OgaPay's income (such as platform fees) goes into a vault that is shared out from time to time among holders of $PAY, in proportion to what they hold, as shown on the <Link to="/vault">Vault</Link> page. Amounts depend on OgaPay's income and aren't guaranteed. $PAY and the vault are part of how OgaPay rewards its community; they are not a savings product or an investment, and nothing on OgaPay is financial advice. We may change how the vault works, and will say so on the Vault page.</p>
            </section>

            <section id="conduct">
              <h2><span>{n('conduct')}</span>Rules of conduct</h2>
              <p>Don't use OgaPay to:</p>
              <ul>
                <li>break the law, or help anyone else do so;</li>
                <li>defraud, scam or mislead other users, including fake reviews, fake jobs, fake proof or fake audiences;</li>
                <li>run several accounts, share accounts, or use bots and scripts to apply, submit or collect rewards (except through your own API keys, within these terms);</li>
                <li>harass, threaten or abuse anyone, or post hateful, sexual or violent content;</li>
                <li>take conversations or payments for OgaPay jobs or orders off the platform to avoid fees or buyer protection;</li>
                <li>interfere with, probe or overload OgaPay's systems.</li>
              </ul>
            </section>

            <section id="disputes">
              <h2><span>{n('disputes')}</span>Reports and disputes</h2>
              <p>You can report a job, a submission or a user, report a problem with a store order, and open a ticket from the <Link to="/support">help centre</Link>. We look at the evidence from both sides and may approve or reject work, move held money, remove content or restrict accounts. We try to be fair and explain our decisions; if you disagree, reply to the ticket and we'll look again.</p>
            </section>

            <section id="suspension">
              <h2><span>{n('suspension')}</span>Suspension and closing accounts</h2>
              <ul>
                <li>We may limit, suspend or close an account that breaks these terms, puts other users at risk, or that we're required to act on by law. Where we can, we'll tell you why.</li>
                <li>You can close your account in Settings. Withdraw your balance first; we can't close an account with money held for open jobs, store orders or withdrawals in progress.</li>
                <li>If an account is closed for fraud, we may hold its balance while we investigate and return money to the people it belongs to.</li>
                <li>Money that arrives in a closed account is recorded and we'll arrange to return it to the sender.</li>
              </ul>
            </section>

            <section id="liability">
              <h2><span>{n('liability')}</span>Our responsibility to you</h2>
              <p>We work hard to keep OgaPay running and your money safe, but the service is provided as it is and may sometimes be unavailable. We aren't responsible for the quality of work, items or promotion provided by other users, for losses caused by things outside our reasonable control (such as bank, network or blockchain outages), or for indirect losses such as lost profits. Where the law allows, our total responsibility to you for any claim is limited to the fees you paid us in the 12 months before it. Nothing in these terms limits responsibility that can't be limited under Nigerian law, including for fraud or gross negligence.</p>
            </section>

            <section id="changes">
              <h2><span>{n('changes')}</span>Changes, law and contact</h2>
              <ul>
                <li>We may update these terms and our fees. We'll show the date at the top and tell you about important changes before they take effect. Fees always show before you pay.</li>
                <li>These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Nigeria can hear any dispute. Please contact us first; most problems are quickest to solve that way.</li>
                <li>Questions: <a href="mailto:support@ogapay.app">support@ogapay.app</a> or the <Link to="/support">help centre</Link>. Privacy: <a href="mailto:privacy@ogapay.app">privacy@ogapay.app</a>.</li>
              </ul>
            </section>
          </article>
        </div>
      </div>
    </Layout>
  )
}
