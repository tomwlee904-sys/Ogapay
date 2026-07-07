import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { apiRequest } from './api'
import type { ApiResponse } from './types'

const BASE_FETCHER = async (url: string) => {
  const res = await apiRequest(url, { auth: false })
  return res
}

const AUTH_FETCHER = async (url: string) => {
  const res = await apiRequest(url, { auth: true })
  return res
}

export function useApi<T = any>(
  url: string | null,
  options?: { auth?: boolean; revalidateOnFocus?: boolean; refreshInterval?: number }
) {
  const fetcher = options?.auth !== false ? AUTH_FETCHER : BASE_FETCHER
  return useSWR<ApiResponse<T> | T>(url, fetcher, {
    revalidateOnFocus: options?.revalidateOnFocus ?? false,
    refreshInterval: options?.refreshInterval,
    errorRetryCount: 2,
    dedupingInterval: 5000,
  })
}

export function useApiList<T = any>(
  url: string | null,
  options?: { auth?: boolean; limit?: number }
) {
  const fetcher = options?.auth !== false ? AUTH_FETCHER : BASE_FETCHER
  const limit = options?.limit ?? 50

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData?.data?.length && !Array.isArray(previousPageData)) return null
    if (!url) return null
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}page=${pageIndex + 1}&limit=${limit}`
  }

  return useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 2,
    dedupingInterval: 5000,
  })
}

export function prefetchApi(url: string, options?: { auth?: boolean }) {
  const fetcher = options?.auth !== false ? AUTH_FETCHER : BASE_FETCHER
  return fetcher(url)
}
