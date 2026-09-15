'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from 'react-query'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Mail, Phone, MapPin, CheckCircle, Landmark } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
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

/** General website inquiries only — PM Loan Scheme applications have their own page. */
export default function InquiriesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: inquiries, refetch, isLoading } = useQuery('inquiries', async () => {
    const response = await api.get('/inquiries')
    return response.data as Inquiry[]
  })

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/inquiries/${id}`, { status })
      toast.success('Inquiry status updated')
      refetch()
    } catch {
      toast.error('Failed to update inquiry status')
    }
  }

  const filtered = (inquiries ?? []).filter((inquiry) => {
    if (statusFilter !== 'all' && inquiry.status !== statusFilter) return false
    const q = searchTerm.toLowerCase()
    return [inquiry.name, inquiry.email, inquiry.message, inquiry.phone].some((v) =>
      (v || '').toLowerCase().includes(q),
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
          <p className="text-gray-600">Contact and inquiry form submissions from the website.</p>
        </div>
        <Link href="/dashboard/loan-applications" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          <Landmark className="mr-2 h-4 w-4" />
          PM Loan applications
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>All Inquiries</CardTitle>
              <CardDescription>{filtered.length} items found</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All status</option>
                <option value="new">New</option>
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
          {isLoading ? (
            <p className="py-12 text-center text-sm text-gray-500">Loading…</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((inquiry) => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} onStatusUpdate={handleStatusUpdate} />
              ))}
              {filtered.length === 0 && (
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
