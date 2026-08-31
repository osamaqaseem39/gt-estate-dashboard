'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { FileUpload } from '@/components/ui/file-upload'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import type { EntityField, EntityFormValues } from './types'

export interface EntityFormModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  fields: EntityField[]
  defaultValues: EntityFormValues
  onSubmit: (values: EntityFormValues) => Promise<void>
  submitLabel?: string
}

/**
 * Field-schema-driven create/edit modal shared by every new dashboard CRUD section
 * (Reviews, Team, Events, Blog, ...). Wraps react-hook-form; each `EntityField.type`
 * picks the input rendered below.
 */
export function EntityFormModal({
  open,
  onClose,
  title,
  description,
  fields,
  defaultValues,
  onSubmit,
  submitLabel,
}: EntityFormModalProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<EntityFormValues>({ defaultValues })

  useEffect(() => {
    if (open) reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues])

  if (!open) return null

  const submit = handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12 sm:pt-20">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={field.colSpan === 2 ? 'md:col-span-2' : ''}>
                {field.type !== 'checkbox' && (
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </Label>
                )}

                {field.type === 'text' || field.type === 'number' ? (
                  <Input
                    id={field.name}
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={field.placeholder}
                    className="mt-1"
                    {...register(field.name, { required: field.required })}
                  />
                ) : field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    placeholder={field.placeholder}
                    className="mt-1"
                    rows={4}
                    {...register(field.name, { required: field.required })}
                  />
                ) : field.type === 'select' ? (
                  <Controller
                    name={field.name}
                    control={control}
                    rules={{ required: field.required }}
                    render={({ field: rhf }) => (
                      <Select
                        {...rhf}
                        value={(rhf.value as string) ?? ''}
                        options={field.options ?? []}
                        placeholder={field.placeholder}
                        className="mt-1"
                      />
                    )}
                  />
                ) : field.type === 'checkbox' ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Controller
                      name={field.name}
                      control={control}
                      render={({ field: rhf }) => (
                        <Checkbox
                          id={field.name}
                          checked={Boolean(rhf.value)}
                          onChange={(e) => rhf.onChange(e.target.checked)}
                        />
                      )}
                    />
                    <Label htmlFor={field.name}>{field.label}</Label>
                  </div>
                ) : field.type === 'image' ? (
                  <Controller
                    name={field.name}
                    control={control}
                    render={({ field: rhf }) => (
                      <div className="mt-1">
                        <FileUpload value={(rhf.value as string) ?? ''} onChange={rhf.onChange} />
                      </div>
                    )}
                  />
                ) : field.type === 'richtext' ? (
                  <Controller
                    name={field.name}
                    control={control}
                    render={({ field: rhf }) => (
                      <div className="mt-1">
                        <RichTextEditor
                          value={(rhf.value as string) ?? ''}
                          onChange={rhf.onChange}
                          placeholder={field.placeholder}
                        />
                      </div>
                    )}
                  />
                ) : null}

                {field.helpText && <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : (submitLabel ?? 'Save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
