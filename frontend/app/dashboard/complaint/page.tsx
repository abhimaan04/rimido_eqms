'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { MessageSquare } from 'lucide-react'

export default function ComplaintHandlingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [complaints, setComplaints] = useState<any[]>([])
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
      const [userRes, compRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/complaint').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setComplaints(compRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModulePageLayout
      user={user}
      title="Complaint & Deviation Handling"
      subtitle="Customer complaints, deviations, and non-conformances — Remidio devices and post-market feedback"
      imageUrl="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80"
      imageAlt="Customer feedback"
      newButtonLabel="New Complaint"
      newButtonHref="#new-complaint"
      accentColor="pink"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div
            id="new-complaint"
            className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6"
          >
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-pink-600" />
              Remidio handling scope
            </h2>
            <ul className="text-slate-700 space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-pink-500 mt-0.5">•</span> <strong>Complaints</strong> — customer reports on device performance, usability, software</li>
              <li className="flex items-start gap-2"><span className="text-pink-500 mt-0.5">•</span> <strong>Deviations</strong> — material, process, or spec deviations in production</li>
              <li className="flex items-start gap-2"><span className="text-pink-500 mt-0.5">•</span> <strong>Non-conformances</strong> — audit findings, inspections, process NCs</li>
              <li className="flex items-start gap-2"><span className="text-pink-500 mt-0.5">•</span> Link to CAPA and MDR vigilance where applicable</li>
            </ul>

            <h3 className="mt-5 font-semibold text-slate-900">Function</h3>
            <ul className="mt-2 text-slate-700 space-y-1.5 text-sm">
              <li>• Log customer or product complaints</li>
              <li>• Investigate complaint root cause</li>
              <li>• Link complaints to CAPA</li>
              <li>• Track complaint resolution</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Complaint records</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500"><div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /> Loading...</div>
            ) : complaints.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No complaints recorded. Log customer feedback and deviations here.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {complaints.slice(0, 10).map((c: any) => (
                  <li key={c.id} className="py-4 flex items-center justify-between group hover:bg-slate-50 -mx-2 px-2 rounded-xl transition">
                    <div>
                      <span className="font-medium text-slate-900">{c.complaint_number}</span>
                      <span className="text-slate-600 text-sm block">{c.description?.slice(0, 60)}...</span>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${c.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                      {c.severity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Workflow</h3>
            <ul className="text-sm text-slate-700 space-y-2">
              <li>• Receive & register</li>
              <li>• Triage & severity</li>
              <li>• Investigate & root cause</li>
              <li>• CAPA / corrective action</li>
              <li>• Respond to customer & close</li>
            </ul>
          </div>
          <div className="bg-pink-50 rounded-2xl p-4 text-sm text-slate-700 border border-pink-100">
            <strong className="text-pink-800">Compliance:</strong> ISO 13485:2016 Clause 8.2.1 — Feedback; MDR Article 83 — Post-market surveillance.
          </div>
        </div>
      </div>
    </ModulePageLayout>
  )
}
