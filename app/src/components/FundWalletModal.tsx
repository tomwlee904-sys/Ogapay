import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import VirtualAccountCard from './VirtualAccountCard';
import { useNavigate, useLocation } from 'react-router-dom';
import WithdrawModal from './wallet/WithdrawModal';
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

type Step = 'select' | 'estimate' | 'swap' | 'sign' | 'confirming' | 'done';

interface Props {
  onClose: () => void;
  onDone?: () => void;
  initialStep?: 'deposit' | 'withdraw';
  // Which deposit tab opens first (e.g. naira when paying for a naira item)
  initialTab?: 'crypto' | 'bank';
}

// Withdrawals use the wallet's Withdraw dialog (saved, verified bank accounts);
// card / USSD payments use the Add money page, which confirms the payment itself.
export default function FundWalletModal(props: Props) {
  return props.initialStep === 'withdraw'
    ? <WithdrawModal onClose={props.onClose} onDone={props.onDone} />
    : <DepositModal {...props} />;
}

function DepositModal({ onClose, onDone, initialTab }: Props) {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<Step>('select');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // ── Entry form state ──
  const [walletAddr, setWalletAddr] = useState('');

  // ── Crypto deposit state ──
  const [amountUsdc, setAmountUsdc] = useState('');
  const [estimate, setEstimate] = useState<any>(null);
  const [estimating, setEstimating] = useState(false);

  // ── Swap state ──
  const [swapSigning, setSwapSigning] = useState(false);

  // ── Result ──
  const [result, setResult] = useState<any>(null);

  // ── NGN deposit state ──
  const [ngnAmount, setNgnAmount] = useState('');

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


  // Card, USSD or bank app: the Add money page takes it from here and brings
  // people back to where they were
  function payByCard() {
    const amt = Math.ceil(parseFloat(ngnAmount) || 0);
    if (amt < 100) { setError('Minimum deposit is ₦100'); return; }
    onClose();
    navigate(`/deposit?method=card&amount=${amt}&back=${encodeURIComponent(location.pathname + location.search)}`);
  }

  // ─── Render helpers ───
  function renderHeader(title: string) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'Geist', fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h3>
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
      <div style={{ padding: '10px 14px', background: '#dbeafe', border: '1px solid var(--accent-bright)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, flexShrink: 0 }} />{msg}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  STEP: select — tabbed entry (Crypto OR Bank)
  // ═══════════════════════════════════════════════════
  const [entryTab, setEntryTab] = useState<'crypto' | 'bank'>(initialTab ?? 'crypto');
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
                Transfer to your own account number below, or pay by card, USSD or bank app.
              </p>
              <VirtualAccountCard />
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Amount (NGN)</label>
                <input style={INPUT} type="number" step="100" min="100" placeholder="1000" value={ngnAmount} onChange={e => { setNgnAmount(e.target.value); setError(''); }} />
              </div>
              <button style={{ ...BTN, background: 'var(--accent)', color: 'var(--on-accent)', width: '100%', justifyContent: 'center' }} onClick={payByCard}>
                Pay by card, USSD or bank app
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
          {renderHeader(result?.status === 'PENDING' ? 'Confirming' : 'Success')}
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in srgb, var(--green) 9%, transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <i className={result?.status === 'PENDING' ? 'ti ti-clock' : 'ti ti-circle-check'} style={{ fontSize: 32, color: 'var(--green)' }} />
            </div>
            <h3 style={{ fontFamily: 'Geist', fontSize: 17, fontWeight: 800, margin: '0 0 8px' }}>
              {result?.status === 'PENDING' ? 'Still confirming' : result?.signature ? 'Deposit Complete' : 'Request Submitted'}
            </h3>
            {result?.status === 'PENDING' && (
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 8px' }}>
                Your payment was sent. It will show in your wallet once the Solana network confirms it.
              </p>
            )}
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

  return null;
}
