import { formatDistanceToNow } from 'date-fns'

interface Inquiry {
  id: string
  name: string
  email: string
  message: string
  status: string
  createdAt: string
  property?: {
    title: string
  }
}

interface RecentInquiriesProps {
  inquiries: Inquiry[]
}

export function RecentInquiries({ inquiries }: RecentInquiriesProps) {
  if (inquiries.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500">No recent inquiries</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {inquiries.map((inquiry) => (
        <div key={inquiry.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {inquiry.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 truncate">
                {inquiry.name}
              </p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                inquiry.status === 'new' 
                  ? 'bg-red-100 text-red-800'
                  : inquiry.status === 'contacted'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {inquiry.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">
              {inquiry.email?.trim() ? inquiry.email : 'No email on file'}
            </p>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {inquiry.message}
            </p>
            {inquiry.property && (
              <p className="text-xs text-gray-400 mt-1">
                Property: {inquiry.property.title}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}