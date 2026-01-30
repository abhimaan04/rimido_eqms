'use client'

import Image from 'next/image'
import Link from 'next/link'
import DashboardNav from './DashboardNav'
import { Plus } from 'lucide-react'

interface ModulePageLayoutProps {
  user: any
  title: string
  subtitle: string
  imageUrl: string
  imageAlt: string
  children: React.ReactNode
  newButtonLabel?: string
  newButtonHref?: string
  newButtonOnClick?: () => void
  accentColor?: 'blue' | 'red' | 'emerald' | 'violet' | 'amber' | 'orange' | 'pink' | 'indigo'
}

const accentMap = {
  blue: 'from-blue-500 to-sky-500',
  red: 'from-red-500 to-rose-500',
  emerald: 'from-emerald-500 to-green-500',
  violet: 'from-violet-500 to-purple-500',
  amber: 'from-amber-500 to-yellow-500',
  orange: 'from-orange-500 to-amber-500',
  pink: 'from-pink-500 to-rose-500',
  indigo: 'from-indigo-500 to-blue-500',
}

export default function ModulePageLayout({
  user,
  title,
  subtitle,
  imageUrl,
  imageAlt,
  children,
  newButtonLabel = 'New',
  newButtonHref = '#',
  newButtonOnClick,
  accentColor = 'blue',
}: ModulePageLayoutProps) {
  const gradient = accentMap[accentColor]

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav user={user} />

      {/* Hero with image */}
      <section className="relative h-48 lg:h-56 overflow-hidden bg-gradient-to-br from-sky-600 to-blue-700">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20" />
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 pb-6 lg:pb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">
              {title}
            </h1>
            <p className="text-sky-100 mt-1 text-lg">
              {subtitle}
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8 -mt-4 relative z-10">
        <div className="flex flex-wrap items-center justify-end gap-4 mb-6">
          {newButtonLabel && (
            newButtonOnClick ? (
              <button
                onClick={newButtonOnClick}
                className={`inline-flex items-center gap-2 bg-gradient-to-r ${gradient} text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:opacity-95 transition`}
              >
                <Plus size={18} />
                {newButtonLabel}
              </button>
            ) : (
              <Link
                href={newButtonHref}
                className={`inline-flex items-center gap-2 bg-gradient-to-r ${gradient} text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:opacity-95 transition`}
              >
                <Plus size={18} />
                {newButtonLabel}
              </Link>
            )
          )}
        </div>
        {children}
      </main>
    </div>
  )
}
