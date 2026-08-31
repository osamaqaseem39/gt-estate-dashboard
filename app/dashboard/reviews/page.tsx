'use client'

import Image from 'next/image'
import { Star } from 'lucide-react'
import { api, resolveDashboardMediaUrl } from '@/lib/api'
import { EntityListPage } from '@/components/crud/EntityListPage'
import type { EntityColumn, EntityField, EntityFormValues } from '@/components/crud/types'

interface Review {
  id: string
  name: string
  role?: string
  image?: string
  rating: number
  text: string
  published: boolean
  sortOrder: number
}

const fields: EntityField[] = [
  { name: 'name', label: 'Reviewer name', type: 'text', required: true },
  { name: 'role', label: 'Role / title', type: 'text', placeholder: 'e.g. Investor' },
  { name: 'image', label: 'Profile picture', type: 'image' },
  { name: 'rating', label: 'Rating (1-5)', type: 'number', placeholder: '5' },
  { name: 'text', label: 'Review text', type: 'textarea', required: true, colSpan: 2 },
  { name: 'sortOrder', label: 'Sort order', type: 'number', placeholder: '0' },
  { name: 'published', label: 'Published', type: 'checkbox' },
]

const columns: EntityColumn<Review>[] = [
  {
    header: 'Photo',
    render: (row) =>
      row.image ? (
        <Image
          src={resolveDashboardMediaUrl(row.image)}
          alt={row.name}
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-gray-100" />
      ),
  },
  { header: 'Name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
  { header: 'Role', render: (row) => row.role || '—' },
  {
    header: 'Rating',
    render: (row) => (
      <span className="flex items-center gap-1 text-amber-500">
        {row.rating} <Star className="h-3.5 w-3.5 fill-amber-500" />
      </span>
    ),
  },
  { header: 'Text', render: (row) => <span className="line-clamp-2 max-w-xs text-gray-600">{row.text}</span> },
  {
    header: 'Status',
    render: (row) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          row.published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {row.published ? 'Published' : 'Draft'}
      </span>
    ),
  },
]

function toFormDefaults(row: Review | null): EntityFormValues {
  return {
    name: row?.name ?? '',
    role: row?.role ?? '',
    image: row?.image ?? '',
    rating: row ? String(row.rating) : '5',
    text: row?.text ?? '',
    sortOrder: row ? String(row.sortOrder) : '0',
    published: row?.published ?? true,
  }
}

function toPayload(values: EntityFormValues) {
  return {
    name: values.name as string,
    role: (values.role as string) || undefined,
    image: (values.image as string) || undefined,
    rating: Number(values.rating) || 5,
    text: values.text as string,
    sortOrder: Number(values.sortOrder) || 0,
    published: Boolean(values.published),
  }
}

export default function ReviewsPage() {
  return (
    <EntityListPage<Review>
      title="Reviews"
      description="Manage the customer reviews shown on the homepage."
      queryKey="reviews"
      fetchList={async () => (await api.get('/reviews')).data}
      columns={columns}
      getId={(row) => row.id}
      fields={fields}
      getFormDefaults={toFormDefaults}
      onCreate={async (values) => {
        await api.post('/reviews', toPayload(values))
      }}
      onUpdate={async (id, values) => {
        await api.patch(`/reviews/${id}`, toPayload(values))
      }}
      onDelete={async (id) => {
        await api.delete(`/reviews/${id}`)
      }}
      addButtonLabel="Add Review"
      emptyMessage="No reviews yet"
    />
  )
}
