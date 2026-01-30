'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { RefreshCw, X } from 'lucide-react'

export default function ChangeControlPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [changes, setChanges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [newChange, setNewChange] = useState({
    title: '',
    change_type: 'design',
    priority: 'medium',
    description: '',
    reason_for_change: '',
    proposed_change: '',
    impact_analysis: '',
    owner_id: '',
    target_completion_date: '',
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
      const [userRes, changeRes, usersRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/change-control').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setChanges(changeRes.data.data || [])
      setUsers(usersRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/change-control', {
        ...newChange,
        owner_id: newChange.owner_id || null,
        target_completion_date: newChange.target_completion_date || null,
        impact_analysis: newChange.impact_analysis || null,
      })
      alert('Change request created successfully!')
      setShowCreateModal(false)
      setNewChange({
        title: '',
        change_type: 'design',
        priority: 'medium',
        description: '',
        reason_for_change: '',
        proposed_change: '',
        impact_analysis: '',
        owner_id: '',
        target_completion_date: '',
      })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create change request')
    } finally {
      setSubmitting(false)
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
      newButtonOnClick={() => setShowCreateModal(true)}
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

      {/* Create Change Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Create New Change Request</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateChange} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newChange.title}
                  onChange={(e) => setNewChange({ ...newChange, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Change request title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Change Type *</label>
                  <select
                    required
                    value={newChange.change_type}
                    onChange={(e) => setNewChange({ ...newChange, change_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="design">Design</option>
                    <option value="software">Software</option>
                    <option value="process">Process</option>
                    <option value="documentation">Documentation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority *</label>
                  <select
                    required
                    value={newChange.priority}
                    onChange={(e) => setNewChange({ ...newChange, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  required
                  value={newChange.description}
                  onChange={(e) => setNewChange({ ...newChange, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Describe the change..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Change *</label>
                <textarea
                  required
                  value={newChange.reason_for_change}
                  onChange={(e) => setNewChange({ ...newChange, reason_for_change: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Why is this change needed?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proposed Change *</label>
                <textarea
                  required
                  value={newChange.proposed_change}
                  onChange={(e) => setNewChange({ ...newChange, proposed_change: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="What is the proposed change?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Impact Analysis</label>
                <textarea
                  value={newChange.impact_analysis}
                  onChange={(e) => setNewChange({ ...newChange, impact_analysis: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Impact on devices, documents, training, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Owner</label>
                  <select
                    value={newChange.owner_id}
                    onChange={(e) => setNewChange({ ...newChange, owner_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Select owner...</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Completion Date</label>
                  <input
                    type="date"
                    value={newChange.target_completion_date}
                    onChange={(e) => setNewChange({ ...newChange, target_completion_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Change Request'}
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
