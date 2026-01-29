'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import api from '@/lib/api'
import DashboardNav from '@/components/DashboardNav'
import {
  FileText,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  ClipboardCheck,
  Shield,
  MessageSquare,
  Users,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>({})

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    loadData()
  }, [router])

  const loadData = async () => {
    try {
      const [userRes, docsRes, capaRes, changeRes, trainingRes, auditRes, riskRes, complaintRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/documents?status=under_review').catch(() => ({ data: { data: [] } })),
        api.get('/capa?status=initiated').catch(() => ({ data: { data: [] } })),
        api.get('/change-control?status=initiated').catch(() => ({ data: { data: [] } })),
        api.get('/training/records?status=scheduled').catch(() => ({ data: { data: [] } })),
        api.get('/audit?status=planned').catch(() => ({ data: { data: [] } })),
        api.get('/risk?status=new').catch(() => ({ data: { data: [] } })),
        api.get('/complaint?status=received').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setStats({
        pendingDocuments: docsRes.data.data.length,
        pendingCAPA: capaRes.data.data.length,
        pendingChanges: changeRes.data.data.length,
        scheduledTraining: trainingRes.data.data.length,
        plannedAudits: auditRes.data.data.length,
        newRisks: riskRes.data.data.length,
        newComplaints: complaintRes.data.data.length,
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const modules = [
    { name: 'Document Control', icon: FileText, href: '/dashboard/documents', gradient: 'from-blue-500 to-sky-500', count: stats.pendingDocuments },
    { name: 'CAPA Management', icon: AlertCircle, href: '/dashboard/capa', gradient: 'from-red-500 to-rose-500', count: stats.pendingCAPA },
    { name: 'Change Control', icon: RefreshCw, href: '/dashboard/change-control', gradient: 'from-emerald-500 to-green-500', count: stats.pendingChanges },
    { name: 'Training Management', icon: GraduationCap, href: '/dashboard/training', gradient: 'from-violet-500 to-purple-500', count: stats.scheduledTraining },
    { name: 'Audit Management', icon: ClipboardCheck, href: '/dashboard/audit', gradient: 'from-amber-500 to-yellow-500', count: stats.plannedAudits },
    { name: 'Risk Management', icon: Shield, href: '/dashboard/risk', gradient: 'from-orange-500 to-amber-500', count: stats.newRisks },
    { name: 'Complaint Handling', icon: MessageSquare, href: '/dashboard/complaint', gradient: 'from-pink-500 to-rose-500', count: stats.newComplaints },
    { name: 'User Management', icon: Users, href: '/dashboard/users', gradient: 'from-indigo-500 to-blue-500' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav user={user} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 text-white">
        <Image
          src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&q=80"
          alt="Quality management"
          fill
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent" />
        <div className="relative container mx-auto px-4 py-10 lg:py-14">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">
                Welcome back{user?.first_name ? `, ${user.first_name}` : ''}
              </h1>
              <p className="text-sky-100 text-lg">
                Remidio eQMS — Electronic Quality Management System
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-emerald-300" />
                ISO 13485:2016
              </span>
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-emerald-300" />
                FDA 21 CFR Part 11
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Modules</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <Link
                key={module.name}
                href={module.href}
                className="group bg-white rounded-2xl p-6 shadow-soft border border-slate-100 card-hover overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  {module.count !== undefined && module.count > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      {module.count}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-sky-600 transition-colors">
                  {module.name}
                </h3>
                <p className="text-slate-500 text-sm mt-1 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Open
                  <ArrowRight className="w-4 h-4" />
                </p>
              </Link>
            )
          })}
        </div>

        <div className="mt-10 bg-white rounded-2xl p-6 shadow-soft border border-slate-100">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">System information</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span><strong className="text-slate-700">Compliance:</strong> ISO 13485, FDA 21 CFR Part 11, ISO 14971</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
              <span className="text-slate-500">Version</span>
              <span className="font-semibold text-slate-900">1.0.0</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-emerald-700">Operational</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
              <span className="text-slate-500">Audit trail</span>
              <span className="font-medium text-slate-900">Enabled</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
