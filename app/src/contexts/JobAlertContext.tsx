import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { API_BASE, getStoredUser } from '../lib/api'

// Site-wide new-job alert, run by the two switches on the Job monitor page:
// "Pop-up alerts" shows a card and "Sound" plays a chime, each on its own. Every
// 30 seconds it asks for open jobs; a job counts as new the first time it's seen
// after the check started (a job filling up or closing never does), and your own
// jobs never alert.
//
// Browsers only let a page play sound after someone has clicked or tapped on it,
// so the first click or key press anywhere wakes the sound up, and switching
// Sound on plays a test chime (which also counts).

interface JobAlertContextType {
  latestJob: any
  dismissAlert: () => void
  testSound: () => void
}

const JobAlertContext = createContext<JobAlertContextType>({ latestJob: null, dismissAlert: () => {}, testSound: () => {} })

const pref = (k: string) => { try { return localStorage.getItem(k) === 'true' } catch { return false } }

export function JobAlertProvider({ children }: { children: ReactNode }) {
  const [latestJob, setLatestJob] = useState<any>(null)
  const seenRef = useRef<Set<string> | null>(null)
  const mountedRef = useRef(true)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const audio = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return null
      audioCtxRef.current = new Ctx()
    }
    return audioCtxRef.current
  }, [])

  // Two short notes, faded in and out so they don't click
  const playSound = useCallback(() => {
    try {
      const ctx = audio()
      if (!ctx) return
      const chime = () => {
        const now = ctx.currentTime
        for (const [freq, at, dur] of [[880, 0, 0.18], [1320, 0.16, 0.24]] as const) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = freq
          gain.gain.setValueAtTime(0.0001, now + at)
          gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.015)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + at)
          osc.stop(now + at + dur + 0.02)
        }
      }
      if (ctx.state === 'suspended') ctx.resume().then(chime).catch(() => {})
      else chime()
    } catch { /* no audio in this browser */ }
  }, [audio])

  // Wake the sound up on the first click, tap or key press (browser rule)
  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'touchstart']
    const unlock = () => {
      if (!pref('ogapay_jm_sound')) return
      try {
        const ctx = audio()
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
        if (ctx && ctx.state === 'running') events.forEach((e) => window.removeEventListener(e, unlock, true))
      } catch { /* ignore */ }
    }
    events.forEach((e) => window.addEventListener(e, unlock, true))
    return () => events.forEach((e) => window.removeEventListener(e, unlock, true))
  }, [audio])

  const pickAlertFields = useCallback((t: any) => ({
    id: t.id,
    title: t.title,
    reward: Number(t.reward),
    currency: t.currency || 'NGN',
    category: t.category,
    createdAt: t.createdAt,
  }), [])

  // Both switches are off until turned on on the Job monitor page
  const poll = useCallback(async () => {
    const alerts = pref('ogapay_jm_alerts')
    const sound = pref('ogapay_jm_sound')
    if (!alerts && !sound) { seenRef.current = null; return }

    try {
      const token = localStorage.getItem('ogapay_access_token')
      if (!token) return
      const res = await fetch(API_BASE + '/tasks?limit=50', {
        headers: { 'Authorization': 'Bearer ' + token },
      })
      const json = await res.json()
      if (!json.success || !json.data) return
      const me = getStoredUser()?.id
      // Only open jobs with a free place, and not your own
      const tasks = ((json.data.tasks || json.data) as any[]).filter((t) => t.posterId !== me && (t.maxWorkers || 1) > (t.currentWorkers || 0))
      if (!seenRef.current) {
        // The first check only notes what's already there
        seenRef.current = new Set(tasks.map((t) => t.id))
        return
      }
      const seen = seenRef.current
      const added = tasks.filter((t) => !seen.has(t.id))
      tasks.forEach((t) => seen.add(t.id))
      if (!added.length || !mountedRef.current) return
      const newest = [...added].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
      if (alerts) setLatestJob(pickAlertFields(newest))
      if (sound) playSound()
    } catch { /* offline: try again next time */ }
  }, [pickAlertFields, playSound])

  useEffect(() => {
    mountedRef.current = true
    seenRef.current = null
    const token = localStorage.getItem('ogapay_access_token')
    if (token) poll()
    const interval = setInterval(poll, 30000)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [poll])

  const dismissAlert = useCallback(() => setLatestJob(null), [])

  return (
    <JobAlertContext.Provider value={{ latestJob, dismissAlert, testSound: playSound }}>
      {children}
    </JobAlertContext.Provider>
  )
}

export function useJobAlert() {
  return useContext(JobAlertContext)
}
