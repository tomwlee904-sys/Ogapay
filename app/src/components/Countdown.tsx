import { useState, useEffect } from 'react'

interface CountdownProps {
  startDate: string
  deadlineHours?: number | null
}

export default function Countdown({ startDate, deadlineHours }: CountdownProps) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    const calc = () => {
      const target = deadlineHours
        ? new Date(new Date(startDate).getTime() + deadlineHours * 3600000)
        : null
      const diff = target
        ? target.getTime() - Date.now()
        : Date.now() - new Date(startDate).getTime()
      if (diff <= 0) { setDisplay('Expired'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDisplay(
        d > 0
          ? `${d}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [startDate, deadlineHours])

  if (!display) return null

  return <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text3)' }}>{display}</span>
}
