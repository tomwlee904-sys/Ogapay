import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'
import { apiRequest } from '../lib/api'
import { useAuth } from './AuthContext'

const BALANCE_TTL = 10_000 // 30 seconds
const RETRY_MS = 4_000

export type BalanceData = Record<string, { balance: number; lockedBalance: number; available: number; pendingBalance?: number }> | null

interface WalletBalanceState {
  balances: BalanceData
  loading: boolean
  error: string | null
  lastFetched: number | null
  refresh: () => Promise<void>
}

const WalletBalanceContext = createContext<WalletBalanceState | null>(null)

export function WalletBalanceProvider({ children }: { children: ReactNode }) {
  const { isAuthed } = useAuth()
  const [balances, setBalances] = useState<BalanceData>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<number | null>(null)
  const fetchPromiseRef = useRef<Promise<void> | null>(null)
  // A failed load is tried once more after RETRY_MS (2026-11-05: one failed
  // load at start-up left the header on ₦0 until the next page refresh)
  const retried = useRef(false)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchRef = useRef<() => Promise<void>>(async () => {})

  const fetchBalance = useCallback(async () => {
    if (fetchPromiseRef.current) return fetchPromiseRef.current
    fetchPromiseRef.current = (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiRequest<any>('/wallet/balance')
        setBalances(data)
        setLastFetched(Date.now())
        retried.current = false
      } catch (e: any) {
        setError(e.message || 'Failed to load balance')
        if (!retried.current) {
          retried.current = true
          if (retryTimer.current) clearTimeout(retryTimer.current)
          retryTimer.current = setTimeout(() => { retryTimer.current = null; fetchRef.current() }, RETRY_MS)
        }
      } finally {
        setLoading(false)
        fetchPromiseRef.current = null
      }
    })()
    return fetchPromiseRef.current
  }, [])
  fetchRef.current = fetchBalance

  const refresh = useCallback(async () => {
    await fetchBalance()
  }, [fetchBalance])

  // On mount / when user becomes authed, check TTL
  useEffect(() => {
    if (!isAuthed) {
      if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null }
      retried.current = false
      setBalances(null)
      setLastFetched(null)
      setError(null)
      return
    }
    const stale = !lastFetched || Date.now() - lastFetched > BALANCE_TTL
    if (stale && !loading) {
      fetchBalance()
    }
  }, [isAuthed])
  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current) }, [])

  return (
    <WalletBalanceContext.Provider value={{ balances, loading, error, lastFetched, refresh }}>
      {children}
    </WalletBalanceContext.Provider>
  )
}

export function useWalletBalance() {
  const ctx = useContext(WalletBalanceContext)
  if (!ctx) throw new Error('useWalletBalance must be used inside WalletBalanceProvider')
  return ctx
}
