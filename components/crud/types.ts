import type { ReactNode } from 'react'

export type EntityFieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'select'
  | 'image'
  | 'checkbox'
  | 'number'

export interface EntityFieldOption {
  label: string
  value: string
}

export interface EntityField {
  name: string
  label: string
  type: EntityFieldType
  required?: boolean
  placeholder?: string
  helpText?: string
  /** Required for type "select". */
  options?: EntityFieldOption[]
  /** Grid width within the two-column form layout. Defaults to 1. */
  colSpan?: 1 | 2
}

export interface EntityColumn<T> {
  header: string
  render: (row: T) => ReactNode
  className?: string
}

export type EntityFormValues = Record<string, string | boolean>
