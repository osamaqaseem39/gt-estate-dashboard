'use client'

import { Fragment, useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, FileDown, Mail, Phone, Search, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api, API_AXIOS_BASE } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface CareerApplication {
  id: string
  fullName: string
  email: string
  phone: string
  position: string
  city: string
  experience: string
  coverNote?: string
  resumeUrl?: string
  resumeFileName?: string
  hasResume?: boolean
  status: string
  createdAt: string
}

const STATUS_OPTIONS = ['new', 'reviewed', 'shortlisted', 'rejected', 'hired']

const STATUS_CLASS: Record<string, string> = {
  new: 'bg-red-100 text-red-800',
  reviewed: 'bg-blue-100 text-blue-800',
  shortlisted: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-gray-100 text-gray-600',
  hired: 'bg-green-100 text-green-800',
}

/** CVs are behind auth, so fetch as a blob with the token and open it locally. */
async function openResume(app: CareerApplication) {
  if (!app.hasResume && app.resumeUrl) {
    // Legacy CVs were written to the API server's own /uploads/careers directory
    const legacy = /^https?:\/\//.test(app.resumeUrl) ? app.resumeUrl : `${API_AXIOS_BASE}${app.resumeUrl}`
    window.open(legacy, '_blank', 'noopener,noreferrer')
    return
  }
  const tab = window.open('', '_blank')
  try {
    const res = await api.get(`/careers/applications/${app.id}/resume`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const isPreviewable = /pdf|image\//.test((res.data as Blob).type)
    if (tab && isPreviewable) {
      tab.location.href = url
    } else {
      tab?.close()
      const a = document.createElement('a')
      a.href = url
      a.download = app.resumeFileName || `${app.fullName}-cv`
      a.click()
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch {
    tab?.close()
    toast.error('Could not download CV')
  }
}

export default function CareerApplicationsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery('career-applications', async () => {
    const res = await api.get('/careers/applications')
    return (res.data as (CareerApplication & { _id?: string })[]).map((a) => ({ ...a, id: a.id ?? a._id ?? '' }))
  })
  const applications = data ?? []

  const positions = useMemo(
    () => Array.from(new Set(applications.map((a) => a.position).filter(Boolean))).sort(),
    [applications],
  )

  const filtered = applications.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (positionFilter !== 'all' && a.position !== positionFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [a.fullName, a.email, a.phone, a.city].some((v) => (v || '').toLowerCase().includes(q))
  })

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/careers/applications/${id}`, { status })
      toast.success('Status updated')
      refetch()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const remove = async (app: CareerApplication) => {
    if (!confirm(`Delete ${app.fullName}'s application and CV? This cannot be undone.`)) return
    try {
      await api.delete(`/careers/applications/${app.id}`)
      toast.success('Application deleted')
      refetch()
    } catch {
      toast.error('Failed to delete application')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Job Applications</h1>
        <p className="text-gray-600">Applications submitted through the public /careers page, with attached CVs.</p>
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
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All positions</option>
                {positions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm capitalize"
              >
                <option value="all">All status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search name, email, phone…"
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
            <p className="py-8 text-center text-sm text-red-600">Could not load applications.</p>
          ) : isLoading ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No applications found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="w-6 py-2" />
                    <th className="py-2 pr-4">Candidate</th>
                    <th className="py-2 pr-4">Position</th>
                    <th className="py-2 pr-4">City</th>
                    <th className="py-2 pr-4">Experience</th>
                    <th className="py-2 pr-4">Applied</th>
                    <th className="py-2 pr-4">CV</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => {
                    const hasCv = app.hasResume || Boolean(app.resumeUrl)
                    const open = expanded === app.id
                    return (
                      <Fragment key={app.id}>
                        <tr className="border-b border-gray-50 align-top">
                          <td className="py-3">
                            <button
                              type="button"
                              onClick={() => setExpanded(open ? null : app.id)}
                              className="text-gray-400 hover:text-gray-700"
                              aria-label={open ? 'Hide details' : 'Show details'}
                            >
                              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="font-medium text-gray-900">{app.fullName}</p>
                            <p className="text-xs text-gray-500">{app.email}</p>
                            <p className="text-xs text-gray-500">{app.phone}</p>
                          </td>
                          <td className="py-3 pr-4">{app.position || '—'}</td>
                          <td className="py-3 pr-4">{app.city || '—'}</td>
                          <td className="py-3 pr-4">{app.experience || '—'}</td>
                          <td className="whitespace-nowrap py-3 pr-4 text-xs text-gray-500">
                            {app.createdAt ? format(new Date(app.createdAt), 'dd MMM yyyy') : '—'}
                          </td>
                          <td className="py-3 pr-4">
                            {hasCv ? (
                              <Button size="sm" variant="outline" onClick={() => openResume(app)} title={app.resumeFileName}>
                                <FileDown className="mr-1 h-3.5 w-3.5" />
                                CV
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <select
                              value={app.status}
                              onChange={(e) => updateStatus(app.id, e.target.value)}
                              className={`rounded-full border-0 px-2 py-1 text-xs font-medium capitalize ${STATUS_CLASS[app.status] ?? 'bg-gray-100'}`}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <a href={`mailto:${app.email}`} className="rounded-md border p-2 text-gray-600 hover:bg-gray-50" aria-label="Email">
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                              <a href={`tel:${app.phone}`} className="rounded-md border p-2 text-gray-600 hover:bg-gray-50" aria-label="Call">
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => remove(app)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-b border-gray-100 bg-gray-50/60">
                            <td />
                            <td colSpan={8} className="py-3 pr-4 text-sm text-gray-700">
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Cover note</p>
                              <p className="whitespace-pre-line">{app.coverNote?.trim() || '—'}</p>
                              {app.resumeFileName && (
                                <p className="mt-2 text-xs text-gray-500">CV file: {app.resumeFileName}</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
