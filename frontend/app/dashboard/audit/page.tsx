'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { ClipboardCheck } from 'lucide-react'

export default function AuditManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [audits, setAudits] = useState<any[]>([])
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
      const [userRes, auditRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/audit').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setAudits(auditRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModulePageLayout
      user={user}
      title="Audit Management"
      subtitle="Internal, external, and regulatory audits — Remidio QMS and product compliance"
      imageUrl="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80"
      imageAlt="Audit and compliance"
      newButtonLabel="New Audit Plan"
      accentColor="amber"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-amber-600" />
              Audit types at Remidio
            </h2>
            <ul className="text-slate-700 space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> <strong>Internal</strong> — QMS, design, manufacturing, software (IEC 62304)</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> <strong>External</strong> — notified body, customer, partner</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> <strong>Regulatory</strong> — FDA, MDR/IVDR, country-specific</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> <strong>Supplier</strong> — critical suppliers and service providers</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Audit schedule</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> Loading...</div>
            ) : audits.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No audits planned. Create an audit plan to schedule internal or external audits.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {audits.slice(0, 10).map((a: any) => (
                  <li key={a.id} className="py-4 flex items-center justify-between group hover:bg-slate-50 -mx-2 px-2 rounded-xl transition">
                    <div>
                      <span className="font-medium text-slate-900">{a.audit_number}</span>
                      <span className="text-slate-600 text-sm block">{a.audit_type} — {a.scope?.slice(0, 50)}...</span>
                    </div>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">{a.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Audit process</h3>
            <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
              <li>Plan (scope, standard, team, dates)</li>
              <li>Conduct (checklists, evidence)</li>
              <li>Findings (NC, observation, OFI)</li>
              <li>Report & CAPA linkage</li>
              <li>Close & follow-up</li>
            </ol>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-sm text-slate-700 border border-amber-100">
            <strong className="text-amber-800">Compliance:</strong> ISO 13485:2016 Clause 8.2 — Internal audit.
          </div>
        </div>
      </div>
    </ModulePageLayout>
  )
}
