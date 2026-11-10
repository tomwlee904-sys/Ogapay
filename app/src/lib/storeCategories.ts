import { useEffect, useState } from 'react'
import { apiRequest } from './api'

// The store's fixed categories (store audit F1, 2026-11-10), from
// GET /store/categories: [{ name, subcategories, count }]. count is how many
// products are on sale under it; older products with an unlisted category
// count under "Other". Kept for the visit once loaded.
export type StoreCategory = { name: string; subcategories: string[]; count: number }

let cached: StoreCategory[] | null = null
let asking: Promise<StoreCategory[]> | null = null

export function loadStoreCategories(): Promise<StoreCategory[]> {
  if (cached) return Promise.resolve(cached)
  if (!asking) {
    asking = apiRequest<StoreCategory[]>('/store/categories', { auth: false })
      .then((d) => {
        const list = Array.isArray(d) ? d.filter((c) => c && typeof c.name === 'string').map((c) => ({ name: c.name, subcategories: Array.isArray(c.subcategories) ? c.subcategories : [], count: Number(c.count) || 0 })) : []
        if (list.length) cached = list
        return list
      })
      .finally(() => { asking = null })
  }
  return asking
}

/** The category list ([] until it loads, or if it can't) */
export function useStoreCategories(): StoreCategory[] {
  const [list, setList] = useState<StoreCategory[]>(cached || [])
  useEffect(() => {
    if (cached) return
    let live = true
    loadStoreCategories().then((l) => { if (live) setList(l) }).catch(() => { /* the selects keep what they have */ })
    return () => { live = false }
  }, [])
  return list
}

/** The store list filtered to a category (and subcategory) */
export const storeCategoryLink = (category: string, sub?: string | null) =>
  `/store?category=${encodeURIComponent(category)}${sub ? `&sub=${encodeURIComponent(sub)}` : ''}`
