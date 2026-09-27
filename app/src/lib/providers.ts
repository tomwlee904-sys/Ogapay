import { useEffect, useState } from 'react'
import { apiRequest } from './api'

// Which sign-in / verification services are set up on the server
// (e.g. very = VeryAI human verification). Asked once per visit.
export type Providers = Record<string, boolean>

let cache: Promise<Providers> | null = null
export const loadProviders = () =>
  (cache ||= apiRequest<Providers>('/social/providers', { auth: false }).catch(() => { cache = null; return {} as Providers }))

export function useProviders(): Providers | null {
  const [p, setP] = useState<Providers | null>(null)
  useEffect(() => {
    let live = true
    loadProviders().then((v) => { if (live) setP(v || {}) })
    return () => { live = false }
  }, [])
  return p
}
