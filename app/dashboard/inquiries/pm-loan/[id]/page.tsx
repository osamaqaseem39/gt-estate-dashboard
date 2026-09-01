'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQuery } from 'react-query'
import { format } from 'date-fns'
import { ArrowLeft, Mail, Phone, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'
import {
  displayValue,
  loanApplicationSections,
  LOAN_STATUS_OPTIONS,
  type LoanApplication,
} from '@/lib/loan-applications'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-red-100 text-red-800'
    case 'reviewed':
      return 'bg-blue-100 text-blue-800'
    case 'contacted':
      return 'bg-yellow-100 text-yellow-800'
    case 'closed':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function PmLoanInquiryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: application, isLoading, isError, refetch } = useQuery(
    ['loan-application', id],
    async () => {
      const response = await api.get(`/loan-applications/${id}`)
      return response.data as LoanApplication
    },
    { enabled: Boolean(id), retry: 1 },
  )

  const handleStatusChange = async (status: string) => {
    setUpdatingStatus(true)
    try {
      await api.patch(`/loan-applications/${id}`, { status })
      toast.success('Status updated')
      refetch()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this PM Loan inquiry? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete(`/loan-applications/${id}`)
      toast.success('Inquiry deleted')
      router.push('/dashboard/inquiries')
    } catch {
      toast.error('Failed to delete inquiry')
      setDeleting(false)
    }
  }

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading inquiry…</p>
  }

  if (isError || !application) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-gray-600">
          {isError
            ? 'Could not load this PM Loan application. It may have been deleted or the server is unavailable.'
            : 'PM Loan inquiry not found.'}
        </p>
        <Link href="/dashboard/inquiries" className={cn(buttonVariants({ variant: 'outline' }))}>
          Back to inquiries
        </Link>
      </div>
    )
  }

  const sections = loanApplicationSections(application)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/dashboard/inquiries"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-2 w-fit px-2')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to inquiries
          </Link>
          <div>
            <span className="mb-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              PM Loan
            </span>
            <h1 className="text-3xl font-bold text-gray-900">{application.fullName}</h1>
            <p className="text-gray-600">PM Loan Scheme application</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadgeClass(application.status)}`}
          >
            {application.status}
          </span>
          <select
            value={application.status}
            disabled={updatingStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            {LOAN_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {application.mobileNumber && (
            <a
              href={`tel:${application.mobileNumber}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Phone className="mr-2 h-4 w-4" />
              Call
            </a>
          )}
          {application.email?.trim() && (
            <a
              href={`mailto:${application.email.trim()}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </a>
          )}
          <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission info</CardTitle>
          <CardDescription>
            {application.createdAt
              ? `Submitted ${format(new Date(application.createdAt), 'PPP p')}`
              : 'Submission date unavailable'}
            {application.updatedAt && application.updatedAt !== application.createdAt && (
              <> · Updated {format(new Date(application.updatedAt), 'PPP p')}</>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{field.label}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{displayValue(field.value)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
