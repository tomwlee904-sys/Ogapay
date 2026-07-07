import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'
import { apiRequest } from '../lib/api'
import { useAuth } from './AuthContext'

const BALANCE_TTL = 10_000 // 30 seconds

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

  const fetchBalance = useCallback(async () => {
    if (fetchPromiseRef.current) return fetchPromiseRef.current
    fetchPromiseRef.current = (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiRequest<any>('/wallet/balance')
        setBalances(data)
        setLastFetched(Date.now())
      } catch (e: any) {
        setError(e.message || 'Failed to load balance')
      } finally {
        setLoading(false)
        fetchPromiseRef.current = null
      }
    })()
    return fetchPromiseRef.current
  }, [])

  const refresh = useCallback(async () => {
    await fetchBalance()
  }, [fetchBalance])

  // On mount / when user becomes authed, check TTL
  useEffect(() => {
    if (!isAuthed) {
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
