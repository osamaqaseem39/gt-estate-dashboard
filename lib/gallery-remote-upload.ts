/**
 * Gallery images are sent to a standalone PHP uploader; the API stores the returned URL only.
 * Matches upload.php shape: success + data.url, or success: false + message.
 * Override with NEXT_PUBLIC_GALLERY_UPLOAD_URL. Optional NEXT_PUBLIC_GALLERY_UPLOAD_FIELD (default "file").
 */

const DEFAULT_ENDPOINT = 'https://gt.osamaqaseem.online/upload.php'

export function getGalleryUploadEndpoint(): string {
  const raw = process.env.NEXT_PUBLIC_GALLERY_UPLOAD_URL?.trim() || DEFAULT_ENDPOINT
  return raw.replace(/\/$/, '')
}

export function getGalleryUploadFieldName(): string {
  return process.env.NEXT_PUBLIC_GALLERY_UPLOAD_FIELD?.trim() || 'file'
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

export async function uploadGalleryImageToRemote(file: File): Promise<string> {
  const endpoint = getGalleryUploadEndpoint()
  const field = getGalleryUploadFieldName()
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
