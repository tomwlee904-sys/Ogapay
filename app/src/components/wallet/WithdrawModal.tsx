import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from './Sheet'
import AddBankForm from './AddBankForm'
import TwoFactorField, { is2FAError } from '../TwoFactorField'
import { apiRequest } from '../../lib/api'
import { sharedGet } from '../../lib/shared'
import { useAuth } from '../../context/AuthContext'
import { useWalletBalance } from '../../context/WalletBalanceContext'
import { useCurrency } from '../../context/CurrencyContext'
import { formatCedi } from '../../lib/money'
import { MIN_WITHDRAW_NGN, kycOf, maskAcct, money, naira, newKey, ngnWithdrawFee, shortAddr, whenAgain, withdrawLimit, type Allowance, type Balances, type Bank, nextPayoutDay, payoutDayLabel } from '../../lib/wallet'
import InfoTip from '../InfoTip'

type Done = { kind: 'bank'; net: number; bank: Bank; reference: string; payDay: Date; teamCheck?: boolean } | { kind: 'momo'; net: number; to: string; reference: string; payDay: Date; teamPays?: boolean } | { kind: 'crypto'; amount: number; currency: string; to: string; reference: string; pending: boolean }

// Ghana mobile money networks (backend momo.service NETWORKS)
const MOMO_NETWORKS = [['MTN', 'MTN MoMo'], ['VODAFONE', 'Telecel Cash'], ['AIRTELTIGO', 'AirtelTigo Money']] as const

// Withdraw to a bank account (paid every Thursday, automatically when the account
// is in their own name: backend payout.service.js), to mobile money for members in
// Ghana (paid in cedis by our team, usually within a week, until the server sends
// them on Thursdays: backend momo.service.js) or to a Solana
// wallet (sent straight away). Bank accounts are the saved, verified
// ones: the old form took a typed bank name with no bank code, so payouts had to
// be matched by hand.
export default function WithdrawModal({ onClose, onDone, balances: given }: { onClose: () => void; onDone?: () => void; balances?: Balances | null }) {
  const { user, refreshUser } = useAuth()
  const { balances: ctx, refresh: refreshBalance } = useWalletBalance()
  const balances = (given || ctx) as Balances | null
  const { tier, verified } = kycOf(user)
  const limit = withdrawLimit(tier)
  const ghana = user?.country === 'GH'
  const { convert } = useCurrency()
  // What's left of today's limit (the server counts the last 24 hours)
  const [allow, setAllow] = useState<Allowance | null>(null)

  const [tab, setTab] = useState<'bank' | 'momo' | 'crypto'>(ghana ? 'momo' : 'bank')
  const [momoNetwork, setMomoNetwork] = useState<string>('MTN')
  const [momoNumber, setMomoNumber] = useState('')
  const [banks, setBanks] = useState<Bank[] | null>(null)
  const [bankId, setBankId] = useState('')
  const [adding, setAdding] = useState(false)
  const [amount, setAmount] = useState('')
  // Crypto withdrawals are USDC on Solana only (SOL was dropped 2026-11-13: nothing
  // can put SOL in an OgaPay wallet any more)
  const coin = 'USDC' as const
  const [address, setAddress] = useState('')
  const [otp, setOtp] = useState('')
  const [otpAsked, setOtpAsked] = useState(false)
  const needOtp = !!(user as any)?.isTwoFactorEnabled || otpAsked
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  // One key per withdrawal: a retry of the same request (e.g. after a timeout)
  // can't pay out twice. A new key once anything about it changes.
  const key = useRef(newKey())
  useEffect(() => { key.current = newKey() }, [tab, bankId, amount, coin, address, momoNetwork, momoNumber])

  useEffect(() => {
    if (!verified) return
    sharedGet<Bank[]>('/wallet/banks', 5000).then((list) => {
      const l = Array.isArray(list) ? list : []
      setBanks(l)
      setBankId((l.find((b) => b.isDefault) || l[0])?.id || '')
      if (!l.length) setAdding(true)
    }).catch(() => setBanks([]))
  }, [verified])
  useEffect(() => {
    if (!verified) return
    apiRequest<Allowance>('/wallet/withdraw-limit').then((a) => setAllow(a || null)).catch(() => setAllow(null))
  }, [verified])
  const dayLimit = allow?.dailyLimit ?? limit
  const left = allow ? allow.leftToday : limit
  const usedUp = !!allow && allow.leftToday < MIN_WITHDRAW_NGN

  // Bank and mobile money both pay out naira (mobile money in cedis on the day)
  const inNaira = tab !== 'crypto'
  const cur = inNaira ? 'NGN' : coin
  const available = Number(balances?.[cur]?.available ?? 0)
  const amt = parseFloat(amount) || 0
  const fee = inNaira && amt > 0 ? ngnWithdrawFee(amt) : 0
  // What the naira is worth in cedis at today's display rate (the exact cedis are
  // set by Flutterwave's rate when it's sent); 0 when there's no rate yet
  const ghsNow = tab === 'momo' && amt > fee ? convert(amt - fee, 'NGN', 'GHS') : 0
  const momoNeedsLevel2 = tab === 'momo' && tier < 2
  const bank = banks?.find((b) => b.id === bankId) || null

  // What's wrong with the amount, before asking the server
  const problem = useMemo(() => {
    if (!amt) return ''
    if (amt > available) return `You have ${money(available, cur)} available.`
    if (inNaira) {
      if (amt < MIN_WITHDRAW_NGN) return `The minimum is ${naira(MIN_WITHDRAW_NGN, 0)}.`
      if (amt > left) return usedUp
        ? `You've used today's limit of ${naira(dayLimit, 0)}.${allow?.nextAt ? ` You can withdraw again from ${whenAgain(allow.nextAt)}.` : ''}`
        : `You can withdraw up to ${naira(left, 0)} today (your limit is ${naira(dayLimit, 0)} a day).`
    }
    return ''
  }, [amt, available, cur, inNaira, left, usedUp, dayLimit, allow])

  const max = () => {
    const m = inNaira ? Math.min(available, left) : available
    setAmount(m > 0 ? String(Math.floor(m * (inNaira ? 1 : 1e6)) / (inNaira ? 1 : 1e6)) : '')
  }

  const finish = () => { refreshBalance(); refreshUser(); onDone?.() }

  async function submit() {
    if (!amt || problem) return
    if (needOtp && otp.length !== 6) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setBusy(true); setError('')
    try {
      if (tab === 'bank') {
        if (!bank) throw new Error('Choose a bank account.')
        const r = await apiRequest<{ reference: string; netAmount?: number; payoutDate?: string; teamCheck?: boolean }>('/wallet/withdraw', {
          method: 'POST',
          headers: { 'Idempotency-Key': key.current },
          body: JSON.stringify({ amount: amt, currency: 'NGN', bankCode: bank.bankCode, bankName: bank.bankName, accountNumber: bank.accountNumber, accountName: bank.accountName, ...(otp && { otp }) }),
        })
        setDone({ kind: 'bank', net: Number(r?.netAmount ?? amt - fee), bank, reference: r?.reference || '', payDay: r?.payoutDate ? new Date(r.payoutDate) : nextPayoutDay(), teamCheck: !!r?.teamCheck })
      } else if (tab === 'momo') {
        if (!momoNumber.trim()) throw new Error('Type your mobile money number.')
        const r = await apiRequest<{ reference: string; netAmount?: number; payoutDate?: string; teamPays?: boolean }>('/wallet/withdraw', {
          method: 'POST',
          headers: { 'Idempotency-Key': key.current },
          body: JSON.stringify({ amount: amt, currency: 'NGN', method: 'MOMO', momoNetwork, momoNumber: momoNumber.trim(), ...(otp && { otp }) }),
        })
        const net = MOMO_NETWORKS.find(([v]) => v === momoNetwork)?.[1] || 'mobile money'
        setDone({ kind: 'momo', net: Number(r?.netAmount ?? amt - fee), to: `${net} •••• ${momoNumber.replace(/\D/g, '').slice(-4)}`, reference: r?.reference || '', payDay: r?.payoutDate ? new Date(r.payoutDate) : nextPayoutDay(), teamPays: !!r?.teamPays || !r?.payoutDate })
      } else {
        const to = address.trim()
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(to)) throw new Error("That isn't a Solana wallet address.")
        const r = await apiRequest<{ reference: string; status?: string }>('/wallet/withdraw/crypto', {
          method: 'POST',
          headers: { 'Idempotency-Key': key.current },
          body: JSON.stringify({ amount: amt, currency: coin, toAddress: to, ...(otp && { otp }) }),
        })
        setDone({ kind: 'crypto', amount: amt, currency: coin, to, reference: r?.reference || '', pending: String(r?.status || '').toUpperCase() === 'PROCESSING' })
      }
      finish()
    } catch (e: any) {
      const msg = e?.message || 'Withdrawal failed. Try again.'
      if (is2FAError(msg)) { setOtpAsked(true); setOtp('') }
      setError(msg)
    }
    setBusy(false)
  }

  if (done) {
    return (
      <Sheet title="Withdraw" onClose={onClose}>
        <div className="wl-done">
          <div className={`wl-done-ic${done.kind !== 'crypto' || done.pending ? ' wait' : ''}`}><i className={done.kind !== 'crypto' || done.pending ? 'ti ti-clock' : 'ti ti-check'} /></div>
          {done.kind === 'momo' ? (
            <>
              <h3>Withdrawal requested</h3>
              {done.teamPays
                ? <p>{naira(done.net)} will be sent to your {done.to}, paid in cedis at the rate on the day. Our team pays it, usually within a week. You'll see it in your history as Processing until it's paid.</p>
                : <p>{naira(done.net)} will be sent to your {done.to} on <b>{payoutDayLabel(done.payDay)}</b>, paid in cedis at the rate on the day. You'll see it in your history as Processing until it's paid.</p>}
            </>
          ) : done.kind === 'bank' ? (
            <>
              <h3>Withdrawal requested</h3>
              {done.teamCheck
                ? <p>{naira(done.net)} will be sent to {done.bank.bankName} {maskAcct(done.bank.accountNumber)} once our team has checked it, because the name on this bank account is a little different from yours. You'll see it in your history as Processing until it's paid.</p>
                : <p>{naira(done.net)} will be sent to {done.bank.bankName} {maskAcct(done.bank.accountNumber)} on <b>{payoutDayLabel(done.payDay)}</b>. We pay bank withdrawals every Thursday. You'll see it in your history as Processing until it's paid.</p>}
            </>
          ) : (
            <>
              <h3>{done.pending ? 'Sent, confirming' : 'Sent'}</h3>
              <p>{money(done.amount, done.currency)} {done.pending ? 'was sent and is waiting for the Solana network to confirm it.' : 'is on its way to'} {!done.pending && shortAddr(done.to)}</p>
            </>
          )}
          {done.reference && <div className="ref">Reference {done.reference}</div>}
          <div className="ui-actions"><button type="button" className="ui-btn ui-btn-dark" onClick={onClose}>Done</button></div>
        </div>
      </Sheet>
    )
  }

  if (!verified) {
    return (
      <Sheet title="Withdraw" onClose={onClose}>
        <div className="dp-lock">
          <i className="ti ti-shield-check" />
          <h3>Verify your identity to withdraw</h3>
          {ghana ? <p>In Ghana, withdrawals to mobile money need Level 2: send a photo of your Ghana Card and its number in Settings → Verification. Our team checks it, usually within a day. The smallest withdrawal is ₦5,000 (fee 1.5%, at least ₦100), paid in cedis, usually within a week.</p> : <p>Withdrawals need Level 1 verification: a bank account in your name (free) or your NIN. It takes a minute and lets you ask to withdraw up to {naira(withdrawLimit(1), 0)} a day, paid out every Thursday. The smallest withdrawal is ₦5,000 (fee 1.5%, at least ₦100).</p>}
          <Link className="ui-btn ui-btn-dark" to="/settings/verification" onClick={onClose}>Verify now</Link>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Withdraw" onClose={onClose}>
      {/* Ghana has 3 tabs: one row of 3 (like Campaigns) with short labels so each fits on a phone (2026-11-07) */}
      <div className="wl-seg" role="group" aria-label="Withdraw to" style={ghana ? { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' } : undefined}>
        {ghana && <button type="button" aria-pressed={tab === 'momo'} onClick={() => { setTab('momo'); setAmount(''); setError('') }}>Mobile money</button>}
        <button type="button" aria-pressed={tab === 'bank'} onClick={() => { setTab('bank'); setAmount(''); setError('') }}>{ghana ? 'Bank' : 'To a bank'}</button>
        <button type="button" aria-pressed={tab === 'crypto'} onClick={() => { setTab('crypto'); setAmount(''); setError('') }}>{ghana ? 'Crypto' : 'To a crypto wallet'}</button>
      </div>

      {tab === 'bank' && (adding || (banks && !banks.length)) ? (
        <>
          <p className="wl-note" style={{ margin: '0 0 14px' }}>Add the bank account to send your money to. We check the account name with the bank.</p>
          <AddBankForm
            makeDefault={!banks?.length}
            onCancel={banks?.length ? () => setAdding(false) : undefined}
            onSaved={(b) => { setBanks((l) => [...(l || []), b]); setBankId(b.id); setAdding(false) }}
          />
        </>
      ) : (
        <>
          {tab === 'bank' ? (
            banks === null ? <div className="ui-sk" style={{ height: 66, marginBottom: 14 }} /> : (
              <div className="wl-field">
                <span className="ui-label">Send to</span>
                <div className="wl-pick">
                  {banks.map((b) => (
                    <label key={b.id}>
                      <input type="radio" name="wd-bank" checked={bankId === b.id} onChange={() => setBankId(b.id)} />
                      <span className="wl-bank-main">
                        <strong>{b.accountName}</strong>
                        <span>{b.bankName} {maskAcct(b.accountNumber)}</span>
                      </span>
                    </label>
                  ))}
                  <button type="button" className="wl-add" onClick={() => setAdding(true)}><i className="ti ti-plus" /> Add another account</button>
                </div>
              </div>
            )
          ) : tab === 'momo' ? (
            <>
              {momoNeedsLevel2 && (
                <p className="wl-note" style={{ margin: '0 0 14px' }}>Mobile money withdrawals need Level 2. <Link to="/settings/verification" onClick={onClose}>Send your Ghana Card</Link> and our team checks it, usually within a day.</p>
              )}
              <div className="wl-field">
                <span className="ui-label">Network</span>
                <div className="wl-quick" style={{ marginTop: 0 }}>
                  {MOMO_NETWORKS.map(([v, label]) => (
                    <button key={v} type="button" className={`ui-chip${momoNetwork === v ? ' on' : ''}`} aria-pressed={momoNetwork === v} onClick={() => setMomoNetwork(v)}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="wl-field">
                <label className="ui-label" htmlFor="wd-momo">Your mobile money number</label>
                <input id="wd-momo" className="ui-input" inputMode="tel" autoComplete="tel" placeholder="e.g. 024 123 4567" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value.replace(/[^\d+ ]/g, ''))} />
              </div>
            </>
          ) : (
            <>
              <div className="wl-field">
                <span className="ui-label">Currency</span>
                <div className="wl-quick" style={{ marginTop: 0 }}>
                  <span className="ui-chip on">USDC on Solana<em>{money(Number(balances?.USDC?.available ?? 0), 'USDC').replace(' USDC', '')}</em></span>
                </div>
              </div>
              <div className="wl-field">
                <label className="ui-label" htmlFor="wd-addr">Solana wallet address</label>
                <input id="wd-addr" className="ui-input" autoComplete="off" spellCheck={false} placeholder="e.g. 7xKX…9fQa" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </>
          )}

          <div className="wl-field">
            <label className="ui-label" htmlFor="wd-amt">Amount</label>
            <div className="wl-amount">
              <span>{inNaira ? '₦' : '$'}</span>
              <input id="wd-amt" className="ui-input" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))} />
              <button type="button" className="wl-max" onClick={max}>Max</button>
            </div>
            <div className={`wl-hint${problem ? ' err' : ''}`}>
              {problem || <>
                <span>Available {money(available, cur)}</span>
                <span>{usedUp
                  ? <>Today's limit used{allow?.nextAt ? ` · again from ${whenAgain(allow.nextAt)}` : ''}</>
                  : <>{naira(left, 0)}{tab === 'crypto' ? ' worth' : ''} left today of {naira(dayLimit, 0)}</>}
                  <InfoTip label="How do withdrawal limits work?" title="Daily withdrawal limit">
                    <p>How much you can take out in any 24 hours, bank and crypto together. It depends on your verification level: {naira(withdrawLimit(1), 0)} at Level 1, {naira(withdrawLimit(2), 0)} at Level 2 and {naira(withdrawLimit(3), 0)} at Level 3.</p>
                    <p>The smallest withdrawal is {naira(MIN_WITHDRAW_NGN, 0)}. Verify a higher level in Settings → Verification to raise your limit.</p>
                  </InfoTip></span>
              </>}
            </div>
          </div>

          {inNaira && amt >= MIN_WITHDRAW_NGN && !problem && (
            <div className="wl-sum">
              <div><span>Fee (1.5%, min ₦100)</span><b>{naira(fee)}</b></div>
              <div className="total"><span>You receive</span><b>{naira(Math.max(0, amt - fee))}</b></div>
              {tab === 'momo' && Number.isFinite(ghsNow) && ghsNow > 0 && <div><span>In cedis today (rough estimate)</span><b>≈ {formatCedi(ghsNow)}</b></div>}
            </div>
          )}

          {needOtp && <TwoFactorField value={otp} onChange={setOtp} />}
          {error && <div className="wl-err" role="alert"><i className="ti ti-alert-circle" /><span>{error}</span></div>}

          <button type="button" className="ui-btn ui-btn-dark ui-btn-lg wl-full" disabled={busy || !amt || !!problem || (tab === 'bank' ? !bank : tab === 'momo' ? (!momoNumber.trim() || momoNeedsLevel2) : !address.trim())} onClick={submit}>
            {busy ? 'Sending…' : amt && !problem ? `Withdraw ${money(amt, cur)}` : 'Withdraw'}
          </button>
          <p className="wl-note" style={{ margin: '12px 0 0', textAlign: 'center' }}>
            {tab === 'momo' ? 'Our team pays mobile money withdrawals, usually within a week, in cedis at the rate on the day the money is sent, so the cedis above are only a rough estimate. Use your own number. A number used for the first time waits at least a day.' : tab === 'bank' ? `You can ask for up to ${naira(dayLimit, 0)} a day; bank withdrawals are paid out every Thursday (next: ${payoutDayLabel(nextPayoutDay())}). Money only goes to a bank account in your own name; if your bank spells it differently, our team checks it first.` : 'Sent on Solana straight away. Check the address: crypto sent to a wrong address can’t be recovered.'}
            {tier < 3 && <> <Link to="/settings/verification" onClick={onClose}>Raise your limit</Link></>}
          </p>
        </>
      )}
    </Sheet>
  )
}
