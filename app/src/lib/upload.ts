import { supabase } from './supabaseClient'

const BUCKET = 'ogapay-uploads'

/**
 * Upload an image file to Supabase Storage and return a public URL.
 * Falls back to base64 data URL if upload fails.
 */
export async function uploadImage(
  file: File,
  folder: string = 'general'
): Promise<string> {
  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = `${folder}/${filename}`

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path)

    return publicUrl.publicUrl
  } catch (err) {
    console.warn('Supabase upload failed, falling back to base64:', err)
    // Fallback: convert to base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}

/**
 * Upload multiple files at once.
 */
export async function uploadImages(
  files: File[],
  folder: string = 'general'
): Promise<string[]> {
  return Promise.all(files.map(f => uploadImage(f, folder)))
}
