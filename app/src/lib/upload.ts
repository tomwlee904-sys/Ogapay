import { API_BASE, getAccessToken, invalidateInFlight } from './api'

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
  // Store checkout files are private now: uploadOrderFile below (2026-11-10)
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
    // e.g. a new avatar: a /users/me already on its way has the old one
    invalidateInFlight()

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

// ── Direct uploads (SP8, 2026-11-10) ──────────────
// Big files go straight from the phone to storage: the server signs a one-time
// upload link (/uploads/sign), the file is sent there with real progress, then
// the server checks what arrived (/uploads/confirm) and returns what the old
// upload route would have. If the server can't sign (an older server, or
// storage is down), the file goes through the old route instead, still with
// progress. signal cancels either way.
type DirectPurpose = 'store-file' | 'support' | 'order-attachment' | 'store-deliverable'
const LEGACY_ROUTE: Record<DirectPurpose, string> = {
  'store-file': '/uploads/store-file', support: '/uploads/support',
  'order-attachment': '/uploads/order-attachment', 'store-deliverable': '/uploads/store-deliverable',
}
const cancelled = () => Object.assign(new Error('Upload cancelled'), { cancelled: true })

// One XHR with upload progress (0-99 while it goes, the caller says 100)
function send(method: string, url: string, body: Blob | FormData, opts: { headers?: Record<string, string>; onProgress?: (pct: number) => void; signal?: AbortSignal }): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) return reject(cancelled())
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    for (const [k, v] of Object.entries(opts.headers || {})) xhr.setRequestHeader(k, v)
    xhr.timeout = 300_000
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && opts.onProgress) opts.onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100))) }
    xhr.onload = () => {
      let json: any = {}
      try { json = JSON.parse(xhr.responseText || '{}') } catch { /* not JSON */ }
      resolve({ status: xhr.status, json })
    }
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'))
    xhr.ontimeout = () => reject(new Error('Upload took too long. Try again.'))
    xhr.onabort = () => reject(cancelled())
    opts.signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(body)
  })
}

async function directUpload(file: File, purpose: DirectPurpose, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<any> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')
  const auth = { Authorization: `Bearer ${token}` }
  const legacy = async () => {
    const fd = new FormData()
    fd.append('file', file)
    const r = await send('POST', `${API_BASE}${LEGACY_ROUTE[purpose]}`, fd, { headers: auth, onProgress, signal })
    if (r.status < 200 || r.status >= 300 || !r.json?.data) throw new Error(r.json?.message || 'Upload failed')
    return r.json.data
  }
  const post = async (path: string, body: object) => {
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
    return { status: res.status, json: await res.json().catch(() => ({})) }
  }
  let ticket: { status: number; json: any }
  try { ticket = await post('/uploads/sign', { purpose, name: file.name, type: file.type, size: file.size }) } catch (e: any) {
    if (signal?.aborted) throw cancelled()
    return legacy()
  }
  // The rules said no (too big, wrong kind): say why. Anything else: the old route.
  if (ticket.status === 400) throw new Error(ticket.json?.message || 'This file can\'t be uploaded')
  const t = ticket.json?.data
  if (ticket.status !== 201 || !t?.uploadUrl) return legacy()
  try {
    const put = await send('PUT', t.uploadUrl, file, { headers: { 'Content-Type': t.contentType, 'x-upsert': 'false' }, onProgress, signal })
    if (put.status < 200 || put.status >= 300) return legacy()
  } catch (e: any) {
    if (e?.cancelled) throw e
    return legacy()
  }
  const done = await post('/uploads/confirm', { purpose, path: t.path, name: file.name, type: file.type })
  if (done.status === 400) throw new Error(done.json?.message || 'Upload failed')
  if (done.status !== 201 || !done.json?.data) return legacy()
  return done.json.data
}

// A sample file for a store product or an attachment on a support message:
// sent as-is (no compression), up to 25 MB. Returns what the server saved.
// 2026-11-10: straight to storage with progress (directUpload).
export type UploadedFile = { url: string; name: string; type: string; size: number | null }
export const MAX_FILE_MB = 25
export async function uploadFile(file: File, purpose: 'store-file' | 'support', onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<UploadedFile> {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`${file.name} is over ${MAX_FILE_MB} MB`)
  const d = await directUpload(file, purpose, onProgress, signal)
  onProgress?.(100)
  return { url: d.url, name: d.name || file.name, type: d.type || 'image', size: d.size ?? file.size }
}


// A file for a store order's brief, chosen at checkout (2026-11-10). It goes to
// private storage: the server returns where it saved it, never a public link,
// and only the buyer, the seller and OgaPay support see it on the order.
// onProgress gets 0 to 100 while it uploads.
export type OrderFile = { path: string; name: string; type: string; size: number }
export const ORDER_FILE_MB = 25
export const ORDER_FILE_ACCEPT = 'image/*,audio/*,video/mp4,video/webm,video/quicktime,video/3gpp,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.md'
// 2026-11-10: straight to storage (directUpload); signal cancels it.
export async function uploadOrderFile(file: File, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<OrderFile> {
  if (file.size > ORDER_FILE_MB * 1024 * 1024) throw new Error(`${file.name} is over ${ORDER_FILE_MB} MB`)
  const d = await directUpload(file, 'order-attachment', onProgress, signal)
  if (!d?.path) throw new Error('Upload failed')
  onProgress?.(100)
  return { path: d.path, name: d.name || file.name, type: d.type || file.type, size: d.size ?? file.size }
}

// A file buyers download straight after paying for a product (F21, 2026-11-10):
// private, like order files, and may also be a ZIP or EPUB. Up to 25 MB.
export const DELIVERABLE_ACCEPT = `${ORDER_FILE_ACCEPT},.zip,.epub,application/zip,application/epub+zip`
export async function uploadDeliverable(file: File, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<OrderFile> {
  if (file.size > ORDER_FILE_MB * 1024 * 1024) throw new Error(`${file.name} is over ${ORDER_FILE_MB} MB`)
  const d = await directUpload(file, 'store-deliverable', onProgress, signal)
  if (!d?.path) throw new Error('Upload failed')
  onProgress?.(100)
  return { path: d.path, name: d.name || file.name, type: d.type || file.type, size: d.size ?? file.size }
}
