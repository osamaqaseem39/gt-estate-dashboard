'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Mail, Phone, MapPin, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

export default function InquiriesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  const { data: inquiries, refetch } = useQuery('inquiries', async () => {
    const response = await api.get('/inquiries')
    return response.data
  })

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/inquiries/${id}`, { status })
      toast.success('Inquiry status updated')
      refetch()
    } catch (error) {
      toast.error('Failed to update inquiry status')
    }
  }

  const filteredInquiries = inquiries?.filter((inquiry: any) => {
    const q = searchTerm.toLowerCase()
    const email = (inquiry.email || '').toLowerCase()
    const msg = (inquiry.message || '').toLowerCase()
    const phone = (inquiry.phone || '').toLowerCase()
    const matchesSearch =
      (inquiry.name || '').toLowerCase().includes(q) ||
      email.includes(q) ||
      msg.includes(q) ||
      phone.includes(q)
    
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
        <p className="text-gray-600">Manage customer inquiries and leads</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Inquiries</CardTitle>
              <CardDescription>
                {filteredInquiries.length} inquiries found
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search inquiries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInquiries.map((inquiry: any) => (
              <div key={inquiry.id} className="border rounded-lg p-6 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {inquiry.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        inquiry.status === 'new' 
                          ? 'bg-red-100 text-red-800'
                          : inquiry.status === 'contacted'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {inquiry.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        {inquiry.email?.trim() ? inquiry.email : '—'}
                      </div>
                      {inquiry.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {inquiry.phone}
                        </div>
                      )}
                      {inquiry.property && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {inquiry.property.title}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mb-3">{inquiry.message}</p>
                    
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    {inquiry.status === 'new' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(inquiry.id, 'contacted')}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark as Contacted
                      </Button>
                    )}
                    {inquiry.status === 'contacted' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(inquiry.id, 'closed')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
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
                      <Mail className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredInquiries.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No inquiries found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}