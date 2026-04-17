'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Star,
  Image as ImageIcon,
  Upload,
  RectangleVertical,
  RectangleHorizontal,
} from 'lucide-react'
import { api, resolveDashboardMediaUrl } from '@/lib/api'
import {
  assertImageFileWithinUploadLimit,
  getMaxImageUploadLabel,
  uploadGalleryImageToRemote,
} from '@/lib/gallery-remote-upload'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

type GalleryShape = 'portrait' | 'landscape'

type GalleryFormState = {
  title: string
  description: string
  imageUrl: string
  category: string
  featured: boolean
  shape: GalleryShape
}

const emptyGalleryForm: GalleryFormState = {
  title: '',
  description: '',
  imageUrl: '',
  category: '',
  featured: false,
  shape: 'landscape',
}

function itemShapeFromApi(item: { shape?: string }): GalleryShape {
  return item.shape === 'portrait' ? 'portrait' : 'landscape'
}

export default function GalleryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [form, setForm] = useState<GalleryFormState>(emptyGalleryForm)
  const [saving, setSaving] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingObjectUrl, setPendingObjectUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!pendingFile) {
      setPendingObjectUrl(null)
      return
    }
    const u = URL.createObjectURL(pendingFile)
    setPendingObjectUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [pendingFile])

  const imagePreviewSrc = pendingObjectUrl || resolveDashboardMediaUrl(form.imageUrl.trim())
  const imageUrlDisplay = pendingFile
    ? `Pending upload: ${pendingFile.name}`
    : form.imageUrl.trim() || '—'

  const { data: gallery, refetch } = useQuery('gallery', async () => {
    const response = await api.get('/gallery/admin/all')
    return response.data
  })

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this gallery item?')) {
      try {
        await api.delete(`/gallery/items/${id}`)
        toast.success('Gallery item deleted successfully')
        refetch()
      } catch (error) {
        toast.error('Failed to delete gallery item')
      }
    }
  }

  const handleToggleFeatured = async (id: string, published: boolean) => {
    try {
      await api.put(`/gallery/items/${id}`, { published: !published })
      toast.success(`Item ${!published ? 'featured' : 'unfeatured'}`)
      refetch()
    } catch (error) {
      toast.error('Failed to update item status')
    }
  }

  const startCreate = () => {
    setEditingItem(null)
    setForm(emptyGalleryForm)
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(true)
  }

  const startEdit = (item: any) => {
    setEditingItem(item)
    setForm({
      title: item.alt ?? item.title ?? '',
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      category: item.category ?? '',
      featured: Boolean(item.published ?? item.featured),
      shape: itemShapeFromApi(item),
    })
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const alt = form.description?.trim()
      ? `${form.title.trim()}\n${form.description.trim()}`
      : form.title.trim()
    const category = form.category.trim() || 'general'
    const published = form.featured

    try {
      if (pendingFile) {
        const imageUrl = await uploadGalleryImageToRemote(pendingFile)
        const itemId = editingItem?._id ?? editingItem?.id
        if (editingItem && itemId) {
          await api.put(`/gallery/items/${itemId}`, {
            alt,
            category,
            published,
            shape: form.shape,
            imageUrl,
          })
          toast.success('Gallery item updated successfully')
        } else {
          await api.post('/gallery', {
            alt,
            imageUrl,
            category,
            published,
            shape: form.shape,
          })
          toast.success('Gallery item created successfully')
        }
      } else {
        if (!editingItem && !form.imageUrl.trim()) {
          toast.error('Add an image file or an image URL')
          return
        }
        if (editingItem) {
          const payload: Record<string, string | boolean> = {
            alt,
            category,
            published,
            shape: form.shape,
          }
          if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim()
          await api.put(`/gallery/items/${editingItem._id ?? editingItem.id}`, payload)
          toast.success('Gallery item updated successfully')
        } else {
          await api.post('/gallery', {
            alt,
            imageUrl: form.imageUrl.trim(),
            category,
            published,
            shape: form.shape,
          })
          toast.success('Gallery item created successfully')
        }
      }

      setShowForm(false)
      setEditingItem(null)
      setForm(emptyGalleryForm)
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save gallery item'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const filteredGallery =
    gallery?.filter((item: any) => {
      const caption = String(item.alt ?? item.title ?? '')
      const matchesSearch =
        caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter

      return matchesSearch && matchesCategory
    }) || []

  const categories: string[] = [
    ...new Set<string>(gallery?.map((item: any) => String(item.category)) || []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gallery</h1>
          <p className="text-gray-600">Manage gallery images and media</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {editingItem ? 'Add New Image' : 'Add Image'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingItem ? 'Edit Gallery Item' : 'Add Gallery Item'}</CardTitle>
            <CardDescription>
              {editingItem
                ? 'Update the gallery item details and save your changes.'
                : 'Create a new gallery item by filling out the details below.'}
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
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="interior, exterior, project, etc."
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Image</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      id="gallery-image-file"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null
                        if (f) {
                          try {
                            assertImageFileWithinUploadLimit(f)
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'File too large')
                            e.target.value = ''
                            setPendingFile(null)
                            return
                          }
                        }
                        setPendingFile(f)
                        if (f) setForm((prev) => ({ ...prev, imageUrl: '' }))
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {pendingFile ? 'Change file' : 'Upload image'}
                    </Button>
                    {pendingFile && (
                      <span className="text-sm text-gray-600 truncate max-w-[200px]" title={pendingFile.name}>
                        {pendingFile.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Files POST to your upload API (<code className="text-[11px]">NEXT_PUBLIC_UPLOAD_API_URL</code>);
                    the returned URL is saved via the estate API. Max {getMaxImageUploadLabel()} per file. Or paste a
                    URL directly.
                  </p>
                  <Input
                    id="imageUrl"
                    value={form.imageUrl}
                    onChange={(e) => {
                      setForm({ ...form, imageUrl: e.target.value })
                      if (e.target.value) {
                        setPendingFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }
                    }}
                    disabled={Boolean(pendingFile)}
                    placeholder="https://example.com/image.jpg"
                  />
                  {(imagePreviewSrc || imageUrlDisplay !== '—') && (
                    <div className="rounded-lg border border-input bg-muted/30 p-3 mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        {imagePreviewSrc ? (
                          <div
                            className={`shrink-0 w-full overflow-hidden rounded-md border border-gray-200 bg-gray-100 ${
                              form.shape === 'portrait' ? 'max-w-[140px] aspect-[3/4]' : 'sm:w-56 aspect-video'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imagePreviewSrc}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src =
                                  'data:image/svg+xml,' +
                                  encodeURIComponent(
                                    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect fill="#e5e7eb" width="160" height="90"/><text x="80" y="50" text-anchor="middle" fill="#9ca3af" font-size="10">No preview</text></svg>',
                                  )
                              }}
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs text-muted-foreground">URL</p>
                          <p className="text-xs break-all font-mono bg-background border rounded px-2 py-1.5 text-gray-800">
                            {imageUrlDisplay}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Orientation</Label>
                  <p className="text-xs text-gray-500">
                    Controls how the image is framed on the public gallery page.
                  </p>
                  <div className="inline-flex rounded-lg border border-input p-1 bg-muted/30">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, shape: 'portrait' })}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        form.shape === 'portrait'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <RectangleVertical className="h-4 w-4" />
                      Portrait
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, shape: 'landscape' })}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        form.shape === 'landscape'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <RectangleHorizontal className="h-4 w-4" />
                      Landscape
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <input
                    id="featured"
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  <Label htmlFor="featured">Featured</Label>
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
                    setEditingItem(null)
                    setForm(emptyGalleryForm)
                    setPendingFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Gallery Item'}
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
              <CardTitle>All Gallery Items</CardTitle>
              <CardDescription>{filteredGallery.length} items found</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search gallery..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredGallery.map((item: any) => {
              const oid = item._id ?? item.id
              const thumbAspect =
                item.shape === 'portrait' ? 'aspect-[3/4]' : 'aspect-[16/9]'
              const thumbSrc = resolveDashboardMediaUrl(String(item.imageUrl ?? ''))
              const rawUrl = String(item.imageUrl ?? '')
              return (
              <div key={oid} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <div className={`relative w-full overflow-hidden bg-gray-100 ${thumbAspect}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc || rawUrl}
                    alt={(item.alt || item.title || '').split('\n')[0]}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                {rawUrl ? (
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/80">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Image URL</p>
                    <p className="text-[11px] font-mono text-gray-600 break-all line-clamp-2" title={rawUrl}>
                      {rawUrl}
                    </p>
                  </div>
                ) : null}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {(item.alt || item.title || 'Untitled').split('\n')[0]}
                    </h3>
                    <div className="flex space-x-1">
                      {(item.published ?? item.featured) && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1 capitalize">
                    {item.category}
                  </p>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
                    {itemShapeFromApi(item) === 'portrait' ? 'Portrait' : 'Landscape'}
                  </p>
                  
                  {item.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-400 mb-3">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleToggleFeatured(oid, Boolean(item.published ?? item.featured))
                      }
                      className={
                        (item.published ?? item.featured) ? 'bg-yellow-50 text-yellow-700' : ''
                      }
                    >
                      <Star className="h-4 w-4 mr-1" />
                      {(item.published ?? item.featured) ? 'Featured' : 'Feature'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDelete(oid)}
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
          
          {filteredGallery.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No gallery items found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}