// Makes a phone photo smaller before it's uploaded, so it gets through on slow
// mobile data (2026-11-01). A full-size phone photo is often 3-8 MB; redrawn at
// most 1600 pixels on the longest side and saved as a JPEG it is usually
// 200-600 KB and still sharp enough to read an ID card.
//
// Small JPG/PNG/WebP files are sent as they are. If the browser can't open the
// photo, the original is sent when the server would take it; otherwise the
// member gets a plain message instead of a failed upload.
//
// Used by the Level 2 "send your ID to our team" form (Settings > Verification).
// Other uploads can use it too: shrinkImage(file, { maxBytes, label }).

export const SHRINK = {
  maxSide: 1600, // pixels, longest side
  quality: 0.82, // JPEG quality
  keepUnder: 400 * 1024, // bytes: smaller files are sent as they are
}

// What the upload routes take (kycManual.service.js IMAGE_TYPES, uploadImage)
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type FileInfo = { size: number; type: string }

export type ShrinkOptions = {
  maxSide?: number
  quality?: number
  keepUnder?: number
  /** The server's limit per file; the original is only sent if it's within it */
  maxBytes?: number
  /** Types the server takes */
  accept?: string[]
  /** Names the photo in messages, e.g. "your ID photo" */
  label?: string
}

// ── The decisions (no browser needed; scripts/tests/kycupload.test.cjs) ──

/** Small files the server already takes go as they are */
export function needsShrink(file: FileInfo, keepUnder = SHRINK.keepUnder, accept = UPLOAD_TYPES): boolean {
  return !(file.size > 0 && file.size <= keepUnder && accept.includes(file.type))
}

/** The size to redraw at: the longest side at most maxSide, never made bigger */
export function fitWithin(width: number, height: number, maxSide = SHRINK.maxSide): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height, 1))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/**
 * Which file to send: the smaller copy if it fits the server's limit, else the
 * original if the server takes it as it is, else neither ('none').
 */
export function pickUpload(
  original: FileInfo,
  shrunk: { size: number } | null,
  { maxBytes = Infinity, accept = UPLOAD_TYPES }: { maxBytes?: number; accept?: string[] } = {},
): 'shrunk' | 'original' | 'none' {
  const originalOk = accept.includes(original.type) && original.size > 0 && original.size <= maxBytes
  const shrunkOk = !!shrunk && shrunk.size > 0 && shrunk.size <= maxBytes
  if (shrunkOk && originalOk) return shrunk!.size < original.size ? 'shrunk' : 'original'
  if (shrunkOk) return 'shrunk'
  if (originalOk) return 'original'
  return 'none'
}

/** "IMG_2041.HEIC" → "IMG_2041.jpg" */
export function jpegName(name: string): string {
  return `${String(name || '').replace(/\.[^./\\]*$/, '') || 'photo'}.jpg`
}

/** What to tell the member when the photo can't be sent as it is */
export function cantSendText(original: FileInfo, { maxBytes = Infinity, accept = UPLOAD_TYPES, label = 'this photo' }: { maxBytes?: number; accept?: string[]; label?: string } = {}): string {
  if (accept.includes(original.type) && original.size > maxBytes) {
    return `${label.charAt(0).toUpperCase() + label.slice(1)} is too large (over ${Math.round(maxBytes / (1024 * 1024))} MB) and we couldn't make it smaller. Please take a new photo, or choose a smaller one.`
  }
  return `We couldn't open ${label}. Please choose a JPG or PNG photo, or take a new one with your camera.`
}

// ── In the browser ──

type Decoded = { source: CanvasImageSource; width: number; height: number; done: () => void }

// Phone cameras save photos sideways with a note (EXIF) saying which way is up.
// createImageBitmap turns them the right way up when asked ('from-image');
// browsers that don't know that option refuse it, and then an <img> is used,
// which current browsers also turn the right way up (Chrome 81+, Safari 13.1+,
// Firefox 77+), so selfies aren't sent sideways.
async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() }
    } catch { /* try an <img> */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('unreadable'))
      i.src = url
    })
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

// Redraws the photo smaller as a JPEG; null if this browser can't
async function redraw(file: Blob, maxSide: number, quality: number): Promise<Blob | null> {
  const img = await decode(file)
  try {
    if (!img.width || !img.height) return null
    const { width, height } = fitWithin(img.width, img.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // JPEG has no see-through parts: a PNG's transparent areas become white, not black
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img.source, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    canvas.width = canvas.height = 0 // frees the memory at once on phones
    return blob && blob.type === 'image/jpeg' ? blob : null
  } finally {
    img.done()
  }
}

/**
 * The file to upload: a smaller JPEG copy of a big photo, or the original when
 * it's already small (or can't be redrawn but the server takes it as it is).
 * Throws an Error with a message for the member when neither will do.
 */
export async function shrinkImage(file: File, opts: ShrinkOptions = {}): Promise<File> {
  const { maxSide = SHRINK.maxSide, quality = SHRINK.quality, keepUnder = SHRINK.keepUnder, maxBytes = Infinity, accept = UPLOAD_TYPES, label } = opts
  if (!needsShrink(file, keepUnder, accept)) return file
  let shrunk: Blob | null = null
  try { shrunk = await redraw(file, maxSide, quality) } catch { shrunk = null }
  const pick = pickUpload(file, shrunk, { maxBytes, accept })
  if (pick === 'shrunk') return new File([shrunk!], jpegName(file.name), { type: 'image/jpeg', lastModified: Date.now() })
  if (pick === 'original') return file
  throw new Error(cantSendText(file, { maxBytes, accept, label }))
}
