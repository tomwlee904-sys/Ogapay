import { useState, useEffect } from 'react'
import { apiRequest } from '../lib/api'

const BOOKMARKS_KEY = 'ogapay_bookmarks'

interface BookmarkEntry {
  id: string
  taskId: string
}

function loadStoredBookmarks(): BookmarkEntry[] {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]')
  } catch {
    return []
  }
}

function storeBookmarks(bookmarks: BookmarkEntry[]) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks))
}

export function useBookmark(taskId: string) {
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bookmarkId, setBookmarkId] = useState<string | null>(null)

  // Initialize from local storage
  useEffect(() => {
    const stored = loadStoredBookmarks()
    const entry = stored.find(b => b.taskId === taskId)
    if (entry) {
      setBookmarked(true)
      setBookmarkId(entry.id)
    }
  }, [taskId])

  const toggle = async () => {
    setLoading(true)
    try {
      if (bookmarked && bookmarkId) {
        // Unbookmark
        await apiRequest(`/bookmarks/${bookmarkId}`, { method: 'DELETE' })
        setBookmarked(false)
        setBookmarkId(null)
        const stored = loadStoredBookmarks()
        storeBookmarks(stored.filter(b => b.taskId !== taskId))
      } else {
        // Bookmark
        const result = await apiRequest<any>('/bookmarks', {
          method: 'POST',
          body: JSON.stringify({ type: "task", targetId: taskId }),
        })
        const newId = result?.id || result?.data?.id || ''
        setBookmarked(true)
        setBookmarkId(newId)
        const stored = loadStoredBookmarks()
        stored.push({ id: newId, taskId })
        storeBookmarks(stored)
      }
    } catch {
      // silently fail
    }
    setLoading(false)
  }

  return { bookmarked, toggle, loading }
}
