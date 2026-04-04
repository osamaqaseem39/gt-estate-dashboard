'use client'

import { FormEvent, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { api, API_AXIOS_BASE, API_SERVER_ORIGIN } from '@/lib/api'
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

function resolvePropertyImageUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${API_SERVER_ORIGIN}${path}`
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

  const buildJsonPayload = () => {
    const priceTrim = form.price.trim()
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      marla: form.marla.trim(),
      type: form.type || 'residential',
      status: form.status || 'available',
      featured: form.featured,
      sortOrder: form.sortOrder.trim() === '' ? 0 : Number(form.sortOrder),
      price: priceTrim === '' ? null : Number(priceTrim),
      primaryImage: form.primaryImageUrl.trim(),
      galleryUrls: form.galleryUrls,
    }
  }

  const appendFormFields = (fd: FormData) => {
    const p = buildJsonPayload()
    fd.append('title', p.title)
    fd.append('description', p.description)
    fd.append('location', p.location)
    fd.append('marla', p.marla)
    fd.append('type', p.type)
    fd.append('status', p.status)
    fd.append('featured', p.featured ? 'true' : 'false')
    fd.append('sortOrder', String(p.sortOrder))
    if (p.price != null && !Number.isNaN(p.price)) {
      fd.append('price', String(p.price))
    }
    if (p.primaryImage && !primaryFile) {
      fd.append('primaryImage', p.primaryImage)
    }
    if (form.galleryUrls.trim()) {
      fd.append('galleryUrls', form.galleryUrls)
    }
    if (primaryFile) {
      fd.append('primaryImage', primaryFile)
    }
    galleryFiles.forEach((file) => fd.append('gallery', file))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const hasFiles = Boolean(primaryFile || galleryFiles.length)
      const id = editingProperty ? propertyId(editingProperty as { _id?: string; id?: string }) : ''

      if (hasFiles) {
        const fd = new FormData()
        appendFormFields(fd)
        const url = editingProperty
          ? `${API_AXIOS_BASE}/properties/${id}`
          : `${API_AXIOS_BASE}/properties`
        const res = await fetch(url, {
          method: editingProperty ? 'PUT' : 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err as { error?: string }).error || res.statusText)
        }
        toast.success(editingProperty ? 'Property updated successfully' : 'Property created successfully')
      } else {
        const payload = buildJsonPayload()
        if (editingProperty && id) {
          await api.put(`/properties/${id}`, payload)
          toast.success('Property updated successfully')
        } else {
          await api.post('/properties', payload)
          toast.success('Property created successfully')
        }
      }

      setShowForm(false)
      setEditingProperty(null)
      setForm(emptyForm)
      resetFiles()
      refetch()
    } catch {
      toast.error('Failed to save property')
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
                    onChange={(e) => setPrimaryFile(e.target.files?.[0] ?? null)}
                  />
                </div>
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
                    onChange={(e) => setGalleryFiles(e.target.files ? Array.from(e.target.files) : [])}
                  />
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
              const img = resolvePropertyImageUrl(String(property.primaryImage ?? ''))
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
