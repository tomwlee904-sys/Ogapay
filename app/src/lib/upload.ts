import { API_BASE, getAccessToken } from './api'

export async function uploadImage(
  file: File,
  _folder: string = 'avatars'
): Promise<string> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const formData = new FormData()
  formData.append('avatar', file)

  const res = await fetch(`${API_BASE}/users/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || 'Avatar upload failed')
  }

  const json = await res.json()
  return json.data?.avatarUrl || json.avatarUrl
}
