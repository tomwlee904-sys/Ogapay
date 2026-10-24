// Community colours. A community's colour is a fixed hex value; older ones were
// saved as the theme colour ("var(--accent)"), which is white in dark mode and
// black in light mode, so their white initials disappeared. Anything that isn't
// a plain hex colour shows as slate, and the initials on a colour tile are dark
// or white depending on how light the colour is.

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
export const FALLBACK_ACCENT = '#52525b'

export function safeAccent(color?: string | null): string {
  return color && HEX.test(color.trim()) ? color.trim() : FALLBACK_ACCENT
}

// Text colour that reads on the given background colour
export function inkOn(color?: string | null): string {
  let h = safeAccent(color).slice(1)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  // whichever of white and near-black has more contrast (they're equal at about 0.18)
  return lum > 0.18 ? '#0a0a0a' : '#ffffff'
}

// The tile style for a community's initials or picture
export function accentTile(color?: string | null) {
  const bg = safeAccent(color)
  return { background: bg, color: inkOn(bg) }
}
