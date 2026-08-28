'use client'

import { api } from '@/lib/api'
import { EntityListPage } from '@/components/crud/EntityListPage'
import type { EntityColumn, EntityField, EntityFormValues } from '@/components/crud/types'

interface Page {
  id: string
  slug: string
  title: string
  content: string
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
  published: boolean
}

const fields: EntityField[] = [
  {
    name: 'slug',
    label: 'Slug',
    type: 'text',
    required: true,
    placeholder: 'privacy-policy',
    helpText: 'Matches the website route, e.g. "privacy-policy" backs /privacy. Avoid changing after publishing.',
  },
  { name: 'title', label: 'Page title', type: 'text', required: true },
  { name: 'content', label: 'Content', type: 'richtext', required: true, colSpan: 2 },
  { name: 'metaTitle', label: 'Meta title', type: 'text' },
  { name: 'metaDescription', label: 'Meta description', type: 'textarea' },
  { name: 'metaKeywords', label: 'Meta keywords', type: 'text', helpText: 'Comma-separated', colSpan: 2 },
  { name: 'published', label: 'Published', type: 'checkbox' },
]

const columns: EntityColumn<Page>[] = [
  { header: 'Title', render: (row) => <span className="font-medium text-gray-900">{row.title}</span> },
  { header: 'Slug', render: (row) => <code className="text-xs text-gray-500">/{row.slug}</code> },
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

function toFormDefaults(row: Page | null): EntityFormValues {
  return {
    slug: row?.slug ?? '',
    title: row?.title ?? '',
    content: row?.content ?? '',
    metaTitle: row?.metaTitle ?? '',
    metaDescription: row?.metaDescription ?? '',
    metaKeywords: row?.metaKeywords ?? '',
    published: row?.published ?? false,
  }
}

function toPayload(values: EntityFormValues) {
  return {
    slug: values.slug as string,
    title: values.title as string,
    content: values.content as string,
    metaTitle: (values.metaTitle as string) || undefined,
    metaDescription: (values.metaDescription as string) || undefined,
    metaKeywords: (values.metaKeywords as string) || undefined,
    published: Boolean(values.published),
  }
}

export default function PagesPage() {
  return (
    <EntityListPage<Page>
      title="Pages / SEO"
      description="Manage rich-text content and SEO metadata for static pages such as Privacy Policy and Terms & Conditions."
      queryKey="pages"
      fetchList={async () => (await api.get('/pages')).data}
      columns={columns}
      getId={(row) => row.id}
      fields={fields}
      getFormDefaults={toFormDefaults}
      onCreate={async (values) => {
        await api.post('/pages', toPayload(values))
      }}
      onUpdate={async (id, values) => {
        await api.patch(`/pages/${id}`, toPayload(values))
      }}
      onDelete={async (id) => {
        await api.delete(`/pages/${id}`)
      }}
      addButtonLabel="Add Page"
      emptyMessage="No pages yet. Add one with slug 'privacy-policy' or 'terms' to back /privacy and /terms."
    />
  )
}
