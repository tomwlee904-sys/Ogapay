import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { MIN_NGN_WITHDRAWAL, NGN_WITHDRAW_LIMITS } from '../lib/currency';
import VirtualAccountCard from './VirtualAccountCard';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const MODAL_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};
const INNER_STYLE: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
  maxWidth: 480, width: '100%', padding: 28, maxHeight: '90vh', overflowY: 'auto',
};
const BTN: React.CSSProperties = {
  height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13,
  border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
  gap: 7, fontFamily: 'inherit', justifyContent: 'center', transition: 'opacity .14s',
};
const INPUT: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 14px', border: '1.5px solid var(--border)',
  borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 14,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

type Step = 'select' | 'estimate' | 'swap' | 'sign' | 'confirming' | 'done' | 'withdraw' | 'ngnOptions';

interface Props {
  onClose: () => void;
  onDone?: () => void;
  initialStep?: 'deposit' | 'withdraw';
}

export default function FundWalletModal({ onClose, onDone, initialStep }: Props) {
  const { refreshUser, user } = useAuth();
  const [step, setStep] = useState<Step>(initialStep === 'withdraw' ? 'withdraw' : 'select');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // ── Entry form state ──
  const [walletAddr, setWalletAddr] = useState('');
  const [ngnAccount, setNgnAccount] = useState('');
  const [ngnBank, setNgnBank] = useState('');

  // ── Crypto deposit state ──
  const [amountUsdc, setAmountUsdc] = useState('');
  const [estimate, setEstimate] = useState<any>(null);
  const [estimating, setEstimating] = useState(false);

  // ── Swap state ──
  const [swapSigning, setSwapSigning] = useState(false);

  // ── Result ──
  const [result, setResult] = useState<any>(null);

  // ── Withdraw state ──
  const [wdAmount, setWdAmount] = useState('');
  const [wdCurrency, setWdCurrency] = useState<'USDC' | 'SOL'>('USDC');
  const [wdAddress, setWdAddress] = useState('');
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdTab, setWdTab] = useState<'crypto' | 'bank'>('crypto');
  const [wdBankAccount, setWdBankAccount] = useState('');
  const [wdBankName, setWdBankName] = useState('');
  const [wdAccountName, setWdAccountName] = useState('');

  // ── NGN deposit state ──
  const [ngnAmount, setNgnAmount] = useState('');
  const [ngnProvider, setNgnProvider] = useState<'PAYSTACK' | 'FLUTTERWAVE' | ''>('');
  const [ngnSubmitting, setNgnSubmitting] = useState(false);
  const [fwTxRef, setFwTxRef] = useState('');

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleSafeClose = () => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
    onClose()
  }

  const detectedWallets: string[] = (() => {
    const found: string[] = [];
    if (typeof window !== 'undefined') {
      if ((window as any).phantom?.solana?.isPhantom) found.push('phantom');
      if ((window as any).backpack?.isBackpack) found.push('backpack');
      if ((window as any).solflare?.isSolflare) found.push('solflare');
    }
    return found;
  })();

  function getWallet(): any {
    const id = detectedWallets[0];
    if (id === 'phantom') return (window as any).phantom?.solana;
    if (id === 'backpack') return (window as any).backpack;
    if (id === 'solflare') return (window as any).solflare;
    return null;
  }

  async function handleSwap() {
    const wallet = getWallet();
    if (!wallet || !estimate?.quote) return;
    setSwapSigning(true);
    setError('');
    try {
      const pubKey = walletAddr.trim();
      const data = await apiRequest<{ swapTransaction: string }>('/wallet/fund/swap', {
        method: 'POST',
        body: JSON.stringify({ quoteResponse: estimate.quote, userWallet: pubKey }),
      });
      const swapTxBytes = Buffer.from(data.swapTransaction, 'base64');
      let tx: Transaction | VersionedTransaction;
      try { tx = VersionedTransaction.deserialize(swapTxBytes); }
      catch { tx = Transaction.from(swapTxBytes); }
      const signed = await wallet.signTransaction(tx);
      const signedBytes = signed instanceof VersionedTransaction
        ? Buffer.from(signed.serialize())
        : Buffer.from(signed.serialize({ requireAllSignatures: false }));
      setStep('sign');
    } catch (e: any) {
      setError(e.message || 'Swap signing failed');
    }
    setSwapSigning(false);
  }

  async function handleSignTransfer() {
    const wallet = getWallet();
    if (!wallet || !estimate) return;
    setError('');
    try {
      const pubKey = walletAddr.trim();
      const senderPubkey = new PublicKey(pubKey);
      const platformAta = new PublicKey(estimate.platformAta);
      const userAta = await getAssociatedTokenAddress(new PublicKey(USDC_MINT), senderPubkey);
      const amountLamports = Math.round(parseFloat(amountUsdc) * 1_000_000);

      const tx = new Transaction().add(
        createTransferInstruction(userAta, platformAta, senderPubkey, amountLamports)
      );
      tx.feePayer = senderPubkey;
      const { blockhash } = await (await fetch(
        'https://api.mainnet-beta.solana.com',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash',
        })}
      )).json();
      tx.recentBlockhash = blockhash;

      const signed = await wallet.signTransaction(tx);
      const bytes = Buffer.from(signed.serialize({ requireAllSignatures: false }));
      await handleSubmit(bytes.toString('base64'));
    } catch (e: any) {
      setError(e.message || 'Signing failed');
    }
  }

  async function handleSubmit(signed: string) {
    setStep('confirming');
    setMsg('Verifying and broadcasting transaction...');
    try {
      const res = await apiRequest('/wallet/fund/submit', {
        method: 'POST',
        body: JSON.stringify({ signedTx: signed, expectedAmount: parseFloat(amountUsdc) }),
      });
      setResult(res);
      setStep('done');
      refreshUser();
      onDone?.();
    } catch (e: any) {
      setError(e.message || 'Submission failed');
      setStep('sign');
    }
  }


  // ── Flutterwave inline checkout config ──
  const fwConfig = {
    public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || "",
    tx_ref: fwTxRef,
    amount: parseFloat(ngnAmount) || 0,
    currency: 'NGN' as const,
    payment_options: 'card,ussd,mobilemoney,banktransfer' as const,
    customer: {
      email: user?.email || "",
      phone_number: (user as any)?.phone || '',
      name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || '',
    },
    customizations: {
      title: 'Fund OgaPay Wallet',
      description: `Deposit ₦${parseFloat(ngnAmount || '0').toLocaleString('en-US', {maximumFractionDigits:0})} into your wallet`,
      logo: 'https://ogapay.io/logo.png',
    },
  }

  const handleFlutterPayment = useFlutterwave(fwConfig)

  // When fwTxRef is set, open Flutterwave inline checkout
  const [fwOpened, setFwOpened] = useState(false)
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
    }
  }, [])

  useEffect(() => {
    if (fwTxRef && !fwOpened) {
      setFwOpened(true)
      handleFlutterPayment({
        callback: (response) => {
          closePaymentModal()
          setStep("confirming")

          // Poll wallet balance every 1.5s for up to ~20s to detect webhook credit
          const depositAmount = parseFloat(ngnAmount) || 0
          const POLL_INTERVAL = 1500
          const POLL_LIMIT = 14
          let pollCount = 0

          pollTimerRef.current = setInterval(async () => {
            pollCount++
            if (pollCount > POLL_LIMIT) {
              if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
              setStep("confirming")
              setError("Payment is taking longer than expected to confirm. Your money is safe — check your wallet balance in a moment, then try again.")
              setNgnSubmitting(false)
              return
            }

            try {
              const txData = await apiRequest<any>('/wallet/balance')
              const newBalance = txData?.NGN?.balance || 0
              // Get pre-payment balance by subtracting the deposit amount
              // from current balance after each poll
              if (newBalance >= depositAmount) {
                if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
                refreshUser()
                setFwTxRef("")
                setFwOpened(false)
                setResult({ reference: fwTxRef })
                setStep("done")
                onDone?.()
              }
            } catch {
              // Network error — keep polling
            }
          }, POLL_INTERVAL)
        },
        onClose: () => {
          if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
          setFwTxRef("")
          setFwOpened(false)
          setNgnSubmitting(false)
          setError('Payment was cancelled.')
        },
      })
    }
  }, [fwTxRef])

  // ─── NGN amount entered → show Paystack/Flutterwave ───
  async function handleNgnDeposit() {
    const amt = parseFloat(ngnAmount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!ngnProvider) { setError('Select a payment provider'); return; }
    setError('');
    setNgnSubmitting(true);

    if (ngnProvider === "FLUTTERWAVE") {
      // Inline Flutterwave checkout
      try {
        const data = await apiRequest<any>("/wallet/deposit", {
          method: "POST",
          body: JSON.stringify({
            amount: amt,
            currency: "NGN",
            provider: "FLUTTERWAVE",
          }),
        });
        const reference = data?.reference || data?.data?.reference || "";
        if (!reference) throw new Error("No reference returned");
        setFwTxRef(reference);
        setFwOpened(false);
      } catch (e: any) {
        setError(e.message || "Deposit initiation failed");
        setNgnSubmitting(false);
      }
    } else {
      // Paystack: existing redirect flow
      try {
        const data = await apiRequest<any>("/wallet/deposit", {
          method: "POST",
          body: JSON.stringify({
            amount: amt,
            currency: "NGN",
            provider: ngnProvider,
            callbackUrl: window.location.origin + '/wallet',
          }),
        });
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          setResult({ reference: data.reference });
          setStep("done");
          refreshUser();
          onDone?.();
        }
      } catch (e: any) {
        setError(e.message || "Deposit initiation failed");
      }
      setNgnSubmitting(false);
    }
  }

  // ─── Withdraw crypto ───
  async function handleWithdraw() {
    const amt = parseFloat(wdAmount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!wdAddress) { setError('Enter a destination wallet address'); return; }
    setError('');
    setWdSubmitting(true);
    try {
      const withdrawKey = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      const res = await apiRequest('/wallet/withdraw/crypto', {
        method: 'POST',
        headers: { 'Idempotency-Key': withdrawKey },
        body: JSON.stringify({ amount: amt, currency: wdCurrency, toAddress: wdAddress }),
      });
      setResult(res);
      setStep('done');
      refreshUser();
      onDone?.();
    } catch (e: any) {
      setError(e.message || 'Withdrawal failed');
    }
    setWdSubmitting(false);
  }

  // ─── Withdraw NGN to bank ───
  async function handleNgnWithdraw() {
    const amt = parseFloat(wdAmount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (amt < MIN_NGN_WITHDRAWAL) { setError(`Minimum withdrawal is ₦${MIN_NGN_WITHDRAWAL.toLocaleString()}`); return; }
    if (!wdBankAccount || wdBankAccount.length < 10) { setError('Enter a valid 10-digit account number'); return; }
    if (!wdBankName.trim()) { setError('Enter your bank name'); return; }
    if (!wdAccountName.trim()) { setError('Enter the account name'); return; }
    const kycTier = (user as any)?.kyc?.kycTier ?? 0
    const maxLimit = kycTier >= 3 ? NGN_WITHDRAW_LIMITS.TIER_3 : kycTier >= 2 ? NGN_WITHDRAW_LIMITS.TIER_2 : kycTier >= 1 ? NGN_WITHDRAW_LIMITS.TIER_1 : NGN_WITHDRAW_LIMITS.TIER_0
    if (amt > maxLimit) {
      const label = kycTier >= 3 ? 'Level 3 (Address + Docs)' : kycTier >= 2 ? 'Level 2 (BVN)' : kycTier >= 1 ? 'Level 1 (NIN)' : 'no KYC'
      setError(`Withdrawal limit exceeded. Maximum ₦${maxLimit.toLocaleString()} with ${label}. Complete KYC to increase your limit.`)
      return
    }
    setError('');
    setWdSubmitting(true);
    try {
      const withdrawKey = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      const res = await apiRequest('/wallet/withdraw', {
        method: 'POST',
        headers: { 'Idempotency-Key': withdrawKey },
        body: JSON.stringify({ amount: amt, currency: 'NGN', accountNumber: wdBankAccount, bankName: wdBankName, accountName: wdAccountName }),
      });
      setResult(res);
      setStep('done');
      refreshUser();
      onDone?.();
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('insufficient')) setError('Insufficient NGN balance. Deposit more funds and try again.')
      else if (msg.includes('limit') || msg.includes('tier')) setError('Withdrawal exceeds your KYC limit. Complete higher KYC tier to increase your limit.')
      else if (msg.includes('bank') || msg.includes('account')) setError('Bank details rejected. Verify your account number, bank name, and account name.')
      else setError(msg || 'Withdrawal failed. Please try again or contact support.')
    }
    setWdSubmitting(false);
  }

  // ─── Render helpers ───
  function renderHeader(title: string) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h3>
        <button style={{ width: 32, height: 32, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--text3)', fontSize: 18 }} onClick={onClose}>
          <i className="ti ti-x" />
        </button>
      </div>
    );
  }

  function renderError() {
    if (!error) return null;
    return (
      <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: '#991b1b', marginBottom: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-alert-triangle" />{error}
      </div>
    );
  }

  function renderMsg() {
    if (!msg) return null;
    return (
      <div style={{ padding: '10px 14px', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 8, fontSize: 12, color: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, flexShrink: 0 }} />{msg}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: select — tabbed entry (Crypto OR Bank)
  // ═══════════════════════════════════════════════════
  const [entryTab, setEntryTab] = useState<'crypto' | 'bank'>('crypto');
  if (step === 'select') {
    const tabStyle = (active: boolean): React.CSSProperties => ({
      ...BTN, flex: 1, justifyContent: 'center', borderRadius: 9,
      background: active ? 'var(--text)' : 'transparent',
      color: active ? 'var(--bg)' : 'var(--text2)',
      border: active ? 'none' : '1.5px solid var(--border)',
    });
    return (
      <div style={MODAL_STYLE} onClick={handleSafeClose}>
        <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
          {renderHeader('Fund Wallet')}
          {renderError()}

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button style={tabStyle(entryTab === 'crypto')} onClick={() => setEntryTab('crypto')}>
              <i className="ti ti-currency-dollar" /> Crypto (USDC)
            </button>
            <button style={tabStyle(entryTab === 'bank')} onClick={() => setEntryTab('bank')}>
              <i className="ti ti-building-bank" /> Bank (NGN)
            </button>
          </div>

          {entryTab === 'crypto' ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
                Deposit USDC from your Solana wallet. Enter your wallet address and the amount.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Solana Wallet Address</label>
                <input style={INPUT} placeholder="5RrYLh..." value={walletAddr} onChange={e => { setWalletAddr(e.target.value); setError(''); }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Amount (USDC)</label>
                <input style={INPUT} type="number" step="0.01" min="0" placeholder="10.00" value={amountUsdc} onChange={e => { setAmountUsdc(e.target.value); setError(''); }} />
              </div>
              <button style={{ ...BTN, background: 'var(--text)', color: 'var(--bg)', width: '100%', justifyContent: 'center', opacity: estimating ? 0.6 : 1 }} disabled={estimating}
                onClick={async () => {
                  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddr.trim())) { setError('Invalid Solana wallet address'); return; }
                  if (!parseFloat(amountUsdc) || parseFloat(amountUsdc) <= 0) { setError('Enter a valid amount'); return; }
                  setError(''); setEstimating(true);
                  try {
                    const data = await apiRequest<any>('/wallet/fund/estimate', {
                      method: 'POST', body: JSON.stringify({ amount: parseFloat(amountUsdc), userWallet: walletAddr.trim() }),
                    });
                    setEstimate(data);
                    if (data?.needsSwap && data?.quote) setStep('swap'); else setStep('sign');
                  } catch (e: any) { setError(e.message || 'Estimation failed'); }
                  setEstimating(false);
                }}>
                {estimating ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Checking...</> : 'Continue'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
                Deposit Naira using your dedicated virtual account or via card/bank transfer.
              </p>
              <VirtualAccountCard />
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Amount (NGN)</label>
                <input style={INPUT} type="number" step="100" min="100" placeholder="1000" value={ngnAmount} onChange={e => { setNgnAmount(e.target.value); setError(''); }} />
              </div>
              <button style={{ ...BTN, background: 'var(--accent)', color: '#fff', width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  if (!parseFloat(ngnAmount) || parseFloat(ngnAmount) < 100) { setError('Minimum deposit is ₦100'); return; }
                  setStep('ngnOptions');
                }}>
                Continue to Payment
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: swap — Jupiter SOL → USDC
  // ═══════════════════════════════════════════════════
  if (step === 'swap') {
    return (
      <div style={MODAL_STYLE} onClick={handleSafeClose}>
        <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
          {renderHeader('Swap SOL → USDC')}
          {renderError()}
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
            You need <strong>{parseFloat(amountUsdc).toFixed(2)} USDC</strong> but only have <strong>{(estimate?.usdcBalance ?? 0) / 1_000_000} USDC</strong>.
            Auto-swap some SOL to cover the difference?
          </p>
          {estimate?.quote && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text2)' }}>Swap</span>
                <span style={{ fontWeight: 700 }}>{(Number(estimate.quote.inAmount) / 1e9).toFixed(4)} SOL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text2)' }}>Receive</span>
                <span style={{ fontWeight: 700 }}>{(Number(estimate.quote.outAmount) / 1e6).toFixed(2)} USDC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text2)' }}>Price impact</span>
                <span style={{ fontWeight: 700, color: Number(estimate.quote.priceImpactPct) > 1 ? '#DC2626' : 'inherit' }}>{Number(estimate.quote.priceImpactPct).toFixed(2)}%</span>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...BTN, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text2)', flex: 1 }} onClick={() => { setStep('select'); setEntryTab('crypto'); }}>Back</button>
            <button style={{ ...BTN, background: 'var(--green)', color: '#fff', flex: 1, opacity: swapSigning ? 0.6 : 1 }} disabled={swapSigning} onClick={handleSwap}>
              {swapSigning ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Signing...</> : 'Sign Swap'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: sign — sign USDC transfer in wallet
  // ═══════════════════════════════════════════════════
  if (step === 'sign') {
    return (
      <div style={MODAL_STYLE} onClick={handleSafeClose}>
        <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
          {renderHeader('Confirm Transfer')}
          {renderError()}
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
            Sign the USDC transfer in your wallet to deposit <strong>{parseFloat(amountUsdc).toFixed(2)} USDC</strong>.
          </p>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>Amount</span>
              <span style={{ fontWeight: 700 }}>{parseFloat(amountUsdc).toFixed(2)} USDC</span>
            </div>
            {estimate?.platformAta && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>To</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{estimate.platformAta}</span>
              </div>
            )}
          </div>
          <button style={{ ...BTN, background: 'var(--text)', color: 'var(--bg)', width: '100%' }} onClick={handleSignTransfer}>
            <i className="ti ti-wallet" /> Sign with {detectedWallets[0] ? detectedWallets[0].charAt(0).toUpperCase() + detectedWallets[0].slice(1) : 'Wallet'}
          </button>
          <button style={{ ...BTN, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text2)', width: '100%', marginTop: 8, justifyContent: 'center' }} onClick={() => { setStep('select'); setEntryTab('crypto'); }}>Back</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: ngnOptions — Pick Paystack or Flutterwave
  // ═══════════════════════════════════════════════════
  if (step === 'ngnOptions') {
    return (
      <div style={MODAL_STYLE} onClick={handleSafeClose}>
        <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
          {renderHeader('Deposit via Bank')}
          {renderError()}
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Fund your NGN wallet using your preferred payment provider.
          </p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Amount (NGN)</label>
            <input style={INPUT} type="number" step="100" min="100" placeholder="1000" value={ngnAmount} onChange={e => setNgnAmount(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>Payment Provider</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { id: 'PAYSTACK' as const, label: 'Paystack', icon: 'ti ti-building-bank', desc: 'Bank transfer, card, USSD' },
                { id: 'FLUTTERWAVE' as const, label: 'Flutterwave', icon: 'ti ti-wand', desc: 'Bank transfer, card, mobile money' },
              ].map(p => (
                <button key={p.id} onClick={() => setNgnProvider(p.id)}
                  style={{ ...BTN, flex: 1, flexDirection: 'column', height: 'auto', padding: '14px 12px', gap: 6, background: ngnProvider === p.id ? 'var(--text)' : 'transparent', color: ngnProvider === p.id ? 'var(--bg)' : 'var(--text2)', border: ngnProvider === p.id ? 'none' : '1.5px solid var(--border)' }}>
                  <i className={p.icon} style={{ fontSize: 22 }} />
                  <span style={{ fontSize: 12 }}>{p.label}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...BTN, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text2)', flex: 1 }} onClick={() => setStep('select')}>Back</button>
            <button style={{ ...BTN, background: 'var(--green)', color: '#fff', flex: 1, opacity: ngnSubmitting ? 0.6 : 1 }} disabled={ngnSubmitting} onClick={handleNgnDeposit}>
              {ngnSubmitting ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processing...</> : 'Deposit'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: confirming
  // ═══════════════════════════════════════════════════
  if (step === 'confirming') {
    return (
      <div style={MODAL_STYLE} onClick={handleSafeClose}>
        <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
          {renderHeader('Confirming')}
          {renderMsg()}
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: done
  // ═══════════════════════════════════════════════════
  if (step === 'done') {
    return (
      <div style={MODAL_STYLE} onClick={handleSafeClose}>
        <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
          {renderHeader('Success')}
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green)18', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <i className="ti ti-circle-check" style={{ fontSize: 32, color: 'var(--green)' }} />
            </div>
            <h3 style={{ fontFamily: 'Outfit', fontSize: 17, fontWeight: 800, margin: '0 0 8px' }}>
              {result?.signature ? 'Deposit Complete' : 'Request Submitted'}
            </h3>
            {result?.signature && (
              <p style={{ fontSize: 12, color: 'var(--text2)', wordBreak: 'break-all', fontFamily: 'monospace', background: 'var(--bg2)', padding: '8px 12px', borderRadius: 8, margin: '12px 0' }}>
                Tx: {result.signature.slice(0, 16)}...{result.signature.slice(-8)}
              </p>
            )}
            {result?.reference && !result?.signature && (
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: '12px 0' }}>
                Reference: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{result.reference}</span>
              </p>
            )}
          </div>
          <button style={{ ...BTN, background: 'var(--text)', color: 'var(--bg)', width: '100%' }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: withdraw — Crypto & Bank (NGN)
  // ═══════════════════════════════════════════════════
  const wdTabStyle = (active: boolean): React.CSSProperties => ({
    ...BTN, flex: 1, justifyContent: 'center', borderRadius: 9,
    background: active ? 'var(--text)' : 'transparent',
    color: active ? 'var(--bg)' : 'var(--text2)',
    border: active ? 'none' : '1.5px solid var(--border)',
  });
  return (
    <div style={MODAL_STYLE} onClick={handleSafeClose}>
      <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
        {renderHeader('Withdraw Funds')}
        {renderError()}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button style={wdTabStyle(wdTab === 'crypto')} onClick={() => setWdTab('crypto')}>
            <i className="ti ti-currency-dollar" /> Crypto (USDC/SOL)
          </button>
          <button style={wdTabStyle(wdTab === 'bank')} onClick={() => setWdTab('bank')}>
            <i className="ti ti-building-bank" /> Bank (NGN)
          </button>
        </div>
        {wdTab === 'crypto' ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Withdraw USDC or SOL to an external wallet.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Currency</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['USDC', 'SOL'].map(c => (
                  <button key={c} onClick={() => setWdCurrency(c as any)}
                    style={{ ...BTN, flex: 1, background: wdCurrency === c ? 'var(--text)' : 'transparent', color: wdCurrency === c ? 'var(--bg)' : 'var(--text2)', border: wdCurrency === c ? 'none' : '1.5px solid var(--border)', justifyContent: 'center' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Amount</label>
              <input style={INPUT} type="number" step="0.01" min="0" placeholder="10.00" value={wdAmount} onChange={e => setWdAmount(e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Destination Wallet Address</label>
              <input style={INPUT} placeholder="Enter Solana wallet address" value={wdAddress} onChange={e => setWdAddress(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...BTN, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text2)', flex: 1 }} onClick={() => setStep('select')}>Back</button>
              <button style={{ ...BTN, background: '#DC2626', color: '#fff', flex: 1, opacity: wdSubmitting ? 0.6 : 1 }} disabled={wdSubmitting} onClick={handleWithdraw}>
                {wdSubmitting ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Sending...</> : 'Withdraw'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Withdraw NGN to your Nigerian bank account. Minimum withdrawal is <strong>₦{MIN_NGN_WITHDRAWAL.toLocaleString()}</strong>.</p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Account Number</label>
              <input style={INPUT} placeholder="0123456789" maxLength={10} value={wdBankAccount} onChange={e => { setWdBankAccount(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Bank Name</label>
              <input style={INPUT} placeholder="Access Bank" value={wdBankName} onChange={e => { setWdBankName(e.target.value); setError(''); }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Account Name</label>
              <input style={INPUT} placeholder="John Doe" value={wdAccountName} onChange={e => { setWdAccountName(e.target.value); setError(''); }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Amount (NGN)</label>
              <input style={INPUT} type="number" step="100" min={MIN_NGN_WITHDRAWAL} placeholder={String(MIN_NGN_WITHDRAWAL)} value={wdAmount} onChange={e => { setWdAmount(e.target.value); setError(''); }} />
            </div>
            <KycLimitNotice user={user} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...BTN, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text2)', flex: 1 }} onClick={() => setStep('select')}>Back</button>
              <button style={{ ...BTN, background: '#DC2626', color: '#fff', flex: 1, opacity: wdSubmitting ? 0.6 : 1 }} disabled={wdSubmitting} onClick={handleNgnWithdraw}>
                {wdSubmitting ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processing...</> : 'Withdraw to Bank'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KycLimitNotice({ user }: { user: any }) {
  const kycTier = user?.kyc?.kycTier ?? 0
  const kycStatus = user?.kyc?.status || user?.kycStatus
  const maxLimit = kycTier >= 3 ? NGN_WITHDRAW_LIMITS.TIER_3 : kycTier >= 2 ? NGN_WITHDRAW_LIMITS.TIER_2 : kycTier >= 1 ? NGN_WITHDRAW_LIMITS.TIER_1 : NGN_WITHDRAW_LIMITS.TIER_0
  const tierLabel = kycTier >= 3 ? 'Level 3 (Address + Docs)' : kycTier >= 2 ? 'Level 2 (BVN)' : kycTier >= 1 ? 'Level 1 (NIN)' : 'No KYC'
  const desc = kycTier >= 3
    ? `You can withdraw up to ₦${maxLimit.toLocaleString()} per transaction.`
    : kycTier >= 2
      ? `You can withdraw up to ₦${maxLimit.toLocaleString()} per transaction. Upgrade to Level 3 (Address + Docs) for ₦${NGN_WITHDRAW_LIMITS.TIER_3.toLocaleString()} limit.`
      : kycTier >= 1
        ? `You can withdraw up to ₦${maxLimit.toLocaleString()} per transaction. Upgrade to Level 2 (BVN) for ₦${NGN_WITHDRAW_LIMITS.TIER_2.toLocaleString()} limit.`
        : `Verify your identity (KYC) to increase your withdrawal limit above ₦${maxLimit.toLocaleString()}.`
  return (
    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14, padding: '8px 10px', background: 'var(--bg2)', borderRadius: 8, lineHeight: 1.5 }}>
      <span style={{ fontWeight: 700 }}>{tierLabel}</span> &mdash; {desc}
      {kycTier < 3 && (
        <span style={{ display: 'block', marginTop: 6 }}>
          <a href="/settings" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Increase limit → complete KYC</a>
        </span>
      )}
    </div>
  );
}
