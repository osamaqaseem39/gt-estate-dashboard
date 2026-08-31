'use client'

import { api } from '@/lib/api'
import { EntityListPage } from '@/components/crud/EntityListPage'
import type { EntityColumn, EntityField, EntityFormValues } from '@/components/crud/types'

interface Event {
  id: string
  title: string
  slug: string
  description: string
  images: { url: string; alt?: string; title?: string }[]
  videos: { url: string; title?: string }[]
  metaTitle?: string
  metaDescription?: string
  published: boolean
  sortOrder: number
}

const fields: EntityField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  {
    name: 'slug',
    label: 'Slug',
    type: 'text',
    required: true,
    placeholder: 'annual-investor-meetup',
    helpText: 'URL path segment for /events/[slug].',
  },
  { name: 'description', label: 'Description', type: 'richtext', colSpan: 2 },
  {
    name: 'images',
    label: 'Images (JSON)',
    type: 'textarea',
    colSpan: 2,
    helpText: 'Array of { "url", "alt", "title" } objects.',
    placeholder: '[{"url":"/uploads/…","alt":"","title":""}]',
  },
  {
    name: 'videos',
    label: 'Videos (JSON)',
    type: 'textarea',
    colSpan: 2,
    helpText: 'Array of { "url", "title" } objects.',
    placeholder: '[{"url":"https://…","title":""}]',
  },
  { name: 'metaTitle', label: 'Meta title', type: 'text' },
  { name: 'metaDescription', label: 'Meta description', type: 'textarea' },
  { name: 'sortOrder', label: 'Sort order', type: 'number', placeholder: '0' },
  { name: 'published', label: 'Published', type: 'checkbox' },
]

const columns: EntityColumn<Event>[] = [
  { header: 'Title', render: (row) => <span className="font-medium text-gray-900">{row.title}</span> },
  { header: 'Slug', render: (row) => <code className="text-xs text-gray-500">/{row.slug}</code> },
  {
    header: 'Media',
    render: (row) => (
      <span className="text-xs text-gray-500">
        {(row.images?.length ?? 0)} img · {(row.videos?.length ?? 0)} vid
      </span>
    ),
  },
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

function stringifyJson(value: unknown, fallback: string): string {
  if (value == null) return fallback
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return fallback
  }
}

function parseJsonArray<T>(raw: string, fieldLabel: string): T[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  const parsed = JSON.parse(trimmed) as unknown
  if (!Array.isArray(parsed)) throw new Error(`${fieldLabel} must be a JSON array`)
  return parsed as T[]
}

function toFormDefaults(row: Event | null): EntityFormValues {
  return {
    title: row?.title ?? '',
    slug: row?.slug ?? '',
    description: row?.description ?? '',
    images: stringifyJson(row?.images, '[]'),
    videos: stringifyJson(row?.videos, '[]'),
    metaTitle: row?.metaTitle ?? '',
    metaDescription: row?.metaDescription ?? '',
    sortOrder: row ? String(row.sortOrder) : '0',
    published: row?.published ?? false,
  }
}

function toPayload(values: EntityFormValues) {
  return {
    title: values.title as string,
    slug: values.slug as string,
    description: values.description as string,
    images: parseJsonArray(values.images as string, 'Images'),
    videos: parseJsonArray(values.videos as string, 'Videos'),
    metaTitle: (values.metaTitle as string) || undefined,
    metaDescription: (values.metaDescription as string) || undefined,
    sortOrder: Number(values.sortOrder) || 0,
    published: Boolean(values.published),
  }
}

export default function EventsPage() {
  return (
    <EntityListPage<Event>
      title="Events"
      description="Manage event pages shown on the public /events section."
      queryKey="events"
      fetchList={async () => (await api.get('/events')).data}
      columns={columns}
      getId={(row) => row.id}
      fields={fields}
      getFormDefaults={toFormDefaults}
      onCreate={async (values) => {
        try {
          await api.post('/events', toPayload(values))
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          throw new Error(msg || 'Failed to create event')
        }
      }}
      onUpdate={async (id, values) => {
        try {
          await api.patch(`/events/${id}`, toPayload(values))
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          throw new Error(msg || 'Failed to update event')
        }
      }}
      onDelete={async (id) => {
        await api.delete(`/events/${id}`)
      }}
      addButtonLabel="Add Event"
      emptyMessage="No events yet."
      formTitle={(editing) => (editing ? 'Edit Event' : 'Add Event')}
    />
  )
}
