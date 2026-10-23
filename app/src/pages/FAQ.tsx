import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

/* Help centre. Answers describe how the platform actually behaves today
   (fees, limits and bonuses match the backend), so keep them in sync when
   those rules change. */

type QA = { q: string; a: string }
export type Topic = { id: string; title: string; items: QA[] }

// Also searched from the Support page
export const TOPICS: Topic[] = [
  {
    id: 'basics', title: 'Platform basics', items: [
      { q: 'What is OgaPay?', a: 'OgaPay is a task marketplace. People and businesses post paid tasks and jobs; workers complete them, submit proof and get paid from escrow once the work is approved. You can hold your balance in Naira or USDC and withdraw to a Nigerian bank account or a Solana wallet.' },
      { q: 'How does it work end to end?', a: 'A poster funds a task, and the budget is locked in escrow. Workers apply and submit proof. The poster approves, rejects or disputes each submission. Approved work is paid straight from escrow into the worker\'s wallet, and any unused budget goes back to the poster.' },
      { q: 'What do I need to get started?', a: 'An OgaPay account (email or Google sign-in) is enough to browse and apply for most tasks. Some tasks ask for KYC, a minimum OgaScore, a connected wallet, a connected X account or a blue tick on X. To withdraw money you need to verify your identity (Level 1 or above).' },
      { q: 'Can I earn and post jobs from the same account?', a: 'Yes. One account can do both. Your earnings, the jobs you post and your wallet all live in the same place.' },
      { q: 'Is OgaPay only for Nigeria?', a: 'Anyone can sign up and earn. Naira deposits and bank withdrawals work with Nigerian banks; everyone else can deposit and withdraw in USDC on Solana.' },
    ],
  },
  {
    id: 'earning', title: 'Earning and tasks', items: [
      { q: 'What kinds of tasks can I do?', a: 'Social tasks (follows, reposts, comments, community joins), app testing, surveys, research, data entry, writing, translation, design and video review. Each card shows the reward per worker, how many places are left, requirements and time left.' },
      { q: 'How do I complete a task?', a: 'Open the job, read the brief carefully, do the work, then press Apply and submit the proof it asks for, such as a screenshot, link or file. Check the requirements first: submissions that don\'t follow the brief are rejected.' },
      { q: 'What does "Available for me" show?', a: 'It hides jobs that are full, past their deadline, jobs you have already submitted to, and jobs whose requirements you don\'t meet.' },
      { q: 'When do I get paid?', a: 'As soon as the poster approves your submission, the reward moves from escrow into your OgaPay wallet. If the poster doesn\'t review it, they get a reminder a day after you submit, and your work is approved and paid automatically 3 days (72 hours) after you sent it.' },
      { q: 'What if a poster never reviews my work?', a: 'You still get paid. Work left unreviewed for 24 hours is flagged to our moderation team and the poster is reminded; anything still unreviewed 3 days after you submitted it is approved and paid automatically.' },
      { q: 'What is a payout check?', a: "Some social jobs use a payout check: do the task, send your proof, then wait out the check the poster picked (5 minutes, 30 minutes, 1 hour, 6 hours or 24 hours). When it ends we look at your X post again: it must still be up, be from your connected X account, and still reply to or quote the job's post. A longer check means your result comes later, not that your work failed. Passing means you are eligible, not guaranteed paid: the places are still limited and the poster still approves the work. Likes and follows can't be checked automatically, so the poster reviews them." },
      { q: 'What happens when all the places on a job are taken?', a: 'The job pauses for 24 hours so the people who took a place can send their work. Anyone who hasn\'t submitted by then loses their place, and it opens up for someone else.' },
      { q: 'My submission was rejected. What can I do?', a: 'Read the poster\'s note first. If you believe you followed the brief, open a dispute from the job page and an admin will review the evidence.' },
    ],
  },
  {
    id: 'kyc', title: 'KYC, OgaScore and trust', items: [
      { q: 'What are the verification levels?', a: 'Level 1 is free and instant with a bank account in your name: in Settings, Verification, pick your bank and type your account number, and if the account is in the same name as your OgaPay account you are verified straight away. You can also use your NIN with your date of birth, which we confirm with NIMC in a few seconds. Once you are verified, your name can only be changed through support. Level 2 is an ID and a selfie with Didit, which takes about two minutes and can be your first step too. Level 3 adds ID documents, checked by our team through support. Any level lets you withdraw to your bank, send money to other users and get your own account number, and each level raises your withdrawal limit.' },
      { q: 'Why do I need to verify?', a: 'It keeps the marketplace free of fake accounts. Verification is required to withdraw money and to send money to other users, and some tasks are only open to verified workers. Browsing, applying for most tasks and posting jobs do not need it.' },
      { q: 'What is OgaScore?', a: 'A reputation score out of 66, built only from things we have verified. LinkedIn and Human Verified are worth 10 each, X and GitHub 8 each, Google and Telegram 5 each, and identity verification 10 per level (20 at Level 2 or above). Posters can require a minimum OgaScore, so a higher score opens better-paid work.' },
      { q: 'What is "Human Verified"?', a: 'A one-time check through Very that confirms you are a unique real person. It adds to your OgaScore and helps keep bots out.' },
      { q: 'How do I report a user or a task?', a: 'Use Report on the job page, profile or submission. Reports go to the moderation team for review.' },
    ],
  },
  {
    id: 'posting', title: 'Creating and managing jobs', items: [
      { q: 'How do I post a job?', a: 'Go to Create, pick Custom job, X campaign or Quick task, write the brief, set the reward and number of places, then fund it from your wallet. The job goes live as soon as it is funded.' },
      { q: 'What is the difference between Challenge and Selection mode?', a: 'Challenge pays every approved submission, up to the number of places you set. Selection is for one-off projects: people apply, and you choose one person to do the work and receive the full reward.' },
      { q: 'Can I limit who takes part?', a: 'Yes. You can require KYC, a minimum OgaScore, a minimum worker rank, a connected wallet, a connected X account or a blue tick on X, and you can post only to your own community.' },
      { q: 'How do I review submissions?', a: 'Open the job and choose View submissions (or use Manage jobs). Approve pays the worker immediately; Reject returns that place to the pool with your note.' },
      { q: 'Can I cancel a job?', a: 'Yes, as long as nobody has started on it. The escrowed budget is returned to your wallet. If people have already submitted, review their work first.' },
      { q: 'Can I edit a job after posting?', a: 'You can request edits to the description, requirements and deadline. The reward can\'t be lowered once people have started applying.' },
    ],
  },
  {
    id: 'fees', title: 'Escrow and fees', items: [
      { q: 'How does escrow protect me?', a: 'When a job is funded, reward × places is locked in escrow. Workers can see the money is there before they start, and posters only pay for work they approve.' },
      { q: 'What are the fees?', a: 'Posters pay a 10% platform fee on the task budget, charged once when the job is funded. Workers keep 100% of the reward shown. Withdrawals cost 1.5% (minimum ₦100) to a bank account and 1% to a crypto wallet. Transfers between OgaPay users are free.' },
      { q: 'Worked example', a: 'You want 100 people to follow and repost a launch at ₦200 each. Rewards come to ₦20,000, the fee is ₦2,000, so you fund ₦22,000. Each approved worker receives the full ₦200.' },
      { q: 'What happens to unused budget?', a: 'If a job expires or is cancelled, whatever is left in escrow goes back to your wallet.' },
    ],
  },
  {
    id: 'wallet', title: 'Deposits and wallet', items: [
      { q: 'How do I add money?', a: 'Pay in Naira by card or bank transfer (Paystack or Flutterwave), or use your personal virtual account number from the Wallet page. For crypto, send USDC from a connected Phantom, Backpack or Solflare wallet; SOL can be swapped to USDC as you deposit.' },
      { q: 'Which currencies does my wallet hold?', a: 'Naira (NGN) and USDC. You can choose which one to display in Settings.' },
      { q: 'How do I connect a crypto wallet?', a: 'Go to Settings, choose Connect wallet and sign a short message with your wallet. Signing proves ownership; OgaPay never asks for your seed phrase or private key.' },
      { q: 'Is my money safe?', a: 'Balances sit on OgaPay\'s ledger with every movement recorded. Withdrawals need KYC, you can add two-factor authentication and OTP confirmation, and you can see and remove paired devices in Settings.' },
    ],
  },
  {
    id: 'withdrawals', title: 'Withdrawals', items: [
      { q: 'How do I withdraw?', a: 'Open Wallet, choose Withdraw, pick a saved bank account (NGN) or enter a Solana address (USDC or SOL), enter the amount and confirm.' },
      { q: 'What are the limits?', a: 'The minimum is ₦5,000 or its equivalent. The most you can withdraw in a day depends on your verification level: ₦5,000 at Level 1, ₦10,000 at Level 2 and ₦50,000 at Level 3. Bank and crypto withdrawals count together over the last 24 hours, and the Withdraw screen shows how much you have left.' },
      { q: 'How long does it take?', a: 'Bank withdrawals are paid every Thursday morning: anything you request before then goes out that Thursday. The money only goes to a bank account in your own name, as your bank records it; if your bank spells your name a little differently, our team checks it first, which can take longer. A bank account added less than a day before a Thursday payout is paid the Thursday after. Crypto withdrawals arrive once the Solana transaction confirms, typically within minutes.' },
      { q: 'My withdrawal failed. Where is my money?', a: 'Funds are only locked while a withdrawal is processing. If the payout fails, the lock is released and the money is available in your wallet again.' },
    ],
  },
  {
    id: 'referrals', title: 'Referrals and bonuses', items: [
      { q: 'How do referrals pay?', a: 'Share your referral link. You earn ₦500 when a friend you invited finishes their first paid job (a job posted by someone else, not you). Signing up or verifying alone does not pay. Paid once per friend.' },
      { q: 'Is there a limit?', a: 'Referral bonuses are paid for up to 20 referrals per person. This stops people farming the programme with fake accounts.' },
      { q: 'Do new users get a bonus?', a: 'Yes. ₦1,000 goes into your wallet when you verify your identity with your NIN or ID (free in Settings → Verification), or when you finish your first paid job, whichever comes first. Verifying with a bank account lets you withdraw, but the bonus then comes with your first paid job. One bonus per person.' },
    ],
  },
  {
    id: 'vault', title: 'Vault and $PAY', items: [
      { q: 'What is the Vault?', a: 'The Vault shares platform fees with $PAY holders. Every 12 hours, at 00:00 and 12:00 UTC, the Vault pool is split between holders according to how much $PAY they hold.' },
      { q: 'How do I claim Vault payouts?', a: 'Open Vault and choose Claim. You need a connected Solana wallet. Your pending payouts are added to your OgaPay USDC balance, and you can see every distribution in Vault history.' },
      { q: 'Are Vault payouts guaranteed?', a: 'No. They depend on the fees the platform actually earns, so they go up and down with activity. Nothing on OgaPay is financial advice.' },
    ],
  },
  {
    id: 'store', title: 'Buying and selling in the store', items: [
      { q: 'How does buying in the store work?', a: 'Choose Buy now on a product and pay from your OgaPay wallet. OgaPay holds the payment, and a chat opens with the seller so you can share details and arrange delivery. You can follow every order in Store, My orders.' },
      { q: 'What is buyer protection?', a: 'The seller only gets your payment when you press Confirm received, or 3 days after they mark the order delivered. If something is wrong, choose Report a problem before then: the payment stays on hold while OgaPay looks into it. Until the seller starts work you can also cancel and get your money back.' },
      { q: 'When do sellers get paid?', a: 'When the buyer confirms they received the order, or automatically 3 days after you mark it delivered if they report no problem. While the payment is held you can cancel and refund the buyer. Orders and payments are in My Store, Orders.' },
      { q: 'Are there store fees?', a: 'No. Sellers receive the full price of each order.' },
    ],
  },
  {
    id: 'communities', title: 'Communities', items: [
      { q: 'What are communities?', a: 'Groups built around a niche or an audience, with members, a group chat, a leaderboard and a feed of open and completed jobs.' },
      { q: 'How do I join one?', a: 'Open Communities and choose Join. Open communities let you in straight away; private ones send your request to the admins.' },
      { q: 'Can I create my own and post jobs to it?', a: 'Yes. Create a community, invite people, and share paid jobs with your members first so your next task starts with people you already trust. Creating a community costs ₦500 from your naira wallet (it keeps spam communities out); you see the fee before you create, and nothing is charged if creating fails.' },
      { q: 'Can I turn my USDC into naira?', a: 'Yes. In Wallet, choose Convert USDC to naira, enter an amount (or 25%, 50%, Max) and you see the rate and the exact naira amount before you confirm. There is no fee. USDC held for a job or a withdrawal cannot be converted. You can also switch on automatic conversion in Settings so USDC you receive becomes naira straight away.' },
    ],
  },
  {
    id: 'troubleshooting', title: 'Troubleshooting', items: [
      { q: 'My withdrawal says Failed or Rejected. Where is my money?', a: 'Back in your wallet. The amount is only held while a withdrawal is processing. If the bank transfer fails or our team rejects the withdrawal, the hold is released and the money is available again straight away. You get a notification with the reason (for example the bank\'s message), so check your bank details and try again.' },
      { q: 'My withdrawal has said Processing for days.', a: 'Bank withdrawals are paid once a week, on Thursday at 10:00 Lagos time, so a withdrawal you request on Friday waits until the next Thursday. It is paid the Thursday after that if the bank account was added less than a day before the payout. A withdrawal also waits for our team when your bank spells your name a little differently from your OgaPay account, or when your account is waiting for a check because it looks linked to other accounts. The money stays held in your wallet the whole time.' },
      { q: 'Why was my withdrawal refused when I requested it?', a: 'The message tells you which rule stopped it. The usual ones: the amount is under the ₦5,000 minimum (or its value in USDC); it is over what is left of your daily limit (the message says when more frees up); you haven\'t verified to Level 1 yet; the bank account isn\'t in your name; or the bank account is already used by another OgaPay account.' },
      { q: 'Why can\'t I withdraw more today?', a: 'The daily limit counts everything you withdrew in the last 24 hours, bank and crypto together, in naira at today\'s rate: ₦5,000 at Level 1, ₦10,000 at Level 2 and ₦50,000 at Level 3. It is a rolling 24 hours, not a calendar day, so each withdrawal stops counting 24 hours after you made it. Withdrawals that failed or were rejected don\'t count. Verify to a higher level in Settings to raise it.' },
      { q: 'I paid by card or bank transfer but my balance didn\'t go up.', a: 'After you pay, the Add money page asks Paystack or Flutterwave about the payment every few seconds, and most deposits show within a minute. If it says the payment is still being checked, don\'t pay again: the deposit is matched to its reference as soon as the provider confirms it. If it still hasn\'t arrived after an hour, contact Support with the payment reference and your bank or card receipt.' },
      { q: 'I sent money to my OgaPay account number and it hasn\'t arrived.', a: 'Money sent to your personal account number is added when Flutterwave tells us it has arrived, usually within minutes, but a slow bank can take longer. We add the amount Flutterwave records for the transfer. If it hasn\'t arrived after a few hours, contact Support with the sending bank, the amount, the time and the receipt or session ID.' },
      { q: 'My USDC deposit hasn\'t shown up.', a: 'A deposit from your connected Solana wallet is added once the transaction confirms on Solana, usually within a minute. Check that the transaction succeeded in your wallet app. If it did and your OgaPay balance hasn\'t changed, contact Support with the transaction signature.' },
      { q: 'It says my account has been banned.', a: 'A banned account can\'t sign in or use OgaPay. Accounts are banned for things like fake accounts, bots or fraud. If you think it\'s a mistake, email support@ogapay.app from the email address on the account and explain what happened.' },
      { q: 'It says I can\'t take new jobs right now.', a: 'That happens after a 3rd warning within 30 days. You can\'t take new jobs until an admin reviews it and lifts it. Money you have earned can still be withdrawn, and work you already sent is still reviewed and paid. You can send an appeal note from the warning banner.' },
      { q: 'My rank went down.', a: 'A 2nd warning within 30 days moves your rank down one step. Warnings older than 30 days, or ones an admin withdraws after an appeal, no longer count. You can claim your rank again once you meet its requirements.' },
      { q: 'I can\'t apply for a job.', a: 'The job page lists what it needs. Common reasons: all places are taken, the deadline has passed, you don\'t meet a requirement (verification level, OgaScore, rank, a connected X account, a blue tick on X or membership of a community), or you were already paid on a linked job (posters can link similar jobs so each person is paid once across them).' },
      { q: 'My payout check failed.', a: 'When the check ends we look at your X post again. It fails if the post was deleted, isn\'t from the X account connected to your OgaPay account, or no longer replies to or quotes the job\'s post. Keep the post up and unchanged until the check is over.' },
      { q: 'I didn\'t get my ₦1,000 sign-up bonus.', a: 'It is paid once per person, when you reach Level 1 with your NIN or ID, or when you finish your first paid job (a job someone else posted), whichever comes first. Verifying with only a bank account doesn\'t pay it on its own; then it comes with your first paid job. If your account looks linked to other accounts, the bonus waits until our team has checked it.' },
      { q: 'I didn\'t get my referral bonus.', a: 'You get ₦500 when a friend you invited finishes their first paid job on a job posted by someone else (not you or them). Your friend must be verified to Level 1, neither of you can be banned, and it is paid for up to 20 friends. Signing up or verifying alone doesn\'t pay. Bonuses for accounts that look linked wait for a check.' },
      { q: 'My 2FA code doesn\'t work.', a: 'Codes from your authenticator app change every 30 seconds, so type the current one. If codes are always wrong, set your phone\'s time to automatic. If you lost the phone, sign in with one of the backup codes you saved when you turned 2FA on, or contact Support.' },
      { q: 'I can\'t add my bank account.', a: 'The account must be in your own name, as your bank records it, and it can\'t already be used by another OgaPay account: each person can have one OgaPay account and each bank account belongs to one of them.' },
      { q: 'I\'m not getting job alerts on my phone.', a: 'Turn them on in Settings, Notifications, Push alerts, and allow notifications when your browser asks. On iPhone, add OgaPay to your home screen first. To avoid spam you get at most 10 new-job alerts a day.' },
      { q: 'The seller never delivered my order.', a: 'Report a problem on the order, or cancel it if the seller hasn\'t started. An order the seller hasn\'t marked delivered 14 days after you bought it is refunded to your wallet automatically.' },
      { q: 'A page looks broken or out of date.', a: 'We update OgaPay often. Refresh the page (or close and reopen the app) to load the latest version. If it is still broken, tell Support which page and what you see, with a screenshot.' },
    ],
  },
  {
    id: 'safety', title: 'Safety & payments', items: [
      { q: 'Will OgaPay ever ask for my password or codes?', a: 'No. OgaPay staff will never ask for your password, your 2FA or email codes, or your crypto wallet\'s seed phrase or private key, in chat, by email or on Telegram. Anyone who asks is trying to take your account.' },
      { q: 'Which channels are really OgaPay?', a: 'This website (ogapay.app), @Ogapayhq on X, t.me/ogapayhq on Telegram and the email address support@ogapay.app. Other accounts using our name, including t.me/ogapay, are not us.' },
      { q: 'Someone asked me to pay to get a job.', a: 'That\'s a scam. Workers never pay to take a job on OgaPay: the reward is already locked in escrow by the poster before the job goes live. Don\'t send money, and report the person.' },
      { q: 'Someone wants to pay me, or be paid, outside OgaPay.', a: 'Keep payments on OgaPay. Outside the platform there is no escrow, no buyer protection and no record we can check, so we can\'t help you get money back.' },
      { q: 'Someone sent me a screenshot of a payment.', a: 'Only trust your own OgaPay wallet. Screenshots are easy to fake. Money for a job, a sale or a send shows in your Wallet transactions.' },
      { q: 'How do I report a scam, a fake job or a bad user?', a: 'Report the job from its page, or the person from their profile, or open a ticket on the Support page. Add links and screenshots so our team can act quickly.' },
      { q: 'Can I have more than one OgaPay account?', a: 'No. One account per person. Accounts that share a bank account, a phone number or an ID number are linked and checked by our team: their bonuses are held and their withdrawals wait for a review until it\'s cleared.' },
      { q: 'Why can I only withdraw to a bank account in my own name?', a: 'So a stolen account can\'t be emptied into someone else\'s bank. We check the name on the account with the bank\'s own record (through Flutterwave), not the name you type. If it only partly matches, our team checks it before the money is sent.' },
      { q: 'Why does a new bank account wait for the next payout?', a: 'A bank account added less than a day before the Thursday payout is paid the Thursday after. If someone got into your account and added their bank, this gives you time to see the "new bank account" alert and stop it.' },
      { q: 'Why can a bank account belong to only one OgaPay account?', a: 'One person used to run many accounts and withdraw them all to the same bank. Now a bank account that one open OgaPay account has saved, verified with or withdrawn to can\'t be used by another.' },
      { q: 'What fees will I pay?', a: 'Posting a job or hiring someone: a 10% fee added on top of the budget, charged once when you fund it. Doing work: none, you keep 100% of the reward. Withdrawals: 1.5% to a bank (minimum ₦100) and 1% to a crypto wallet. Sending to another OgaPay user and selling in the store: free.' },
      { q: 'How do ranks work?', a: 'Everyone starts as Beginner. Intermediate needs 10 approved jobs. Advanced needs 50 jobs and a 4.0 rating from at least 5 different posters, Expert 200 jobs and 4.5 from 20 posters, and Legend 500 jobs and 4.8 from 50 posters. When you qualify you claim the next rank on the Ranks page, one step at a time. Most accounts get it at once; some are checked by our team first.' },
      { q: 'What gets an account a warning?', a: 'Spam or low-effort work, fake or edited proof, copied or AI-written work where the job asks for your own words, and breaking the site rules (bots, scripts or extra accounts). A 1st warning is only a warning, a 2nd within 30 days lowers your rank, and a 3rd stops you taking new jobs until an admin reviews it.' },
      { q: 'Can a poster keep my work and not pay?', a: 'The reward is locked in escrow before you start. Work the poster doesn\'t review is approved and paid automatically 3 days after you sent it. If your work is rejected and you followed the brief, open a dispute from the job page and an admin will look at the evidence.' },
      { q: 'Should I turn on two-factor authentication?', a: 'Yes. With 2FA on, withdrawals and sends to other users ask for the 6-digit code from your authenticator app, so a stolen password alone can\'t move your money. Turn it on in Settings, Security, and keep your backup codes somewhere safe.' },
      { q: 'How are the bonus rules kept fair?', a: 'Each person gets the ₦1,000 sign-up bonus once, and an inviter\'s ₦500 is only paid when the friend finishes a real paid job for someone else. Bursts of sign-ups from one inviter, and accounts sharing a bank, phone or ID, are flagged; their bonuses are held until our team checks them.' },
      { q: 'Is my store payment safe?', a: 'Yes. Your payment is held until you press Confirm received, or 3 days after the seller marks the order delivered. Report a problem before then and the payment stays on hold while OgaPay decides. Orders not delivered within 14 days are refunded automatically.' },
      { q: 'I sent money to the wrong person.', a: 'Sends between OgaPay users arrive instantly, so check the username and amount before you confirm. If it went to the wrong person, message them and contact Support with the transaction reference.' },
    ],
  },
  {
    id: 'developers', title: 'Developers and API', items: [
      { q: 'Can my app or AI agent use OgaPay?', a: 'Yes. With an API key from the Developer page, your app or agent can list open jobs and read your own jobs, submissions, balance and transactions. A key you create with write access can also post jobs (paid from your wallet into escrow), approve or reject work and cancel jobs. No key can withdraw or send money.' },
      { q: 'How do I get an API key?', a: 'Turn on Developer Mode in Settings, then create a key. Keys start with oga_ and are shown only once, so store yours safely. Each key can have its own rate limit and monthly spend cap.' },
      { q: 'I think my key leaked. What now?', a: 'Revoke it in Settings straight away and create a new one. Revoked keys stop working immediately.' },
    ],
  },
]

const TOTAL = TOPICS.reduce((n, t) => n + t.items.length, 0)
// Each answer's own address, e.g. /faq#q-my-2fa-code-doesnt-work
const answerId = (q: string) => 'q-' + q.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70)
const pad = (n: number) => String(n).padStart(2, '0')

export default function FAQ() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [active, setActive] = useState(TOPICS[0].id)
  const [copied, setCopied] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const q = search.trim().toLowerCase()
  const shown = useMemo(() => TOPICS
    .map(t => ({ ...t, items: q ? t.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)) : t.items }))
    .filter(t => t.items.length > 0), [q])
  const shownCount = shown.reduce((n, t) => n + t.items.length, 0)

  // Highlight the topic currently in view
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) setActive(visible[0].target.id.replace('topic-', ''))
    }, { rootMargin: '-90px 0px -60% 0px' })
    Object.values(sectionRefs.current).forEach(el => el && io.observe(el))
    return () => io.disconnect()
  }, [shown])

  // Open a question from the URL hash, e.g. /faq#withdrawals
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace('#', ''))
    if (id && TOPICS.some(t => t.id === id)) setTimeout(() => jump(id), 200)
    // A link to one answer: open it and scroll to it
    for (const t of TOPICS) {
      const item = t.items.find(i => answerId(i.q) === id)
      if (item) {
        setOpen(t.id + ':' + item.q)
        setTimeout(() => {
          const el = document.getElementById(id)
          if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' })
        }, 250)
        break
      }
    }
  }, [])

  const jump = (id: string) => {
    const el = sectionRefs.current[id]
    if (!el) return
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' })
    setActive(id)
  }

  return (
    <Layout>
      <style>{`
        .fq-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
        .fq-brand{display:flex;gap:16px;align-items:flex-start}
        .fq-icon{width:48px;height:48px;border-radius:14px;border:1px solid var(--border);background:var(--card2);display:grid;place-items:center;font-size:22px;color:var(--text2);flex-shrink:0}
        .fq-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:26px 0 22px;padding-bottom:22px;border-bottom:1px solid var(--border);flex-wrap:wrap}
        .fq-bar .ui-search{flex:1;max-width:440px}
        .fq-count{font:400 12px var(--font-mono);color:var(--text2);letter-spacing:.04em}
        .fq-layout{display:grid;grid-template-columns:230px minmax(0,1fr);gap:28px;align-items:start}
        .fq-side{position:sticky;top:calc(var(--nav-h,64px) + 20px)}
        .fq-side-head{display:flex;justify-content:space-between;padding:0 10px 10px;font:400 11px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--text2)}
        .fq-topic{width:100%;display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;border:0;background:none;cursor:pointer;font:400 12.5px 'Inter',system-ui,sans-serif;color:var(--text2);text-align:left}
        .fq-topic .n{font:400 11px var(--font-mono);color:var(--text3);width:18px}
        .fq-topic .c{margin-left:auto;font:400 11px var(--font-mono);color:var(--text3)}
        .fq-topic:hover{color:var(--text)}
        .fq-topic.on{background:var(--card2);color:var(--text);font-weight:500}
        .fq-sec{margin-bottom:30px;scroll-margin-top:90px}
        .fq-sec-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
        .fq-sec-head h2{margin:0;font-size:17px;font-weight:600;letter-spacing:-.02em}
        .fq-list{border:1px solid var(--border);border-radius:16px;background:var(--card);overflow:hidden}
        .fq-item+.fq-item{border-top:1px solid var(--border)}
        .fq-q{width:100%;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:15px 16px;border:0;background:none;cursor:pointer;font:500 13.5px 'Inter',system-ui,sans-serif;color:var(--text);text-align:left}
        .fq-q i{font-size:15px;color:var(--text3);transition:transform .2s ease;flex-shrink:0}
        .fq-item.open .fq-q i{transform:rotate(180deg)}
        .fq-q:focus-visible{outline:2px solid var(--text);outline-offset:-2px;border-radius:12px}
        .fq-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .25s ease}
        .fq-item.open .fq-a{grid-template-rows:1fr}
        .fq-a > div{overflow:hidden}
        .fq-a p{margin:0;padding:0 16px 16px;font-size:13.5px;line-height:1.7;color:var(--text2)}
        .fq-chips{display:none}
        .fq-link{display:inline-flex;align-items:center;gap:5px;min-height:36px;margin:0 16px 10px;font-size:12px;font-weight:600;color:var(--text3);text-decoration:none}
        .fq-link:hover{color:var(--text)}
        .fq-help{margin-top:12px;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px;flex-wrap:wrap}
        @media(max-width:860px){
          .fq-layout{grid-template-columns:1fr}
          .fq-side{display:none}
          .fq-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:18px;scrollbar-width:none;position:sticky;top:var(--nav-h,64px);background:var(--bg);z-index:5;padding-top:8px}
          .fq-chips::-webkit-scrollbar{display:none}
          .fq-chips button{flex-shrink:0;height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--border);background:var(--card);font:500 12px 'Inter',system-ui,sans-serif;color:var(--text2);cursor:pointer}
          .fq-chips button.on{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
        }
        @media(prefers-reduced-motion:reduce){.fq-a{transition:none}.fq-q i{transition:none}}
      `}</style>

      <div className="ui-page" style={{ paddingTop: 28 }}>
        <header className="fq-head">
          <div className="fq-brand">
            <span className="fq-icon" aria-hidden="true"><i className="ti ti-help" /></span>
            <div>
              <span className="ui-eyebrow">Help center</span>
              <h1 className="ui-title" style={{ marginTop: 4 }}>Frequently asked questions</h1>
              <p className="ui-sub">Answers about jobs, payments, rewards and working with OgaPay.</p>
            </div>
          </div>
          <Link to="/support" className="ui-btn ui-btn-ghost"><i className="ti ti-headset" /> Contact support</Link>
        </header>

        <div className="fq-bar">
          <div className="ui-search">
            <i className="ti ti-search" />
            <input className="ui-input" type="search" placeholder="Search questions and answers..." aria-label="Search the FAQ"
              value={search} onChange={e => { setSearch(e.target.value); setOpen(null) }} />
          </div>
          <span className="fq-count">{q ? `${shownCount} of ${TOTAL} answers` : `${TOTAL} answers · ${TOPICS.length} topics`}</span>
        </div>

        <nav className="fq-chips" aria-label="Topics">
          {shown.map(t => <button key={t.id} className={active === t.id ? 'on' : ''} onClick={() => jump(t.id)}>{t.title}</button>)}
        </nav>

        <div className="fq-layout">
          <aside className="fq-side" aria-label="Browse topics">
            <div className="fq-side-head"><span>Browse topics</span><span>{pad(shown.length)}</span></div>
            {shown.map((t) => (
              <button key={t.id} className={`fq-topic${active === t.id ? ' on' : ''}`} onClick={() => jump(t.id)}>
                <span className="n">{pad(TOPICS.findIndex(x => x.id === t.id) + 1)}</span>
                {t.title}
                <span className="c">{t.items.length}</span>
              </button>
            ))}
          </aside>

          <div>
            {shown.length === 0 && (
              <div className="ui-empty">
                <b style={{ color: 'var(--text)' }}>No answers match “{search}”</b>
                <p style={{ margin: '6px 0 16px' }}>Try other words, or ask the team directly.</p>
                <Link to="/support" className="ui-btn ui-btn-dark">Contact support</Link>
              </div>
            )}
            {shown.map(t => (
              <section key={t.id} id={`topic-${t.id}`} className="fq-sec" ref={el => { sectionRefs.current[t.id] = el }}>
                <div className="fq-sec-head">
                  <h2>{t.title}</h2>
                  <span className="fq-count">{t.items.length} {t.items.length === 1 ? 'answer' : 'answers'}</span>
                </div>
                <div className="fq-list">
                  {t.items.map(item => {
                    const key = t.id + ':' + item.q
                    const isOpen = open === key || (!!q && t.items.length <= 3)
                    return (
                      <div key={key} id={answerId(item.q)} className={`fq-item${isOpen ? ' open' : ''}`}>
                        <button className="fq-q" aria-expanded={isOpen} onClick={() => setOpen(open === key ? null : key)}>
                          {item.q}<i className="ti ti-chevron-down" />
                        </button>
                        <div className="fq-a" role="region"><div><p>{item.a}</p>
                          <a className="fq-link" href={`#${answerId(item.q)}`} tabIndex={isOpen ? 0 : -1} onClick={(e) => {
                            e.preventDefault()
                            const url = `${window.location.origin}/faq#${answerId(item.q)}`
                            window.history.replaceState(null, '', `#${answerId(item.q)}`)
                            navigator.clipboard?.writeText(url).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000) }).catch(() => {})
                          }}><i className="ti ti-link" /> {copied === key ? 'Link copied' : 'Link to this answer'}</a>
                        </div></div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}

            <div className="ui-card fq-help">
              <div>
                <b style={{ fontSize: 14 }}>Still stuck?</b>
                <p className="ui-sub" style={{ margin: '4px 0 0' }}>Message the team on Telegram or email support@ogapay.app.</p>
              </div>
              <div className="ui-actions">
                <a className="ui-btn ui-btn-ghost" href="https://t.me/ogapayhq" target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" /> Telegram</a>
                <a className="ui-btn ui-btn-dark" href="mailto:support@ogapay.app"><i className="ti ti-mail" /> Email us</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
