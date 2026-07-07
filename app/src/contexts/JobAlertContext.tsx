import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { API_BASE } from '../lib/api'

interface JobAlertContextType {
  latestJob: any
  dismissAlert: () => void
}

const JobAlertContext = createContext<JobAlertContextType>({ latestJob: null, dismissAlert: () => {} })

export function JobAlertProvider({ children }: { children: ReactNode }) {
  const [latestJob, setLatestJob] = useState<any>(null)
  const lastIdRef = useRef('')
  const firstLoadRef = useRef(true)
  const mountedRef = useRef(true)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const playSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.value = 0.15
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch {}
  }, [])

  const pickAlertFields = useCallback((t: any) => ({
    id: t.id,
    title: t.title,
    reward: Number(t.reward),
    currency: t.currency || 'NGN',
    category: t.category,
    createdAt: t.createdAt,
  }), [])

  const poll = useCallback(async () => {
    const alerts = localStorage.getItem('ogapay_jm_alerts') !== 'false'
    if (!alerts) return

    try {
      const token = localStorage.getItem('ogapay_access_token')
      if (!token) return
      const res = await fetch(API_BASE + '/tasks?limit=50', {
        headers: { 'Authorization': 'Bearer ' + token },
      })
      const json = await res.json()
      if (!json.success || !json.data) return
      const tasks = (json.data.tasks || json.data) as any[]
      const sorted = [...tasks].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      const latest = sorted[0]
      if (latest && latest.id !== lastIdRef.current) {
        if (!mountedRef.current) return
        lastIdRef.current = latest.id
        if (!firstLoadRef.current) {
          setLatestJob(pickAlertFields(latest))
          const sound = localStorage.getItem('ogapay_jm_sound') !== 'false'
          if (sound) playSound()
        } else {
          firstLoadRef.current = false
        }
      }
    } catch {}
  }, [pickAlertFields, playSound])

  useEffect(() => {
    mountedRef.current = true
    firstLoadRef.current = true
    lastIdRef.current = ''
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
    <JobAlertContext.Provider value={{ latestJob, dismissAlert }}>
      {children}
    </JobAlertContext.Provider>
  )
}

export function useJobAlert() {
  return useContext(JobAlertContext)
}
