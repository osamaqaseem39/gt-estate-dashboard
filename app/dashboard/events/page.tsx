'use client'

import { api, resolveDashboardMediaUrl } from '@/lib/api'
import { EntityListPage } from '@/components/crud/EntityListPage'
import type { EntityColumn, EntityField, EntityFormValues, MediaItem } from '@/components/crud/types'

interface Event {
  id: string
  title: string
  slug: string
  description: string
  images: MediaItem[]
  videos: MediaItem[]
  metaTitle?: string
  metaDescription?: string
  published: boolean
  sortOrder: number
}

const fields: EntityField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2 },
  { name: 'description', label: 'Description', type: 'richtext', colSpan: 2 },
  {
    name: 'images',
    label: 'Images',
    type: 'images',
    colSpan: 2,
    helpText: 'Upload as many photos as you like; they show as this event’s gallery on the /events page.',
  },
  {
    name: 'videos',
    label: 'Videos',
    type: 'videos',
    colSpan: 2,
    helpText: 'Upload video files or paste YouTube links.',
  },
  { name: 'sortOrder', label: 'Sort order', type: 'number', placeholder: '0', helpText: 'Lower numbers appear first.' },
  { name: 'published', label: 'Published', type: 'checkbox' },
]

const columns: EntityColumn<Event>[] = [
  {
    header: 'Event',
    render: (row) => {
      const cover = row.images?.[0]?.url
      return (
        <div className="flex items-center gap-3">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveDashboardMediaUrl(cover)} alt="" className="h-10 w-14 rounded object-cover" />
          ) : (
            <div className="h-10 w-14 rounded bg-gray-100" />
          )}
          <span className="font-medium text-gray-900">{row.title}</span>
        </div>
      )
    },
  },
  {
    header: 'Media',
    render: (row) => (
      <span className="text-xs text-gray-500">
        {row.images?.length ?? 0} images · {row.videos?.length ?? 0} videos
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

function toFormDefaults(row: Event | null): EntityFormValues {
  return {
    title: row?.title ?? '',
    description: row?.description ?? '',
    images: row?.images ?? [],
    videos: row?.videos ?? [],
    sortOrder: row ? String(row.sortOrder ?? 0) : '0',
    published: row?.published ?? true,
  }
}

function toPayload(values: EntityFormValues) {
  const media = (v: unknown) => (Array.isArray(v) ? (v as MediaItem[]).filter((m) => m.url?.trim()) : [])
  return {
    title: values.title as string,
    description: values.description as string,
    images: media(values.images),
    videos: media(values.videos),
    sortOrder: Number(values.sortOrder) || 0,
    published: Boolean(values.published),
  }
}

function errorMessage(err: unknown, fallback: string): string {
  const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
  return apiError || (err instanceof Error ? err.message : fallback)
}

export default function EventsPage() {
  return (
    <EntityListPage<Event>
      title="Events"
      description="All published events are listed together on the public /events page, each with its photo and video gallery."
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
          throw new Error(errorMessage(err, 'Failed to create event'))
        }
      }}
      onUpdate={async (id, values) => {
        try {
          await api.patch(`/events/${id}`, toPayload(values))
        } catch (err) {
          throw new Error(errorMessage(err, 'Failed to update event'))
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
