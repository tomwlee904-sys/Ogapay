import { useMemo } from 'react'
import { useCurrency } from '../context/CurrencyContext'

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

export function useLivePrice(): LivePriceState {
  const { rates, loading, lastUpdated } = useCurrency()

  const solUsd = rates.SOL
  const usdcUsd = rates.USDC
  const ngnUsd = rates.NGN

  const solNgn = solUsd / ngnUsd
  const usdcNgn = usdcUsd / ngnUsd

  const sol = useMemo<PriceData>(() => ({ usd: solUsd, ngn: solNgn }), [solUsd, solNgn])
  const usdc = useMemo<PriceData>(() => ({ usd: usdcUsd, ngn: usdcNgn }), [usdcUsd, usdcNgn])

  const convertNgnToSol = (ngnAmount: number) => ngnAmount / solNgn
  const convertNgnToUsdc = (ngnAmount: number) => ngnAmount / usdcNgn
  const convertSolToNgn = (solAmount: number) => solAmount * solNgn
  const convertUsdcToNgn = (usdcAmount: number) => usdcAmount * usdcNgn

  return {
    sol,
    usdc,
    loading,
    stale: false,
    lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
    convertNgnToSol,
    convertNgnToUsdc,
    convertSolToNgn,
    convertUsdcToNgn,
  }
}
