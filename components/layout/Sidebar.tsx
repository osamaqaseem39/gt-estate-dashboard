'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Home,
  Building2,
  Image,
  Newspaper,
  Mail,
  Star,
  Users,
  Info,
  FileText,
  Briefcase,
  Calendar,
  CreditCard,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

interface NavDropdown {
  name: string
  icon: LucideIcon
  items: NavItem[]
}

const topLevelItems: NavItem[] = [{ name: 'Dashboard', href: '/dashboard', icon: Home }]

const contentItems: NavItem[] = [
  { name: 'Properties / Projects', href: '/dashboard/properties', icon: Building2 },
  { name: 'Payment Plans', href: '/dashboard/payment-plans', icon: CreditCard },
  { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Pages / SEO', href: '/dashboard/pages', icon: FileText },
]

const navDropdowns: NavDropdown[] = [
  {
    name: 'About',
    icon: Info,
    items: [
      { name: 'Events', href: '/dashboard/events', icon: Calendar },
      { name: 'Gallery', href: '/dashboard/gallery', icon: Image },
    ],
  },
  {
    name: 'Company',
    icon: Building2,
    items: [
      { name: 'What We Do', href: '/dashboard/what-we-do', icon: Info },
      { name: 'Blog', href: '/dashboard/news', icon: Newspaper },
      { name: 'Careers', href: '/dashboard/careers', icon: Briefcase },
    ],
  },
]

const leadsGroup: NavGroup = {
  label: 'Leads',
  items: [{ name: 'Inquiries', href: '/dashboard/inquiries', icon: Mail }],
}

function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = isNavActive(pathname, item.href)

  return (
    <Link
      href={item.href}
      className={cn(
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-700 hover:bg-gray-50 hover:text-primary-700',
        'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
      )}
    >
      <item.icon
        className={cn(
          isActive ? 'text-primary-700' : 'text-gray-400 group-hover:text-primary-700',
          'h-6 w-6 shrink-0',
        )}
        aria-hidden="true"
      />
      {item.name}
    </Link>
  )
}

function NavDropdownSection({ dropdown, pathname }: { dropdown: NavDropdown; pathname: string }) {
  const hasActiveChild = dropdown.items.some((item) => isNavActive(pathname, item.href))
  const [open, setOpen] = useState(hasActiveChild)

  useEffect(() => {
    if (hasActiveChild) setOpen(true)
  }, [hasActiveChild])

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          hasActiveChild
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-700 hover:bg-gray-50 hover:text-primary-700',
          'group flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
        )}
      >
        <dropdown.icon
          className={cn(
            hasActiveChild ? 'text-primary-700' : 'text-gray-400 group-hover:text-primary-700',
            'h-6 w-6 shrink-0',
          )}
          aria-hidden="true"
        />
        <span className="flex-1 text-left">{dropdown.name}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180',
            hasActiveChild && 'text-primary-700',
          )}
        />
      </button>
      {open && (
        <ul role="list" className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-2">
          {dropdown.items.map((item) => {
            const isActive = isNavActive(pathname, item.href)
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-primary-700',
                    'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6',
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? 'text-primary-700' : 'text-gray-400 group-hover:text-primary-700',
                      'h-5 w-5 shrink-0',
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

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
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {topLevelItems.map((item) => (
                  <li key={item.name}>
                    <NavLink item={item} pathname={pathname} />
                  </li>
                ))}
              </ul>
            </li>

            <li>
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Content</p>
              <ul role="list" className="-mx-2 space-y-1">
                {contentItems.map((item) => (
                  <li key={item.name}>
                    <NavLink item={item} pathname={pathname} />
                  </li>
                ))}
                {navDropdowns.map((dropdown) => (
                  <NavDropdownSection key={dropdown.name} dropdown={dropdown} pathname={pathname} />
                ))}
              </ul>
            </li>

            <li>
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {leadsGroup.label}
              </p>
              <ul role="list" className="-mx-2 space-y-1">
                {leadsGroup.items.map((item) => (
                  <li key={item.name}>
                    <NavLink item={item} pathname={pathname} />
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
