import { useState, useEffect } from 'react'
import { savedJobIds, setSaved, onSavedJobsChange } from '../lib/bookmarks'

// Saved-job state for one task, kept in sync with the server list
export function useBookmark(taskId: string) {
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let live = true
    savedJobIds().then((ids) => { if (live) setBookmarked(ids.has(taskId)) })
    const off = onSavedJobsChange((ids) => setBookmarked(ids.has(taskId)))
    return () => { live = false; off() }
  }, [taskId])

  const toggle = async () => {
    if (loading) return
    const next = !bookmarked
    setBookmarked(next)
    setLoading(true)
    try { await setSaved(taskId, next) } catch { setBookmarked(!next) }
    setLoading(false)
  }

  return { bookmarked, toggle, loading }
}
