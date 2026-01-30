'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { RefreshCw } from 'lucide-react'

export default function ChangeControlPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [changes, setChanges] = useState<any[]>([])
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
      const [userRes, changeRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/change-control').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setChanges(changeRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModulePageLayout
      user={user}
      title="Change Control"
      subtitle="Engineering Change Orders (ECOs) — design, process, software, and documentation changes at Remidio"
      imageUrl="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80"
      imageAlt="Change and collaboration"
      newButtonLabel="New Change Request"
      accentColor="emerald"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div
            id="new-change"
            className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6"
          >
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-600" />
              Change types at Remidio
            </h2>
            <ul className="text-slate-700 space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span> <strong>Design</strong> — hardware, optics, mechanical (FOP devices)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span> <strong>Software</strong> — app and firmware (IEC 62304)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span> <strong>Process</strong> — manufacturing, calibration, servicing</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span> <strong>Documentation</strong> — SOPs, labels, IFU</li>
            </ul>

            <h3 className="mt-5 font-semibold text-slate-900">Function</h3>
            <ul className="mt-2 text-slate-700 space-y-1.5 text-sm">
              <li>• Submit change requests</li>
              <li>• Evaluate impact of changes</li>
              <li>• Approve or reject changes</li>
              <li>• Maintain change history</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Change control records</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Loading...</div>
            ) : changes.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No change requests. Initiate an ECO for any design, process, or document change.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {changes.slice(0, 10).map((c: any) => (
                  <li key={c.id} className="py-4 flex items-center justify-between group hover:bg-slate-50 -mx-2 px-2 rounded-xl transition">
                    <div>
                      <span className="font-medium text-slate-900">{c.change_number}</span>
                      <span className="text-slate-600 text-sm block">{c.title}</span>
                    </div>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">{c.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">ECO workflow</h3>
            <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
              <li>Initiation & impact analysis</li>
              <li>Review & risk assessment</li>
              <li>Change board approval</li>
              <li>Implementation & verification</li>
              <li>Closure & documentation</li>
            </ol>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 text-sm text-slate-700 border border-emerald-100">
            <strong className="text-emerald-800">Compliance:</strong> ISO 13485:2016 design & development changes; IEC 62304 for software changes.
          </div>
        </div>
      </div>
    </ModulePageLayout>
  )
}
