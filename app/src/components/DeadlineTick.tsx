import { useEffect, useState } from 'react'
import { deadlineLabel, type Deadline } from '../lib/deadline'

// One shared one-second clock for every countdown on the page (a page of job
// cards runs one timer, not one per card). It stops when nothing listens.
const listeners = new Set<(n: number) => void>()
let timer: ReturnType<typeof setInterval> | null = null
function subscribe(fn: (n: number) => void) {
  listeners.add(fn)
  if (!timer) timer = setInterval(() => { const n = Date.now(); listeners.forEach((l) => l(n)) }, 1000)
  return () => { listeners.delete(fn); if (!listeners.size && timer) { clearInterval(timer); timer = null } }
}

/** "3d 4h 12m 08s left", ticking every second; static text when there's no deadline or it ended */
export default function DeadlineTick({ deadline }: { deadline: Deadline }) {
  const [now, setNow] = useState(() => Date.now())
  const ticking = deadline.state === 'open'
  useEffect(() => (ticking ? subscribe(setNow) : undefined), [ticking])
  return <>{deadlineLabel(deadline, now, true)}</>
}
