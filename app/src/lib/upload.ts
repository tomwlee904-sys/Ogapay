import { API_BASE, getAccessToken } from './api'

interface IKResponse {
  url: string
  fileId: string
  thumbnailUrl?: string
}

export async function uploadImage(
  file: File,
  folder: string = 'profiles'
): Promise<string> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`${API_BASE}/imagekit/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  const creds = json?.data || json
  if (!creds?.publicKey || !creds?.urlEndpoint || !creds?.token || !creds?.signature) {
    throw new Error('ImageKit not configured')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileName', file.name || 'upload')
  formData.append('useUniqueFileName', 'true')
  formData.append('folder', folder)
  formData.append('publicKey', creds.publicKey)
  formData.append('signature', creds.signature)
  formData.append('expire', String(creds.expire))
  formData.append('token', creds.token)

  const uploadRes = await fetch(`https://upload.imagekit.io/api/v1/files/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    throw new Error(errText || 'ImageKit upload failed')
  }

  const result: IKResponse = await uploadRes.json()
  return result.url
}
