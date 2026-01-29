'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FileText, Shield, RefreshCw, GraduationCap, ClipboardCheck, AlertCircle, MessageSquare, ArrowRight } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 text-white">
        <Image
          src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1920&q=80"
          alt="Healthcare and quality"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent" />
        <div className="relative container mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Remidio eQMS
            </h1>
            <p className="text-xl text-sky-100 mb-2">
              Electronic Quality Management System
            </p>
            <p className="text-sky-100/90 mb-8">
              FDA 21 CFR Part 11 Compliant • ISO 13485:2016 • ISO 14971 — Built for Remidio Innovative Solutions and ophthalmic diagnostics.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-sky-700 px-6 py-3 rounded-xl font-semibold hover:bg-sky-50 transition shadow-lg"
              >
                Sign in
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/30 px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Compliance badges */}
      <section className="border-b border-slate-200 bg-white py-6">
        <div className="container mx-auto px-4 flex flex-wrap justify-center gap-8 text-slate-600 text-sm font-medium">
          <span className="flex items-center gap-2">✅ ISO 13485:2016</span>
          <span className="flex items-center gap-2">✅ ISO 14971</span>
          <span className="flex items-center gap-2">✅ FDA 21 CFR Part 11</span>
          <span className="flex items-center gap-2">✅ IEC 62304</span>
          <span className="flex items-center gap-2">✅ GDPR / HIPAA</span>
        </div>
      </section>

      {/* Modules grid */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">Core modules</h2>
        <p className="text-slate-600 text-center max-w-2xl mx-auto mb-12">
          Everything you need to run a compliant quality system for medical devices — documents, CAPA, change control, training, audits, risk, and complaints.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: FileText, label: 'Document Control', color: 'from-blue-500 to-sky-500', bg: 'bg-blue-50' },
            { icon: AlertCircle, label: 'CAPA Management', color: 'from-red-500 to-rose-500', bg: 'bg-red-50' },
            { icon: RefreshCw, label: 'Change Control', color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50' },
            { icon: GraduationCap, label: 'Training Management', color: 'from-violet-500 to-purple-500', bg: 'bg-violet-50' },
            { icon: ClipboardCheck, label: 'Audit Management', color: 'from-amber-500 to-yellow-500', bg: 'bg-amber-50' },
            { icon: Shield, label: 'Risk Management', color: 'from-orange-500 to-amber-500', bg: 'bg-orange-50' },
            { icon: MessageSquare, label: 'Complaint Handling', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-50' },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className={`${item.bg} rounded-2xl p-6 card-hover border border-white/50 shadow-soft animate-slide-up`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900">{item.label}</h3>
                <p className="text-slate-600 text-sm mt-1">Compliant workflows & traceability</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
          <p className="text-slate-300 mb-6">Sign in to access Remidio eQMS.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-sky-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-sky-600 transition"
          >
            Sign in
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
