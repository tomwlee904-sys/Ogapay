import { useState, type CSSProperties } from 'react'
import { useToast } from './Toast'

/* Share a link (2026-11-10). On phones and tablets it opens the device's share
   sheet (WhatsApp, X, Telegram…); elsewhere, or when there is no share sheet, it
   copies the link and says so. Sellers sell by posting their links, and the
   installed app has no address bar to copy from. Closing the share sheet does
   nothing. className/label let a page fit it to its own buttons. */

// Copies text; the old way for browsers without the clipboard API (or when it's blocked)
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
  } catch { /* try the old way */ }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const done = document.execCommand('copy')
    area.remove()
    return done
  } catch { return false }
}

export default function ShareButton({ url, title, text, label = 'Share', className, style }: {
  url: string; title: string; text?: string; label?: string; className?: string; style?: CSSProperties
}) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const share = async () => {
    // Desktop browsers with a share sheet send it to the system dialog; copying is what people expect there
    const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    if (typeof navigator.share === 'function' && touch) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (e: any) {
        if (e?.name === 'AbortError') return // they closed the share sheet
        // any other failure: copy the link instead
      }
    }
    if (await copyText(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast('Link copied. Paste it anywhere to share.', 'success')
    } else {
      toast(`Couldn't copy the link. Here it is: ${url}`, 'error')
    }
  }

  return (
    <button type="button" className={className} style={style} onClick={share}>
      <i className={`ti ${copied ? 'ti-check' : 'ti-share'}`} aria-hidden="true" />{copied ? 'Link copied' : label}
    </button>
  )
}
