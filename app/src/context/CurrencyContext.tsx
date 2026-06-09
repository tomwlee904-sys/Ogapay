import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  Currency,
  CurrencyRates,
  CURRENCIES,
  DEFAULT_RATES,
  formatCurrency,
  formatShort,
  formatWithEquivalents,
  convertAmount,
  fetchRates,
  getStoredCurrency,
  storeCurrency,
} from '../lib/currency'
import { API_BASE, getAccessToken } from '../lib/api'
import { useAuth } from './AuthContext'

interface CurrencyContextValue {
  preferredCurrency: Currency
  setPreferredCurrency: (c: Currency) => void
  rates: CurrencyRates
  lastUpdated: Date | null
  loading: boolean
  /** Format an amount in the preferred currency with full label */
  fmt: (amount: number, currency?: Currency) => string
  /** Format an amount short (just symbol + number) */
  fmtShort: (amount: number, currency?: Currency) => string
  /** Format with equivalents in other currencies */
  fmtAll: (amount: number, currency?: Currency) => { primary: string; secondary: string }
  /** Convert an amount between currencies */
  convert: (amount: number, from: Currency, to: Currency) => number
  /** Convert an amount to preferred and format with equivalents */
  displayAmount: (amount: number, fromCurrency?: Currency) => { primary: string; secondary: string }
  /** Refresh rates */
  refreshRates: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [preferredCurrency, setPreferredCurrencyState] = useState<Currency>(getStoredCurrency)
  const [rates, setRates] = useState<CurrencyRates>({ ...DEFAULT_RATES })
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const { isAuthed } = useAuth()

  // ── Sync currency from backend profile ───────────────────────────────────
  useEffect(() => {
    if (!isAuthed) return
    const token = getAccessToken()
    if (!token) return
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const json = await res.json()
        const data = json.data ?? json
        if (data?.currency && CURRENCIES.includes(data.currency as Currency)) {
          const backendCurrency = data.currency as Currency
          setPreferredCurrencyState(backendCurrency)
          storeCurrency(backendCurrency)
        }
      } catch { /* silently ignore */ }
    })()
  }, [isAuthed])

  const refreshRates = useCallback(async () => {
    setLoading(true)
    const result = await fetchRates(API_BASE)
    setRates(result.rates)
    setLastUpdated(result.lastUpdated)
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshRates()
    const interval = setInterval(refreshRates, 300000)
    return () => clearInterval(interval)
  }, [refreshRates])

  const setPreferredCurrency = useCallback(async (c: Currency) => {
    setPreferredCurrencyState(c)
    storeCurrency(c)
    // Sync to backend if authenticated
    const token = getAccessToken()
    if (token) {
      try {
        await fetch(`${API_BASE}/users/me`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ currency: c }),
        })
      } catch { /* silently ignore */ }
    }
  }, [])

  const fmt = useCallback(
    (amount: number, currency?: Currency) => formatCurrency(amount, currency || preferredCurrency),
    [preferredCurrency]
  )

  const fmtShort = useCallback(
    (amount: number, currency?: Currency) => formatShort(amount, currency || preferredCurrency),
    [preferredCurrency]
  )

  const fmtAll = useCallback(
    (amount: number, currency?: Currency) =>
      formatWithEquivalents(amount, currency || preferredCurrency, rates),
    [preferredCurrency, rates]
  )

  const convert = useCallback(
    (amount: number, from: Currency, to: Currency) => convertAmount(amount, from, to, rates),
    [rates]
  )

  const displayAmount = useCallback(
    (amount: number, fromCurrency?: Currency) => {
      const cur = fromCurrency || preferredCurrency
      // Show in the currency the amount is already in, with equivalents
      return formatWithEquivalents(amount, cur, rates)
    },
    [rates, preferredCurrency]
  )

  return (
    <CurrencyContext.Provider
      value={{
        preferredCurrency,
        setPreferredCurrency,
        rates,
        lastUpdated,
        loading,
        fmt,
        fmtShort,
        fmtAll,
        convert,
        displayAmount,
        refreshRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
