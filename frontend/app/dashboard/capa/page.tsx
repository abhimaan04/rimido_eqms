'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { AlertCircle } from 'lucide-react'

export default function CAPAManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [capaList, setCapaList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
      const [userRes, capaRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/capa').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setCapaList(capaRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModulePageLayout
      user={user}
      title="CAPA Management"
      subtitle="Corrective and Preventive Actions — Remidio devices, processes, and quality system"
      imageUrl="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80"
      imageAlt="Quality and improvement"
      newButtonLabel="New CAPA"
      newButtonHref="#new-capa"
      accentColor="red"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div
            id="new-capa"
            className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6"
          >
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Remidio CAPA sources
            </h2>
            <ul className="text-slate-700 space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Customer complaints (FOP device performance, usability)</li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Internal audits and management review</li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Non-conformances and deviations in production</li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Post-market surveillance and adverse events</li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Software defects (IEC 62304) and risk findings</li>
            </ul>

            <h3 className="mt-5 font-semibold text-slate-900">Function</h3>
            <ul className="mt-2 text-slate-700 space-y-1.5 text-sm">
              <li>• Create CAPA records</li>
              <li>• Identify root causes of issues</li>
              <li>• Define corrective and preventive actions</li>
              <li>• Track CAPA status (Open / In Progress / Closed)</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">CAPA records</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500"><div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> Loading...</div>
            ) : capaList.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No CAPA records. Create one when a corrective or preventive action is required.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {capaList.slice(0, 10).map((c: any) => (
                  <li key={c.id} className="py-4 flex items-center justify-between group hover:bg-slate-50 -mx-2 px-2 rounded-xl transition">
                    <div>
                      <span className="font-medium text-slate-900">{c.capa_number}</span>
                      <span className="text-slate-600 text-sm block">{c.title}</span>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${c.priority === 'critical' ? 'bg-red-100 text-red-700' : c.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                      {c.priority}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">CAPA workflow</h3>
            <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
              <li>Initiation (source, description)</li>
              <li>Investigation & root cause</li>
              <li>Action plan & implementation</li>
              <li>Effectiveness check</li>
              <li>Closure & e-signature</li>
            </ol>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 text-sm text-slate-700 border border-red-100">
            <strong className="text-red-800">Compliance:</strong> ISO 13485:2016 Clause 8.5.2–8.5.3 — Corrective and preventive actions.
          </div>
        </div>
      </div>
    </ModulePageLayout>
  )
}
