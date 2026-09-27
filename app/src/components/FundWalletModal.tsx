import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import VirtualAccountCard from './VirtualAccountCard';
import { useNavigate, useLocation } from 'react-router-dom';
import WithdrawModal from './wallet/WithdrawModal';
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
// Built here rather than with @solana/spl-token, whose helpers need Node's
// global Buffer: the browser build has none, so every USDC deposit failed with
// "Buffer is not defined" at the transfer step.
const usdcAccountOf = (owner: PublicKey) =>
  PublicKey.findProgramAddressSync([owner.toBytes(), TOKEN_PROGRAM.toBytes(), new PublicKey(USDC_MINT).toBytes()], ATA_PROGRAM)[0];
const tokenTransfer = (from: PublicKey, to: PublicKey, owner: PublicKey, amount: number) => {
  const data = new Uint8Array(9); // Transfer: [3, amount as u64 little-endian]
  data[0] = 3;
  new DataView(data.buffer).setBigUint64(1, BigInt(amount), true);
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM,
    keys: [
      { pubkey: from, isSigner: false, isWritable: true },
      { pubkey: to, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: data as any,
  });
};
// Base64 without Node's Buffer, which doesn't exist in the browser build
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const toB64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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

  // ── Wallet + swap state ──
  const [connecting, setConnecting] = useState(false);
  const [swapPhase, setSwapPhase] = useState<'' | 'signing' | 'sending' | 'waiting'>('');

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
  const walletName = detectedWallets[0] ? detectedWallets[0].charAt(0).toUpperCase() + detectedWallets[0].slice(1) : '';

  // The swap and the transfer are signed in the wallet, so the address comes
  // from the wallet (a typed address that isn't the wallet's own can't sign)
  async function connectWallet() {
    const wallet = getWallet();
    if (!wallet) { setError("No Solana wallet found in this browser. Install Phantom, Solflare or Backpack, or open OgaPay in your wallet app's browser."); return; }
    setConnecting(true);
    setError('');
    try {
      const r = await wallet.connect();
      const pk = (r?.publicKey || wallet.publicKey)?.toString();
      if (!pk) throw new Error("The wallet didn't share its address. Try again.");
      setWalletAddr(pk);
    } catch (e: any) {
      setError(e?.message || 'The wallet connection was cancelled.');
    }
    setConnecting(false);
  }

  const estimateFor = () => apiRequest<any>('/wallet/fund/estimate', {
    method: 'POST', body: JSON.stringify({ amount: parseFloat(amountUsdc), userWallet: walletAddr }),
  });

  // SOL -> USDC for what's missing. It used to be signed and then dropped, so
  // the swap never happened and the deposit that followed had no USDC to send.
  async function handleSwap() {
    const wallet = getWallet();
    if (!wallet || !estimate?.quote) return;
    setError('');
    try {
      setSwapPhase('signing');
      const data = await apiRequest<{ swapTransaction: string; lastValidBlockHeight?: number }>('/wallet/fund/swap', {
        method: 'POST',
        body: JSON.stringify({ quoteResponse: estimate.quote, userWallet: walletAddr }),
      });
      const signed = await wallet.signTransaction(VersionedTransaction.deserialize(fromB64(data.swapTransaction)));
      setSwapPhase('sending');
      const sent = await apiRequest<{ status: string; signature: string }>('/wallet/fund/swap/send', {
        method: 'POST',
        body: JSON.stringify({ signedTx: toB64(signed.serialize()), lastValidBlockHeight: data.lastValidBlockHeight }),
      });
      // On to the deposit once the USDC is in the wallet
      setSwapPhase('waiting');
      for (let i = 0; i < 12; i++) {
        const fresh = await estimateFor().catch(() => null);
        if (fresh && !fresh.needsSwap) { setEstimate(fresh); setSwapPhase(''); setStep('sign'); return; }
        await sleep(2500);
      }
      throw new Error(sent?.status === 'CONFIRMED'
        ? "The swap went through, but the USDC isn't showing in your wallet yet. Wait a minute, then start the deposit again."
        : "The swap was sent but hasn't confirmed yet. Check your wallet in a minute, then start the deposit again.");
    } catch (e: any) {
      setError(e?.message || 'The swap failed. Nothing was swapped.');
    }
    setSwapPhase('');
  }

  async function handleSignTransfer() {
    const wallet = getWallet();
    if (!wallet || !estimate) return;
    setError('');
    try {
      const senderPubkey = new PublicKey(walletAddr);
      const platformAta = new PublicKey(estimate.platformAta);
      const userAta = usdcAccountOf(senderPubkey);
      const amountLamports = Math.round(parseFloat(amountUsdc) * 1_000_000);

      const tx = new Transaction().add(
        tokenTransfer(userAta, platformAta, senderPubkey, amountLamports)
      );
      tx.feePayer = senderPubkey;
      const { blockhash } = await apiRequest<{ blockhash: string }>('/wallet/fund/blockhash');
      tx.recentBlockhash = blockhash;

      const signed = await wallet.signTransaction(tx);
      await handleSubmit(toB64(signed.serialize({ requireAllSignatures: false })));
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
                Deposit USDC from a Solana wallet in this browser (Phantom, Solflare or Backpack). If the wallet is short of USDC, you can swap some SOL first.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Wallet</label>
                {walletAddr ? (
                  <div style={{ ...INPUT, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13 }}>{walletAddr.slice(0, 4)}…{walletAddr.slice(-4)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="ti ti-circle-check" /> {walletName || 'Wallet'} connected</span>
                  </div>
                ) : (
                  <button type="button" style={{ ...BTN, width: '100%', height: 42, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text)', opacity: connecting ? 0.6 : 1 }} disabled={connecting} onClick={connectWallet}>
                    <i className="ti ti-wallet" /> {connecting ? 'Connecting…' : walletName ? `Connect ${walletName}` : 'Connect a Solana wallet'}
                  </button>
                )}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Amount (USDC)</label>
                <input style={INPUT} type="number" step="0.01" min="0" placeholder="10.00" value={amountUsdc} onChange={e => { setAmountUsdc(e.target.value); setError(''); }} />
              </div>
              <button style={{ ...BTN, background: 'var(--text)', color: 'var(--bg)', width: '100%', justifyContent: 'center', opacity: estimating ? 0.6 : 1 }} disabled={estimating}
                onClick={async () => {
                  if (!walletAddr) { setError('Connect your wallet first.'); return; }
                  if (!parseFloat(amountUsdc) || parseFloat(amountUsdc) <= 0) { setError('Enter a valid amount'); return; }
                  setError(''); setEstimating(true);
                  try {
                    const data = await estimateFor();
                    setEstimate(data);
                    if (!data?.needsSwap) setStep('sign');
                    else if (data?.quote) setStep('swap');
                    // Short of USDC and no swap possible: say why (it used to go on
                    // to a transfer the wallet couldn't cover)
                    else setError(data?.swapError || `This wallet has ${(data?.usdcBalance ?? 0) / 1e6} USDC. Add USDC to it or enter a smaller amount.`);
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
              {Number(estimate.quote.otherAmountThreshold) > Number(estimate.quote.inAmount) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text2)' }}>At most, if the price moves</span>
                  <span style={{ fontWeight: 700 }}>{(Number(estimate.quote.otherAmountThreshold) / 1e9).toFixed(4)} SOL</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text2)' }}>Price impact</span>
                <span style={{ fontWeight: 700, color: Number(estimate.quote.priceImpactPct) > 1 ? '#DC2626' : 'inherit' }}>{Number(estimate.quote.priceImpactPct).toFixed(2)}%</span>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...BTN, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text2)', flex: 1, opacity: swapPhase ? 0.5 : 1 }} disabled={!!swapPhase} onClick={() => { setStep('select'); setEntryTab('crypto'); }}>Back</button>
            <button style={{ ...BTN, background: 'var(--green)', color: '#fff', flex: 1, opacity: swapPhase ? 0.6 : 1 }} disabled={!!swapPhase} onClick={handleSwap}>
              {swapPhase ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> {swapPhase === 'signing' ? 'Approve in your wallet…' : swapPhase === 'sending' ? 'Swapping…' : 'Waiting for USDC…'}</> : 'Swap and continue'}
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
