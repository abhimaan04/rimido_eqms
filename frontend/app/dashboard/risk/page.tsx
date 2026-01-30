'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { Shield, X } from 'lucide-react'

export default function RiskManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [risks, setRisks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [newRisk, setNewRisk] = useState({
    title: '',
    product_component: '',
    hazard: '',
    hazard_situation: '',
    harm: '',
    severity: '3',
    probability: '3',
    current_controls: '',
    mitigation_measures: '',
    reviewer_id: '',
  })

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
      const [userRes, riskRes, usersRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/risk').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setRisks(riskRes.data.data || [])
      setUsers(usersRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/risk', {
        ...newRisk,
        severity: parseInt(newRisk.severity),
        probability: parseInt(newRisk.probability),
        reviewer_id: newRisk.reviewer_id || null,
        current_controls: newRisk.current_controls || null,
        mitigation_measures: newRisk.mitigation_measures || null,
        product_component: newRisk.product_component || null,
      })
      alert('Risk assessment created successfully!')
      setShowCreateModal(false)
      setNewRisk({
        title: '',
        product_component: '',
        hazard: '',
        hazard_situation: '',
        harm: '',
        severity: '3',
        probability: '3',
        current_controls: '',
        mitigation_measures: '',
        reviewer_id: '',
      })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create risk assessment')
    } finally {
      setSubmitting(false)
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
      newButtonOnClick={() => setShowCreateModal(true)}
      accentColor="orange"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div
            id="new-risk"
            className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6"
          >
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

            <h3 className="mt-5 font-semibold text-slate-900">Function</h3>
            <ul className="mt-2 text-slate-700 space-y-1.5 text-sm">
              <li>• Identify risks</li>
              <li>• Analyze risk severity and probability</li>
              <li>• Record mitigation actions</li>
              <li>• Track residual risk</li>
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

      {/* Create Risk Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Create New Risk Assessment</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateRisk} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newRisk.title}
                  onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Risk assessment title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product/Component</label>
                <input
                  type="text"
                  value={newRisk.product_component}
                  onChange={(e) => setNewRisk({ ...newRisk, product_component: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., FOP Camera, Mobile App"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hazard *</label>
                <input
                  type="text"
                  required
                  value={newRisk.hazard}
                  onChange={(e) => setNewRisk({ ...newRisk, hazard: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Potential hazard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hazard Situation *</label>
                <textarea
                  required
                  value={newRisk.hazard_situation}
                  onChange={(e) => setNewRisk({ ...newRisk, hazard_situation: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Describe the situation where hazard occurs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Harm *</label>
                <input
                  type="text"
                  required
                  value={newRisk.harm}
                  onChange={(e) => setNewRisk({ ...newRisk, harm: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Potential harm to patient/user"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Severity (1-5) *</label>
                  <select
                    required
                    value={newRisk.severity}
                    onChange={(e) => setNewRisk({ ...newRisk, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="1">1 - Negligible</option>
                    <option value="2">2 - Minor</option>
                    <option value="3">3 - Moderate</option>
                    <option value="4">4 - Major</option>
                    <option value="5">5 - Catastrophic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Probability (1-5) *</label>
                  <select
                    required
                    value={newRisk.probability}
                    onChange={(e) => setNewRisk({ ...newRisk, probability: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="1">1 - Rare</option>
                    <option value="2">2 - Unlikely</option>
                    <option value="3">3 - Possible</option>
                    <option value="4">4 - Probable</option>
                    <option value="5">5 - Frequent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Controls</label>
                <textarea
                  value={newRisk.current_controls}
                  onChange={(e) => setNewRisk({ ...newRisk, current_controls: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Existing risk controls"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mitigation Measures</label>
                <textarea
                  value={newRisk.mitigation_measures}
                  onChange={(e) => setNewRisk({ ...newRisk, mitigation_measures: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Proposed mitigation actions"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reviewer</label>
                <select
                  value={newRisk.reviewer_id}
                  onChange={(e) => setNewRisk({ ...newRisk, reviewer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select reviewer...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Risk Assessment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePageLayout>
  )
}
