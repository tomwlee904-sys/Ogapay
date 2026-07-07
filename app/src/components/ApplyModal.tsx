import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from './Toast'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ogapay-app-66b6c47c60e5.herokuapp.com/api'
const BRAND = '#2E4E24'

interface ApplyModalProps {
  open: boolean
  onClose: () => void
  jobId: string
  jobTitle: string
  reward: number
  currency: string
  onApplied?: (jobId: string) => void
}

export default function ApplyModal({ open, onClose, jobId, jobTitle, reward, currency, onApplied }: ApplyModalProps) {
  const { fmt } = useCurrency()
  const { toast: showToast } = useToast()
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [applyLink, setApplyLink] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
  }
  const handleRemoveFile = (index: number) => { setFiles(prev => prev.filter((_, i) => i !== index)) }

  useEffect(() => {
    if (!open) { setStep('form'); setApplyLink(''); setNotes(''); setError(''); setFiles([]) }
  }, [open])

  const handleSubmit = async () => {
    if (!applyLink.trim() && !notes.trim() && files.length === 0) {
      setError('Please add a proof link, a note, or upload at least one screenshot/file before submitting.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const token = localStorage.getItem('ogapay_access_token')
      if (!token) { setError('Please log in first'); setSubmitting(false); return }

      // Step 1: Apply
      const applyRes = await fetch(`${API_BASE}/tasks/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const applyJson = await applyRes.json()
      if (!applyRes.ok) {
        const msg = applyJson.message || applyJson.error || ''
        if (!msg.toLowerCase().includes('already')) throw new Error(msg || 'Failed to apply')
      }

      // Step 2: Upload files if any
      const uploadedUrls: string[] = []
      for (const f of files) {
        try {
          const fd = new FormData()
          fd.append('file', f)
          const upRes = await fetch(`${API_BASE}/uploads/proof`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          })
          if (upRes.ok) { const upJson = await upRes.json(); if (upJson.data?.url) uploadedUrls.push(upJson.data.url) }
        } catch (e: any) { console.error(e) }
      }

      // Step 3: Submit
      const submitBody: Record<string, any> = {}
      if (applyLink.trim()) submitBody.proof = applyLink.trim()
      if (notes.trim()) submitBody.workerNotes = notes.trim()
      if (uploadedUrls.length > 0) submitBody.attachments = uploadedUrls

      const submitRes = await fetch(`${API_BASE}/tasks/${jobId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(submitBody),
      })
      const submitJson = await submitRes.json()
      if (!submitRes.ok) throw new Error(submitJson.message || 'Failed to submit')

      setStep('success')
      onApplied?.(jobId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 520,
        margin: '0 auto',
        background: 'var(--card,#fff)',
        border: '0.5px solid var(--border,#e5e7eb)',
        borderRadius: '20px 20px 0 0',
        maxHeight: '92vh', overflowY: 'auto',
        padding: '20px 20px 32px',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border,#e5e7eb)' }} />
        </div>

        {step === 'form' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text,#0f172a)' }}>Apply for this Job</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text2,#6b7280)' }}>
                  {fmt(reward, currency as any)} · {jobTitle}
                </p>
              </div>
              <button onClick={onClose} style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--bg,#f3f4f6)',
                border: '0.5px solid var(--border,#e5e7eb)',
                color: 'var(--text2,#6b7280)',
                cursor: 'pointer', display: 'grid', placeItems: 'center',
                flexShrink: 0,
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Link input */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text,#0f172a)', display: 'block', marginBottom: 6 }}>
                Submission Link <span style={{ fontWeight: 400, color: 'var(--text3,#9ca3af)' }}>(optional)</span>
              </label>
              <input type="url" value={applyLink} onChange={(e: any) => setApplyLink(e.target.value)}
                placeholder="https://twitter.com/... or any link to your work"
                style={{
                  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                  border: '1px solid var(--border,#e5e7eb)', borderRadius: 10,
                  background: 'var(--bg,#f8fafc)', color: 'var(--text,#0f172a)',
                  fontSize: 14, outline: 'none', fontFamily: 'inherit',
                }}
              />
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text3,#9ca3af)' }}>
                Add a tweet/post/document link if applicable. If your proof is a screenshot or file, upload it below instead.
              </p>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text,#0f172a)', display: 'block', marginBottom: 6 }}>
                Notes <span style={{ fontWeight: 400, color: 'var(--text3,#9ca3af)' }}>(optional)</span>
              </label>
              <textarea value={notes} onChange={(e: any) => setNotes(e.target.value)}
                placeholder="Add any notes for the task creator..."
                rows={4}
                style={{
                  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                  border: '1px solid var(--border,#e5e7eb)', borderRadius: 10,
                  background: 'var(--bg,#f8fafc)', color: 'var(--text,#0f172a)',
                  fontSize: 14, outline: 'none', fontFamily: 'inherit',
                  resize: 'vertical', lineHeight: 1.5, minHeight: 90,
                }}
              />
            </div>

            {/* File upload */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text,#0f172a)', display: 'block', marginBottom: 6 }}>
                Attachments <span style={{ fontWeight: 400, color: 'var(--text3,#9ca3af)' }}>(optional)</span>
              </label>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileAdd} style={{ display: 'none' }} />
              <div onClick={() => fileInputRef.current?.click()} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '20px 16px', borderRadius: 10,
                border: '1.5px dashed var(--border,#e5e7eb)',
                background: 'var(--bg,#f8fafc)',
                color: 'var(--text3,#9ca3af)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
              }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Click to upload files</span>
              </div>
              {files.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 8,
                      background: 'var(--bg,#f8fafc)',
                      border: '0.5px solid var(--border,#e5e7eb)', fontSize: 12,
                    }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text,#0f172a)' }}>
                        {f.name}
                      </span>
                      <span style={{ color: 'var(--text3,#9ca3af)' }}>{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => handleRemoveFile(i)} style={{
                        background: 'none', border: 'none',
                        color: 'var(--text3,#9ca3af)', cursor: 'pointer',
                        padding: 2, display: 'grid', placeItems: 'center',
                      }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(220,38,38,0.08)',
                border: '0.5px solid rgba(220,38,38,0.2)',
                fontSize: 13, color: '#dc2626', marginBottom: 14,
              }}>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button onClick={handleSubmit} disabled={submitting} style={{
              width: '100%', padding: '15px', borderRadius: 12,
              border: 'none',
              background: submitting ? 'var(--border,#cbd5e1)' : BRAND,
              color: '#fff', fontSize: 14, fontWeight: 800,
              cursor: submitting ? 'wait' : 'pointer',
              fontFamily: 'inherit', minHeight: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all .2s',
            }}>
              {submitting ? (
                <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
              ) : (
                'Submit Application'
              )}
            </button>
          </>
        ) : (
          /* Success state */
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(22,163,74,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', color: 'var(--green)',
            }}>
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: 'var(--text,#0f172a)' }}>
              Application Submitted!
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text2,#6b7280)', lineHeight: 1.5 }}>
              Your application has been submitted. The task creator will review it.
            </p>
            <button onClick={onClose} style={{
              padding: '13px 32px', borderRadius: 12,
              border: 'none', background: BRAND,
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
