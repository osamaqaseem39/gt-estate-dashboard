'use client'

import { useQuery } from 'react-query'
import { api } from '@/lib/api'
import { EntityListPage } from '@/components/crud/EntityListPage'
import type { EntityColumn, EntityField, EntityFormValues, MediaItem } from '@/components/crud/types'

interface PaymentPlanRow {
  label: string
  percentage: string
  amount: string
  dueOn: string
  notes: string
}

interface PaymentPlanTab {
  id: string
  title: string
  slug: string
  description: string
  rows: PaymentPlanRow[]
  images?: MediaItem[]
  propertyId?: string | null
  published: boolean
  sortOrder: number
}

interface PropertyOption {
  id: string
  title: string
  parentId?: string | null
  parent?: { title: string } | null
}

function buildFields(properties: PropertyOption[]): EntityField[] {
  return [
    { name: 'title', label: 'Title', type: 'text', required: true },
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      placeholder: 'installment-plan',
      helpText: 'Tab identifier on the public payment plans page. Leave empty to generate it from the title.',
    },
    {
      name: 'propertyId',
      label: 'Project / block',
      type: 'select',
      colSpan: 2,
      placeholder: 'General plan (not linked to a project)',
      options: properties.map((p) => ({
        value: p.id,
        label: p.parent?.title ? `${p.parent.title} › ${p.title}` : p.title,
      })),
      helpText: "Linked plans also appear on that project or block's detail page.",
    },
    { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    {
      name: 'images',
      label: 'Payment plan images',
      type: 'images',
      colSpan: 2,
      helpText: 'Upload payment schedule images/flyers. They are shown under this tab on the public /payment-plans page.',
    },
    {
      name: 'rows',
      label: 'Plan rows (JSON)',
      type: 'textarea',
      colSpan: 2,
      helpText: 'Optional. Array of { "label", "percentage", "amount", "dueOn", "notes" }. Leave [] if you only use images.',
      placeholder:
        '[{"label":"Booking","percentage":"10","amount":"","dueOn":"On booking","notes":""}]',
    },
    { name: 'sortOrder', label: 'Sort order', type: 'number', placeholder: '0' },
    { name: 'published', label: 'Published', type: 'checkbox' },
  ]
}

const columns: EntityColumn<PaymentPlanTab>[] = [
  { header: 'Title', render: (row) => <span className="font-medium text-gray-900">{row.title}</span> },
  { header: 'Slug', render: (row) => <code className="text-xs text-gray-500">/{row.slug}</code> },
  {
    header: 'Content',
    render: (row) => (
      <span className="text-xs text-gray-500">
        {row.rows?.length ?? 0} milestones · {row.images?.length ?? 0} images
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

function parseRows(raw: string): PaymentPlanRow[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new Error('Plan rows must be valid JSON')
  }
  if (!Array.isArray(parsed)) throw new Error('Plan rows must be a JSON array')
  return parsed as PaymentPlanRow[]
}

function toFormDefaults(row: PaymentPlanTab | null): EntityFormValues {
  return {
    title: row?.title ?? '',
    slug: row?.slug ?? '',
    description: row?.description ?? '',
    images: row?.images ?? [],
    propertyId: row?.propertyId ?? '',
    rows: stringifyJson(row?.rows, '[]'),
    sortOrder: row ? String(row.sortOrder) : '0',
    published: row?.published ?? true,
  }
}

function toPayload(values: EntityFormValues) {
  return {
    title: values.title as string,
    slug: (values.slug as string).trim() || undefined,
    description: values.description as string,
    images: Array.isArray(values.images) ? (values.images as MediaItem[]).filter((m) => m.url?.trim()) : [],
    rows: parseRows(values.rows as string),
    propertyId: (values.propertyId as string) || null,
    sortOrder: Number(values.sortOrder) || 0,
    published: Boolean(values.published),
  }
}

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
  const apiError = data?.error || data?.message
  return apiError || (err instanceof Error ? err.message : fallback)
}

export default function PaymentPlansPage() {
  const { data: properties } = useQuery('payment-plan-properties', async () => {
    const res = await api.get('/properties', { params: { scope: 'all' } })
    return (Array.isArray(res.data) ? res.data : []) as PropertyOption[]
  })
  const propertyList = properties ?? []
  const propertyTitle = new Map(propertyList.map((p) => [p.id, p.title]))
  const fields = buildFields(propertyList)
  const listColumns: EntityColumn<PaymentPlanTab>[] = [
    columns[0],
    {
      header: 'Project',
      render: (row) => (
        <span className="text-xs text-gray-600">
          {row.propertyId ? propertyTitle.get(row.propertyId) ?? 'Unknown project' : 'General'}
        </span>
      ),
    },
    ...columns.slice(1),
  ]

  return (
    <EntityListPage<PaymentPlanTab>
      title="Payment Plans"
      description="Manage payment plan tabs (images and milestone rows) for the public /payment-plans page."
      queryKey="payment-plans"
      fetchList={async () => (await api.get('/payment-plans')).data}
      columns={listColumns}
      getId={(row) => row.id}
      fields={fields}
      getFormDefaults={toFormDefaults}
      onCreate={async (values) => {
        try {
          await api.post('/payment-plans', toPayload(values))
        } catch (err) {
          throw new Error(errorMessage(err, 'Failed to create payment plan'))
        }
      }}
      onUpdate={async (id, values) => {
        try {
          await api.patch(`/payment-plans/${id}`, toPayload(values))
        } catch (err) {
          throw new Error(errorMessage(err, 'Failed to update payment plan'))
        }
      }}
      onDelete={async (id) => {
        await api.delete(`/payment-plans/${id}`)
      }}
      addButtonLabel="Add Plan Tab"
      emptyMessage="No payment plan tabs yet."
      formTitle={(editing) => (editing ? 'Edit Payment Plan' : 'Add Payment Plan')}
    />
  )
}
