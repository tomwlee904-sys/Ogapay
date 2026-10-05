import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import {
  Currency,
  DisplayMode,
  CurrencyRates,
  CURRENCIES,
  DEFAULT_RATES,
  formatCurrency,
  formatShort,
  formatBoth,
  formatWithEquivalents,
  convertAmount,
  fetchRates,
  getStoredCurrency,
  storeCurrency,
} from '../lib/currency'
import { API_BASE, getAccessToken } from '../lib/api'
import { useAuth } from './AuthContext'

interface CurrencyContextValue {
  preferredCurrency: DisplayMode
  setPreferredCurrency: (c: DisplayMode) => void
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
  const [preferredCurrency, setPreferredCurrencyState] = useState<DisplayMode>(getStoredCurrency)
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
        const p = data.preferences || data
        // The account's saved display currency wins. Without one, keep what this
        // browser has (it used to fall back to the account's base currency, NGN,
        // and undo a choice made before signing in)
        if (p?.defaultCurrency) {
          const mode = p.defaultCurrency as DisplayMode
          setPreferredCurrencyState(mode)
          storeCurrency(mode as any)
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

  // Save to the account shortly after the last change, so quick switching
  // (₦ > $ > Both) can't land out of order and leave an older choice saved
  const saveTimer = useRef<number | undefined>(undefined)
  const setPreferredCurrency = useCallback(async (c: DisplayMode) => {
    setPreferredCurrencyState(c)
    storeCurrency(c as any)
    const token = getAccessToken()
    if (!token) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      fetch(`${API_BASE}/users/me/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ preferences: { defaultCurrency: c } }),
      }).catch(() => { /* kept in this browser; saved next time */ })
    }, 400)
  }, [])

  const resolveCurrency = (cur?: Currency): Currency => cur || (preferredCurrency === 'BOTH' ? 'NGN' : preferredCurrency)

  const fmt = useCallback(
    (amount: number, currency?: Currency) => {
      const cur = resolveCurrency(currency)
      if (preferredCurrency === 'BOTH' && !currency) {
        return formatBoth(amount, cur, rates)
      }
      return formatCurrency(amount, cur)
    },
    [preferredCurrency, rates]
  )

  const fmtShort = useCallback(
    (amount: number, currency?: Currency) => {
      const cur = resolveCurrency(currency)
      if (preferredCurrency === 'BOTH' && !currency) {
        const ngn = cur === 'NGN' ? amount : convertAmount(amount, cur, 'NGN', rates)
        const usdc = cur === 'USDC' ? amount : convertAmount(amount, cur, 'USDC', rates)
        return `₦${Math.round(ngn).toLocaleString('en-US')} / $${usdc.toFixed(2)}`
      }
      return formatShort(amount, cur)
    },
    [preferredCurrency, rates]
  )

  const fmtAll = useCallback(
    (amount: number, currency?: Currency) => {
      const cur = resolveCurrency(currency)
      return formatWithEquivalents(amount, cur, rates)
    },
    [preferredCurrency, rates]
  )

  const convert = useCallback(
    (amount: number, from: Currency, to: Currency) => convertAmount(amount, from, to, rates),
    [rates]
  )

  const displayAmount = useCallback(
    (amount: number, fromCurrency?: Currency) => {
      const cur = fromCurrency || resolveCurrency()
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
