'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { Shield } from 'lucide-react'

export default function RiskManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [risks, setRisks] = useState<any[]>([])
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
      const [userRes, riskRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/risk').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setRisks(riskRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModulePageLayout
      user={user}
      title="Risk Management"
      subtitle="ISO 14971 — risk analysis and mitigation for Remidio ophthalmic devices and software"
      imageUrl="https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1200&q=80"
      imageAlt="Risk and safety"
      newButtonLabel="New Risk Assessment"
      accentColor="orange"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              Remidio risk scope
            </h2>
            <ul className="text-slate-700 space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">•</span> Device: FOP hardware, optics, electrical safety</li>
              <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">•</span> Software: mobile app, firmware (IEC 62304 / 62443)</li>
              <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">•</span> Use environment: clinical setting, user interaction</li>
              <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">•</span> Data & privacy: patient images, GDPR / HIPAA</li>
              <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">•</span> Supply chain and manufacturing</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 overflow-x-auto">
            <h2 className="font-semibold text-slate-900 mb-4">Risk matrix (Severity × Probability)</h2>
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 font-medium text-slate-700">Assessment #</th>
                  <th className="text-left py-3 font-medium text-slate-700">Hazard / Harm</th>
                  <th className="text-left py-3 font-medium text-slate-700">Score</th>
                  <th className="text-left py-3 font-medium text-slate-700">Level</th>
                  <th className="text-left py-3 font-medium text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                ) : risks.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">No risk assessments. Add one for each identified hazard.</td></tr>
                ) : (
                  risks.slice(0, 10).map((r: any) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-3 font-medium text-slate-900">{r.assessment_number}</td>
                      <td className="py-3 text-slate-700">{r.hazard} / {r.harm}</td>
                      <td className="py-3">{r.risk_score}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          r.risk_level === 'unacceptable' ? 'bg-red-100 text-red-700' :
                          r.risk_level === 'high' ? 'bg-orange-100 text-orange-700' :
                          r.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {r.risk_level}
                        </span>
                      </td>
                      <td className="py-3 capitalize text-slate-600">{r.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Risk levels</h3>
            <ul className="text-sm text-slate-700 space-y-2">
              <li><span className="font-medium text-red-600">Unacceptable</span> — must reduce</li>
              <li><span className="font-medium text-orange-600">High</span> — reduce or justify</li>
              <li><span className="font-medium text-amber-600">Medium</span> — reduce as far as practicable</li>
              <li><span className="font-medium text-emerald-600">Low</span> — monitor</li>
            </ul>
          </div>
          <div className="bg-orange-50 rounded-2xl p-4 text-sm text-slate-700 border border-orange-100">
            <strong className="text-orange-800">Compliance:</strong> ISO 14971 — Risk management for medical devices.
          </div>
        </div>
      </div>
    </ModulePageLayout>
  )
}
