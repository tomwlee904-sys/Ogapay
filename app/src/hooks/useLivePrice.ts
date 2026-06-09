import { useState, useEffect, useCallback, useRef } from 'react'
import { API_BASE, getAccessToken } from '../lib/api'

interface PriceData {
  usd: number
  ngn: number
}

interface LivePriceState {
  sol: PriceData
  usdc: PriceData
  loading: boolean
  stale: boolean
  lastUpdated: string | null
  convertNgnToSol: (ngnAmount: number) => number
  convertNgnToUsdc: (ngnAmount: number) => number
  convertSolToNgn: (solAmount: number) => number
  convertUsdcToNgn: (usdcAmount: number) => number
}

const FALLBACK = {
  sol: { usd: 145, ngn: 230000 },
  usdc: { usd: 1, ngn: 1580 },
}

// In-memory cache
let cachedPrices: { sol: PriceData; usdc: PriceData } | null = null

export function useLivePrice(): LivePriceState {
  const [sol, setSol] = useState<PriceData>(FALLBACK.sol)
  const [usdc, setUsdc] = useState<PriceData>(FALLBACK.usdc)
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchPrices = useCallback(async () => {
    try {
      const token = getAccessToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/prices`, { headers })
      const json = await res.json()
      const data = json?.data || json

      if (data?.sol && data?.usdc) {
        setSol(data.sol)
        setUsdc(data.usdc)
        setStale(data.stale || false)
        setLastUpdated(data.updatedAt || null)
        cachedPrices = { sol: data.sol, usdc: data.usdc }
      }
    } catch {
      // On error, use cached or fallback
      if (cachedPrices) {
        setSol(cachedPrices.sol)
        setUsdc(cachedPrices.usdc)
        setStale(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrices()
    intervalRef.current = setInterval(fetchPrices, 5 * 60 * 1000) // Every 5 min
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchPrices])

  const convertNgnToSol = useCallback(
    (ngnAmount: number) => (ngnAmount / sol.ngn),
    [sol.ngn]
  )

  const convertNgnToUsdc = useCallback(
    (ngnAmount: number) => (ngnAmount / usdc.ngn),
    [usdc.ngn]
  )

  const convertSolToNgn = useCallback(
    (solAmount: number) => (solAmount * sol.ngn),
    [sol.ngn]
  )

  const convertUsdcToNgn = useCallback(
    (usdcAmount: number) => (usdcAmount * usdc.ngn),
    [usdc.ngn]
  )

  return {
    sol,
    usdc,
    loading,
    stale,
    lastUpdated,
    convertNgnToSol,
    convertNgnToUsdc,
    convertSolToNgn,
    convertUsdcToNgn,
  }
}
