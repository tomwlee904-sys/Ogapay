import { useState, useMemo } from 'react'

interface UsePaginationOptions {
  totalItems: number
  perPage?: number
  initialPage?: number
}

interface UsePaginationReturn {
  page: number
  totalPages: number
  perPage: number
  startIndex: number
  endIndex: number
  setPage: (page: number) => void
  next: () => void
  prev: () => void
  hasNext: boolean
  hasPrev: boolean
  firstItem: number
  lastItem: number
}

export function usePagination({
  totalItems,
  perPage: initialPerPage = 20,
  initialPage = 1,
}: UsePaginationOptions): UsePaginationReturn {
  const [page, setPage] = useState(initialPage)
  const [perPage] = useState(initialPerPage)

  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))

  // Clamp page when total changes
  const safePage = Math.min(page, totalPages)
  if (safePage !== page) setPage(safePage)

  const startIndex = (safePage - 1) * perPage
  const endIndex = Math.min(startIndex + perPage, totalItems)

  return {
    page: safePage,
    totalPages,
    perPage,
    startIndex,
    endIndex,
    setPage: (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    next: () => setPage(p => Math.min(p + 1, totalPages)),
    prev: () => setPage(p => Math.max(p - 1, 1)),
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    firstItem: totalItems === 0 ? 0 : startIndex + 1,
    lastItem: endIndex,
  }
}
