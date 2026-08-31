'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit, Trash2, Star, Users, Upload } from 'lucide-react'
import { api, resolveDashboardMediaUrl } from '@/lib/api'
import {
  assertImageFileWithinUploadLimit,
  getMaxImageUploadLabel,
  uploadFileViaUploadApi,
} from '@/lib/gallery-remote-upload'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const MAX_BIO_WORDS = 50

type TeamFormState = {
  name: string
  designation: string
  imageUrl: string
  bio: string
  published: boolean
  sortOrder: string
}

const emptyTeamForm: TeamFormState = {
  name: '',
  designation: '',
  imageUrl: '',
  bio: '',
  published: true,
  sortOrder: '',
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export default function TeamPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [form, setForm] = useState<TeamFormState>(emptyTeamForm)
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

  const bioWordCount = countWords(form.bio)

  const { data: team, refetch } = useQuery('team', async () => {
    const response = await api.get('/team/admin/all')
    return response.data
  })

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this team member?')) {
      try {
        await api.delete(`/team/items/${id}`)
        toast.success('Team member deleted successfully')
        refetch()
      } catch (error) {
        toast.error('Failed to delete team member')
      }
    }
  }

  const handleTogglePublished = async (id: string, published: boolean) => {
    try {
      await api.put(`/team/items/${id}`, { published: !published })
      toast.success(`Member ${!published ? 'published' : 'unpublished'}`)
      refetch()
    } catch (error) {
      toast.error('Failed to update member status')
    }
  }

  const startCreate = () => {
    setEditingItem(null)
    setForm(emptyTeamForm)
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(true)
  }

  const startEdit = (item: any) => {
    setEditingItem(item)
    setForm({
      name: item.name ?? '',
      designation: item.designation ?? '',
      imageUrl: item.imageUrl ?? '',
      bio: item.bio ?? '',
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
    const designation = form.designation.trim()
    const bio = form.bio.trim()
    const published = form.published
    const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0

    try {
      let imageUrl = form.imageUrl.trim()
      if (pendingFile) {
        imageUrl = await uploadFileViaUploadApi(pendingFile)
      }

      const itemId = editingItem?._id ?? editingItem?.id

      if (editingItem && itemId) {
        const payload: Record<string, string | boolean | number> = {
          name,
          designation,
          bio,
          published,
          sortOrder,
        }
        if (imageUrl) payload.imageUrl = imageUrl
        await api.put(`/team/items/${itemId}`, payload)
        toast.success('Team member updated successfully')
      } else {
        await api.post('/team', {
          name,
          designation,
          bio,
          published,
          sortOrder,
          imageUrl,
        })
        toast.success('Team member created successfully')
      }

      setShowForm(false)
      setEditingItem(null)
      setForm(emptyTeamForm)
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save team member'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const filteredTeam =
    team?.filter((item: any) => {
      const name = String(item.name ?? '')
      const designation = String(item.designation ?? '')
      const term = searchTerm.toLowerCase()
      return name.toLowerCase().includes(term) || designation.toLowerCase().includes(term)
    }) || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600">Manage team members shown on the public site</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {editingItem ? 'Add New Member' : 'Add Member'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingItem ? 'Edit Team Member' : 'Add Team Member'}</CardTitle>
            <CardDescription>
              {editingItem
                ? 'Update the team member details and save your changes.'
                : 'Create a new team member by filling out the details below.'}
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
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    placeholder="Operations & Business Growth"
                    required
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Portrait Image</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      id="team-image-file"
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
                    placeholder="https://example.com/portrait.jpg"
                  />
                  {(imagePreviewSrc || imageUrlDisplay !== '—') && (
                    <div className="rounded-lg border border-input bg-muted/30 p-3 mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        {imagePreviewSrc ? (
                          <div className="shrink-0 w-full max-w-[140px] aspect-[3/4] overflow-hidden rounded-md border border-gray-200 bg-gray-100">
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
                <div className="flex items-center space-x-2">
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
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="A short paragraph describing this team member (aim for ~50 words)."
                />
                <p
                  className={`mt-1 text-xs ${
                    bioWordCount > MAX_BIO_WORDS ? 'text-amber-600 font-medium' : 'text-gray-500'
                  }`}
                >
                  {bioWordCount} / {MAX_BIO_WORDS} words
                  {bioWordCount > MAX_BIO_WORDS ? ' — consider trimming for readability' : ''}
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingItem(null)
                    setForm(emptyTeamForm)
                    setPendingFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Team Member'}
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
              <CardTitle>All Team Members</CardTitle>
              <CardDescription>{filteredTeam.length} members found</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTeam.map((item: any) => {
              const oid = item._id ?? item.id
              const thumbSrc = resolveDashboardMediaUrl(String(item.imageUrl ?? ''))
              return (
                <div key={oid} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                  <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbSrc || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200"><rect fill="#e5e7eb" width="160" height="200"/></svg>')}
                      alt={item.name || ''}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                        {item.name || 'Unnamed'}
                      </h3>
                      <div className="flex space-x-1">
                        {item.published && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">{item.designation}</p>

                    {item.bio && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-3">{item.bio}</p>
                    )}

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
                        className={item.published ? 'bg-yellow-50 text-yellow-700' : ''}
                      >
                        <Star className="h-4 w-4 mr-1" />
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

          {filteredTeam.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No team members found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
