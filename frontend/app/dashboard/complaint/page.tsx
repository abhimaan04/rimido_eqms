'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { MessageSquare, X } from 'lucide-react'

export default function ComplaintHandlingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [newComplaint, setNewComplaint] = useState({
    received_date: '',
    reported_by: '',
    contact_info: '',
    product_name: '',
    product_lot_batch: '',
    product_serial_number: '',
    description: '',
    severity: 'medium',
    category: '',
    owner_id: '',
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
      const [userRes, compRes, usersRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/complaint').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setComplaints(compRes.data.data || [])
      setUsers(usersRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/complaint', {
        ...newComplaint,
        reported_by: newComplaint.reported_by || null,
        contact_info: newComplaint.contact_info || null,
        product_name: newComplaint.product_name || null,
        product_lot_batch: newComplaint.product_lot_batch || null,
        product_serial_number: newComplaint.product_serial_number || null,
        category: newComplaint.category || null,
        owner_id: newComplaint.owner_id || null,
      })
      alert('Complaint created successfully!')
      setShowCreateModal(false)
      setNewComplaint({
        received_date: '',
        reported_by: '',
        contact_info: '',
        product_name: '',
        product_lot_batch: '',
        product_serial_number: '',
        description: '',
        severity: 'medium',
        category: '',
        owner_id: '',
      })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create complaint')
    } finally {
      setSubmitting(false)
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
      newButtonOnClick={() => setShowCreateModal(true)}
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

      {/* Create Complaint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Create New Complaint</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateComplaint} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Received Date *</label>
                <input
                  type="date"
                  required
                  value={newComplaint.received_date}
                  onChange={(e) => setNewComplaint({ ...newComplaint, received_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reported By</label>
                  <input
                    type="text"
                    value={newComplaint.reported_by}
                    onChange={(e) => setNewComplaint({ ...newComplaint, reported_by: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Info</label>
                  <input
                    type="text"
                    value={newComplaint.contact_info}
                    onChange={(e) => setNewComplaint({ ...newComplaint, contact_info: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Email or phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={newComplaint.product_name}
                    onChange={(e) => setNewComplaint({ ...newComplaint, product_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="e.g., FOP Camera"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lot/Batch</label>
                  <input
                    type="text"
                    value={newComplaint.product_lot_batch}
                    onChange={(e) => setNewComplaint({ ...newComplaint, product_lot_batch: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Lot number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={newComplaint.product_serial_number}
                    onChange={(e) => setNewComplaint({ ...newComplaint, product_serial_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Serial #"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  required
                  value={newComplaint.description}
                  onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Describe the complaint..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Severity *</label>
                  <select
                    required
                    value={newComplaint.severity}
                    onChange={(e) => setNewComplaint({ ...newComplaint, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={newComplaint.category}
                    onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="e.g., Performance, Usability"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner</label>
                <select
                  value={newComplaint.owner_id}
                  onChange={(e) => setNewComplaint({ ...newComplaint, owner_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="">Select owner...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Complaint'}
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
