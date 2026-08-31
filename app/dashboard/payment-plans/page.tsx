'use client'

import { api } from '@/lib/api'
import { EntityListPage } from '@/components/crud/EntityListPage'
import type { EntityColumn, EntityField, EntityFormValues } from '@/components/crud/types'

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
    placeholder: 'installment-plan',
    helpText: 'Tab identifier on the public payment plans page.',
  },
  { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
  {
    name: 'rows',
    label: 'Plan rows (JSON)',
    type: 'textarea',
    colSpan: 2,
    helpText: 'Array of { "label", "percentage", "amount", "dueOn", "notes" }.',
    placeholder:
      '[{"label":"Booking","percentage":"10","amount":"","dueOn":"On booking","notes":""}]',
  },
  { name: 'sortOrder', label: 'Sort order', type: 'number', placeholder: '0' },
  { name: 'published', label: 'Published', type: 'checkbox' },
]

const columns: EntityColumn<PaymentPlanTab>[] = [
  { header: 'Title', render: (row) => <span className="font-medium text-gray-900">{row.title}</span> },
  { header: 'Slug', render: (row) => <code className="text-xs text-gray-500">/{row.slug}</code> },
  {
    header: 'Rows',
    render: (row) => <span className="text-xs text-gray-500">{row.rows?.length ?? 0} milestones</span>,
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
  const parsed = JSON.parse(trimmed) as unknown
  if (!Array.isArray(parsed)) throw new Error('Plan rows must be a JSON array')
  return parsed as PaymentPlanRow[]
}

function toFormDefaults(row: PaymentPlanTab | null): EntityFormValues {
  return {
    title: row?.title ?? '',
    slug: row?.slug ?? '',
    description: row?.description ?? '',
    rows: stringifyJson(row?.rows, '[]'),
    sortOrder: row ? String(row.sortOrder) : '0',
    published: row?.published ?? true,
  }
}

function toPayload(values: EntityFormValues) {
  return {
    title: values.title as string,
    slug: values.slug as string,
    description: values.description as string,
    rows: parseRows(values.rows as string),
    sortOrder: Number(values.sortOrder) || 0,
    published: Boolean(values.published),
  }
}

export default function PaymentPlansPage() {
  return (
    <EntityListPage<PaymentPlanTab>
      title="Payment Plans"
      description="Manage payment plan tabs and milestone rows for the public site."
      queryKey="payment-plans"
      fetchList={async () => (await api.get('/payment-plans')).data}
      columns={columns}
      getId={(row) => row.id}
      fields={fields}
      getFormDefaults={toFormDefaults}
      onCreate={async (values) => {
        try {
          await api.post('/payment-plans', toPayload(values))
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          throw new Error(msg || 'Failed to create payment plan')
        }
      }}
      onUpdate={async (id, values) => {
        try {
          await api.patch(`/payment-plans/${id}`, toPayload(values))
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          throw new Error(msg || 'Failed to update payment plan')
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
