'use client'

import { api } from '@/lib/api'
import { EntityListPage } from '@/components/crud/EntityListPage'
import type { EntityColumn, EntityField, EntityFormValues } from '@/components/crud/types'

interface Career {
  id: string
  fullName: string
  email: string
  phone?: string
  position?: string
  city?: string
  experience?: string
  coverNote?: string
  resumeUrl?: string
  status: string
  createdAt: string
}

const STATUS_OPTIONS = [
  { label: 'New', value: 'new' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Hired', value: 'hired' },
]

const fields: EntityField[] = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text', required: true },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'position', label: 'Position applied for', type: 'text' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'experience', label: 'Experience', type: 'text' },
  { name: 'resumeUrl', label: 'Resume / CV link', type: 'text' },
  { name: 'coverNote', label: 'Cover note', type: 'textarea', colSpan: 2 },
  { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
]

const columns: EntityColumn<Career>[] = [
  { header: 'Name', render: (row) => <span className="font-medium text-gray-900">{row.fullName}</span> },
  { header: 'Email', render: (row) => row.email },
  { header: 'Position', render: (row) => row.position || '—' },
  { header: 'City', render: (row) => row.city || '—' },
  {
    header: 'Resume',
    render: (row) =>
      row.resumeUrl ? (
        <a href={row.resumeUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline">
          View
        </a>
      ) : (
        '—'
      ),
  },
  {
    header: 'Status',
    render: (row) => (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
        {row.status}
      </span>
    ),
  },
]

function toFormDefaults(row: Career | null): EntityFormValues {
  return {
    fullName: row?.fullName ?? '',
    email: row?.email ?? '',
    phone: row?.phone ?? '',
    position: row?.position ?? '',
    city: row?.city ?? '',
    experience: row?.experience ?? '',
    resumeUrl: row?.resumeUrl ?? '',
    coverNote: row?.coverNote ?? '',
    status: row?.status ?? 'new',
  }
}

function toPayload(values: EntityFormValues) {
  return {
    fullName: values.fullName as string,
    email: values.email as string,
    phone: (values.phone as string) || undefined,
    position: (values.position as string) || undefined,
    city: (values.city as string) || undefined,
    experience: (values.experience as string) || undefined,
    resumeUrl: (values.resumeUrl as string) || undefined,
    coverNote: (values.coverNote as string) || undefined,
    status: (values.status as string) || 'new',
  }
}

export default function CareersPage() {
  return (
    <EntityListPage<Career>
      title="Careers"
      description="Job applications submitted through the careers page."
      queryKey="careers"
      fetchList={async () => (await api.get('/careers')).data}
      columns={columns}
      getId={(row) => row.id}
      fields={fields}
      getFormDefaults={toFormDefaults}
      onCreate={async (values) => {
        await api.post('/careers', toPayload(values))
      }}
      onUpdate={async (id, values) => {
        await api.patch(`/careers/${id}`, toPayload(values))
      }}
      onDelete={async (id) => {
        await api.delete(`/careers/${id}`)
      }}
      addButtonLabel="Add Application"
      emptyMessage="No applications yet"
    />
  )
}
