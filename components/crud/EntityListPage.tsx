'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EntityFormModal } from './EntityFormModal'
import type { EntityColumn, EntityField, EntityFormValues } from './types'

export interface EntityListPageProps<T> {
  title: string
  description?: string
  queryKey: string
  fetchList: () => Promise<T[]>
  columns: EntityColumn<T>[]
  getId: (row: T) => string
  fields: EntityField[]
  getFormDefaults: (row: T | null) => EntityFormValues
  onCreate: (values: EntityFormValues) => Promise<void>
  onUpdate: (id: string, values: EntityFormValues) => Promise<void>
  onDelete: (id: string) => Promise<void>
  addButtonLabel?: string
  emptyMessage?: string
  formTitle?: (editing: T | null) => string
  /** Extra row action buttons rendered before Edit/Delete. */
  renderExtraActions?: (row: T) => React.ReactNode
}

/**
 * Shared list+form CRUD scaffold for the new dashboard content sections. Handles the
 * fetch/create/update/delete/refetch plumbing that Properties/Gallery/News each hand-roll
 * separately — new sections only supply columns, a field schema, and the API calls.
 */
export function EntityListPage<T>({
  title,
  description,
  queryKey,
  fetchList,
  columns,
  getId,
  fields,
  getFormDefaults,
  onCreate,
  onUpdate,
  onDelete,
  addButtonLabel,
  emptyMessage,
  formTitle,
  renderExtraActions,
}: EntityListPageProps<T>) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<T | null>(null)

  const { data, refetch, isLoading } = useQuery(queryKey, fetchList)
  const rows = data ?? []

  const startCreate = () => {
    setEditingRow(null)
    setFormOpen(true)
  }

  const startEdit = (row: T) => {
    setEditingRow(row)
    setFormOpen(true)
  }

  const handleSubmit = async (values: EntityFormValues) => {
    try {
      if (editingRow) {
        await onUpdate(getId(editingRow), values)
        toast.success(`${title.replace(/s$/, '')} updated`)
      } else {
        await onCreate(values)
        toast.success(`${title.replace(/s$/, '')} created`)
      }
      setFormOpen(false)
      setEditingRow(null)
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    }
  }

  const handleDelete = async (row: T) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      await onDelete(getId(row))
      toast.success('Deleted successfully')
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-gray-600">{description}</p>}
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {addButtonLabel ?? 'Add New'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All {title}</CardTitle>
          <CardDescription>{rows.length} items found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              {emptyMessage ?? 'No items found'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    {columns.map((col) => (
                      <th key={col.header} className={`py-2 pr-4 ${col.className ?? ''}`}>
                        {col.header}
                      </th>
                    ))}
                    <th className="py-2 pr-0 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={getId(row)} className="border-b border-gray-50 last:border-0">
                      {columns.map((col) => (
                        <td key={col.header} className={`py-3 pr-4 align-top ${col.className ?? ''}`}>
                          {col.render(row)}
                        </td>
                      ))}
                      <td className="py-3 pr-0 text-right align-top">
                        <div className="flex justify-end gap-1.5">
                          {renderExtraActions?.(row)}
                          <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <EntityFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingRow(null)
        }}
        title={formTitle ? formTitle(editingRow) : editingRow ? `Edit ${title}` : `Add ${title}`}
        fields={fields}
        defaultValues={getFormDefaults(editingRow)}
        onSubmit={handleSubmit}
        submitLabel={editingRow ? 'Save Changes' : 'Create'}
      />
    </div>
  )
}
