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
  'kyc-docs':         { path: '/uploads/kyc', field: 'file', responseKey: 'url' },
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
  if (isImage && purpose !== 'avatars') {
    try {
      const imageCompression = (await import('browser-image-compression')).default
      uploadFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      })
    } catch {
      // Fall back to original file if compression fails
    }
  }

  const config = uploadRoutes[purpose] || uploadRoutes['avatars']
  const formData = new FormData()
  formData.append(config.field, uploadFile)

  const res = await fetch(`${API_BASE}${config.path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || 'Upload failed')
  }

  const json = await res.json()
  return json.data?.[config.responseKey] || json[config.responseKey]
}
