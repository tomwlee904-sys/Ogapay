import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from './Sheet'
import AddBankForm from './AddBankForm'
import TwoFactorField, { is2FAError } from '../TwoFactorField'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useWalletBalance } from '../../context/WalletBalanceContext'
import { MIN_WITHDRAW_NGN, kycOf, maskAcct, money, naira, newKey, ngnWithdrawFee, shortAddr, whenAgain, withdrawLimit, type Allowance, type Balances, type Bank } from '../../lib/wallet'
import InfoTip from '../InfoTip'

type Done = { kind: 'bank'; net: number; bank: Bank; reference: string } | { kind: 'crypto'; amount: number; currency: string; to: string; reference: string; pending: boolean }

// Withdraw to a bank account (paid out by the team, usually within 24 hours) or
// to a Solana wallet (sent straight away). Bank accounts are the saved, verified
// ones: the old form took a typed bank name with no bank code, so payouts had to
// be matched by hand.
export default function WithdrawModal({ onClose, onDone, balances: given }: { onClose: () => void; onDone?: () => void; balances?: Balances | null }) {
  const { user, refreshUser } = useAuth()
  const { balances: ctx, refresh: refreshBalance } = useWalletBalance()
  const balances = (given || ctx) as Balances | null
  const { tier, verified } = kycOf(user)
  const limit = withdrawLimit(tier)
  // What's left of today's limit (the server counts the last 24 hours)
  const [allow, setAllow] = useState<Allowance | null>(null)

  const [tab, setTab] = useState<'bank' | 'crypto'>('bank')
  const [banks, setBanks] = useState<Bank[] | null>(null)
  const [bankId, setBankId] = useState('')
  const [adding, setAdding] = useState(false)
  const [amount, setAmount] = useState('')
  const [coin, setCoin] = useState<'USDC' | 'SOL'>('USDC')
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
  useEffect(() => { key.current = newKey() }, [tab, bankId, amount, coin, address])

  useEffect(() => {
    if (!verified) return
    apiRequest<Bank[]>('/wallet/banks').then((list) => {
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

  const cur = tab === 'bank' ? 'NGN' : coin
  const available = Number(balances?.[cur]?.available ?? 0)
  const amt = parseFloat(amount) || 0
  const fee = tab === 'bank' && amt > 0 ? ngnWithdrawFee(amt) : 0
  const bank = banks?.find((b) => b.id === bankId) || null

  // What's wrong with the amount, before asking the server
  const problem = useMemo(() => {
    if (!amt) return ''
    if (amt > available) return `You have ${money(available, cur)} available.`
    if (tab === 'bank') {
      if (amt < MIN_WITHDRAW_NGN) return `The minimum is ${naira(MIN_WITHDRAW_NGN, 0)}.`
      if (amt > left) return usedUp
        ? `You've used today's limit of ${naira(dayLimit, 0)}.${allow?.nextAt ? ` You can withdraw again from ${whenAgain(allow.nextAt)}.` : ''}`
        : `You can withdraw up to ${naira(left, 0)} today (your limit is ${naira(dayLimit, 0)} a day).`
    }
    return ''
  }, [amt, available, cur, tab, left, usedUp, dayLimit, allow])

  const max = () => {
    const m = tab === 'bank' ? Math.min(available, left) : available
    setAmount(m > 0 ? String(Math.floor(m * (tab === 'bank' ? 1 : 1e6)) / (tab === 'bank' ? 1 : 1e6)) : '')
  }

  const finish = () => { refreshBalance(); refreshUser(); onDone?.() }

  async function submit() {
    if (!amt || problem) return
    if (needOtp && otp.length !== 6) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setBusy(true); setError('')
    try {
      if (tab === 'bank') {
        if (!bank) throw new Error('Choose a bank account.')
        const r = await apiRequest<{ reference: string; netAmount?: number }>('/wallet/withdraw', {
          method: 'POST',
          headers: { 'Idempotency-Key': key.current },
          body: JSON.stringify({ amount: amt, currency: 'NGN', bankCode: bank.bankCode, bankName: bank.bankName, accountNumber: bank.accountNumber, accountName: bank.accountName, ...(otp && { otp }) }),
        })
        setDone({ kind: 'bank', net: Number(r?.netAmount ?? amt - fee), bank, reference: r?.reference || '' })
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
          <div className={`wl-done-ic${done.kind === 'bank' || done.pending ? ' wait' : ''}`}><i className={done.kind === 'bank' || done.pending ? 'ti ti-clock' : 'ti ti-check'} /></div>
          {done.kind === 'bank' ? (
            <>
              <h3>Withdrawal requested</h3>
              <p>{naira(done.net)} will be sent to {done.bank.bankName} {maskAcct(done.bank.accountNumber)}, usually within 24 hours. You'll see it in your history as Processing until it's paid.</p>
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
          <p>Withdrawals need Level 1 verification: a bank account in your name (free) or your NIN. It takes a minute and lets you withdraw up to {naira(withdrawLimit(1), 0)} a day.</p>
          <Link className="ui-btn ui-btn-dark" to="/settings/verification" onClick={onClose}>Verify now</Link>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Withdraw" onClose={onClose}>
      <div className="wl-seg" role="group" aria-label="Withdraw to">
        <button type="button" aria-pressed={tab === 'bank'} onClick={() => { setTab('bank'); setAmount(''); setError('') }}>To a bank</button>
        <button type="button" aria-pressed={tab === 'crypto'} onClick={() => { setTab('crypto'); setAmount(''); setError('') }}>To a crypto wallet</button>
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
          ) : (
            <>
              <div className="wl-field">
                <span className="ui-label">Currency</span>
                <div className="wl-quick" style={{ marginTop: 0 }}>
                  {(['USDC', 'SOL'] as const).map((c) => (
                    <button key={c} type="button" className={`ui-chip${coin === c ? ' on' : ''}`} aria-pressed={coin === c} onClick={() => { setCoin(c); setAmount('') }}>
                      {c}<em>{money(Number(balances?.[c]?.available ?? 0), c).replace(' ' + c, '')}</em>
                    </button>
                  ))}
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
              <span>{tab === 'bank' ? '₦' : coin === 'SOL' ? '◎' : '$'}</span>
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

          {tab === 'bank' && amt >= MIN_WITHDRAW_NGN && !problem && (
            <div className="wl-sum">
              <div><span>Fee (1.5%, min ₦100)</span><b>{naira(fee)}</b></div>
              <div className="total"><span>You receive</span><b>{naira(Math.max(0, amt - fee))}</b></div>
            </div>
          )}

          {needOtp && <TwoFactorField value={otp} onChange={setOtp} />}
          {error && <div className="wl-err" role="alert"><i className="ti ti-alert-circle" /><span>{error}</span></div>}

          <button type="button" className="ui-btn ui-btn-dark ui-btn-lg wl-full" disabled={busy || !amt || !!problem || (tab === 'bank' ? !bank : !address.trim())} onClick={submit}>
            {busy ? 'Sending…' : amt && !problem ? `Withdraw ${money(amt, cur)}` : 'Withdraw'}
          </button>
          <p className="wl-note" style={{ margin: '12px 0 0', textAlign: 'center' }}>
            {tab === 'bank' ? 'Bank withdrawals are paid by our team, usually within 24 hours.' : 'Sent on Solana straight away. Check the address: crypto sent to a wrong address can’t be recovered.'}
            {tier < 3 && <> <Link to="/settings/verification" onClick={onClose}>Raise your limit</Link></>}
          </p>
        </>
      )}
    </Sheet>
  )
}
