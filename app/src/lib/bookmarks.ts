import { apiRequest, getAccessToken } from './api'

// Saved jobs live on the server (/users/bookmarks). Job cards, the job page and
// /bookmarks all go through here so they agree. One list request per page load.

export type SavedJob = {
  id: string
  taskId: string
  createdAt: string
  task: { id: string; title: string; description: string; reward: string | number; currency: string; category: string; status: string } | null
}

let cache: Promise<Set<string>> | null = null
const listeners = new Set<(ids: Set<string>) => void>()

export async function listSavedJobs(): Promise<SavedJob[]> {
  const res: any = await apiRequest('/users/bookmarks')
  return Array.isArray(res?.bookmarks) ? res.bookmarks : Array.isArray(res) ? res : []
}

export function savedJobIds(): Promise<Set<string>> {
  if (!getAccessToken()) return Promise.resolve(new Set())
  if (!cache) {
    cache = listSavedJobs()
      .then((list) => new Set(list.map((b) => b.taskId)))
      .catch(() => { cache = null; return new Set<string>() })
  }
  return cache
}

export function onSavedJobsChange(fn: (ids: Set<string>) => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export async function setSaved(taskId: string, saved: boolean): Promise<void> {
  await apiRequest(`/users/bookmarks/${encodeURIComponent(taskId)}`, { method: saved ? 'POST' : 'DELETE' })
  const ids = new Set(await savedJobIds())
  if (saved) ids.add(taskId)
  else ids.delete(taskId)
  cache = Promise.resolve(ids)
  listeners.forEach((fn) => fn(ids))
}
