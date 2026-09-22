// Helpers for saree image handling.
//
// Storage model: images live on Cloudinary. Uploads go through OUR
// backend (POST /api/upload) which holds the signed Cloudinary
// credentials — the admin browser never sees the api_secret. The
// backend returns the https URL, which we save on the product's
// `image` / `images[].url` fields. Legacy products may still hold
// `data:image` URLs — those keep rendering fine.
import { getToken } from '../api/client'

const BASE =
  import.meta.env.VITE_API_URL ||
  // (import.meta.env.PROD ? 'http://localhost:5000/api' : '/api')
  (import.meta.env.PROD ? 'https://api.thridhavarnam.com/api' : '/api')

export const isImageSrc = (v) =>
  typeof v === 'string' && (v.startsWith('data:image') || v.startsWith('http') || v.startsWith('/'))

// Upload a single File to our backend, which forwards it to Cloudinary
// and returns { url, publicId, ... }. Throws with a readable message on
// failure so the caller can toast it.
export async function uploadImage(file) {
  const body = new FormData()
  body.append('file', file)

  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers,
    body,
  })
  if (!res.ok) {
    let message = `Upload failed (${res.status})`
    try {
      const err = await res.json()
      if (err?.message) message = err.message
    } catch {}
    throw new Error(message)
  }
  const json = await res.json()
  if (!json.url) throw new Error('Server response missing url')
  return json.url
}
