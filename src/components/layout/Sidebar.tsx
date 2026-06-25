'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  PlusCircle,
  Library,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
    description: 'Overview & recent jobs',
  },
  {
    href: '/dashboard/new',
    label: 'New Content',
    icon: PlusCircle,
    exact: false,
    description: 'Submit a content job',
  },
  {
    href: '/dashboard/library',
    label: 'Library',
    icon: Library,
    exact: false,
    description: 'All generated content',
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 flex-col items-start justify-center border-b border-gray-200 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://jbrktjnscnzmhwupojiu.supabase.co/storage/v1/object/public/assets/freshcan-logo-white.jpeg"
          alt="Fresh-CAN"
          className="h-9 w-auto max-w-[160px] rounded-md object-contain"
        />
        <p className="mt-0.5 text-[10px] text-gray-400 pl-0.5">Content Studio</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Menu
        </p>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110',
                  active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600',
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="rounded-lg bg-green-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-green-700">Fresh-CAN Brand</p>
          <p className="mt-0.5 text-[10px] text-green-600">
            AI Content Automation v1.0
          </p>
        </div>
      </div>
    </aside>
  )
}
