'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import { formatDistanceToNow } from 'date-fns'
import { Search, Eye, Phone } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LOAN_STATUS_OPTIONS, type LoanApplication } from '@/lib/loan-applications'
import { cn } from '@/lib/utils'

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

export default function PmLoanApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { data: applications, refetch, isLoading } = useQuery('pm-loan-applications', async () => {
    const response = await api.get('/loan-applications')
    return response.data as LoanApplication[]
  })

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return (applications ?? []).filter((app) => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false
      return (
        app.fullName.toLowerCase().includes(q) ||
        (app.cnicNumber ?? '').toLowerCase().includes(q) ||
        (app.propertyType ?? '').toLowerCase().includes(q) ||
        (app.profession ?? '').toLowerCase().includes(q) ||
        (app.residentialAddress ?? '').toLowerCase().includes(q)
      )
    })
  }, [applications, searchTerm, statusFilter])

  const handleStatusUpdate = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      await api.patch(`/loan-applications/${id}`, { status })
      toast.success('Status updated')
      refetch()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">PM Loan applications</h1>
        <p className="text-gray-600">Loan scheme inquiries submitted from /pm-loan-scheme — separate from contact inquiries.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>All PM Loan inquiries</CardTitle>
              <CardDescription>{filtered.length} applications</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All status</option>
                {LOAN_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search applications..."
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">CNIC</th>
                    <th className="px-3 py-2">Property interest</th>
                    <th className="px-3 py-2">Loan amount</th>
                    <th className="px-3 py-2">Profession</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => (
                    <tr key={app.id} className="border-t">
                      <td className="px-3 py-3 font-medium">{app.fullName}</td>
                      <td className="px-3 py-3">{app.cnicNumber || '—'}</td>
                      <td className="px-3 py-3">{app.propertyType || '—'}</td>
                      <td className="px-3 py-3">{app.requiredLoanAmount || '—'}</td>
                      <td className="px-3 py-3">{app.profession || '—'}</td>
                      <td className="px-3 py-3">
                        <select
                          value={app.status}
                          disabled={updatingId === app.id}
                          onChange={(e) => handleStatusUpdate(app.id, e.target.value)}
                          className={cn(
                            'rounded-md border px-2 py-1 text-xs capitalize',
                            loanStatusClass(app.status),
                          )}
                        >
                          {LOAN_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {app.createdAt ? formatDistanceToNow(new Date(app.createdAt), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/inquiries/pm-loan/${app.id}`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {app.mobileNumber && (
                            <a href={`tel:${app.mobileNumber}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="py-12 text-center text-gray-500">No PM Loan applications found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
