'use client'

import { FormEvent, useState } from 'react'
import { useQuery } from 'react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'

type PropertyFormState = {
  title: string
  description: string
  price: string
  location: string
  type: string
  bedrooms: string
  bathrooms: string
  area: string
  status: string
  featured: boolean
  imageUrl: string
}

const emptyForm: PropertyFormState = {
  title: '',
  description: '',
  price: '',
  location: '',
  type: '',
  bedrooms: '',
  bathrooms: '',
  area: '',
  status: 'available',
  featured: false,
  imageUrl: '',
}

export default function PropertiesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<any | null>(null)
  const [form, setForm] = useState<PropertyFormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const { data: properties, refetch } = useQuery('properties', async () => {
    const response = await api.get('/properties')
    return response.data
  })

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      try {
        await api.delete(`/properties/${id}`)
        toast.success('Property deleted successfully')
        refetch()
      } catch (error) {
        toast.error('Failed to delete property')
      }
    }
  }

  const startCreate = () => {
    setEditingProperty(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const startEdit = (property: any) => {
    setEditingProperty(property)
    setForm({
      title: property.title ?? '',
      description: property.description ?? '',
      price: property.price != null ? String(property.price) : '',
      location: property.location ?? '',
      type: property.type ?? '',
      bedrooms: property.bedrooms != null ? String(property.bedrooms) : '',
      bathrooms: property.bathrooms != null ? String(property.bathrooms) : '',
      area: property.area != null ? String(property.area) : '',
      status: property.status ?? 'available',
      featured: Boolean(property.featured),
      imageUrl: property.images?.[0]?.url ?? '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload: any = {
        title: form.title,
        description: form.description || undefined,
        price: form.price ? Number(form.price) : 0,
        location: form.location,
        type: form.type || 'apartment',
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        area: form.area ? Number(form.area) : undefined,
        status: form.status || 'available',
        featured: form.featured,
      }

      if (form.imageUrl) {
        payload.images = [
          {
            url: form.imageUrl,
            alt: form.title,
            isPrimary: true,
          },
        ]
      }

      if (editingProperty) {
        await api.patch(`/properties/${editingProperty.id}`, payload)
        toast.success('Property updated successfully')
      } else {
        await api.post('/properties', payload)
        toast.success('Property created successfully')
      }

      setShowForm(false)
      setEditingProperty(null)
      setForm(emptyForm)
      refetch()
    } catch (error) {
      toast.error('Failed to save property')
    } finally {
      setSaving(false)
    }
  }

  const filteredProperties =
    properties?.filter(
      (property: any) =>
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600">Manage your property portfolio</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {editingProperty ? 'Add New Property' : 'Add Property'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingProperty ? 'Edit Property' : 'Add Property'}</CardTitle>
            <CardDescription>
              {editingProperty
                ? 'Update the property details and save your changes.'
                : 'Create a new property by filling out the details below.'}
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
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Input
                    id="type"
                    placeholder="Apartment, Villa, etc."
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min={0}
                    value={form.bedrooms}
                    onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min={0}
                    value={form.bathrooms}
                    onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="area">Area (sq ft)</Label>
                  <Input
                    id="area"
                    type="number"
                    min={0}
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Input
                    id="status"
                    placeholder="available, sold, pending..."
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="imageUrl">Primary Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
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
                    setEditingProperty(null)
                    setForm(emptyForm)
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingProperty ? 'Save Changes' : 'Create Property'}
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
              <CardTitle>All Properties</CardTitle>
              <CardDescription>{filteredProperties.length} properties found</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search properties..."
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
            {filteredProperties.map((property: any) => (
              <div key={property.id} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                {property.images && property.images.length > 0 && (
                  <div className="aspect-w-16 aspect-h-9">
                    <img
                      src={property.images[0].url}
                      alt={property.title}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {property.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        property.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : property.status === 'sold'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {property.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{property.location}</p>
                  <p className="text-2xl font-bold text-primary-600 mb-3">
                    ${property.price.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{property.bedrooms} beds</span>
                    <span>{property.bathrooms} baths</span>
                    <span>{property.area} sq ft</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startEdit(property)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(property.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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