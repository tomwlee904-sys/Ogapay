import { useState } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
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
  const { refreshUser } = useAuth();
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

  // ── NGN deposit state ──
  const [ngnAmount, setNgnAmount] = useState('');
  const [ngnProvider, setNgnProvider] = useState<'PAYSTACK' | 'FLUTTERWAVE' | ''>('');
  const [ngnSubmitting, setNgnSubmitting] = useState(false);

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

  // ─── Wallet address entered → estimate crypto deposit ───
  async function handleEstimate() {
    const amt = parseFloat(amountUsdc);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddr.trim())) {
      setError('Invalid Solana wallet address'); return;
    }
    setError('');
    setEstimating(true);
    try {
      const data = await apiRequest<any>('/wallet/fund/estimate', {
        method: 'POST',
        body: JSON.stringify({ amount: amt, userWallet: walletAddr.trim() }),
      });
      setEstimate(data);
      if (data?.needsSwap && data?.quote) setStep('swap');
      else setStep('sign');
    } catch (e: any) {
      setError(e.message || 'Estimation failed');
    }
    setEstimating(false);
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

  // ─── NGN amount entered → show Paystack/Flutterwave ───
  async function handleNgnDeposit() {
    const amt = parseFloat(ngnAmount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!ngnProvider) { setError('Select a payment provider'); return; }
    setError('');
    setNgnSubmitting(true);
    try {
      const data = await apiRequest<any>('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          currency: 'NGN',
          provider: ngnProvider,
          callbackUrl: window.location.origin + '/wallet',
        }),
      });
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setResult({ reference: data.reference });
        setStep('done');
        refreshUser();
        onDone?.();
      }
    } catch (e: any) {
      setError(e.message || 'Deposit initiation failed');
    }
    setNgnSubmitting(false);
  }

  // ─── Withdraw ───
  async function handleWithdraw() {
    const amt = parseFloat(wdAmount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!wdAddress) { setError('Enter a destination wallet address'); return; }
    setError('');
    setWdSubmitting(true);
    try {
      const res = await apiRequest('/wallet/withdraw/crypto', {
        method: 'POST',
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

  // ─── Entry: user fills wallet OR bank, branches accordingly ───
  function handleContinue() {
    setError('');
    const walletTrimmed = walletAddr.trim();
    const hasWallet = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletTrimmed);
    const hasBank = ngnAccount.length >= 10 && ngnBank.trim().length > 0;

    if (hasWallet && hasBank) {
      setError('Fill in either wallet address OR bank details, not both');
      return;
    }
    if (hasWallet) {
      setStep('estimate');
      return;
    }
    if (hasBank) {
      setStep('ngnOptions');
      return;
    }
    setError('Enter a wallet address or bank account number to continue');
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
      <div style={{ padding: '10px 14px', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 8, fontSize: 12, color: '#1e40af', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, flexShrink: 0 }} />{msg}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: select — entry form (wallet OR bank)
  // ═══════════════════════════════════════════════════
  if (step === 'select') {
    return (
      <div style={MODAL_STYLE} onClick={onClose}>
        <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
          {renderHeader('Fund Wallet')}
          {renderError()}
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
            Enter your Solana wallet address <strong>or</strong> your Nigerian bank account to fund your OgaPay wallet.
          </p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Solana Wallet Address</label>
            <input style={INPUT} placeholder="5RrYLh..." value={walletAddr} onChange={e => setWalletAddr(e.target.value)} />
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 12, letterSpacing: '.1em', textTransform: 'uppercase' }}>— Or —</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Account Number</label>
            <input style={INPUT} placeholder="0123456789" maxLength={10} value={ngnAccount} onChange={e => setNgnAccount(e.target.value.replace(/\D/g, '').slice(0, 10))} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Bank Name</label>
            <input style={INPUT} placeholder="Access Bank" value={ngnBank} onChange={e => setNgnBank(e.target.value)} />
          </div>
          <button style={{ ...BTN, background: 'var(--text)', color: 'var(--bg)', width: '100%' }} onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: estimate — crypto deposit amount
  // ═══════════════════════════════════════════════════
  if (step === 'estimate') {
    return (
      <div style={MODAL_STYLE} onClick={onClose}>
        <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
          {renderHeader('Deposit USDC')}
          {renderError()}
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Amount to deposit from your wallet <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{walletAddr.slice(0, 8)}...</span></p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Amount (USDC)</label>
            <input style={INPUT} type="number" step="0.01" min="0" placeholder="10.00" value={amountUsdc} onChange={e => setAmountUsdc(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...BTN, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text2)', flex: 1 }} onClick={() => setStep('select')}>Back</button>
            <button style={{ ...BTN, background: 'var(--text)', color: 'var(--bg)', flex: 1, opacity: estimating ? 0.6 : 1 }} disabled={estimating} onClick={handleEstimate}>
              {estimating ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Checking...</> : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: swap — Jupiter SOL → USDC
  // ═══════════════════════════════════════════════════
  if (step === 'swap') {
    return (
      <div style={MODAL_STYLE} onClick={onClose}>
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
            <button style={{ ...BTN, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text2)', flex: 1 }} onClick={() => setStep('estimate')}>Back</button>
            <button style={{ ...BTN, background: '#16a34a', color: '#fff', flex: 1, opacity: swapSigning ? 0.6 : 1 }} disabled={swapSigning} onClick={handleSwap}>
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
      <div style={MODAL_STYLE} onClick={onClose}>
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
          <button style={{ ...BTN, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text2)', width: '100%', marginTop: 8, justifyContent: 'center' }} onClick={() => setStep('estimate')}>Back</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: ngnOptions — Pick Paystack or Flutterwave
  // ═══════════════════════════════════════════════════
  if (step === 'ngnOptions') {
    return (
      <div style={MODAL_STYLE} onClick={onClose}>
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
            <button style={{ ...BTN, background: '#16a34a', color: '#fff', flex: 1, opacity: ngnSubmitting ? 0.6 : 1 }} disabled={ngnSubmitting} onClick={handleNgnDeposit}>
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
      <div style={MODAL_STYLE} onClick={onClose}>
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
      <div style={MODAL_STYLE} onClick={onClose}>
        <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
          {renderHeader('Success')}
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#16a34a18', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <i className="ti ti-circle-check" style={{ fontSize: 32, color: '#16a34a' }} />
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
  //  STEP: withdraw
  // ═══════════════════════════════════════════════════
  return (
    <div style={MODAL_STYLE} onClick={onClose}>
      <div style={INNER_STYLE} onClick={e => e.stopPropagation()}>
        {renderHeader('Withdraw Crypto')}
        {renderError()}
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
      </div>
    </div>
  );
}
