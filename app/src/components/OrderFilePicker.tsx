import { useEffect, useRef, useState } from 'react'
import { ORDER_FILE_ACCEPT, ORDER_FILE_MB, uploadOrderFile, type OrderFile } from '../lib/upload'
import '../styles/checkout.css'

// Private files on a store order (2026-11-10): what the seller delivered, the
// buyer's evidence for a report, the seller's side of it. Same uploads as the
// checkout brief (POST /uploads/order-attachment): each file goes up on its own
// with its progress; a failed one stays with its reason, to try again or remove.
// onChange gets the uploaded files; onBusy says whether any are still going up.

type Pending = { id: string; file: File; pct: number; error?: string }
let seq = 0

export default function OrderFilePicker({ files, onChange, onBusy, max = 5, label = 'Add files' }: {
  files: OrderFile[]; onChange: (files: OrderFile[]) => void; onBusy?: (busy: boolean) => void; max?: number; label?: string
}) {
  const [pending, setPending] = useState<Pending[]>([])
  const [error, setError] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  // Uploads finish after the parent may have changed the list: keep the latest
  const latest = useRef(files)
  latest.current = files
  const busy = pending.some((p) => !p.error)
  useEffect(() => { onBusy?.(busy) }, [busy])

  const run = async (job: Pending) => {
    try {
      const saved = await uploadOrderFile(job.file, (pct) => setPending((prev) => prev.map((p) => (p.id === job.id ? { ...p, pct } : p))))
      setPending((prev) => prev.filter((p) => p.id !== job.id))
      if (latest.current.length < max) onChange([...latest.current, saved])
    } catch (e: any) {
      setPending((prev) => prev.map((p) => (p.id === job.id ? { ...p, error: e?.message || 'Upload failed' } : p)))
    }
  }
  const add = (list: FileList | null) => {
    if (!list?.length) return
    setError('')
    const room = max - files.length - pending.length
    const all = Array.from(list)
    if (all.length > room) setError(`Up to ${max} files.`)
    const fit = all.slice(0, Math.max(0, room))
    const big = fit.filter((f) => f.size > ORDER_FILE_MB * 1024 * 1024)
    if (big.length) setError(`${big.map((f) => f.name).join(', ')} ${big.length === 1 ? 'is' : 'are'} over ${ORDER_FILE_MB} MB.`)
    const jobs = fit.filter((f) => f.size <= ORDER_FILE_MB * 1024 * 1024).map((file) => ({ id: `of${++seq}`, file, pct: 0 }))
    if (ref.current) ref.current.value = ''
    if (!jobs.length) return
    setPending((prev) => [...prev, ...jobs])
    jobs.forEach(run)
  }
  const retry = (p: Pending) => {
    const job = { ...p, pct: 0, error: undefined }
    setPending((prev) => prev.map((x) => (x.id === p.id ? job : x)))
    run(job)
  }

  return (
    <div>
      <button type="button" className="up-btn" disabled={files.length + pending.length >= max} onClick={() => ref.current?.click()}>
        <i className="ti ti-paperclip" aria-hidden="true" /> {label} <small style={{ color: 'var(--text3)' }}>{files.length} / {max}</small>
      </button>
      <input ref={ref} type="file" hidden multiple accept={ORDER_FILE_ACCEPT} onChange={(e) => add(e.target.files)} />
      {error && <p className="sc-error" role="alert">{error}</p>}
      {(files.length > 0 || pending.length > 0) && (
        <ul className="sc-files">
          {files.map((f) => (
            <li key={f.path}>
              <i className="ti ti-file" aria-hidden="true" /><span>{f.name}</span>
              <small className="sc-file-ok"><i className="ti ti-check" aria-hidden="true" /> Uploaded</small>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((y) => y.path !== f.path))}><i className="ti ti-x" aria-hidden="true" /></button>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.id} className={p.error ? 'err' : undefined}>
              <i className={`ti ${p.error ? 'ti-alert-circle' : 'ti-loader-2 sc-spin'}`} aria-hidden="true" />
              <span title={p.error || undefined}>{p.file.name}{p.error ? `: ${p.error}` : ''}</span>
              {p.error
                ? <button type="button" className="sc-file-retry" onClick={() => retry(p)}>Try again</button>
                : <small aria-live="polite">{p.pct}%</small>}
              {p.error && <button type="button" aria-label={`Remove ${p.file.name}`} onClick={() => setPending((x) => x.filter((y) => y.id !== p.id))}><i className="ti ti-x" aria-hidden="true" /></button>}
              {!p.error && <span className="sc-file-bar" aria-hidden="true"><span style={{ width: `${p.pct}%` }} /></span>}
            </li>
          ))}
        </ul>
      )}
      <small style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--text3)' }}>
        <i className="ti ti-lock" aria-hidden="true" /> Up to {max} files, {ORDER_FILE_MB} MB each. Only the buyer, the seller and OgaPay support can open them.
      </small>
    </div>
  )
}
