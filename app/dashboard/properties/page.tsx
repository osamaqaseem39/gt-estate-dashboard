'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit, Trash2, Eye, X, ArrowUp, ArrowDown, Layers, Download } from 'lucide-react'
import { MediaListUpload } from '@/components/ui/media-list-upload'
import { FileUpload } from '@/components/ui/file-upload'
import type { MediaItem } from '@/components/crud/types'
import { api, resolveDashboardMediaUrl, downloadDashboardMedia } from '@/lib/api'
import {
  assertImageFileWithinUploadLimit,
  getMaxImageUploadLabel,
  uploadFileViaUploadApi,
} from '@/lib/gallery-remote-upload'
import { toast } from 'react-hot-toast'

/** Matches `server/models/Property.js` and website `FeaturedProperties` / `/projects`. */
const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'other', label: 'Other' },
] as const

const PROPERTY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'coming_soon', label: 'Coming soon' },
] as const

const DEVELOPMENT_STATUSES = [
  { value: 'on_ground', label: 'On ground (possession ready)' },
  { value: 'under_construction', label: 'Under construction' },
  { value: 'planned', label: 'Planned / launching' },
] as const

const DEVELOPMENT_STATUS_LABELS: Record<string, string> = {
  on_ground: 'On ground',
  under_construction: 'Under construction',
  planned: 'Planned',
}

type GalleryEntry = {
  url: string
  alt: string
  title: string
}

type FloorEntry = {
  _id?: string
  name: string
  area: string
  description: string
  /** Edited as one feature per line. */
  features: string
  images: MediaItem[]
}

const FLOOR_NAME_SUGGESTIONS = ['Basement', 'Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', 'Rooftop']

type PropertyFormState = {
  title: string
  slug: string
  description: string
  price: string
  location: string
  marla: string
  type: string
  status: string
  /** Empty = main development; otherwise the id of the main project this block belongs to. */
  parentId: string
  developmentStatus: string
  featured: boolean
  sortOrder: string
  primaryImageUrl: string
  gallery: GalleryEntry[]
  inventory: string
  paymentPlan: string
  floors: FloorEntry[]
}

const emptyForm: PropertyFormState = {
  title: '',
  slug: '',
  description: '',
  price: '',
  location: '',
  marla: '',
  type: 'residential',
  status: 'available',
  parentId: '',
  developmentStatus: '',
  featured: false,
  sortOrder: '0',
  primaryImageUrl: '',
  gallery: [],
  inventory: '[]',
  paymentPlan: JSON.stringify({ enabled: false, title: 'Payment Plan', rows: [] }, null, 2),
  floors: [],
}

function toFloorEntries(raw: unknown): FloorEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((f): f is Record<string, unknown> => Boolean(f) && typeof f === 'object')
    .map((f) => ({
      _id: typeof f._id === 'string' ? f._id : undefined,
      name: String(f.name ?? ''),
      area: String(f.area ?? ''),
      description: String(f.description ?? ''),
      features: Array.isArray(f.features) ? f.features.map(String).join('\n') : '',
      images: Array.isArray(f.images)
        ? f.images.map(normalizeGalleryEntry).filter((g): g is GalleryEntry => g !== null)
        : [],
    }))
}

/** Prefer the API's `{ error }` body over axios' generic "Request failed with status code …". */
function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { status?: number; data?: { error?: string; message?: string } } })?.response
  const detail = data?.data?.error || data?.data?.message
  if (detail) return detail
  if (data?.status === 413) return 'Request too large — remove some images or shorten the description.'
  return err instanceof Error ? err.message : fallback
}

/** Photos stored in the legacy `images[]` relation (isPrimary flag) rather than primaryImage/gallery. */
function legacyImages(property: Record<string, unknown>): { primary: string; others: GalleryEntry[] } {
  const images = Array.isArray(property.images)
    ? (property.images as Array<{ url?: string; alt?: string; titleTag?: string; isPrimary?: boolean }>).filter(
        (img) => img?.url,
      )
    : []
  const primary = images.find((img) => img.isPrimary) ?? images[0]
  return {
    primary: primary?.url ?? '',
    others: images
      .filter((img) => img !== primary)
      .map((img) => ({ url: String(img.url), alt: img.alt ?? '', title: img.titleTag ?? '' })),
  }
}

function propertyId(p: { _id?: string; id?: string }) {
  return p._id ?? p.id ?? ''
}

type PropertyRecord = Record<string, unknown>

function parentIdOf(p: PropertyRecord): string {
  return typeof p.parentId === 'string' ? p.parentId : ''
}

type PropertyGroup = { parent: PropertyRecord; blocks: PropertyRecord[] }

/** Main projects in API order, each followed by its blocks; blocks whose parent is missing stand alone. */
function groupByParent(all: PropertyRecord[], visible: PropertyRecord[]): PropertyGroup[] {
  const visibleIds = new Set(visible.map((p) => propertyId(p as { _id?: string; id?: string })))
  const byId = new Map(all.map((p) => [propertyId(p as { _id?: string; id?: string }), p]))
  const blocksByParent = new Map<string, PropertyRecord[]>()
  const groups: PropertyGroup[] = []

  for (const p of visible) {
    const pid = parentIdOf(p)
    if (pid && byId.has(pid)) {
      const list = blocksByParent.get(pid) ?? []
      list.push(p)
      blocksByParent.set(pid, list)
    }
  }

  for (const p of all) {
    const id = propertyId(p as { _id?: string; id?: string })
    const pid = parentIdOf(p)
    if (pid && byId.has(pid)) continue
    const blocks = (blocksByParent.get(id) ?? []).sort(
      (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    )
    // Keep a non-matching parent visible when one of its blocks matches the search.
    if (visibleIds.has(id) || blocks.length > 0) groups.push({ parent: p, blocks })
  }
  return groups
}

function normalizeGalleryEntry(item: unknown): GalleryEntry | null {
  if (item == null) return null
  if (typeof item === 'string') {
    const url = item.trim()
    return url ? { url, alt: '', title: '' } : null
  }
  if (typeof item === 'object') {
    const o = item as { url?: string; imageUrl?: string; alt?: string; title?: string }
    const url = String(o.url ?? o.imageUrl ?? '').trim()
    if (!url) return null
    return { url, alt: String(o.alt ?? ''), title: String(o.title ?? '') }
  }
  return null
}

function stringifyJsonField(value: unknown, fallback: string): string {
  if (value == null) return fallback
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return fallback
  }
}

function parseJsonField<T>(raw: string, fieldLabel: string, emptyDefault?: T): T {
  const trimmed = raw.trim()
  if (!trimmed) {
    if (emptyDefault !== undefined) return emptyDefault
    throw new Error(`${fieldLabel} is required`)
  }
  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(`${fieldLabel} must be valid JSON`)
  }
}

export default function PropertiesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState<PropertyFormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [quickAddUrl, setQuickAddUrl] = useState('')
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const formCardRef = useRef<HTMLDivElement>(null)

  const { data: properties, refetch } = useQuery('properties', async () => {
    const response = await api.get('/properties', { params: { scope: 'all' } })
    return response.data as PropertyRecord[]
  })

  const allProperties: PropertyRecord[] = Array.isArray(properties) ? properties : []
  const titleById = new Map(
    allProperties.map((p) => [propertyId(p as { _id?: string; id?: string }), String(p.title ?? '')]),
  )
  const editingId = editingProperty ? propertyId(editingProperty as { _id?: string; id?: string }) : ''
  const editingHasBlocks = Boolean(editingId) && allProperties.some((p) => parentIdOf(p) === editingId)
  const parentOptions = allProperties.filter(
    (p) => !parentIdOf(p) && propertyId(p as { _id?: string; id?: string }) !== editingId,
  )

  const handleDelete = async (id: string) => {
    if (!id) return
    const blockCount = allProperties.filter((p) => parentIdOf(p) === id).length
    const message = blockCount
      ? `This project has ${blockCount} block(s). Deleting it keeps the blocks as standalone projects. Continue?`
      : 'Are you sure you want to delete this property?'
    if (!confirm(message)) return
    try {
      await api.delete(`/properties/${id}`)
      toast.success('Property deleted successfully')
      refetch()
    } catch {
      toast.error('Failed to delete property')
    }
  }

  const resetFiles = () => {
    setQuickAddUrl('')
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const startCreate = () => {
    setEditingProperty(null)
    setForm(emptyForm)
    resetFiles()
    setShowForm(true)
  }

  const startCreateBlock = (parent: PropertyRecord) => {
    setEditingProperty(null)
    setForm({
      ...emptyForm,
      parentId: propertyId(parent as { _id?: string; id?: string }),
      location: String(parent.location ?? ''),
      type: String(parent.type ?? 'residential'),
    })
    resetFiles()
    setShowForm(true)
  }

  const startEdit = (property: Record<string, unknown>) => {
    setEditingProperty(property)
    const legacy = legacyImages(property)
    const savedGallery = Array.isArray(property.gallery)
      ? (property.gallery as unknown[]).map(normalizeGalleryEntry).filter((g): g is GalleryEntry => g !== null)
      : []
    // Older records keep photos in images[] only; surface them so they can be edited and re-saved.
    const gallery = savedGallery.length ? savedGallery : legacy.others
    setForm({
      title: String(property.title ?? ''),
      slug: String(property.slug ?? ''),
      description: String(property.description ?? ''),
      price: property.price != null && property.price !== '' ? String(property.price) : '',
      location: String(property.location ?? ''),
      marla: String(property.marla ?? ''),
      type: String(property.type ?? 'residential'),
      status: String(property.status ?? 'available'),
      parentId: parentIdOf(property),
      developmentStatus: String(property.developmentStatus ?? ''),
      featured: Boolean(property.featured),
      sortOrder: property.sortOrder != null ? String(property.sortOrder) : '0',
      primaryImageUrl: String(property.primaryImage || legacy.primary),
      gallery,
      inventory: stringifyJsonField(property.inventory, '[]'),
      paymentPlan: stringifyJsonField(
        property.paymentPlan,
        JSON.stringify({ enabled: false, title: 'Payment Plan', rows: [] }, null, 2),
      ),
      floors: toFloorEntries(property.floors),
    })
    resetFiles()
    setShowForm(true)
  }

  // The form renders above the property grid; bring it into view so edits aren't made off-screen.
  useEffect(() => {
    if (showForm) formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showForm, editingProperty])

  const addFloor = () => {
    setForm((prev) => ({
      ...prev,
      floors: [
        ...prev.floors,
        {
          name:
            FLOOR_NAME_SUGGESTIONS.slice(1).find((n) => !prev.floors.some((f) => f.name.trim() === n)) ??
            `Floor ${prev.floors.length + 1}`,
          area: '',
          description: '',
          features: '',
          images: [],
        },
      ],
    }))
  }

  const updateFloor = (index: number, patch: Partial<FloorEntry>) => {
    setForm((prev) => ({
      ...prev,
      floors: prev.floors.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }))
  }

  const moveFloor = (index: number, delta: number) => {
    setForm((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.floors.length) return prev
      const floors = [...prev.floors]
      ;[floors[index], floors[target]] = [floors[target], floors[index]]
      return { ...prev, floors }
    })
  }

  const removeFloor = (index: number) => {
    setForm((prev) => ({ ...prev, floors: prev.floors.filter((_, i) => i !== index) }))
  }

  const addGalleryEntry = (entry: GalleryEntry) => {
    setForm((prev) => ({ ...prev, gallery: [...prev.gallery, entry] }))
  }

  const updateGalleryEntry = (index: number, patch: Partial<GalleryEntry>) => {
    setForm((prev) => ({
      ...prev,
      gallery: prev.gallery.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    }))
  }

  const removeGalleryEntry = (index: number) => {
    setForm((prev) => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== index) }))
  }

  const handleQuickAddUrl = () => {
    const url = quickAddUrl.trim()
    if (!url) return
    addGalleryEntry({ url, alt: '', title: '' })
    setQuickAddUrl('')
  }

  const handleGalleryFilesSelected = async (files: File[]) => {
    try {
      for (const file of files) assertImageFileWithinUploadLimit(file)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'File too large')
      if (galleryInputRef.current) galleryInputRef.current.value = ''
      return
    }
    setGalleryUploading(true)
    try {
      for (const file of files) {
        const url = await uploadFileViaUploadApi(file)
        addGalleryEntry({ url, alt: '', title: '' })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload gallery image')
    } finally {
      setGalleryUploading(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const id = editingProperty ? propertyId(editingProperty as { _id?: string; id?: string }) : ''

      const primaryImage = form.primaryImageUrl.trim()

      const gallery = form.gallery
        .map((g) => ({ url: g.url.trim(), alt: g.alt.trim(), title: g.title.trim() }))
        .filter((g) => g.url)

      const priceTrim = form.price.trim()
      let inventory: unknown
      let paymentPlan: unknown
      try {
        inventory = parseJsonField(form.inventory, 'Inventory', [])
        paymentPlan = parseJsonField(form.paymentPlan, 'Payment plan', {
          enabled: false,
          title: 'Payment Plan',
          rows: [],
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Invalid JSON in inventory or payment plan')
        setSaving(false)
        return
      }

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim(),
        location: form.location.trim(),
        marla: form.marla.trim(),
        type: form.type || 'residential',
        status: form.status || 'available',
        parentId: form.parentId || null,
        developmentStatus: form.developmentStatus || null,
        featured: form.featured,
        sortOrder: form.sortOrder.trim() === '' ? 0 : Number(form.sortOrder),
        price: priceTrim === '' ? null : Number(priceTrim),
        primaryImage,
        gallery,
        inventory,
        paymentPlan,
        floors: form.floors
          .filter((f) => f.name.trim())
          .map((f) => ({
            ...(f._id && { _id: f._id }),
            name: f.name.trim(),
            area: f.area.trim(),
            description: f.description.trim(),
            features: f.features.split('\n').map((s) => s.trim()).filter(Boolean),
            images: f.images.filter((img) => img.url.trim()),
          })),
      }

      if (editingProperty && id) {
        await api.put(`/properties/${id}`, payload)
        toast.success('Property updated successfully')
      } else {
        await api.post('/properties', payload)
        toast.success('Property created successfully')
      }

      setShowForm(false)
      setEditingProperty(null)
      setForm(emptyForm)
      resetFiles()
      refetch()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save property'))
    } finally {
      setSaving(false)
    }
  }

  const filteredProperties = allProperties.filter((property) => {
    const t = String(property.title ?? '').toLowerCase()
    const loc = String(property.location ?? '').toLowerCase()
    const q = searchTerm.toLowerCase()
    return t.includes(q) || loc.includes(q)
  })

  const groups = groupByParent(allProperties, filteredProperties)
  const blockTotal = allProperties.filter((p) => parentIdOf(p) && titleById.has(parentIdOf(p))).length

  // Consecutive projects without blocks share one grid; a project with blocks gets its own section.
  const segments: Array<{ kind: 'grid'; items: PropertyRecord[] } | { kind: 'family'; group: PropertyGroup }> = []
  for (const group of groups) {
    if (group.blocks.length > 0) {
      segments.push({ kind: 'family', group })
      continue
    }
    const last = segments[segments.length - 1]
    if (last?.kind === 'grid') last.items.push(group.parent)
    else segments.push({ kind: 'grid', items: [group.parent] })
  }

  const renderCard = (property: PropertyRecord) => {
    const pid = propertyId(property as { _id?: string; id?: string })
    const rawPrimary = String(property.primaryImage || legacyImages(property).primary)
    const img = resolveDashboardMediaUrl(rawPrimary)
    const priceVal = property.price
    const priceLabel =
      priceVal != null && priceVal !== ''
        ? Number(priceVal).toLocaleString(undefined, { maximumFractionDigits: 0 })
        : null
    const parentTitle = titleById.get(parentIdOf(property))
    const isBlock = Boolean(parentTitle)
    const blockCount = isBlock ? 0 : allProperties.filter((p) => parentIdOf(p) === pid).length
    const devStatus = DEVELOPMENT_STATUS_LABELS[String(property.developmentStatus ?? '')]
    return (
      <div
        key={pid}
        className={`bg-white border rounded-lg overflow-hidden shadow-sm ${isBlock ? 'border-l-4 border-l-primary-400' : ''}`}
      >
        {img ? (
          <div className="relative w-full h-48 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={String(property.title ?? '')} className="w-full h-48 object-cover" />
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}
        {rawPrimary ? (
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/80">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Image URL</p>
            <button
              type="button"
              className="text-[11px] font-mono text-primary-700 break-all line-clamp-2 text-left underline-offset-2 hover:underline"
              title="Download image"
              onClick={async () => {
                try {
                  await downloadDashboardMedia(rawPrimary)
                } catch {
                  toast.error('Could not download image')
                }
              }}
            >
              {rawPrimary}
            </button>
          </div>
        ) : null}
        <div className="p-4">
          {isBlock ? (
            <p className="text-xs font-medium text-primary-700 mb-1">Block of {parentTitle}</p>
          ) : null}
          <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{String(property.title ?? '')}</h3>
            <span
              className={`shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
                property.status === 'available'
                  ? 'bg-green-100 text-green-800'
                  : property.status === 'sold'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {String(property.status ?? '')}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-1 line-clamp-1">{String(property.location ?? '')}</p>
          <p className="text-sm text-gray-500 mb-2">{String(property.marla ?? '')}</p>
          {devStatus || blockCount > 0 ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {devStatus ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-800">{devStatus}</span>
              ) : null}
              {blockCount > 0 ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                  {blockCount} block{blockCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          ) : null}
          {priceLabel != null ? (
            <p className="text-xl font-bold text-primary-600 mb-3">{priceLabel}</p>
          ) : (
            <p className="text-sm text-gray-400 mb-3">No price set</p>
          )}
          {property.featured ? <p className="text-xs font-medium text-primary-700 mb-3">Featured on site</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={!img}
              onClick={() => img && window.open(img, '_blank', 'noopener,noreferrer')}
              title="Open image"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={!rawPrimary}
              title="Download image"
              onClick={async () => {
                try {
                  await downloadDashboardMedia(rawPrimary)
                } catch {
                  toast.error('Could not download image')
                }
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={() => startEdit(property)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => handleDelete(pid)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {!isBlock ? (
              <Button size="sm" variant="outline" type="button" onClick={() => startCreateBlock(property)}>
                <Layers className="h-4 w-4 mr-1" />
                Add block
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties &amp; projects</h1>
          <p className="text-gray-600">
            Same records power the homepage &quot;Our projects&quot; section and the{' '}
            <span className="font-medium">/projects</span> page when marked featured.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add property
        </Button>
      </div>

      {showForm && (
        <Card ref={formCardRef} className="scroll-mt-20">
          <CardHeader>
            <CardTitle>
              {editingProperty
                ? form.parentId
                  ? 'Edit block'
                  : 'Edit property'
                : form.parentId
                  ? `Add block to ${titleById.get(form.parentId) || 'project'}`
                  : 'Add property'}
            </CardTitle>
            <CardDescription>
              Fields match the public site: title, location, and the marla line (green badge on cards). Use
              featured to show on the marketing site.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder="e.g. Sialkot — 5 Marla Residential"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="e.g. etihad-town-sialkot"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional URL slug for the project detail page.
                  </p>
                </div>
                <div>
                  <Label htmlFor="parentId">Parent project</Label>
                  <select
                    id="parentId"
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    value={form.parentId}
                    disabled={editingHasBlocks}
                    onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  >
                    <option value="">None — this is a main development</option>
                    {parentOptions.map((p) => {
                      const id = propertyId(p as { _id?: string; id?: string })
                      return (
                        <option key={id} value={id}>
                          {String(p.title ?? '')}
                        </option>
                      )
                    })}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {editingHasBlocks
                      ? 'This project has its own blocks, so it must stay a main development.'
                      : 'Pick a main project to make this a block / sub-project (e.g. Opal Block under New Metro City).'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="developmentStatus">Development status</Label>
                  <select
                    id="developmentStatus"
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.developmentStatus}
                    onChange={(e) => setForm({ ...form, developmentStatus: e.target.value })}
                  >
                    <option value="">Not specified</option>
                    {DEVELOPMENT_STATUSES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shown on the website so buyers know whether this block is on ground or still being built.
                  </p>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                    placeholder="e.g. Etihad Town Sialkot"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="marla">Marla / badge line</Label>
                  <Input
                    id="marla"
                    value={form.marla}
                    onChange={(e) => setForm({ ...form, marla: e.target.value })}
                    required
                    placeholder="e.g. 5 Marla · Residential"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Shown as the green label on project cards (website).
                  </p>
                </div>
                <div>
                  <Label htmlFor="type">Category</Label>
                  <select
                    id="type"
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {PROPERTY_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {PROPERTY_STATUSES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="price">Price (optional)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step="any"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="Leave empty if not shown on site"
                  />
                </div>
                <div>
                  <Label htmlFor="sortOrder">Sort order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first in lists.</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Primary image</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Main photo on project cards and the top of the detail page. Drop a new file to replace it
                    (uploads immediately), or paste an image URL. Click Save to apply.
                  </p>
                  <FileUpload
                    value={form.primaryImageUrl}
                    onChange={(url) => setForm((prev) => ({ ...prev, primaryImageUrl: url }))}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Gallery images</Label>
                  <p className="text-xs text-muted-foreground">
                    Each image can have its own Alt text (accessibility / SEO) and Title. Upload files or paste a
                    URL, then fill in Alt/Title per image below.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="cursor-pointer max-w-xs"
                      disabled={galleryUploading}
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : []
                        if (files.length) handleGalleryFilesSelected(files)
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {galleryUploading ? 'Uploading…' : `Max ${getMaxImageUploadLabel()} per file`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={quickAddUrl}
                      onChange={(e) => setQuickAddUrl(e.target.value)}
                      onBlur={handleQuickAddUrl}
                      placeholder="Or paste an image URL"
                      className="max-w-xs"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleQuickAddUrl}>
                      Add URL
                    </Button>
                  </div>

                  {form.gallery.length > 0 && (
                    <div className="space-y-3 mt-2">
                      {form.gallery.map((entry, i) => (
                        <div
                          key={`${entry.url}-${i}`}
                          className="flex flex-col sm:flex-row gap-3 rounded-lg border border-input bg-muted/30 p-3"
                        >
                          <div className="shrink-0 w-full sm:w-32 aspect-video rounded-md border border-gray-200 overflow-hidden bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveDashboardMediaUrl(entry.url)}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src =
                                  'data:image/svg+xml,' +
                                  encodeURIComponent(
                                    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="68"><rect fill="#e5e7eb" width="120" height="68"/><text x="60" y="38" text-anchor="middle" fill="#9ca3af" font-size="10">No preview</text></svg>',
                                  )
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <p
                              className="sm:col-span-2 text-[11px] break-all font-mono text-gray-600"
                              title={entry.url}
                            >
                              {entry.url}
                            </p>
                            <Input
                              value={entry.alt}
                              onChange={(e) => updateGalleryEntry(i, { alt: e.target.value })}
                              placeholder="Alt text"
                            />
                            <Input
                              value={entry.title}
                              onChange={(e) => updateGalleryEntry(i, { title: e.target.value })}
                              placeholder="Title"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGalleryEntry(i)}
                            className="shrink-0 self-start rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <input
                    id="featured"
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  <Label htmlFor="featured">Featured (shown on homepage &amp; /projects)</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-3 rounded-lg border border-input p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Label>Floor-by-floor layout</Label>
                    <p className="text-xs text-muted-foreground">
                      Add each floor (Ground Floor, 1st Floor, …) with its area, description, room/feature list and
                      images. Shown in this order on the project page.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addFloor}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add floor
                  </Button>
                </div>
                {form.floors.length === 0 && (
                  <p className="text-xs text-muted-foreground">No floors added.</p>
                )}
                {form.floors.map((floor, i) => (
                  <div key={floor._id ?? `new-${i}`} className="space-y-3 rounded-md border border-gray-200 bg-muted/20 p-3">
                    <div className="flex items-start gap-2">
                      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={`floor-name-${i}`}>Floor name</Label>
                          <Input
                            id={`floor-name-${i}`}
                            list="floor-name-suggestions"
                            value={floor.name}
                            onChange={(e) => updateFloor(i, { name: e.target.value })}
                            placeholder="Ground Floor"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`floor-area-${i}`}>Covered area (optional)</Label>
                          <Input
                            id={`floor-area-${i}`}
                            value={floor.area}
                            onChange={(e) => updateFloor(i, { area: e.target.value })}
                            placeholder="e.g. 850 sq ft"
                          />
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1 pt-6">
                        <Button type="button" variant="outline" size="sm" onClick={() => moveFloor(i, -1)} disabled={i === 0} aria-label="Move floor up">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => moveFloor(i, 1)} disabled={i === form.floors.length - 1} aria-label="Move floor down">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => removeFloor(i)} aria-label="Remove floor">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`floor-desc-${i}`}>Description</Label>
                        <textarea
                          id={`floor-desc-${i}`}
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          rows={4}
                          value={floor.description}
                          onChange={(e) => updateFloor(i, { description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`floor-features-${i}`}>Rooms / features (one per line)</Label>
                        <textarea
                          id={`floor-features-${i}`}
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          rows={4}
                          value={floor.features}
                          onChange={(e) => updateFloor(i, { features: e.target.value })}
                          placeholder={'Drawing room\nKitchen\n1 Bedroom with attached bath'}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Floor plan / images</Label>
                      <div className="mt-1">
                        <MediaListUpload kind="image" value={floor.images} onChange={(images) => updateFloor(i, { images: images.map((m) => ({ url: m.url, alt: m.alt ?? '', title: m.title ?? '' })) })} />
                      </div>
                    </div>
                  </div>
                ))}
                <datalist id="floor-name-suggestions">
                  {FLOOR_NAME_SUGGESTIONS.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="inventory">Inventory (JSON)</Label>
                <textarea
                  id="inventory"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={6}
                  value={form.inventory}
                  onChange={(e) => setForm({ ...form, inventory: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Array of {'{ category, label, size, price, status, notes }'}.
                </p>
              </div>
              <div>
                <Label htmlFor="paymentPlan">Payment plan (JSON)</Label>
                <textarea
                  id="paymentPlan"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={6}
                  value={form.paymentPlan}
                  onChange={(e) => setForm({ ...form, paymentPlan: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {'{ enabled, title, rows: [{ milestone, percentage, amount, dueOn, notes }] }'}
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingProperty(null)
                    setForm(emptyForm)
                    resetFiles()
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingProperty ? 'Save changes' : 'Create property'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All properties</CardTitle>
              <CardDescription>
                {allProperties.length - blockTotal} main projects · {blockTotal} blocks
                {searchTerm ? ` · ${filteredProperties.length} matching` : ''}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {segments.map((segment) =>
              segment.kind === 'grid' ? (
                <div
                  key={`grid-${propertyId(segment.items[0] as { _id?: string; id?: string })}`}
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {segment.items.map(renderCard)}
                </div>
              ) : (
                <section
                  key={`family-${propertyId(segment.group.parent as { _id?: string; id?: string })}`}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {renderCard(segment.group.parent)}
                  </div>
                  <div className="ml-2 sm:ml-6 pl-4 border-l-2 border-primary-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Blocks of {String(segment.group.parent.title ?? '')} ({segment.group.blocks.length})
                    </p>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {segment.group.blocks.map(renderCard)}
                    </div>
                  </div>
                </section>
              ),
            )}
          </div>
          {filteredProperties.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No properties found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
