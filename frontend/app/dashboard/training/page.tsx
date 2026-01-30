'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { GraduationCap, X } from 'lucide-react'

export default function TrainingManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [newRecord, setNewRecord] = useState({
    user_id: '',
    program_id: '',
    training_date: '',
    trainer_id: '',
    completion_date: '',
    status: 'scheduled',
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
      const [userRes, progRes, recRes, usersRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/training/programs').catch(() => ({ data: { data: [] } })),
        api.get('/training/records').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setPrograms(progRes.data.data || [])
      setRecords(recRes.data.data || [])
      setUsers(usersRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/training/records', {
        ...newRecord,
        trainer_id: newRecord.trainer_id || null,
        completion_date: newRecord.completion_date || null,
      })
      alert('Training record created successfully!')
      setShowCreateModal(false)
      setNewRecord({
        user_id: '',
        program_id: '',
        training_date: '',
        trainer_id: '',
        completion_date: '',
        status: 'scheduled',
      })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create training record')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModulePageLayout
      user={user}
      title="Training Management"
      subtitle="Competence and training records — Remidio personnel and role-based requirements"
      imageUrl="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80"
      imageAlt="Training and learning"
      newButtonLabel="New Training Record"
      newButtonOnClick={() => setShowCreateModal(true)}
      accentColor="violet"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-violet-600" />
              Remidio training scope
            </h2>
            <ul className="text-slate-700 space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">•</span> QMS and GDP (Good Documentation Practice)</li>
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">•</span> Device handling: FOP cameras, accessories, calibration</li>
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">•</span> Software use (mobile app, desktop tools)</li>
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">•</span> Regulatory awareness (ISO 13485, MDR, FDA)</li>
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">•</span> Risk management and CAPA awareness</li>
            </ul>

            <h3 className="mt-5 font-semibold text-slate-900">Function</h3>
            <ul className="mt-2 text-slate-700 space-y-1.5 text-sm">
              <li>• Assign training to users</li>
              <li>• Track training completion</li>
              <li>• Record training effectiveness</li>
              <li>• Maintain training history</li>
            </ul>
          </div>

          <div
            id="assign-training"
            className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6"
          >
            <h2 className="font-semibold text-slate-900 mb-4">Training programs</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /> Loading...</div>
            ) : programs.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No training programs defined yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {programs.slice(0, 8).map((p: any) => (
                  <li key={p.id} className="py-3 flex justify-between items-center hover:bg-slate-50 -mx-2 px-2 rounded-xl transition">
                    <span className="font-medium text-slate-900">{p.title}</span>
                    <span className="text-slate-500 text-sm">{p.program_code}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            id="record-completion"
            className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6"
          >
            <h2 className="font-semibold text-slate-900 mb-4">Recent training records</h2>
            {records.length === 0 ? (
              <p className="text-slate-500 py-6 text-center">No training records yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {records.slice(0, 5).map((r: any) => (
                  <li key={r.id} className="py-2 flex justify-between text-sm hover:bg-slate-50 -mx-2 px-2 rounded-xl transition">
                    <span>{r.user_name} — {r.program_title}</span>
                    <span className="text-slate-500">{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Quick actions</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#assign-training" className="text-violet-600 hover:underline">Assign training</Link></li>
              <li><Link href="#record-completion" className="text-violet-600 hover:underline">Record completion</Link></li>
              <li><Link href="#due-report" className="text-violet-600 hover:underline">Due / overdue report</Link></li>
            </ul>
          </div>
          <div
            id="due-report"
            className="bg-violet-50 rounded-2xl p-4 text-sm text-slate-700 border border-violet-100"
          >
            <strong className="text-violet-800">Compliance:</strong> ISO 13485:2016 Clause 7.2 — Competence.
          </div>
        </div>
      </div>

      {/* Create Training Record Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Create New Training Record</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateRecord} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User *</label>
                <select
                  required
                  value={newRecord.user_id}
                  onChange={(e) => setNewRecord({ ...newRecord, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="">Select user...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Training Program *</label>
                <select
                  required
                  value={newRecord.program_id}
                  onChange={(e) => setNewRecord({ ...newRecord, program_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="">Select program...</option>
                  {programs.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title} ({p.program_code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Training Date *</label>
                  <input
                    type="date"
                    required
                    value={newRecord.training_date}
                    onChange={(e) => setNewRecord({ ...newRecord, training_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                  <select
                    required
                    value={newRecord.status}
                    onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Trainer</label>
                  <select
                    value={newRecord.trainer_id}
                    onChange={(e) => setNewRecord({ ...newRecord, trainer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="">Select trainer...</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Completion Date</label>
                  <input
                    type="date"
                    value={newRecord.completion_date}
                    onChange={(e) => setNewRecord({ ...newRecord, completion_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Training Record'}
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
