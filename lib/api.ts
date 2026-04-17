import axios from 'axios'

/** Server origin (no `/api`); matches `NEXT_PUBLIC_API_URL` after normalizing. */
const DEFAULT_ORIGIN = 'https://gt-estate-server-zhly.vercel.app'

function resolveApiBase(): { axiosBase: string; serverOrigin: string } {
  const trimmed = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_ORIGIN).replace(/\/$/, '')
  if (trimmed.toLowerCase().endsWith('/api')) {
    return {
      axiosBase: trimmed,
      serverOrigin: trimmed.replace(/\/api$/i, '') || trimmed,
    }
  }
  return {
    axiosBase: `${trimmed}/api`,
    serverOrigin: trimmed,
  }
}

const { axiosBase, serverOrigin } = resolveApiBase()

/** Use in user-facing copy (e.g. “backend running at …”). */
export const API_SERVER_ORIGIN = serverOrigin

/** Absolute URL for images stored as `/uploads/...` or full https URLs (dashboard previews & lists). */
export function resolveDashboardMediaUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return ''
  const t = pathOrUrl.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  const path = t.startsWith('/') ? t : `/${t}`
  return `${serverOrigin}${path}`
}

/** Same base URL as the axios client (`…/api`). Use with `fetch` + FormData so the browser sets multipart boundaries. */
export const API_AXIOS_BASE = axiosBase

export const api = axios.create({
  baseURL: axiosBase,
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