'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Mail, Phone, MapPin, CheckCircle, Eye, Landmark } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { loanAmountLabel, LOAN_STATUS_OPTIONS, type LoanApplication } from '@/lib/loan-applications'
import { cn } from '@/lib/utils'

interface Inquiry {
  id: string
  name: string
  email?: string
  phone?: string
  message?: string
  status: string
  createdAt: string
  property?: { title?: string }
}

type LeadKind = 'inquiry' | 'pm-loan'

type LeadItem =
  | { kind: 'inquiry'; createdAt: string; data: Inquiry }
  | { kind: 'pm-loan'; createdAt: string; data: LoanApplication }

function inquiryStatusClass(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-red-100 text-red-800'
    case 'contacted':
      return 'bg-yellow-100 text-yellow-800'
    case 'closed':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function loanStatusClass(status: string): string {
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

export default function InquiriesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | LeadKind>('all')
  const [updatingLoanId, setUpdatingLoanId] = useState<string | null>(null)

  const { data: inquiries, refetch: refetchInquiries } = useQuery('inquiries', async () => {
    const response = await api.get('/inquiries')
    return response.data as Inquiry[]
  })

  const { data: loanApplications, refetch: refetchLoans, isLoading, isError: loansError } = useQuery(
    'loan-applications',
    async () => {
      const response = await api.get('/loan-applications')
      return response.data as LoanApplication[]
    },
  )

  const allLeads = useMemo(() => {
    const items: LeadItem[] = [
      ...(inquiries ?? []).map((inquiry) => ({
        kind: 'inquiry' as const,
        createdAt: inquiry.createdAt,
        data: inquiry,
      })),
      ...(loanApplications ?? []).map((loan) => ({
        kind: 'pm-loan' as const,
        createdAt: loan.createdAt ?? '',
        data: loan,
      })),
    ]
    return items.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )
  }, [inquiries, loanApplications])

  const handleInquiryStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/inquiries/${id}`, { status })
      toast.success('Inquiry status updated')
      refetchInquiries()
    } catch {
      toast.error('Failed to update inquiry status')
    }
  }

  const handleLoanStatusUpdate = async (id: string, status: string) => {
    setUpdatingLoanId(id)
    try {
      await api.patch(`/loan-applications/${id}`, { status })
      toast.success('Status updated')
      refetchLoans()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingLoanId(null)
    }
  }

  const filteredLeads = allLeads.filter((lead) => {
    const q = searchTerm.toLowerCase()

    if (typeFilter !== 'all' && lead.kind !== typeFilter) return false

    const matchesStatus = statusFilter === 'all' || lead.data.status === statusFilter
    if (!matchesStatus) return false

    if (lead.kind === 'inquiry') {
      const inquiry = lead.data
      const email = (inquiry.email || '').toLowerCase()
      const msg = (inquiry.message || '').toLowerCase()
      const phone = (inquiry.phone || '').toLowerCase()
      return (
        inquiry.name.toLowerCase().includes(q) ||
        email.includes(q) ||
        msg.includes(q) ||
        phone.includes(q)
      )
    }

    const loan = lead.data
    return (
      loan.fullName.toLowerCase().includes(q) ||
      loan.mobileNumber.toLowerCase().includes(q) ||
      (loan.city ?? '').toLowerCase().includes(q) ||
      (loan.email ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
        <p className="text-gray-600">Manage website inquiries and PM Loan Scheme applications.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>All Inquiries</CardTitle>
              <CardDescription>{filteredLeads.length} items found</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | LeadKind)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All types</option>
                <option value="inquiry">Website inquiries</option>
                <option value="pm-loan">PM Loan</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All status</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search inquiries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loansError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Could not load PM Loan applications. Check your connection and try refreshing the page.
            </div>
          )}
          {isLoading ? (
            <p className="py-12 text-center text-sm text-gray-500">Loading…</p>
          ) : (
            <div className="space-y-4">
              {filteredLeads.map((lead) =>
                lead.kind === 'inquiry' ? (
                  <InquiryCard
                    key={`inquiry-${lead.data.id}`}
                    inquiry={lead.data}
                    onStatusUpdate={handleInquiryStatusUpdate}
                  />
                ) : (
                  <PmLoanCard
                    key={`pm-loan-${lead.data.id}`}
                    loan={lead.data}
                    updating={updatingLoanId === lead.data.id}
                    onStatusUpdate={handleLoanStatusUpdate}
                  />
                ),
              )}

              {filteredLeads.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500">No inquiries found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InquiryCard({
  inquiry,
  onStatusUpdate,
}: {
  inquiry: Inquiry
  onStatusUpdate: (id: string, status: string) => void
}) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">{inquiry.name}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              Website inquiry
            </span>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${inquiryStatusClass(inquiry.status)}`}
            >
              {inquiry.status}
            </span>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <div className="flex items-center">
              <Mail className="mr-1 h-4 w-4" />
              {inquiry.email?.trim() ? inquiry.email : '—'}
            </div>
            {inquiry.phone && (
              <div className="flex items-center">
                <Phone className="mr-1 h-4 w-4" />
                {inquiry.phone}
              </div>
            )}
            {inquiry.property && (
              <div className="flex items-center">
                <MapPin className="mr-1 h-4 w-4" />
                {inquiry.property.title}
              </div>
            )}
          </div>

          <p className="mb-3 text-gray-700">{inquiry.message || '—'}</p>

          <p className="text-xs text-gray-500">
            {inquiry.createdAt
              ? formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })
              : '—'}
          </p>
        </div>

        <div className="ml-4 flex flex-col space-y-2">
          {inquiry.status === 'new' && (
            <Button
              size="sm"
              onClick={() => onStatusUpdate(inquiry.id, 'contacted')}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Mark as Contacted
            </Button>
          )}
          {inquiry.status === 'contacted' && (
            <Button
              size="sm"
              onClick={() => onStatusUpdate(inquiry.id, 'closed')}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Close Inquiry
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={!inquiry.email?.trim()}
            onClick={() => {
              const em = inquiry.email?.trim()
              if (em) window.open(`mailto:${em}`)
            }}
          >
            <Mail className="mr-1 h-4 w-4" />
            Reply
          </Button>
        </div>
      </div>
    </div>
  )
}

function PmLoanCard({
  loan,
  updating,
  onStatusUpdate,
}: {
  loan: LoanApplication
  updating: boolean
  onStatusUpdate: (id: string, status: string) => void
}) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{loan.fullName}</h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              <Landmark className="mr-1 h-3 w-3" />
              PM Loan
            </span>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${loanStatusClass(loan.status)}`}
            >
              {loan.status}
            </span>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <div className="flex items-center">
              <Phone className="mr-1 h-4 w-4" />
              {loan.mobileNumber}
            </div>
            {loan.email?.trim() && (
              <div className="flex items-center">
                <Mail className="mr-1 h-4 w-4" />
                {loan.email}
              </div>
            )}
            {loan.city && (
              <div className="flex items-center">
                <MapPin className="mr-1 h-4 w-4" />
                {loan.city}
              </div>
            )}
          </div>

          <p className="mb-1 text-sm text-gray-700">
            <span className="font-medium text-gray-900">Loan amount:</span> {loanAmountLabel(loan)}
          </p>
          {loan.applicantType && (
            <p className="mb-3 text-sm text-gray-700">
              <span className="font-medium text-gray-900">Applicant type:</span> {loan.applicantType}
            </p>
          )}

          <p className="text-xs text-gray-500">
            {loan.createdAt
              ? formatDistanceToNow(new Date(loan.createdAt), { addSuffix: true })
              : '—'}
          </p>
        </div>

        <div className="ml-4 flex flex-col space-y-2">
          <select
            value={loan.status}
            disabled={updating}
            onChange={(e) => onStatusUpdate(loan.id, e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm capitalize disabled:opacity-50"
          >
            {LOAN_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Link
            href={`/dashboard/inquiries/pm-loan/${loan.id}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Eye className="mr-1 h-4 w-4" />
            View details
          </Link>
          {loan.mobileNumber && (
            <a
              href={`tel:${loan.mobileNumber}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Phone className="mr-1 h-4 w-4" />
              Call
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
