'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  ClipboardCheck,
  Shield,
  MessageSquare,
  Users,
  LogOut,
} from 'lucide-react'

export default function DashboardNav({ user }: { user?: { first_name?: string; last_name?: string } | null }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/documents', label: 'Documents', icon: FileText },
    { href: '/dashboard/capa', label: 'CAPA', icon: AlertCircle },
    { href: '/dashboard/change-control', label: 'Change Control', icon: RefreshCw },
    { href: '/dashboard/training', label: 'Training', icon: GraduationCap },
    { href: '/dashboard/audit', label: 'Audit', icon: ClipboardCheck },
    { href: '/dashboard/risk', label: 'Risk', icon: Shield },
    { href: '/dashboard/complaint', label: 'Complaints', icon: MessageSquare },
    { href: '/dashboard/users', label: 'Users', icon: Users },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent"
          >
            Remidio eQMS
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-100 text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              )
            })}
            <div className="w-px h-6 bg-slate-200 mx-1" />
            {user && (
              <span className="text-slate-600 text-sm font-medium px-2">
                {user.first_name} {user.last_name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 text-sm font-medium transition"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
