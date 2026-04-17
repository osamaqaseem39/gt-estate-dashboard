/**
 * File uploads (gallery, property images, etc.) POST multipart to this upload API; the GT Estate API stores the returned URL only.
 * Response shape: success + data.url (upload.php), or success: false + message.
 *
 * Endpoint: NEXT_PUBLIC_UPLOAD_API_URL, or NEXT_PUBLIC_GALLERY_UPLOAD_URL, or default below.
 * Form field: NEXT_PUBLIC_GALLERY_UPLOAD_FIELD or NEXT_PUBLIC_UPLOAD_API_FIELD (default "file").
 * Max size: NEXT_PUBLIC_MAX_IMAGE_UPLOAD_BYTES (bytes), default 5 MiB.
 */

const DEFAULT_ENDPOINT = 'https://gt.osamaqaseem.online/upload.php'
const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === '') return fallback
  const n = Number(raw.trim())
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function getMaxImageUploadBytes(): number {
  return parsePositiveInt(process.env.NEXT_PUBLIC_MAX_IMAGE_UPLOAD_BYTES, DEFAULT_MAX_IMAGE_BYTES)
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024)
    return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

/** Human-readable max for form hints, e.g. "5.0 MB". */
export function getMaxImageUploadLabel(): string {
  return formatSize(getMaxImageUploadBytes())
}

export function assertImageFileWithinUploadLimit(file: File): void {
  const max = getMaxImageUploadBytes()
  if (file.size > max) {
    throw new Error(`File is too large (${formatSize(file.size)}). Maximum is ${formatSize(max)}.`)
  }
}

export function getUploadApiEndpoint(): string {
  const raw =
    process.env.NEXT_PUBLIC_UPLOAD_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_GALLERY_UPLOAD_URL?.trim() ||
    DEFAULT_ENDPOINT
  return raw.replace(/\/$/, '')
}

/** @deprecated Use getUploadApiEndpoint — same value, kept for existing imports. */
export function getGalleryUploadEndpoint(): string {
  return getUploadApiEndpoint()
}

export function getUploadApiFieldName(): string {
  return (
    process.env.NEXT_PUBLIC_UPLOAD_API_FIELD?.trim() ||
    process.env.NEXT_PUBLIC_GALLERY_UPLOAD_FIELD?.trim() ||
    'file'
  )
}

/** @deprecated Use getUploadApiFieldName */
export function getGalleryUploadFieldName(): string {
  return getUploadApiFieldName()
}

function resolveMaybeRelativeUrl(url: string, uploadEndpoint: string): string {
  const t = url.trim()
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('//')) {
    try {
      return `${new URL(uploadEndpoint).protocol}${t}`
    } catch {
      return t
    }
  }
  if (t.startsWith('/')) {
    try {
      const u = new URL(uploadEndpoint)
      return `${u.origin}${t}`
    } catch {
      return t
    }
  }
  return t
}

function phpErrorMessage(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const o = parsed as Record<string, unknown>
  if (o.success === false && typeof o.message === 'string' && o.message.trim()) {
    return o.message.trim()
  }
  return null
}

function extractImageUrl(parsed: unknown, rawText: string): string | null {
  if (typeof parsed === 'string') {
    const t = parsed.trim().replace(/^["']|["']$/g, '')
    if (/^https?:\/\//i.test(t)) return t.split(/\r?\n/)[0].trim()
    return null
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>
    const nested = o.data
    const fromNested =
      nested && typeof nested === 'object' && !Array.isArray(nested)
        ? (nested as Record<string, unknown>).url
        : typeof nested === 'string'
          ? nested
          : null
    // Prefer upload.php-style { data: { url } }, then flat keys
    const candidates = [
      fromNested,
      o.url,
      o.link,
      o.file,
      o.imageUrl,
      o.image,
      o.location,
      o.path,
      o.src,
    ]
    for (const c of candidates) {
      if (typeof c === 'string' && /^https?:\/\//i.test(c.trim())) return c.trim()
    }
  }
  const line = rawText.trim().split(/\r?\n/)[0]?.replace(/^["']|["']$/g, '') ?? ''
  if (/^https?:\/\//i.test(line)) return line.trim()
  return null
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function uploadFileViaUploadApi(file: File): Promise<string> {
  assertImageFileWithinUploadLimit(file)
  const endpoint = getUploadApiEndpoint()
  const field = getUploadApiFieldName()
  const fd = new FormData()
  fd.append(field, file)

  const res = await fetch(endpoint, {
    method: 'POST',
    body: fd,
  })

  const text = await res.text()
  const parsed = parseJsonSafe(text)

  if (!res.ok) {
    const phpMsg = phpErrorMessage(parsed)
    throw new Error(phpMsg || (typeof parsed === 'string' ? parsed.slice(0, 240) : text.slice(0, 240)) || `Upload failed (HTTP ${res.status})`)
  }

  const failMsg = phpErrorMessage(parsed)
  if (failMsg) {
    throw new Error(failMsg)
  }

  const raw = extractImageUrl(parsed, text)
  if (!raw) {
    throw new Error(
      'Upload response did not contain a usable image URL. Expected JSON with data.url (or a plain https URL).',
    )
  }
  return resolveMaybeRelativeUrl(raw, endpoint)
}

/** Same as uploadFileViaUploadApi — gallery UI historically used this name. */
export async function uploadGalleryImageToRemote(file: File): Promise<string> {
  return uploadFileViaUploadApi(file)
}
