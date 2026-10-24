import { useEffect, useState } from 'react'

/** True while the CSS media query matches, e.g. useMedia('(min-width: 1024px)').
    Used where the markup itself changes between phone and desktop (a bottom
    sheet instead of a dropdown, a fold-out instead of an open card). */
export function useMedia(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
  const [on, setOn] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const update = () => setOn(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [query])
  return on
}

export const PHONE = '(max-width: 767.98px)'
export const DESKTOP = '(min-width: 1024px)'
