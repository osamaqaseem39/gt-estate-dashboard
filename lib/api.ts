import axios from 'axios'

const DEFAULT_API_ORIGIN = 'https://gt-estate-server.vercel.app'
const DEFAULT_MEDIA_ORIGIN = 'https://gt.osamaqaseem.online'

function resolveApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_ORIGIN).replace(/\/$/, '')
}

function resolveMediaBase(): string {
  return (process.env.NEXT_PUBLIC_MEDIA_URL || DEFAULT_MEDIA_ORIGIN).replace(/\/$/, '')
}

const axiosBase = resolveApiBase()
const mediaBase = resolveMediaBase()

/** Same origin the axios client uses. */
export const API_SERVER_ORIGIN = axiosBase

/** Absolute URL for images stored as `/uploads/...` or full https URLs (dashboard previews & lists). */
export function resolveDashboardMediaUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return ''
  const t = pathOrUrl.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  const path = t.startsWith('/') ? t : `/${t}`
  return `${mediaBase}${path}`
}

function filenameFromMediaUrl(url: string, fallback = 'image'): string {
  try {
    const path = new URL(url, 'https://example.local').pathname
    const base = path.split('/').pop() || ''
    if (base && /\.[a-z0-9]{2,5}$/i.test(base)) return decodeURIComponent(base)
  } catch {
    /* ignore */
  }
  return fallback
}

/**
 * Download a media URL even when it is on another origin (upload host).
 * Falls back to opening a new tab if CORS blocks the fetch.
 */
export async function downloadDashboardMedia(pathOrUrl: string, filenameHint?: string): Promise<void> {
  const href = resolveDashboardMediaUrl(pathOrUrl)
  if (!href) throw new Error('No image URL')
  const filename = filenameHint || filenameFromMediaUrl(href)

  try {
    const res = await fetch(href, { mode: 'cors' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch {
    window.open(href, '_blank', 'noopener,noreferrer')
  }
}

/** Same base URL as the axios client (`…/api`). Use with `fetch` + FormData so the browser sets multipart boundaries. */
export const API_AXIOS_BASE = axiosBase

export const api = axios.create({
  baseURL: axiosBase,
  // gt-estate-server is a serverless function that can take several seconds to cold-start
  // (Nest bootstrap + Prisma connecting to Atlas). Give it real room before failing.
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)