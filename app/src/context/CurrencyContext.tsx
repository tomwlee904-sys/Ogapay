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
import { API_BASE } from '../lib/api'

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

  const refreshRates = useCallback(async () => {
    setLoading(true)
    const result = await fetchRates(API_BASE)
    setRates(result.rates)
    setLastUpdated(result.lastUpdated)
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshRates()
    // Refresh rates every 5 minutes
    const interval = setInterval(refreshRates, 300000)
    return () => clearInterval(interval)
  }, [refreshRates])

  const setPreferredCurrency = useCallback((c: Currency) => {
    setPreferredCurrencyState(c)
    storeCurrency(c)
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
