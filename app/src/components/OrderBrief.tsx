import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/order-brief.css'

// The buyer's brief on a store order (2026-11-10), saved with the payment. Shown
// on the order page, the seller's order card and the admin dispute card. Files
// come as links that work for about an hour (reload the page for fresh ones);
// lists only know how many files there are, and link to the order page.

export type BriefFile = { name: string; type: string; size: number; isImage: boolean; url: string | null }

const sizeText = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export default function OrderBrief({ label = "Buyer's brief", brief, files, fileCount = 0, orderId }: {
  label?: string; brief?: string | null; files?: BriefFile[]; fileCount?: number; orderId?: string
}) {
  const [open, setOpen] = useState(false)
  const text = (brief || '').trim()
  const count = files ? files.length : fileCount
  if (!text && !count) return null
  const long = text.length > 280 || text.split('\n').length > 4
  return (
    <div className="ob">
      <span className="ob-label"><i className="ti ti-file-text" aria-hidden="true" /> {label}</span>
      {text && <p className={`ob-text${open || !long ? ' open' : ''}`}>{text}</p>}
      {text && long && <button type="button" className="ob-more" onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Read full brief'}</button>}
      {files && files.length > 0 ? (
        <ul className="ob-files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              {f.url
                ? <a href={f.url} target="_blank" rel="noopener noreferrer"><i className={`ti ${f.isImage ? 'ti-photo' : 'ti-paperclip'}`} aria-hidden="true" /><span>{f.name}</span><small>{sizeText(f.size)}</small></a>
                : <span className="ob-off"><i className="ti ti-paperclip" aria-hidden="true" /><span>{f.name}</span><small>not available</small></span>}
            </li>
          ))}
        </ul>
      ) : !files && fileCount > 0 && orderId ? (
        <Link className="ob-more" to={`/orders/${orderId}`}><i className="ti ti-paperclip" aria-hidden="true" /> {fileCount} file{fileCount === 1 ? '' : 's'}: open the order to see {fileCount === 1 ? 'it' : 'them'}</Link>
      ) : null}
    </div>
  )
}
