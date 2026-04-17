'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { api, resolveDashboardMediaUrl } from '@/lib/api'
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
  { value: 'other', label: 'Other' },
] as const

const PROPERTY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'coming_soon', label: 'Coming soon' },
] as const

type PropertyFormState = {
  title: string
  description: string
  price: string
  location: string
  marla: string
  type: string
  status: string
  featured: boolean
  sortOrder: string
  primaryImageUrl: string
  galleryUrls: string
}

const emptyForm: PropertyFormState = {
  title: '',
  description: '',
  price: '',
  location: '',
  marla: '',
  type: 'residential',
  status: 'available',
  featured: false,
  sortOrder: '0',
  primaryImageUrl: '',
  galleryUrls: '',
}

function propertyId(p: { _id?: string; id?: string }) {
  return p._id ?? p.id ?? ''
}

export default function PropertiesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState<PropertyFormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [primaryFile, setPrimaryFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const primaryInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [primaryObjectUrl, setPrimaryObjectUrl] = useState<string | null>(null)
  const [galleryObjectUrls, setGalleryObjectUrls] = useState<string[]>([])

  useEffect(() => {
    if (!primaryFile) {
      setPrimaryObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(primaryFile)
    setPrimaryObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [primaryFile])

  useEffect(() => {
    const urls = galleryFiles.map((f) => URL.createObjectURL(f))
    setGalleryObjectUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [galleryFiles])

  const primaryPreviewSrc = primaryObjectUrl || resolveDashboardMediaUrl(form.primaryImageUrl.trim())
  const primaryUrlDisplay = primaryFile
    ? `Pending upload: ${primaryFile.name}`
    : form.primaryImageUrl.trim() || '—'

  const galleryUrlLines = useMemo(
    () => form.galleryUrls.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
    [form.galleryUrls],
  )

  const { data: properties, refetch } = useQuery('properties', async () => {
    const response = await api.get('/properties')
    return response.data
  })

  const handleDelete = async (id: string) => {
    if (!id) return
    if (!confirm('Are you sure you want to delete this property?')) return
    try {
      await api.delete(`/properties/${id}`)
      toast.success('Property deleted successfully')
      refetch()
    } catch {
      toast.error('Failed to delete property')
    }
  }

  const resetFiles = () => {
    setPrimaryFile(null)
    setGalleryFiles([])
    if (primaryInputRef.current) primaryInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const startCreate = () => {
    setEditingProperty(null)
    setForm(emptyForm)
    resetFiles()
    setShowForm(true)
  }

  const startEdit = (property: Record<string, unknown>) => {
    setEditingProperty(property)
    const gallery = Array.isArray(property.gallery) ? (property.gallery as string[]) : []
    setForm({
      title: String(property.title ?? ''),
      description: String(property.description ?? ''),
      price: property.price != null && property.price !== '' ? String(property.price) : '',
      location: String(property.location ?? ''),
      marla: String(property.marla ?? ''),
      type: String(property.type ?? 'residential'),
      status: String(property.status ?? 'available'),
      featured: Boolean(property.featured),
      sortOrder: property.sortOrder != null ? String(property.sortOrder) : '0',
      primaryImageUrl: String(property.primaryImage ?? ''),
      galleryUrls: gallery.join('\n'),
    })
    resetFiles()
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const id = editingProperty ? propertyId(editingProperty as { _id?: string; id?: string }) : ''

      let primaryImage = form.primaryImageUrl.trim()
      if (primaryFile) {
        primaryImage = await uploadFileViaUploadApi(primaryFile)
      }

      const existingGalleryLines = form.galleryUrls
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      const uploadedGallery: string[] = []
      for (const file of galleryFiles) {
        uploadedGallery.push(await uploadFileViaUploadApi(file))
      }
      const galleryUrls = [...existingGalleryLines, ...uploadedGallery].join('\n')

      const priceTrim = form.price.trim()
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        marla: form.marla.trim(),
        type: form.type || 'residential',
        status: form.status || 'available',
        featured: form.featured,
        sortOrder: form.sortOrder.trim() === '' ? 0 : Number(form.sortOrder),
        price: priceTrim === '' ? null : Number(priceTrim),
        primaryImage,
        galleryUrls,
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
      const message = err instanceof Error ? err.message : 'Failed to save property'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const filteredProperties =
    properties?.filter((property: { title?: string; location?: string }) => {
      const t = (property.title ?? '').toLowerCase()
      const loc = (property.location ?? '').toLowerCase()
      const q = searchTerm.toLowerCase()
      return t.includes(q) || loc.includes(q)
    }) || []

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
        <Card>
          <CardHeader>
            <CardTitle>{editingProperty ? 'Edit property' : 'Add property'}</CardTitle>
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
                <div>
                  <Label htmlFor="primaryImageUrl">Primary image URL (optional)</Label>
                  <Input
                    id="primaryImageUrl"
                    value={form.primaryImageUrl}
                    onChange={(e) => setForm({ ...form, primaryImageUrl: e.target.value })}
                    placeholder="https://… or /uploads/properties/…"
                  />
                </div>
                <div>
                  <Label htmlFor="primaryFile">Or upload primary image</Label>
                  <Input
                    id="primaryFile"
                    ref={primaryInputRef}
                    type="file"
                    accept="image/*"
                    className="cursor-pointer"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      if (f) {
                        try {
                          assertImageFileWithinUploadLimit(f)
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'File too large')
                          e.target.value = ''
                          setPrimaryFile(null)
                          return
                        }
                      }
                      setPrimaryFile(f)
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Files are POSTed to your upload API first; the returned URL is sent to the estate API (
                    <code className="text-[11px]">NEXT_PUBLIC_UPLOAD_API_URL</code>). Max{' '}
                    {getMaxImageUploadLabel()} per file.
                  </p>
                </div>
                {(primaryPreviewSrc || primaryUrlDisplay !== '—') && (
                  <div className="md:col-span-2 rounded-lg border border-input bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Primary image preview</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {primaryPreviewSrc ? (
                        <div className="shrink-0 w-full sm:w-44 h-32 rounded-md overflow-hidden bg-gray-200 border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={primaryPreviewSrc}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs text-muted-foreground">URL</p>
                        <p className="text-xs break-all font-mono bg-background border rounded px-2 py-1.5 text-gray-800">
                          {primaryUrlDisplay}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <Label htmlFor="galleryUrls">Extra image URLs (one per line)</Label>
                  <textarea
                    id="galleryUrls"
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[88px]"
                    value={form.galleryUrls}
                    onChange={(e) => setForm({ ...form, galleryUrls: e.target.value })}
                    placeholder="https://example.com/plot-a.jpg"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="galleryFiles">Or upload gallery images</Label>
                  <Input
                    id="galleryFiles"
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="cursor-pointer"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : []
                      try {
                        for (const file of files) assertImageFileWithinUploadLimit(file)
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'File too large')
                        e.target.value = ''
                        setGalleryFiles([])
                        return
                      }
                      setGalleryFiles(files)
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Each file is uploaded via the same upload API. Max {getMaxImageUploadLabel()} per file.
                  </p>
                </div>
                {(galleryUrlLines.length > 0 || galleryFiles.length > 0) && (
                  <div className="md:col-span-2 rounded-lg border border-input bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Gallery preview</p>
                    <div className="flex flex-wrap gap-4">
                      {galleryUrlLines.map((u, i) => (
                        <div key={`url-${i}-${u.slice(0, 24)}`} className="w-[7.5rem]">
                          <div className="aspect-video rounded-md border border-gray-200 overflow-hidden bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveDashboardMediaUrl(u)}
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
                          <p className="text-[10px] mt-1 break-all font-mono text-gray-700 line-clamp-3" title={u}>
                            {u}
                          </p>
                        </div>
                      ))}
                      {galleryFiles.map((f, i) => (
                        <div key={`file-${i}-${f.name}`} className="w-[7.5rem]">
                          <div className="aspect-video rounded-md border border-gray-200 overflow-hidden bg-gray-100">
                            {galleryObjectUrls[i] ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={galleryObjectUrls[i]} alt="" className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <p className="text-[10px] mt-1 break-all text-gray-700 line-clamp-2" title={f.name}>
                            {f.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              <CardDescription>{filteredProperties.length} properties</CardDescription>
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property: Record<string, unknown>) => {
              const pid = propertyId(property as { _id?: string; id?: string })
              const img = resolveDashboardMediaUrl(String(property.primaryImage ?? ''))
              const rawPrimary = String(property.primaryImage ?? '')
              const priceVal = property.price
              const priceLabel =
                priceVal != null && priceVal !== ''
                  ? Number(priceVal).toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : null
              return (
                <div key={pid} className="bg-white border rounded-lg overflow-hidden shadow-sm">
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
                      <p className="text-[11px] font-mono text-gray-600 break-all line-clamp-2" title={rawPrimary}>
                        {rawPrimary}
                      </p>
                    </div>
                  ) : null}
                  <div className="p-4">
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
                    {priceLabel != null ? (
                      <p className="text-xl font-bold text-primary-600 mb-3">{priceLabel}</p>
                    ) : (
                      <p className="text-sm text-gray-400 mb-3">No price set</p>
                    )}
                    {property.featured ? (
                      <p className="text-xs font-medium text-primary-700 mb-3">Featured on site</p>
                    ) : null}
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        disabled={!img}
                        onClick={() => img && window.open(img, '_blank', 'noopener,noreferrer')}
                      >
                        <Eye className="h-4 w-4" />
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
                    </div>
                  </div>
                </div>
              )
            })}
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
