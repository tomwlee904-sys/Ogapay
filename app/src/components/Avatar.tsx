import { useState } from 'react'

interface Props {
  src?: string | null
  name?: string
  size?: number
}

const GRADIENTS = [
  'linear-gradient(135deg,#7C3AED,#EC4899)',
  'linear-gradient(135deg,#191C6B,#4F46E5)',
  'linear-gradient(135deg,#22C55E,#06B6D4)',
  'linear-gradient(135deg,#F59E0B,#EF4444)',
  'linear-gradient(135deg,#EC4899,#F59E0B)',
  'linear-gradient(135deg,#4F46E5,#22C55E)',
]

function hash(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ src, name = '?', size = 36 }: Props) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <img loading="lazy" src={src}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }}
        onError={() => setFailed(true)}
      />
    )
  }

  const gradient = GRADIENTS[hash(name) % GRADIENTS.length]
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: size * 0.38,
        fontWeight: 800,
        color: '#fff',
        border: '1px solid var(--border)',
      }}
    >
      {initials(name)}
    </div>
  )
}
