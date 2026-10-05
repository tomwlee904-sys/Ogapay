import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Each page names its own address as the main one. index.html used to give
// every page the homepage's, so Google treated /tasks, /store, /about and the
// rest as copies of the homepage and didn't list them. Query strings
// (filters, tabs) point at the page itself.
const ORIGIN = 'https://ogapay.app'

export default function CanonicalUrl() {
  const { pathname } = useLocation()
  useEffect(() => {
    const href = ORIGIN + (pathname === '/' ? '/' : pathname.replace(/\/+$/, ''))
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = href
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', href)
  }, [pathname])
  return null
}
