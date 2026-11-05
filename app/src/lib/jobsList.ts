// The jobs list address the member was last on (page, search, filters), so
// "Find other jobs" and "Back" from a job go back to the same page of the list
// instead of page 1 (2026-11-05). Kept for this tab only (sessionStorage);
// storage can be blocked (private mode), so it falls back to /tasks.

const KEY = 'ogapay_jobs_list'

export function saveJobsList(search: string) {
  try {
    const params = new URLSearchParams(search)
    params.delete('job') // the quick-view modal isn't part of the list
    const qs = params.toString()
    sessionStorage.setItem(KEY, qs ? `/tasks?${qs}` : '/tasks')
  } catch { /* storage blocked */ }
}

export function jobsListPath(): string {
  try {
    const saved = sessionStorage.getItem(KEY)
    if (saved && (saved === '/tasks' || saved.startsWith('/tasks?'))) return saved
  } catch { /* storage blocked */ }
  return '/tasks'
}
