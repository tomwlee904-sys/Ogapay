// Date of birth for the NIN check (ver-16). Picked as day, month and year: the
// browser's date picker opened on today, so reaching 1998 took many taps. The
// year list starts at the youngest allowed age (18, as kyc.service checks), so
// the years most people need (around 2000) are on the first screen.

export const MIN_AGE = 18
const OLDEST = 100

export const DOB_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Newest first: 18 years ago, then back 100 years
export const dobYears = (now = new Date()): number[] => {
  const top = now.getFullYear() - MIN_AGE
  return Array.from({ length: OLDEST - MIN_AGE + 1 }, (_, i) => top - i)
}

const pad = (n: number) => String(n).padStart(2, '0')

// 'YYYY-MM-DD', or '' when a part is missing or the day doesn't exist (31 June)
export function dobIso(day: string, month: string, year: string): string {
  const d = Number(day), m = Number(month), y = Number(year)
  if (!d || !m || !y) return ''
  const t = new Date(Date.UTC(y, m - 1, d))
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return ''
  return `${y}-${pad(m)}-${pad(d)}`
}

// Full years old on `now` (local date), from a 'YYYY-MM-DD' date
export function ageOn(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number)
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1
  return age
}

// What's wrong with the picked date, or null when it can be sent
export function dobProblem(day: string, month: string, year: string, now = new Date()): string | null {
  if (!day || !month || !year) return 'Choose the day, month and year you were born.'
  const iso = dobIso(day, month, year)
  if (!iso) return "That date doesn't exist. Check the day and month."
  if (ageOn(iso, now) < MIN_AGE) return `You must be ${MIN_AGE} or older to verify on OgaPay.`
  return null
}
