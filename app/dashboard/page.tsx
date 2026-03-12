'use client'

import { useQuery } from 'react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { RecentInquiries } from '@/components/dashboard/RecentInquiries'
import { PropertiesChart } from '@/components/dashboard/PropertiesChart'
import { api } from '@/lib/api'

export default function DashboardPage() {
  const { data: stats } = useQuery('dashboard-stats', async () => {
    const [properties, inquiries, news, gallery] = await Promise.all([
      api.get('/properties').then(res => res.data),
      api.get('/inquiries').then(res => res.data),
      api.get('/news').then(res => res.data),
      api.get('/gallery').then(res => res.data),
    ])

    return {
      totalProperties: properties.length,
      totalInquiries: inquiries.length,
      newInquiries: inquiries.filter((i: any) => i.status === 'new').length,
      totalNews: news.length,
      totalGallery: gallery.length,
    }
  })

  const { data: recentInquiries } = useQuery('recent-inquiries', async () => {
    const response = await api.get('/inquiries')
    return response.data.slice(0, 5)
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
          description="Customer inquiries received"
          icon="📧"
        />
        <StatsCard
          title="New Inquiries"
          value={stats?.newInquiries || 0}
          description="Unread inquiries"
          icon="🆕"
        />
        <StatsCard
          title="News Articles"
          value={stats?.totalNews || 0}
          description="Published articles"
          icon="📰"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Inquiries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Inquiries</CardTitle>
            <CardDescription>Latest customer inquiries</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentInquiries inquiries={recentInquiries || []} />
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