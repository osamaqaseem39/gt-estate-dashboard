'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import { Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface LoanApplication {
  id: string
  fullName: string
  mobileNumber: string
  city?: string
  requiredLoanAmount?: string
  requiredLoanAmountCustom?: string
  status: string
  createdAt?: string
}

const STATUS_OPTIONS = [
  { label: 'New', value: 'new' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Closed', value: 'closed' },
]

function loanAmountLabel(row: LoanApplication): string {
  const custom = row.requiredLoanAmountCustom?.trim()
  if (custom) return custom
  return row.requiredLoanAmount?.trim() || '—'
}

export default function LoanApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { data, refetch, isLoading } = useQuery('loan-applications', async () => {
    const response = await api.get('/loan-applications')
    return response.data as LoanApplication[]
  })

  const rows = data ?? []

  const handleStatusChange = async (id: string, status: string) => {
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

  const filtered = rows.filter((row) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      row.fullName.toLowerCase().includes(q) ||
      row.mobileNumber.toLowerCase().includes(q) ||
      (row.city ?? '').toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Loan Applications</h1>
        <p className="text-gray-600">Review financing applications submitted from the website.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Applications</CardTitle>
              <CardDescription>{filtered.length} applications found</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search…"
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
            <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No loan applications yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Mobile</th>
                    <th className="py-2 pr-4">City</th>
                    <th className="py-2 pr-4">Loan amount</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 align-top font-medium text-gray-900">{row.fullName}</td>
                      <td className="py-3 pr-4 align-top text-gray-700">{row.mobileNumber}</td>
                      <td className="py-3 pr-4 align-top text-gray-700">{row.city || '—'}</td>
                      <td className="py-3 pr-4 align-top text-gray-700">{loanAmountLabel(row)}</td>
                      <td className="py-3 pr-4 align-top">
                        <select
                          value={row.status}
                          disabled={updatingId === row.id}
                          onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm capitalize disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
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
