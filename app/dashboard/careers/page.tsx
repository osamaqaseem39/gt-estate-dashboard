'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { api } from '@/lib/api'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EntityListPage } from '@/components/crud/EntityListPage'
import type { EntityColumn, EntityField, EntityFormValues } from '@/components/crud/types'

interface JobPosting {
  id: string
  title: string
  department?: string
  location?: string
  employmentType?: string
  experience?: string
  description?: string
  requirements?: string[]
  published: boolean
  sortOrder: number
  createdAt?: string
}

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'].map((v) => ({ label: v, value: v }))

const fields: EntityField[] = [
  { name: 'title', label: 'Job title', type: 'text', required: true, placeholder: 'Sales Executive' },
  { name: 'department', label: 'Department', type: 'text', placeholder: 'Sales' },
  { name: 'location', label: 'Location', type: 'text', placeholder: 'Lahore' },
  { name: 'employmentType', label: 'Employment type', type: 'select', options: EMPLOYMENT_TYPES },
  { name: 'experience', label: 'Experience required', type: 'text', placeholder: '1–2 years' },
  { name: 'sortOrder', label: 'Sort order', type: 'number', placeholder: '0' },
  { name: 'description', label: 'Job description', type: 'textarea', colSpan: 2 },
  {
    name: 'requirements',
    label: 'Requirements',
    type: 'textarea',
    colSpan: 2,
    helpText: 'One requirement per line.',
  },
  { name: 'published', label: 'Published (visible on /careers and in the application form)', type: 'checkbox', colSpan: 2 },
]

const columns: EntityColumn<JobPosting>[] = [
  { header: 'Job title', render: (row) => <span className="font-medium text-gray-900">{row.title}</span> },
  { header: 'Department', render: (row) => row.department || '—' },
  { header: 'Location', render: (row) => row.location || '—' },
  { header: 'Type', render: (row) => row.employmentType || '—' },
  {
    header: 'Status',
    render: (row) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          row.published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {row.published ? 'Open' : 'Hidden'}
      </span>
    ),
  },
]

function toFormDefaults(row: JobPosting | null): EntityFormValues {
  return {
    title: row?.title ?? '',
    department: row?.department ?? '',
    location: row?.location ?? '',
    employmentType: row?.employmentType ?? 'Full-time',
    experience: row?.experience ?? '',
    sortOrder: row ? String(row.sortOrder ?? 0) : '0',
    description: row?.description ?? '',
    requirements: (row?.requirements ?? []).join('\n'),
    published: row?.published ?? true,
  }
}

function toPayload(values: EntityFormValues) {
  return {
    title: values.title as string,
    department: values.department as string,
    location: values.location as string,
    employmentType: values.employmentType as string,
    experience: values.experience as string,
    sortOrder: Number(values.sortOrder) || 0,
    description: values.description as string,
    requirements: String(values.requirements || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    published: Boolean(values.published),
  }
}

function errorMessage(err: unknown, fallback: string): string {
  const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
  return apiError || (err instanceof Error ? err.message : fallback)
}

export default function PostJobPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/dashboard/careers/applications" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          <Users className="mr-2 h-4 w-4" />
          View job applications
        </Link>
      </div>
      <EntityListPage<JobPosting>
        title="Post a Job"
        description="Open positions listed on the public /careers page. Applicants choose from these when applying."
        queryKey="career-jobs"
        fetchList={async () => (await api.get('/careers/jobs')).data}
        columns={columns}
        getId={(row) => row.id}
        fields={fields}
        getFormDefaults={toFormDefaults}
        onCreate={async (values) => {
          try {
            await api.post('/careers/jobs', toPayload(values))
          } catch (err) {
            throw new Error(errorMessage(err, 'Failed to post job'))
          }
        }}
        onUpdate={async (id, values) => {
          try {
            await api.patch(`/careers/jobs/${id}`, toPayload(values))
          } catch (err) {
            throw new Error(errorMessage(err, 'Failed to update job'))
          }
        }}
        onDelete={async (id) => {
          await api.delete(`/careers/jobs/${id}`)
        }}
        addButtonLabel="Post a Job"
        emptyMessage="No jobs posted yet."
        formTitle={(editing) => (editing ? 'Edit Job' : 'Post a Job')}
      />
    </div>
  )
}
