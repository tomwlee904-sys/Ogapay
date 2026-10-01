// A job's deadline, read the same way on the job list and the job page.
// expiresAt is what the server enforces (applying and submitting stop after it);
// `deadline` is the older name for the same date. No date means no deadline:
// never make one up, and never start a fresh countdown when a page loads.

export type Deadline =
  | { state: 'none' }
  | { state: 'invalid' }
  | { state: 'ended'; at: number }
  | { state: 'open'; at: number }

export function jobDeadline(task: { expiresAt?: any; deadline?: any } | null | undefined, now = Date.now()): Deadline {
  const raw = task?.expiresAt ?? task?.deadline
  if (raw == null || raw === '') return { state: 'none' }
  const at = typeof raw === 'number' ? raw : new Date(raw).getTime()
  if (!Number.isFinite(at)) return { state: 'invalid' }
  return at <= now ? { state: 'ended', at } : { state: 'open', at }
}

/** "3d 4h left", "5h 12m left", "Ended", "No deadline" */
export function deadlineLabel(d: Deadline, now = Date.now()): string {
  if (d.state === 'none' || d.state === 'invalid') return 'No deadline'
  if (d.state === 'ended') return 'Ended'
  const m = Math.floor((d.at - now) / 60000), days = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60)
  if (days > 0) return `${days}d ${h}h left`
  if (h > 0) return `${h}h ${m % 60}m left`
  return `${Math.max(1, m)}m left`
}

/** "Closes 12 Oct, 18:00" for the job page */
export function deadlineDate(d: Deadline): string {
  if (d.state !== 'open' && d.state !== 'ended') return 'No deadline'
  return new Date(d.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
