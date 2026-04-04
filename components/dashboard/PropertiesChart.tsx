'use client'

import { useQuery } from 'react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { api } from '@/lib/api'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function PropertiesChart() {
  const { data: properties } = useQuery('properties-chart', async () => {
    const response = await api.get('/properties')
    return response.data
  })
  

  if (!properties) {
    return <div className="h-64 flex items-center justify-center">Loading...</div>
  }

  // Group by type
  const typeData = properties.reduce((acc: any, property: any) => {
    const type = property.type || 'Other'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const chartData = Object.entries(typeData).map(([type, count]) => ({
    type,
    count,
  }))

  // Group by status
  const statusData = properties.reduce((acc: any, property: any) => {
    const status = property.status || 'Unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const statusChartData = Object.entries(statusData).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Properties by Type</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ type, count }) => `${type}: ${count}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Properties by Status</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={statusChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}