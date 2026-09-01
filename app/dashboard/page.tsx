'use client'

import { useQuery } from 'react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { RecentLeads, type RecentLead } from '@/components/dashboard/RecentLeads'
import { PropertiesChart } from '@/components/dashboard/PropertiesChart'
import { api } from '@/lib/api'
import type { LoanApplication } from '@/lib/loan-applications'

export default function DashboardPage() {
  const { data: stats } = useQuery('dashboard-stats', async () => {
    const [properties, inquiries, loanApplications, news, gallery] = await Promise.all([
      api.get('/properties').then(res => res.data),
      api.get('/inquiries').then(res => res.data),
      api.get('/loan-applications').then(res => res.data).catch(() => []),
      api.get('/news').then(res => res.data),
      api.get('/gallery').then(res => res.data),
    ])

    const newInquiries = inquiries.filter((i: { status: string }) => i.status === 'new').length
    const newLoans = loanApplications.filter((l: LoanApplication) => l.status === 'new').length

    return {
      totalProperties: properties.length,
      totalInquiries: inquiries.length + loanApplications.length,
      newInquiries: newInquiries + newLoans,
      totalLoanApplications: loanApplications.length,
      totalNews: news.length,
      totalGallery: gallery.length,
    }
  })

  const { data: recentLeads } = useQuery('recent-leads', async () => {
    const [inquiriesRes, loansRes] = await Promise.all([
      api.get('/inquiries'),
      api.get('/loan-applications').catch(() => ({ data: [] as LoanApplication[] })),
    ])

    const leads: RecentLead[] = [
      ...inquiriesRes.data.map((inquiry: { id: string; name: string; email?: string; message?: string; status: string; createdAt: string; property?: { title?: string } }) => ({
        kind: 'inquiry' as const,
        createdAt: inquiry.createdAt,
        data: inquiry,
      })),
      ...loansRes.data.map((loan: LoanApplication) => ({
        kind: 'pm-loan' as const,
        createdAt: loan.createdAt ?? '',
        data: loan,
      })),
    ]

    return leads
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your real estate management dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Properties"
          value={stats?.totalProperties || 0}
          description="Properties in your portfolio"
          icon="🏠"
        />
        <StatsCard
          title="Total Inquiries"
          value={stats?.totalInquiries || 0}
          description="Website inquiries & PM Loan applications"
          icon="📧"
        />
        <StatsCard
          title="New Inquiries"
          value={stats?.newInquiries || 0}
          description="Unread inquiries & loan applications"
          icon="🆕"
        />
        <StatsCard
          title="PM Loan Applications"
          value={stats?.totalLoanApplications || 0}
          description="PM Loan Scheme submissions"
          icon="🏦"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Inquiries</CardTitle>
            <CardDescription>Latest website inquiries and PM Loan applications</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentLeads leads={recentLeads || []} />
          </CardContent>
        </Card>

        {/* Properties Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Properties Overview</CardTitle>
            <CardDescription>Property distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            <PropertiesChart />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}