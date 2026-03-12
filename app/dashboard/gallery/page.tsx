'use client'

import { FormEvent, useState } from 'react'
import { useQuery } from 'react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit, Trash2, Star, Image as ImageIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

type GalleryFormState = {
  title: string
  description: string
  imageUrl: string
  category: string
  featured: boolean
}

const emptyGalleryForm: GalleryFormState = {
  title: '',
  description: '',
  imageUrl: '',
  category: '',
  featured: false,
}

export default function GalleryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [form, setForm] = useState<GalleryFormState>(emptyGalleryForm)
  const [saving, setSaving] = useState(false)
  
  const { data: gallery, refetch } = useQuery('gallery', async () => {
    const response = await api.get('/gallery')
    return response.data
  })

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this gallery item?')) {
      try {
        await api.delete(`/gallery/${id}`)
        toast.success('Gallery item deleted successfully')
        refetch()
      } catch (error) {
        toast.error('Failed to delete gallery item')
      }
    }
  }

  const handleToggleFeatured = async (id: string, featured: boolean) => {
    try {
      await api.patch(`/gallery/${id}`, { featured: !featured })
      toast.success(`Item ${!featured ? 'featured' : 'unfeatured'}`)
      refetch()
    } catch (error) {
      toast.error('Failed to update item status')
    }
  }

  const startCreate = () => {
    setEditingItem(null)
    setForm(emptyGalleryForm)
    setShowForm(true)
  }

  const startEdit = (item: any) => {
    setEditingItem(item)
    setForm({
      title: item.title ?? '',
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      category: item.category ?? '',
      featured: Boolean(item.featured),
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        imageUrl: form.imageUrl,
        category: form.category || 'general',
        featured: form.featured,
      }

      if (editingItem) {
        await api.patch(`/gallery/${editingItem.id}`, payload)
        toast.success('Gallery item updated successfully')
      } else {
        await api.post('/gallery', payload)
        toast.success('Gallery item created successfully')
      }

      setShowForm(false)
      setEditingItem(null)
      setForm(emptyGalleryForm)
      refetch()
    } catch (error) {
      toast.error('Failed to save gallery item')
    } finally {
      setSaving(false)
    }
  }

  const filteredGallery =
    gallery?.filter((item: any) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    required
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="flex items-center space-x-2 mt-6">
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
            {filteredGallery.map((item: any) => (
              <div key={item.id} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="flex space-x-1">
                      {item.featured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 capitalize">
                    {item.category}
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
                      onClick={() => handleToggleFeatured(item.id, item.featured)}
                      className={item.featured ? 'bg-yellow-50 text-yellow-700' : ''}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      {item.featured ? 'Featured' : 'Feature'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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