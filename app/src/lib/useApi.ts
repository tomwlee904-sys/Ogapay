import useSWR, { SWRConfiguration } from 'swr'
import { apiRequest } from './api'
import type { ApiResponse } from './types'

type FetcherOptions = {
  method?: string
  body?: unknown
  auth?: boolean
}

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  dedupingInterval: 2000,
}

/**
 * Generic SWR hook for a single resource.
 * key: URL path (e.g. '/tasks/featured')
 * Returns { data, error, isLoading, isValidating, mutate }
 */
export function useApi<T>(
  key: string | null,
  options: FetcherOptions = {},
  config?: SWRConfiguration
) {
  const { method = 'GET', body, auth = true } = options

  const fetcher = async (url: string): Promise<T> => {
    const init: RequestInit = { method }
    if (body) init.body = JSON.stringify(body)
    return apiRequest<T>(url, { method, body: init.body, auth })
  }

  return useSWR<T>(key, fetcher, { ...defaultConfig, ...config })
}

/**
 * SWR hook for list endpoints that return { data: T[] } or { success, data: T[] }.
 * Automatically unwraps the data array.
 */
export function useApiList<T>(
  key: string | null,
  options: FetcherOptions = {},
  config?: SWRConfiguration
) {
  const { method = 'GET', auth = true } = options

  const fetcher = async (url: string): Promise<T[]> => {
    const result = await apiRequest<ApiResponse<T[]> | T[]>(url, { method, auth })
    // Handle both { data: [...] } and plain [...] responses
    if (Array.isArray(result)) return result
    if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as ApiResponse<T[]>).data)) {
      return (result as ApiResponse<T[]>).data!
    }
    return []
  }

  return useSWR<T[]>(key, fetcher, { ...defaultConfig, ...config })
}
