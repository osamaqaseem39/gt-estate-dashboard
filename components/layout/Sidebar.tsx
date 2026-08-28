'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Building2, Image, Newspaper, Mail, Star, Users, Info, FileText, type LucideIcon } from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

/**
 * Grouped so future sections (Events, Blog, Loan Applications, Payment Plans, ...)
 * can slot into an existing group instead of growing one flat list.
 */
const navigation: NavGroup[] = [
  {
    label: null,
    items: [{ name: 'Dashboard', href: '/dashboard', icon: Home }],
  },
  {
    label: 'Content',
    items: [
      { name: 'Properties / Projects', href: '/dashboard/properties', icon: Building2 },
      { name: 'Gallery', href: '/dashboard/gallery', icon: Image },
      { name: 'News', href: '/dashboard/news', icon: Newspaper },
      { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
      { name: 'Team', href: '/dashboard/team', icon: Users },
      { name: 'What We Do', href: '/dashboard/what-we-do', icon: Info },
      { name: 'Pages / SEO', href: '/dashboard/pages', icon: FileText },
    ],
  },
  {
    label: 'Leads',
    items: [{ name: 'Inquiries', href: '/dashboard/inquiries', icon: Mail }],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-sm">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-xl font-bold text-gray-900">Real Estate</h1>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-6">
            {navigation.map((group, groupIdx) => (
              <li key={group.label ?? `group-${groupIdx}`}>
                {group.label && (
                  <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {group.label}
                  </p>
                )}
                <ul role="list" className="-mx-2 space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            isActive
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-gray-700 hover:text-primary-700 hover:bg-gray-50',
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                          )}
                        >
                          <item.icon
                            className={cn(
                              isActive ? 'text-primary-700' : 'text-gray-400 group-hover:text-primary-700',
                              'h-6 w-6 shrink-0'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
