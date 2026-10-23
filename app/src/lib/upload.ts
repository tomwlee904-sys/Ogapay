import { API_BASE, getAccessToken } from './api'

interface UploadRoute {
  path: string
  field: string
  responseKey: string
}

const uploadRoutes: Record<string, UploadRoute> = {
  'avatars':          { path: '/users/avatar', field: 'avatar', responseKey: 'avatarUrl' },
  'task-proofs':      { path: '/uploads/proof', field: 'file',   responseKey: 'url' },
  'store':            { path: '/uploads/store', field: 'file',   responseKey: 'url' },
  'community-covers': { path: '/uploads/community', field: 'cover', responseKey: 'url' },
  // There is no /uploads/community/avatar route; the community image upload serves both
  'community-avatars': { path: '/uploads/community', field: 'cover', responseKey: 'url' },
  // Blog covers used to fall through to 'avatars' and replace the writer's profile picture
  // Blog pictures have their own route that takes up to 25 MB
  'blog-covers':      { path: '/uploads/blog', field: 'file', responseKey: 'url' },
  // Pictures inside an article (the editor's Image button)
  'blog-images':      { path: '/uploads/blog', field: 'file', responseKey: 'url' },
  // Profile screenshot for a creator audience (Settings, Creator)
  'creator-proofs':   { path: '/uploads/proof', field: 'file', responseKey: 'url' },
  'user-covers':      { path: '/users/cover', field: 'cover', responseKey: 'coverUrl' },
  'kyc-docs':         { path: '/kyc/documents/id_front', field: 'document', responseKey: 'url' },
  'task-attachments': { path: '/uploads/proof', field: 'file', responseKey: 'url' },
}

export async function uploadImage(
  file: File,
  purpose: string = 'avatars'
): Promise<string> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  // Client-side pre-check for common issues
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const allowedDocs = ['application/pdf']
  const isImage = allowedImageTypes.includes(file.type)
  const isDoc = allowedDocs.includes(file.type)

  // Compress images before upload
  let uploadFile = file
  if (isImage && file.type !== 'image/gif') {
    try {
      const imageCompression = (await import('browser-image-compression')).default
      const avatar = purpose === 'avatars' || purpose === 'community-avatars'
      uploadFile = await imageCompression(file, {
        maxSizeMB: avatar ? 0.2 : 0.5,
        maxWidthOrHeight: avatar ? 512 : 1600,
        useWebWorker: true,
      })
    } catch {
      // Fall back to original file if compression fails
    }
  }

  const config = uploadRoutes[purpose]
  if (!config) throw new Error(`Unknown upload type: ${purpose}`)
  const formData = new FormData()
  formData.append(config.field, uploadFile)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  try {
    const res = await fetch(`${API_BASE}${config.path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.message || 'Upload failed')
    }

    const json = await res.json()
    return json.data?.[config.responseKey] || json[config.responseKey]
  } finally {
    clearTimeout(timeout)
  }
}

// Jobs with "Watermarks on": the server stamps images, and it can only read PNG
// (services/proofImage.service.js), so images are redrawn as PNG first, at most
// 1600 pixels on the longest side.
export async function imageToPng(file: File, maxSide = 1600): Promise<File> {
  if (file.type === 'image/png' && file.size < 4 * 1024 * 1024) return file
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error(`"${file.name}" couldn't be read as an image`))
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error(`"${file.name}" couldn't be converted`)
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Proof for a job: { url, originalUrl? }. With taskId on a watermarked job, an
// image comes back stamped (url) with its original kept for you (originalUrl).
export async function uploadProof(file: File, taskId?: string, watermark = false): Promise<{ url: string; originalUrl?: string }> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')
  const isImage = /^image\/(png|jpeg|webp|gif)$/.test(file.type)
  const send = watermark && isImage ? await imageToPng(file) : file
  const fd = new FormData()
  if (taskId) fd.append('taskId', taskId)
  fd.append('file', send)
  const r = await fetch(`${API_BASE}/uploads/proof`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j?.data?.url) throw new Error(`"${file.name}" couldn't be uploaded${j?.message ? `: ${j.message}` : ''}. Try again or remove it.`)
  return { url: j.data.url, ...(j.data.originalUrl && { originalUrl: j.data.originalUrl }) }
}
