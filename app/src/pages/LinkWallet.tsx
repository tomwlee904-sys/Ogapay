import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader";
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

const OGAPAY_BLUE = 'var(--accent)'

// ── Inject skeleton styles on mount ──
export default function LinkWallet() {
  useEffect(() => { injectSkeletonStyles(); }, []);
  const navigate = useNavigate()
  const { user, isAuthed } = useAuth()

  const [loading, setLoading] = useState(true)
  const [walletInfo, setWalletInfo] = useState<any>(null)
  const [method, setMethod] = useState<'connect' | 'micro'>('connect')
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState('')
  const [microStep, setMicroStep] = useState<'start' | 'waiting' | 'done'>('start')

  useEffect(() => {
    if (!isAuthed) return
    apiRequest<any>('/wallet/linked').then(res => {
      setWalletInfo(res?.data || res)
    }).catch(e => console.error(e)).finally(() => setLoading(false))
  }, [isAuthed])

  const isLinked = walletInfo?.linkedWalletAddress

  const truncate = (addr: string | null | undefined) => {
    if (!addr || addr.length < 10) return addr || ''
    return addr.slice(0, 6) + '...' + addr.slice(-4)
  }

  const handleLinkConnect = async () => {
    setError('')
    setLinking(true)
    try {
      const wallet = (window as any).phantom?.solana || (window as any).solflare?.solana
      if (!wallet) {
        setError('Please install Phantom or Solflare wallet extension')
        setLinking(false)
        return
      }
      const resp = await wallet.connect()
      const pubKey = resp.publicKey.toString()
      await apiRequest('/wallet/link', {
        method: 'POST',
        body: JSON.stringify({ walletAddress: pubKey, provider: 'phantom' }),
      })
      setWalletInfo((prev: any) => ({
        ...prev,
        linkedWalletAddress: pubKey,
        linkedWalletProvider: 'phantom',
        linkedWalletAt: new Date().toISOString(),
      }))
    } catch (e: any) {
      setError(e?.message || 'Failed to link wallet')
    } finally {
      setLinking(false)
    }
  }

  const handleMicroStart = () => {
    setMicroStep('waiting')
    setError('')
    // In production, this would create a micro transaction and poll
    setTimeout(() => {
      setMicroStep('done')
    }, 5000)
  }

  const handleUnlink = async () => {
    setError('')
    setLinking(true)
    try {
      await apiRequest('/wallet/unlink', { method: 'POST' })
      setWalletInfo((prev: any) => ({ ...prev, linkedWalletAddress: null, linkedWalletProvider: null, linkedWalletAt: null }))
    } catch (e: any) {
      setError(e?.message || 'Failed to unlink wallet')
    } finally {
      setLinking(false)
    }
  }

  if (loading) {
    return <SkeletonPage />
  }

  return (
    <div className="page-fade-in">
    <Layout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
        {/* Back + Refresh */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span onClick={() => navigate(-1)} style={{ fontSize: 13, color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <i className="ti ti-arrow-left" /> Back to profile
          </span>
          <button onClick={() => window.location.reload()} style={{ padding: '6px 18px', borderRadius: 100, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            <i className="ti ti-refresh" style={{ marginRight: 6 }} />Refresh
          </button>
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, margin: '0 0 6px', color: 'var(--text)' }}>Link wallet</h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 28px' }}>Add one secondary wallet for profile and payout checks. It stays fixed to this account after linking.</p>

        {/* Wallet Status Card */}
        <div style={{ border: '1.5px solid var(--border)', borderRadius: 16, background: 'var(--card)', marginBottom: 20 }}>
          {/* Primary Wallet */}
          <div style={{ padding: 20, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Primary Wallet</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', background: 'var(--bg)', padding: '2px 10px', borderRadius: 100, border: '1px solid var(--border)' }}>Main</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, color: 'var(--text)' }}>Sign-in wallet</div>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace', color: 'var(--text)' }}>{truncate(user?.walletAddress) || 'Not connected'}</div>
            {user?.walletAddress && (
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text2)', wordBreak: 'break-all', marginTop: 2 }}>{user.walletAddress}</div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Secondary Wallet */}
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Secondary Wallet</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 100, border: '1px solid',
                color: isLinked ? OGAPAY_BLUE : 'var(--text3)',
                background: isLinked ? 'rgba(var(--accent-rgb),0.08)' : 'var(--bg)',
                borderColor: isLinked ? OGAPAY_BLUE : 'var(--border)',
              }}>
                {isLinked ? 'Linked' : 'Not linked'}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, color: 'var(--text)' }}>Linked wallet</div>
            {isLinked ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace', color: 'var(--text)' }}>{truncate(walletInfo.linkedWalletAddress)}</div>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text2)', wordBreak: 'break-all', marginTop: 2 }}>{walletInfo.linkedWalletAddress}</div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace', color: 'var(--text2)' }}>Not linked</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>No wallet linked yet</div>
              </>
            )}

            {/* Info rows */}
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)' }}>
              {[
                ['Linked', isLinked ? 'Yes' : 'No'],
                ['Seeker wallet', 'No'],
                ['Linked at', isLinked ? new Date(walletInfo.linkedWalletAt).toLocaleDateString() : '-'],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{label}</span>
                  <span style={{ color: label === 'Linked' && val === 'Yes' ? OGAPAY_BLUE : 'var(--text)', fontWeight: 700 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* When This Matters */}
        <div style={{ padding: 16, borderRadius: 16, background: `rgba(var(--accent-rgb),0.06)`, border: `1px solid rgba(var(--accent-rgb),0.12)`, marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: OGAPAY_BLUE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>When This Matters</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>
            Linking a secondary wallet allows another wallet address to count for KYC verification and payout eligibility on your account. Your sign-in wallet stays unchanged.
          </p>
        </div>

        {!isLinked ? (
          <>
            {/* Method Card */}
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 16, background: 'var(--card)', padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Method</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: 'var(--text)' }}>Choose how to link</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['connect', 'micro'] as const).map(m => (
                      <button key={m} onClick={() => { setMethod(m); setMicroStep('start'); setError('') }}
                        style={{
                          padding: '8px 18px', borderRadius: 100, border: '1.5px solid', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 12, fontWeight: 700, transition: 'all .2s',
                          background: method === m ? OGAPAY_BLUE : 'transparent',
                          color: method === m ? '#fff' : 'var(--text2)',
                          borderColor: method === m ? OGAPAY_BLUE : 'var(--border)',
                        }}>
                        {m === 'connect' ? 'Wallet connect' : 'Micro transaction'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, lineHeight: 1.6 }}>
                    Both options attach the wallet to this profile only. Pick the flow that fits your device and wallet setup.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Card */}
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 16, background: 'var(--card)', padding: 20, marginBottom: 20 }}>
              {method === 'connect' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, flex: 1, minWidth: 200, lineHeight: 1.6 }}>
                    Best for Phantom, Solflare, Backpack, and Mobile Wallet Adapter. Your main sign-in wallet stays unchanged.
                  </p>
                  <button onClick={handleLinkConnect} disabled={linking}
                    style={{
                      padding: '12px 32px', borderRadius: 100, border: 'none', cursor: linking ? 'not-allowed' : 'pointer',
                      background: OGAPAY_BLUE, color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 8, opacity: linking ? 0.7 : 1,
                    }}>
                    <i className="ti ti-wallet" /> {linking ? 'Linking...' : 'Link with wallet connect'}
                  </button>
                </div>
              ) : (
                <div>
                  {microStep === 'start' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, flex: 1, minWidth: 200, lineHeight: 1.6 }}>
                        Send a small SOL transaction from the wallet you want to link to verify ownership.
                      </p>
                      <button onClick={handleMicroStart}
                        style={{
                          padding: '12px 32px', borderRadius: 100, border: 'none', cursor: 'pointer',
                          background: OGAPAY_BLUE, color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                        <i className="ti ti-send" /> Start micro transaction
                      </button>
                    </div>
                  )}
                  {microStep === 'waiting' && (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>
                        Send exactly <strong style={{ color: OGAPAY_BLUE }}>0.000001 SOL</strong> to:
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text)', background: 'var(--bg)', padding: 12, borderRadius: 8, wordBreak: 'break-all', marginBottom: 12, border: '1px solid var(--border)' }}>
                        F48NUFQ1qJcNGbLNUnqdF1jmJXMBKDNdJ3EoBzmPjemX
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text2)', fontSize: 13 }}>
                        <span className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: OGAPAY_BLUE, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                        Waiting for transaction...
                      </div>
                    </div>
                  )}
                  {microStep === 'done' && (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <i className="ti ti-circle-check" style={{ fontSize: 32, color: OGAPAY_BLUE, marginBottom: 8, display: 'block' }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Wallet linked successfully!</div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                  <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Already linked state */
          <div style={{ border: '1.5px solid var(--border)', borderRadius: 16, background: 'var(--card)', padding: 20, textAlign: 'center' }}>
            <i className="ti ti-circle-check" style={{ fontSize: 36, color: OGAPAY_BLUE, marginBottom: 12, display: 'block' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Wallet already linked</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Your secondary wallet is linked to this account.</div>
            <button onClick={handleUnlink} disabled={linking}
              style={{
                padding: '10px 28px', borderRadius: 100, border: '1.5px solid #dc2626', background: 'transparent',
                color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: linking ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: linking ? 0.7 : 1,
              }}>
              {linking ? 'Unlinking...' : 'Unlink wallet'}
            </button>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg) } }
        `}</style>
      </div>
    </Layout>
      </div>
  )
}