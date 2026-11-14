import { useToast } from './Toast'

// A code block with a copy button (Developer API pages). The block scrolls
// sideways inside itself, so long commands never widen the page.
export default function DevCode({ children, label }: { children: string; label?: string }) {
  const { toast } = useToast()
  return (
    <div className="dv-code">
      {label && <span className="dv-code-l">{label}</span>}
      <pre><code>{children}</code></pre>
      <button className="dv-copy" aria-label="Copy" onClick={() => navigator.clipboard?.writeText(children).then(() => toast('Copied', 'success')).catch(() => {})}><i className="ti ti-copy" /></button>
    </div>
  )
}
