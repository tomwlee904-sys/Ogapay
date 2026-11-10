import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/api'
import { DELIVERABLE_ACCEPT, ORDER_FILE_MB, uploadDeliverable, type OrderFile } from '../lib/upload'
import '../styles/store-extras.css'

// "Files the buyer gets after paying" in the product editor (F21, 2026-11-10).
// The files are private: buyers can download them from their order as soon as
// they pay, and the order is marked delivered (the payment still waits 3 days
// before it comes to you). Unlike sample files, nobody sees them before paying.
// useDeliverables keeps the list for the editor and saves it after the product
// is saved (PUT /store/products/:id/deliverables).

const MAX = 5
type Pending = { id: string; name: string; pct: number; error?: string; abort: AbortController }
const sizeText = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const strip = (list: any[]): OrderFile[] => (Array.isArray(list) ? list : []).map((f) => ({ path: f.path, name: f.name, type: f.type, size: f.size }))

export function useDeliverables(productId?: string | null) {
  const [files, setFiles] = useState<OrderFile[]>([])
  const [initial, setInitial] = useState('[]')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(!productId)
  useEffect(() => {
    if (!productId) return
    apiRequest<{ files: OrderFile[] }>(`/store/products/${productId}/deliverables`, { fresh: true })
      .then((d) => { const f = strip(d?.files || []); setFiles(f); setInitial(JSON.stringify(f)) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [productId])
  const dirty = loaded && JSON.stringify(files) !== initial
  // After the product itself is saved
  const save = async (id: string) => {
    if (!dirty) return
    await apiRequest(`/store/products/${id}/deliverables`, { method: 'PUT', body: JSON.stringify({ files }) })
  }
  return { files, setFiles, busy, setBusy, dirty, loaded, save }
}
export type Deliverables = ReturnType<typeof useDeliverables>

export default function DeliverableFiles({ dl }: { dl: Deliverables }) {
  const [pending, setPending] = useState<Pending[]>([])
  const [msg, setMsg] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const { files, setFiles, setBusy } = dl
  useEffect(() => { setBusy(pending.some((p) => !p.error)) }, [pending, setBusy])

  const add = (list: FileList | null) => {
    if (!list?.length) return
    setMsg('')
    const room = MAX - files.length - pending.filter((p) => !p.error).length
    const picked = Array.from(list)
    if (picked.length > room) setMsg(`Up to ${MAX} files.`)
    for (const file of picked.slice(0, Math.max(0, room))) {
      if (file.size > ORDER_FILE_MB * 1024 * 1024) { setMsg(`${file.name} is over ${ORDER_FILE_MB} MB.`); continue }
      const job: Pending = { id: `${Date.now()}-${Math.random()}`, name: file.name, pct: 0, abort: new AbortController() }
      setPending((p) => [...p, job])
      uploadDeliverable(file, (pct) => setPending((p) => p.map((x) => (x.id === job.id ? { ...x, pct } : x))), job.abort.signal)
        .then((saved) => { setPending((p) => p.filter((x) => x.id !== job.id)); setFiles((cur) => [...cur, saved].slice(0, MAX)) })
        .catch((e: any) => setPending((p) => (e?.cancelled ? p.filter((x) => x.id !== job.id) : p.map((x) => (x.id === job.id ? { ...x, error: e?.message || 'Upload failed' } : x)))))
    }
    if (input.current) input.current.value = ''
  }

  return (
    <div className="ep-field">
      <span>Files the buyer gets after paying (optional)</span>
      {!dl.loaded ? <div className="up-skel" style={{ height: 40 }} /> : (
        <>
          {(files.length > 0 || pending.length > 0) && (
            <ul className="df-list">
              {files.map((f) => (
                <li key={f.path}>
                  <i className="ti ti-lock" aria-hidden="true" /><span>{f.name}</span><small>{sizeText(f.size)}</small>
                  <button type="button" className="up-btn" aria-label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((x) => x.path !== f.path))}><i className="ti ti-x" /></button>
                </li>
              ))}
              {pending.map((p) => (
                <li key={p.id} style={{ flexWrap: 'wrap', paddingTop: 6, paddingBottom: 6 }}>
                  <i className={`ti ${p.error ? 'ti-alert-circle' : 'ti-loader-2'}`} aria-hidden="true" />
                  <span title={p.error}>{p.name}{p.error ? `: ${p.error}` : ''}</span>
                  {!p.error && <small aria-live="polite">{p.pct}%</small>}
                  <button type="button" className="up-btn" aria-label={p.error ? `Remove ${p.name}` : `Cancel ${p.name}`}
                    onClick={() => { if (p.error) setPending((x) => x.filter((y) => y.id !== p.id)); else p.abort.abort() }}><i className="ti ti-x" /></button>
                  {!p.error && <span className="df-bar" aria-hidden="true"><span style={{ width: `${p.pct}%` }} /></span>}
                </li>
              ))}
            </ul>
          )}
          <div>
            <button type="button" className="up-btn" disabled={files.length + pending.filter((p) => !p.error).length >= MAX} onClick={() => input.current?.click()}>
              <i className="ti ti-lock" /> {files.length >= MAX ? `${MAX} files added` : 'Add download files'}
            </button>
            <input ref={input} type="file" multiple hidden accept={DELIVERABLE_ACCEPT} onChange={(e) => add(e.target.files)} />
          </div>
          {msg ? <em>{msg}</em> : <small>For e-books, templates, presets and other digital products. Buyers download them from their order as soon as they pay, and the order is marked delivered. You're paid 3 days later unless they report a problem. Private: nobody sees them before paying. Up to {MAX} files, {ORDER_FILE_MB} MB each (ZIP and PDF work well).</small>}
        </>
      )}
    </div>
  )
}
