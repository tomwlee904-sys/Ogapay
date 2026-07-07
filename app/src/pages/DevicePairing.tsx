import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'

const OGAPAY_BLUE = 'var(--accent)'

export default function DevicePairing() {
  const navigate = useNavigate()
  const { isAuthed } = useAuth()
  const { toast } = useToast()

  const [code, setCode] = useState('')
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState('')
  const [paired, setPaired] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const pairCheckRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pairCheckRef.current) clearInterval(pairCheckRef.current)
    }
  }, [])

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timerRef.current)
        setCode('')
        setExpiresAt(null)
        setTimeLeft(0)
      }
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [expiresAt])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleGenerate = async () => {
    if (code && timeLeft > 0) {
      // Delete existing code first
      try {
        await apiRequest('/devices/pair/delete', { method: 'POST' })
        setBanner('Pairing code deleted')
        setTimeout(() => setBanner(''), 3000)
      } catch {}
    }
    setLoading(true)
    try {
      const res: any = await apiRequest('/devices/pair/generate', { method: 'POST' })
      const pairingCode = res?.code || res?.data?.code
      if (pairingCode) {
        setCode(pairingCode)
        setExpiresAt(Date.now() + 5 * 60 * 1000)
        setTimeLeft(300)
        toast('Pairing code generated!', 'success')
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to generate code', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await apiRequest('/devices/pair/delete', { method: 'POST' })
      setCode('')
      setExpiresAt(null)
      setTimeLeft(0)
      setBanner('Pairing code deleted')
      setTimeout(() => setBanner(''), 3000)
    } catch (e: any) {
      toast(e?.message || 'Failed to delete code', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Poll for pairing completion
  useEffect(() => {
    if (!code) {
      if (pairCheckRef.current) clearInterval(pairCheckRef.current)
      return
    }
    pairCheckRef.current = setInterval(async () => {
      try {
        const res: any = await apiRequest('/devices')
        const devices = Array.isArray(res) ? res : res?.data || []
        if (devices.length > 0) {
          setPaired(true)
          if (pairCheckRef.current) clearInterval(pairCheckRef.current)
          setTimeout(() => navigate('/settings'), 2000)
        }
      } catch {}
    }, 10000)
    return () => { if (pairCheckRef.current) clearInterval(pairCheckRef.current) }
  }, [code, navigate])

  const hasActiveCode = code && timeLeft > 0
  const pairingUrl = code ? `ogapay.app/pair?code=${code}` : ''

  return (
    <Layout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, margin: '0 0 6px', color: 'var(--text)' }}>Device Pairing</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>Securely link your devices to your OgaPay account</p>
        </div>

        {/* Section 1 — Pairing Code Card */}
        <div style={{ border: '1.5px solid var(--border)', borderRadius: 16, background: 'var(--card)', marginBottom: 20, overflow: 'hidden' }}>
          {/* Banner */}
          {banner && (
            <div style={{ padding: '10px 16px', background: OGAPAY_BLUE, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: '#fff' }}>
              <i className="ti ti-circle-check" style={{ fontSize: 16 }} />
              <span style={{ flex: 1 }}>{banner}</span>
              <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: 14, opacity: 0.8 }} onClick={() => setBanner('')} />
            </div>
          )}

          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pairing Code</div>

            {/* Code display */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)',
              fontFamily: 'monospace', fontSize: hasActiveCode ? 28 : 16,
              fontWeight: 900, color: hasActiveCode ? OGAPAY_BLUE : 'var(--text3)',
              letterSpacing: hasActiveCode ? 6 : 0,
            }}>
              <span style={{ flex: 1 }}>{hasActiveCode ? code : 'No active code'}</span>
              {hasActiveCode && (
                <button onClick={() => { navigator.clipboard.writeText(code); toast('Copied!', 'success') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: 4 }}>
                  <i className="ti ti-copy" />
                </button>
              )}
            </div>

            {/* Countdown */}
            {hasActiveCode && (
              <div style={{ textAlign: 'right', fontSize: 12, color: timeLeft < 60 ? '#dc2626' : 'var(--text2)', fontWeight: 700, marginTop: 6 }}>
                <i className="ti ti-clock" style={{ marginRight: 4 }} />{formatTime(timeLeft)} remaining
              </div>
            )}

            {/* Action button */}
            {hasActiveCode ? (
              <button onClick={handleDelete} disabled={loading}
                style={{
                  width: '100%', height: 46, borderRadius: 100, border: '1.5px solid #dc2626',
                  background: 'transparent', color: '#dc2626', fontWeight: 700, fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 16,
                  opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {loading ? 'Deleting...' : <><i className="ti ti-trash" /> Delete Code</>}
              </button>
            ) : (
              <button onClick={handleGenerate} disabled={loading}
                style={{
                  width: '100%', height: 46, borderRadius: 100, border: 'none',
                  background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 16,
                  opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {loading ? 'Creating...' : <><i className="ti ti-plus" /> Create Code</>}
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>
              <i className="ti ti-info-circle" style={{ fontSize: 13 }} />
              <span>Codes expire after 5 minutes &bull; One code per minute limit</span>
            </div>
          </div>
        </div>

        {/* Section 2 — How to Use */}
        <div style={{ border: '1.5px solid var(--border)', borderRadius: 16, background: 'var(--card)', marginBottom: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <i className="ti ti-circle-check" style={{ color: OGAPAY_BLUE, fontSize: 16 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>How to Use</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 20px 24px' }}>Use either option below to sign in on your second device.</p>

          {/* Option A */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>A</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <i className="ti ti-device-tablet" style={{ color: 'var(--text2)', fontSize: 14 }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Manual Entry</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>
                Visit <strong>ogapay.app</strong> on your device &rarr; Click <strong>Connect Wallet</strong> &rarr; Choose <strong>Pair devices</strong> &rarr; Enter your code
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Option B */}
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>B</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <i className="ti ti-qrcode" style={{ color: 'var(--text2)', fontSize: 14 }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>QR Code Scan</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 14px', lineHeight: 1.6 }}>Scan the QR code below with your mobile device for instant pairing</p>
              <div style={{
                border: '2px dashed var(--border)', borderRadius: 12, padding: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 180, background: 'var(--bg)',
              }}>
                {hasActiveCode ? (
                  <QRCodeCanvas value={pairingUrl} size={160} bgColor="transparent" fgColor="var(--accent)" />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    <i className="ti ti-qrcode" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                    Create a pairing code to generate QR
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Paired success state */}
        {paired && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 40, color: OGAPAY_BLUE, display: 'block', marginBottom: 12 }} />
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'Outfit', color: 'var(--text)' }}>Device paired successfully!</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: '4px 0 0' }}>Redirecting to settings...</p>
          </div>
        )}
      </div>
    </Layout>
  )
}