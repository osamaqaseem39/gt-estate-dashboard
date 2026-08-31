'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { resolveDashboardMediaUrl } from '@/lib/api'
import {
  assertImageFileWithinUploadLimit,
  getMaxImageUploadLabel,
  uploadFileViaUploadApi,
} from '@/lib/gallery-remote-upload'

export interface FileUploadProps {
  /** Current image URL (already-uploaded or pasted). */
  value: string
  /** Called with the new URL once a file finishes uploading, or when the URL text input changes. */
  onChange: (url: string) => void
  /** Aspect ratio class applied to the preview box, e.g. "aspect-video" or "aspect-square". */
  previewAspect?: string
  accept?: Record<string, string[]>
  disabled?: boolean
}

/**
 * Drag-and-drop image upload, reusing the same upload API every dashboard page already posts to
 * (see lib/gallery-remote-upload.ts). Also accepts a pasted URL as a fallback, matching the
 * existing Gallery/Properties forms' UX.
 */
export function FileUpload({
  value,
  onChange,
  previewAspect = 'aspect-video',
  accept = { 'image/*': [] },
  disabled,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0]
      if (!file) return
      try {
        assertImageFileWithinUploadLimit(file)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'File too large')
        return
      }
      setUploading(true)
      try {
        const url = await uploadFileViaUploadApi(file)
        onChange(url)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
    disabled: disabled || uploading,
  })

  const previewSrc = resolveDashboardMediaUrl(value.trim())

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/30 p-4 text-center transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          (disabled || uploading) && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-xs text-muted-foreground">
          {uploading
            ? 'Uploading…'
            : isDragActive
              ? 'Drop the file here'
              : `Drag & drop, or click to upload (max ${getMaxImageUploadLabel()})`}
        </p>
      </div>

      {previewSrc && (
        <div className={cn('relative w-full max-w-[220px] overflow-hidden rounded-md border bg-gray-100', previewAspect)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste an image URL"
        disabled={disabled || uploading}
      />
    </div>
  )
}
