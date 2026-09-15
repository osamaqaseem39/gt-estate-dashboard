'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from 'react-query'
import { format } from 'date-fns'
import { Eye, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  displayValue,
  loanAmountLabel,
  loanIncomeLabel,
  loanStatusClass,
  LOAN_STATUS_OPTIONS,
  type LoanApplication,
} from '@/lib/loan-applications'

export default function LoanApplicationsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery('loan-applications', async () => {
    const res = await api.get('/loan-applications')
    return res.data as LoanApplication[]
  })
  const applications = data ?? []

  const filtered = applications.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (propertyFilter !== 'all' && a.propertyType !== propertyFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [a.fullName, a.cnicNumber, a.fatherOrHusbandName, a.profession, a.mobileNumber].some((v) =>
      (v || '').toLowerCase().includes(q),
    )
  })

  const updateStatus = async (id: string, status: string) => {
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
        <h1 className="text-3xl font-bold text-gray-900">PM Loan Applications</h1>
        <p className="text-gray-600">
          Submissions from the /pm-loan-scheme form. Kept separate from general website inquiries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>All applications</CardTitle>
              <CardDescription>{filtered.length} of {applications.length} applications</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All property types</option>
                {['Plot', 'Townhouse', 'Home', 'Apartment'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All status</option>
                {LOAN_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search name, CNIC…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="py-8 text-center text-sm text-red-600">Could not load PM Loan applications.</p>
          ) : isLoading ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No applications found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4">Applicant</th>
                    <th className="py-2 pr-4">CNIC</th>
                    <th className="py-2 pr-4">Profession</th>
                    <th className="py-2 pr-4">Monthly income</th>
                    <th className="py-2 pr-4">Property</th>
                    <th className="py-2 pr-4">Loan amount</th>
                    <th className="py-2 pr-4">Submitted</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b border-gray-50 align-top">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">{a.fullName}</p>
                        {a.fatherOrHusbandName && (
                          <p className="text-xs text-gray-500">s/o, w/o {a.fatherOrHusbandName}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4">{displayValue(a.cnicNumber)}</td>
                      <td className="py-3 pr-4">{displayValue(a.profession || a.employmentStatus)}</td>
                      <td className="py-3 pr-4">{loanIncomeLabel(a)}</td>
                      <td className="py-3 pr-4">{displayValue(a.propertyType)}</td>
                      <td className="py-3 pr-4">{loanAmountLabel(a)}</td>
                      <td className="whitespace-nowrap py-3 pr-4 text-xs text-gray-500">
                        {a.createdAt ? format(new Date(a.createdAt), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={a.status}
                          disabled={updatingId === a.id}
                          onChange={(e) => updateStatus(a.id, e.target.value)}
                          className={`rounded-full border-0 px-2 py-1 text-xs font-medium disabled:opacity-50 ${loanStatusClass(a.status)}`}
                        >
                          {LOAN_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/dashboard/loan-applications/${a.id}`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
