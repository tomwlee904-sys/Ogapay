import { useState } from 'react'
import { apiRequest } from '../lib/api'

export function useBookmark(taskId: string, initialState = false) {
  const [bookmarked, setBookmarked] = useState(initialState)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    try {
      if (bookmarked) {
        await apiRequest(`/users/bookmarks/${taskId}`, { method: 'DELETE' })
        setBookmarked(false)
        const saved = JSON.parse(localStorage.getItem('ogapay_bookmarks') || '[]')
        localStorage.setItem('ogapay_bookmarks',
          JSON.stringify(saved.filter((b: any) => b.id !== taskId && b.taskId !== taskId))
        )
      } else {
        await apiRequest(`/users/bookmarks/${taskId}`, { method: 'POST' })
        setBookmarked(true)
      }
    } catch {
      // silently fail
    }
    setLoading(false)
  }

  return { bookmarked, toggle, loading }
}
