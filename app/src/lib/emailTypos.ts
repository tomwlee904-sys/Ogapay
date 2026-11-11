/* "Did you mean …@gmail.com?" before a sign-in code is sent (login-21,
   2026-11-11). A code sent to gmial.com never arrives, and the person waits.
   Only suggests; the person can still send to what they typed. */

const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'ymail.com', 'aol.com', 'protonmail.com', 'proton.me', 'yahoo.co.uk', 'googlemail.com', 'mail.com', 'zoho.com']
// Real addresses that look like slips of the ones above: never "corrected"
const FINE = ['yahoo.co.in', 'yahoo.ca', 'yahoo.fr', 'yahoo.de', 'hotmail.co.uk', 'hotmail.fr', 'live.co.uk', 'outlook.co.uk', 'gmx.com', 'gmx.de', 'me.com', 'mac.com', 'msn.com', 'email.com']

// Common slips seen in the wild that are too far from the right one for the distance check
const KNOWN: Record<string, string> = {
  'gmail.co': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cmo': 'gmail.com', 'gmail.comm': 'gmail.com', 'gmaill.com': 'gmail.com',
  'gmail.ocm': 'gmail.com', 'gmail.vom': 'gmail.com', 'gmail.xom': 'gmail.com', 'gmail.ng': 'gmail.com', 'gmail.com.ng': 'gmail.com', 'g.mail.com': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.cm': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com', 'icloud.co': 'icloud.com', 'icoud.com': 'icloud.com',
}

// Edits between two short strings (insert, delete, change, or swap two letters next to each other)
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/** The likely meant address, or null when the email looks right (or unknown) */
export function suggestEmail(raw: string): string | null {
  const email = String(raw || '').trim()
  const at = email.lastIndexOf('@')
  if (at < 1 || at === email.length - 1) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1).toLowerCase()
  if (DOMAINS.includes(domain) || FINE.includes(domain)) return null
  let fix = KNOWN[domain] || null
  if (!fix) {
    // One slip from a well-known address (gmaik.com, yahho.com). Short or
    // unusual domains (a company's own) are left alone.
    let best = 3
    for (const d of DOMAINS) {
      const n = distance(domain, d)
      if (n < best && n <= (d.length > 9 ? 2 : 1)) { best = n; fix = d }
    }
  }
  return fix ? `${local}@${fix}` : null
}
