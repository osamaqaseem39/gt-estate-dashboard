'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { ArrowDown, ArrowUp, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resolveDashboardMediaUrl } from '@/lib/api'
import {
  assertImageFileWithinUploadLimit,
  getMaxImageUploadLabel,
  getMaxVideoUploadLabel,
  uploadFileViaUploadApi,
} from '@/lib/gallery-remote-upload'
import type { MediaItem } from '@/components/crud/types'

export interface MediaListUploadProps {
  value: MediaItem[]
  onChange: (items: MediaItem[]) => void
  kind: 'image' | 'video'
}

/**
 * Multi-file image/video list: drop several files at once (each is POSTed to the upload API),
 * or add a URL (e.g. a YouTube link for videos). Items can be captioned, reordered, and removed.
 */
export function MediaListUpload({ value, onChange, kind }: MediaListUploadProps) {
  const items = Array.isArray(value) ? value : []
  const [uploading, setUploading] = useState(0)
  const [urlDraft, setUrlDraft] = useState('')
  const isVideo = kind === 'video'

  const onDrop = useCallback(
    async (files: File[]) => {
      const valid = files.filter((file) => {
        try {
          assertImageFileWithinUploadLimit(file)
          return true
        } catch (err) {
          toast.error(`${file.name}: ${err instanceof Error ? err.message : 'File too large'}`)
          return false
        }
      })
      if (!valid.length) return
      setUploading(valid.length)
      const uploaded: MediaItem[] = []
      for (const file of valid) {
        try {
          uploaded.push({ url: await uploadFileViaUploadApi(file), alt: '', title: '' })
        } catch (err) {
          toast.error(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`)
        } finally {
          setUploading((n) => n - 1)
        }
      }
      if (uploaded.length) onChange([...items, ...uploaded])
    },
    [items, onChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: isVideo ? { 'video/*': [] } : { 'image/*': [] },
    multiple: true,
    disabled: uploading > 0,
  })

  const update = (index: number, patch: Partial<MediaItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const addUrl = () => {
    const url = urlDraft.trim()
    if (!url) return
    onChange([...items, { url, alt: '', title: '' }])
    setUrlDraft('')
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/30 p-4 text-center transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          uploading > 0 && 'pointer-events-none opacity-60',
        )}
      >
        <input {...getInputProps()} />
        {uploading > 0 ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-xs text-muted-foreground">
          {uploading > 0
            ? `Uploading ${uploading} file${uploading === 1 ? '' : 's'}…`
            : `Drag & drop ${isVideo ? 'videos' : 'images'} (multiple allowed), or click to select — max ${
                isVideo ? getMaxVideoUploadLabel() : getMaxImageUploadLabel()
              } each`}
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addUrl()
            }
          }}
          placeholder={isVideo ? 'Or paste a video URL (YouTube or .mp4)' : 'Or paste an image URL'}
        />
        <Button type="button" variant="outline" onClick={addUrl}>
          Add
        </Button>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={`${item.url}-${i}`} className="flex gap-3 rounded-md border border-input bg-muted/20 p-2">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded bg-gray-100">
                {isVideo ? (
                  /\.(mp4|webm|ogg|mov)(\?|$)/i.test(item.url) ? (
                    <video src={resolveDashboardMediaUrl(item.url)} className="h-full w-full object-cover" muted />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-gray-500">Video link</div>
                  )
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveDashboardMediaUrl(item.url)} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="grid min-w-0 flex-1 gap-1.5">
                <p className="truncate font-mono text-[11px] text-gray-500" title={item.url}>
                  {item.url}
                </p>
                <div className={cn('grid gap-1.5', !isVideo && 'sm:grid-cols-2')}>
                  {!isVideo && (
                    <Input
                      value={item.alt ?? ''}
                      onChange={(e) => update(i, { alt: e.target.value })}
                      placeholder="Alt text"
                      className="h-8"
                    />
                  )}
                  <Input
                    value={item.title ?? ''}
                    onChange={(e) => update(i, { title: e.target.value })}
                    placeholder="Caption / title"
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30" aria-label="Move up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30" aria-label="Move down">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
