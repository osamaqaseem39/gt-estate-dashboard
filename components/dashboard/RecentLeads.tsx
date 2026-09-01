import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Landmark } from 'lucide-react'

interface Inquiry {
  id: string
  name: string
  email?: string
  message?: string
  status: string
  createdAt: string
  property?: {
    title?: string
  }
}

interface LoanApplication {
  id: string
  fullName: string
  email?: string
  mobileNumber: string
  status: string
  createdAt?: string
  city?: string
  requiredLoanAmount?: string
  requiredLoanAmountCustom?: string
}

export type RecentLead =
  | { kind: 'inquiry'; createdAt: string; data: Inquiry }
  | { kind: 'pm-loan'; createdAt: string; data: LoanApplication }

interface RecentLeadsProps {
  leads: RecentLead[]
}

function loanAmountLabel(loan: LoanApplication): string {
  const custom = loan.requiredLoanAmountCustom?.trim()
  if (custom) return custom
  return loan.requiredLoanAmount?.trim() || '—'
}

function statusClass(status: string): string {
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

export function RecentLeads({ leads }: RecentLeadsProps) {
  if (leads.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-gray-500">No recent inquiries</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {leads.map((lead) => {
        if (lead.kind === 'inquiry') {
          const inquiry = lead.data
          return (
            <div key={`inquiry-${inquiry.id}`} className="flex items-start space-x-3 rounded-lg bg-gray-50 p-3">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                  <span className="text-sm font-medium text-primary-700">
                    {inquiry.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">{inquiry.name}</p>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass(inquiry.status)}`}
                  >
                    {inquiry.status}
                  </span>
                </div>
                <span className="mb-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  Website inquiry
                </span>
                <p className="truncate text-sm text-gray-500">
                  {inquiry.email?.trim() ? inquiry.email : 'No email on file'}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{inquiry.message || '—'}</p>
                {inquiry.property?.title && (
                  <p className="mt-1 text-xs text-gray-400">Property: {inquiry.property.title}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        }

        const loan = lead.data
        return (
          <Link
            key={`pm-loan-${loan.id}`}
            href={`/dashboard/inquiries/pm-loan/${loan.id}`}
            className="flex items-start space-x-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-amber-50"
          >
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <Landmark className="h-4 w-4 text-amber-700" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-gray-900">{loan.fullName}</p>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass(loan.status)}`}
                >
                  {loan.status}
                </span>
              </div>
              <span className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                PM Loan application
              </span>
              <p className="truncate text-sm text-gray-500">{loan.mobileNumber}</p>
              <p className="mt-1 text-sm text-gray-600">
                Loan amount: {loanAmountLabel(loan)}
                {loan.city ? ` · ${loan.city}` : ''}
              </p>
              <p className="mt-1 text-xs text-primary-600">View full application →</p>
              {lead.createdAt && (
                <p className="mt-1 text-xs text-gray-400">
                  {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
