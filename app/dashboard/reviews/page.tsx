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
  MessageSquare,
  Upload,
} from 'lucide-react'
import { api, resolveDashboardMediaUrl } from '@/lib/api'
import {
  assertImageFileWithinUploadLimit,
  getMaxImageUploadLabel,
  uploadFileViaUploadApi,
} from '@/lib/gallery-remote-upload'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

type ReviewFormState = {
  name: string
  role: string
  avatarUrl: string
  rating: number
  text: string
  published: boolean
  sortOrder: string
}

const emptyReviewForm: ReviewFormState = {
  name: '',
  role: '',
  avatarUrl: '',
  rating: 5,
  text: '',
  published: true,
  sortOrder: '',
}

export default function ReviewsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [form, setForm] = useState<ReviewFormState>(emptyReviewForm)
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

  const avatarPreviewSrc = pendingObjectUrl || resolveDashboardMediaUrl(form.avatarUrl.trim())
  const avatarUrlDisplay = pendingFile
    ? `Pending upload: ${pendingFile.name}`
    : form.avatarUrl.trim() || '—'

  const { data: reviews, refetch } = useQuery('reviews', async () => {
    const response = await api.get('/reviews/admin/all')
    return response.data
  })

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      try {
        await api.delete(`/reviews/items/${id}`)
        toast.success('Review deleted successfully')
        refetch()
      } catch (error) {
        toast.error('Failed to delete review')
      }
    }
  }

  const handleTogglePublished = async (id: string, published: boolean) => {
    try {
      await api.put(`/reviews/items/${id}`, { published: !published })
      toast.success(`Review ${!published ? 'published' : 'unpublished'}`)
      refetch()
    } catch (error) {
      toast.error('Failed to update review status')
    }
  }

  const startCreate = () => {
    setEditingItem(null)
    setForm(emptyReviewForm)
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(true)
  }

  const startEdit = (item: any) => {
    setEditingItem(item)
    setForm({
      name: item.name ?? '',
      role: item.role ?? '',
      avatarUrl: item.avatarUrl ?? '',
      rating: Number(item.rating ?? 5),
      text: item.text ?? '',
      published: Boolean(item.published),
      sortOrder: item.sortOrder != null ? String(item.sortOrder) : '',
    })
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const name = form.name.trim()
    const role = form.role.trim()
    const text = form.text.trim()
    const rating = form.rating
    const published = form.published
    const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0

    if (!name) {
      toast.error('Name is required')
      setSaving(false)
      return
    }
    if (!text) {
      toast.error('Review text is required')
      setSaving(false)
      return
    }

    try {
      let avatarUrl = form.avatarUrl.trim()
      if (pendingFile) {
        avatarUrl = await uploadFileViaUploadApi(pendingFile)
      }

      const payload: Record<string, string | number | boolean> = {
        name,
        role,
        rating,
        text,
        published,
        sortOrder,
      }
      if (avatarUrl) payload.avatarUrl = avatarUrl

      if (editingItem) {
        await api.put(`/reviews/items/${editingItem._id ?? editingItem.id}`, payload)
        toast.success('Review updated successfully')
      } else {
        await api.post('/reviews', payload)
        toast.success('Review created successfully')
      }

      setShowForm(false)
      setEditingItem(null)
      setForm(emptyReviewForm)
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save review'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const filteredReviews =
    reviews?.filter((item: any) => {
      const haystack = `${item.name ?? ''} ${item.role ?? ''} ${item.text ?? ''}`.toLowerCase()
      return haystack.includes(searchTerm.toLowerCase())
    }) || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-600">Manage client testimonials shown on the website</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Review
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingItem ? 'Edit Review' : 'Add Review'}</CardTitle>
            <CardDescription>
              {editingItem
                ? 'Update the review details and save your changes.'
                : 'Create a new client review by filling out the details below.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Investor, Homeowner, etc."
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Avatar</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      id="review-avatar-file"
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
                        if (f) setForm((prev) => ({ ...prev, avatarUrl: '' }))
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {pendingFile ? 'Change file' : 'Upload avatar'}
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
                    id="avatarUrl"
                    value={form.avatarUrl}
                    onChange={(e) => {
                      setForm({ ...form, avatarUrl: e.target.value })
                      if (e.target.value) {
                        setPendingFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }
                    }}
                    disabled={Boolean(pendingFile)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  {(avatarPreviewSrc || avatarUrlDisplay !== '—') && (
                    <div className="rounded-lg border border-input bg-muted/30 p-3 mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        {avatarPreviewSrc ? (
                          <div className="shrink-0 h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={avatarPreviewSrc}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src =
                                  'data:image/svg+xml,' +
                                  encodeURIComponent(
                                    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="#e5e7eb" width="64" height="64"/><text x="32" y="36" text-anchor="middle" fill="#9ca3af" font-size="9">No image</text></svg>',
                                  )
                              }}
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs text-muted-foreground">URL</p>
                          <p className="text-xs break-all font-mono bg-background border rounded px-2 py-1.5 text-gray-800">
                            {avatarUrlDisplay}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <select
                    id="rating"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} star{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <input
                    id="published"
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  <Label htmlFor="published">Published</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="text">Review Text</Label>
                <textarea
                  id="text"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={4}
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingItem(null)
                    setForm(emptyReviewForm)
                    setPendingFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Review'}
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
              <CardTitle>All Reviews</CardTitle>
              <CardDescription>{filteredReviews.length} reviews found</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredReviews.map((item: any) => {
              const oid = item._id ?? item.id
              const avatarSrc = resolveDashboardMediaUrl(String(item.avatarUrl ?? ''))
              return (
                <div key={oid} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                        {avatarSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarSrc} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                            {String(item.name ?? '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                          {item.name || 'Unnamed'}
                        </h3>
                        {item.role && (
                          <p className="text-xs text-gray-500 line-clamp-1">{item.role}</p>
                        )}
                      </div>
                      {item.published && (
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">
                          Published
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className="h-4 w-4"
                          style={{
                            color: '#fabb22',
                            fill: i <= Number(item.rating ?? 0) ? '#fabb22' : 'transparent',
                            stroke: '#fabb22',
                          }}
                        />
                      ))}
                    </div>

                    <p className="text-sm text-gray-500 mb-3 line-clamp-3">{item.text}</p>

                    <p className="text-xs text-gray-400 mb-3">
                      {item.createdAt
                        ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
                        : ''}
                    </p>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePublished(oid, Boolean(item.published))}
                        className={item.published ? 'bg-green-50 text-green-700' : ''}
                      >
                        {item.published ? 'Published' : 'Publish'}
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

          {filteredReviews.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reviews found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
