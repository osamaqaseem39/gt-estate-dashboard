'use client'

import Image from 'next/image'
import { api, resolveDashboardMediaUrl } from '@/lib/api'
import { EntityListPage } from '@/components/crud/EntityListPage'
import type { EntityColumn, EntityField, EntityFormValues } from '@/components/crud/types'

interface NewsArticle {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  imageUrl?: string
  metaTitle?: string
  metaDescription?: string
  published: boolean
  featured: boolean
  sortOrder: number
}

const fields: EntityField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  {
    name: 'slug',
    label: 'Slug',
    type: 'text',
    required: true,
    placeholder: 'market-update-q1',
    helpText: 'URL path for /blog/[slug].',
  },
  { name: 'content', label: 'Content', type: 'richtext', required: true, colSpan: 2 },
  { name: 'excerpt', label: 'Excerpt', type: 'textarea', colSpan: 2 },
  { name: 'imageUrl', label: 'Cover image', type: 'image' },
  { name: 'metaTitle', label: 'Meta title', type: 'text' },
  { name: 'metaDescription', label: 'Meta description', type: 'textarea' },
  { name: 'sortOrder', label: 'Sort order', type: 'number', placeholder: '0' },
  { name: 'featured', label: 'Featured', type: 'checkbox' },
  { name: 'published', label: 'Published', type: 'checkbox' },
]

const columns: EntityColumn<NewsArticle>[] = [
  {
    header: 'Cover',
    render: (row) =>
      row.imageUrl ? (
        <Image
          src={resolveDashboardMediaUrl(row.imageUrl)}
          alt={row.title}
          width={48}
          height={32}
          className="h-8 w-12 rounded object-cover"
          unoptimized
        />
      ) : (
        <div className="h-8 w-12 rounded bg-gray-100" />
      ),
  },
  { header: 'Title', render: (row) => <span className="font-medium text-gray-900">{row.title}</span> },
  { header: 'Slug', render: (row) => <code className="text-xs text-gray-500">/{row.slug}</code> },
  {
    header: 'Status',
    render: (row) => (
      <div className="flex flex-wrap gap-1">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            row.published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {row.published ? 'Published' : 'Draft'}
        </span>
        {row.featured && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            Featured
          </span>
        )}
      </div>
    ),
  },
]

function toFormDefaults(row: NewsArticle | null): EntityFormValues {
  return {
    title: row?.title ?? '',
    slug: row?.slug ?? '',
    content: row?.content ?? '',
    excerpt: row?.excerpt ?? '',
    imageUrl: row?.imageUrl ?? '',
    metaTitle: row?.metaTitle ?? '',
    metaDescription: row?.metaDescription ?? '',
    sortOrder: row ? String(row.sortOrder) : '0',
    featured: row?.featured ?? false,
    published: row?.published ?? false,
  }
}

function toPayload(values: EntityFormValues) {
  return {
    title: values.title as string,
    slug: values.slug as string,
    content: values.content as string,
    excerpt: (values.excerpt as string) || undefined,
    imageUrl: (values.imageUrl as string) || undefined,
    metaTitle: (values.metaTitle as string) || undefined,
    metaDescription: (values.metaDescription as string) || undefined,
    sortOrder: Number(values.sortOrder) || 0,
    featured: Boolean(values.featured),
    published: Boolean(values.published),
  }
}

export default function NewsPage() {
  return (
    <EntityListPage<NewsArticle>
      title="Blog"
      description="Manage blog posts and articles shown on the public site."
      queryKey="news"
      fetchList={async () => (await api.get('/news')).data}
      columns={columns}
      getId={(row) => row.id}
      fields={fields}
      getFormDefaults={toFormDefaults}
      onCreate={async (values) => {
        await api.post('/news', toPayload(values))
      }}
      onUpdate={async (id, values) => {
        await api.patch(`/news/${id}`, toPayload(values))
      }}
      onDelete={async (id) => {
        await api.delete(`/news/${id}`)
      }}
      addButtonLabel="Add Article"
      emptyMessage="No blog posts yet."
      formTitle={(editing) => (editing ? 'Edit Article' : 'Add Article')}
    />
  )
}
