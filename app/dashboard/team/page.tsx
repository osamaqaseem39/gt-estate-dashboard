'use client'

import Image from 'next/image'
import { api, resolveDashboardMediaUrl } from '@/lib/api'
import { EntityListPage } from '@/components/crud/EntityListPage'
import type { EntityColumn, EntityField, EntityFormValues } from '@/components/crud/types'

interface TeamMember {
  id: string
  name: string
  designation: string
  image?: string
  bio?: string
  published: boolean
  sortOrder: number
}

const fields: EntityField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'designation', label: 'Designation', type: 'text', required: true },
  { name: 'image', label: 'Photo', type: 'image' },
  {
    name: 'bio',
    label: 'Short bio',
    type: 'textarea',
    colSpan: 2,
    helpText: 'Optional — keep it to about 50 words.',
  },
  { name: 'sortOrder', label: 'Sort order', type: 'number', placeholder: '0' },
  { name: 'published', label: 'Published', type: 'checkbox' },
]

const columns: EntityColumn<TeamMember>[] = [
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
  { header: 'Designation', render: (row) => row.designation },
  { header: 'Bio', render: (row) => <span className="line-clamp-2 max-w-xs text-gray-600">{row.bio || '—'}</span> },
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

function toFormDefaults(row: TeamMember | null): EntityFormValues {
  return {
    name: row?.name ?? '',
    designation: row?.designation ?? '',
    image: row?.image ?? '',
    bio: row?.bio ?? '',
    sortOrder: row ? String(row.sortOrder) : '0',
    published: row?.published ?? true,
  }
}

function toPayload(values: EntityFormValues) {
  return {
    name: values.name as string,
    designation: values.designation as string,
    image: (values.image as string) || undefined,
    bio: (values.bio as string) || undefined,
    sortOrder: Number(values.sortOrder) || 0,
    published: Boolean(values.published),
  }
}

export default function TeamPage() {
  return (
    <EntityListPage<TeamMember>
      title="Team"
      description="Manage the team members shown on the /team page."
      queryKey="team"
      fetchList={async () => (await api.get('/team')).data}
      columns={columns}
      getId={(row) => row.id}
      fields={fields}
      getFormDefaults={toFormDefaults}
      onCreate={async (values) => {
        await api.post('/team', toPayload(values))
      }}
      onUpdate={async (id, values) => {
        await api.patch(`/team/${id}`, toPayload(values))
      }}
      onDelete={async (id) => {
        await api.delete(`/team/${id}`)
      }}
      addButtonLabel="Add Team Member"
      emptyMessage="No team members yet"
    />
  )
}
