import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'
import '../styles/profile-public.css'
import '../styles/settings.css'

const deviceIds = (res: any): string[] => {
  const list = Array.isArray(res) ? res : res?.data || []
  return list.map((d: any) => String(d?.id ?? '')).filter(Boolean)
}

export default function DevicePairing() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [code, setCode] = useState('')
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState('')
  const [paired, setPaired] = useState(false)
  // The QR shows open on tablets and computers (scan it with your phone); on a
  // phone it's folded, since the phone is usually the screen showing the code
  const [qrOpen, setQrOpen] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const pairCheckRef = useRef<ReturnType<typeof setInterval>>()
  // Devices already paired when the code was made: success only means a new one
  const knownRef = useRef<Set<string> | null>(null)

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
        // Note the devices you have now, so an old one is never taken for the new one
        knownRef.current = null
        apiRequest('/devices').then((d) => { knownRef.current = new Set(deviceIds(d)) }).catch(() => {})
        setCode(pairingCode)
        setExpiresAt(Date.now() + 5 * 60 * 1000)
        setTimeLeft(300)
        toast('Pairing code created', 'success')
      }
    } catch (e: any) {
      toast(e?.message || "Couldn't create a code", 'error')
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
      toast(e?.message || "Couldn't delete the code", 'error')
    } finally {
      setLoading(false)
    }
  }

  // Poll for pairing completion: a device that wasn't there when the code was made
  useEffect(() => {
    if (!code) {
      if (pairCheckRef.current) clearInterval(pairCheckRef.current)
      return
    }
    pairCheckRef.current = setInterval(async () => {
      try {
        const ids = deviceIds(await apiRequest('/devices'))
        // The first look failed: this list becomes the starting point
        if (!knownRef.current) { knownRef.current = new Set(ids); return }
        if (ids.some((id) => !knownRef.current!.has(id))) {
          setPaired(true)
          if (pairCheckRef.current) clearInterval(pairCheckRef.current)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          setTimeout(() => navigate('/settings/devices'), 3000)
        }
      } catch {}
    }, 10000)
    return () => { if (pairCheckRef.current) clearInterval(pairCheckRef.current) }
  }, [code, navigate])

  const hasActiveCode = !!code && timeLeft > 0
  const pairPage = `${window.location.host}/pair`
  const pairingUrl = code ? `${window.location.origin}/pair?code=${code}` : ''
  const shownCode = code ? (code.match(/.{1,5}/g) || [code]).join(' ') : ''

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text).then(() => toast(`${what} copied`, 'success')).catch(() => {})
  }
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'OgaPay pairing code', text: `My OgaPay pairing code: ${code}`, url: pairingUrl }); return }
    } catch { return }
    copy(pairingUrl, 'Link')
  }

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-narrow" style={{ maxWidth: hasActiveCode ? 900 : undefined }}>
          <Link to="/settings/devices" className="pd-back tap"><i className="ti ti-arrow-left" aria-hidden="true" /> Devices</Link>
          <div className="ui-head pd-head">
            <div>
              <h1 className="ui-title">Pair a device</h1>
              <p className="ui-sub">Sign in on another phone or computer without typing your password.</p>
            </div>
          </div>

          {banner && <div className="pd-banner" role="status"><i className="ti ti-circle-check" aria-hidden="true" /> {banner}</div>}

          {paired ? (
            <section className="ui-card pd-done" role="status">
              <i className="ti ti-circle-check" aria-hidden="true" />
              <h2>Device paired</h2>
              <p>Your other device is signed in. Taking you to your devices…</p>
              <Link className="ui-btn ui-btn-dark" to="/settings/devices">See your devices</Link>
            </section>
          ) : (
            <div className={`pd-grid${hasActiveCode ? ' has-code' : ''}`}>
              <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
                {/* The code */}
                <section className="ui-card pd-card" aria-labelledby="pd-code-h">
                  {hasActiveCode ? (
                    <>
                      <div className="pd-label" id="pd-code-h">Your pairing code</div>
                      <div className="pd-code" aria-live="polite">{shownCode}</div>
                      <div className={`pd-time${timeLeft < 60 ? ' low' : ''}`}><i className="ti ti-clock" aria-hidden="true" /> Expires in {formatTime(timeLeft)}</div>
                      <div className="pd-acts">
                        <button type="button" className="ui-btn ui-btn-dark" onClick={() => copy(code, 'Code')}><i className="ti ti-copy" aria-hidden="true" /> Copy code</button>
                        <button type="button" className="ui-btn ui-btn-ghost" onClick={share}><i className="ti ti-share" aria-hidden="true" /> Share</button>
                      </div>
                      <button type="button" className="ui-btn ui-btn-text pd-del" onClick={handleDelete} disabled={loading}>
                        <i className="ti ti-trash" aria-hidden="true" /> {loading ? 'Deleting…' : 'Delete code'}
                      </button>
                    </>
                  ) : (
                    <>
                      <h2 id="pd-code-h">Create a pairing code</h2>
                      <p>You'll type it (or scan it) on the other device. It works once and lasts 5 minutes.</p>
                      <button type="button" className="ui-btn ui-btn-dark ui-btn-lg" onClick={handleGenerate} disabled={loading}>
                        <i className="ti ti-plus" aria-hidden="true" /> {loading ? 'Creating…' : 'Create code'}
                      </button>
                      <div className="pd-hint"><i className="ti ti-info-circle" aria-hidden="true" /> One new code a minute</div>
                    </>
                  )}
                </section>

                {/* What to do on the other device */}
                <section className="ui-card pd-card" aria-labelledby="pd-steps-h">
                  <h2 id="pd-steps-h">On the other device</h2>
                  <ol className="pd-steps">
                    <li>
                      <span className="pd-link">Open <code>{pairPage}</code>
                        <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => copy(`${window.location.origin}/pair`, 'Link')}><i className="ti ti-copy" aria-hidden="true" /> Copy link</button>
                      </span>
                    </li>
                    <li>Type the code{hasActiveCode ? <> <b>{shownCode}</b></> : ' from this screen'}, or scan the QR code.</li>
                    <li>You're signed in there. It shows under Settings, Devices.</li>
                  </ol>
                </section>
              </div>

              {/* QR: beside the code on bigger screens, folded on phones */}
              {hasActiveCode && (
                <section className="ui-card pd-card">
                  <details className="pd-qr" open={qrOpen} onToggle={(e) => setQrOpen((e.currentTarget as HTMLDetailsElement).open)}>
                    <summary>Show QR code <i className="ti ti-chevron-down" aria-hidden="true" /></summary>
                    <div className="pd-label" style={{ marginBottom: 4 }}>Scan with the other device</div>
                    <div className="pd-qr-box">
                      <QRCodeCanvas value={pairingUrl} size={176} bgColor="#ffffff" fgColor="#0a0a0a" marginSize={2} />
                    </div>
                  </details>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
