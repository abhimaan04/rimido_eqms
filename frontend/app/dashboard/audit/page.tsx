'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { ClipboardCheck, X } from 'lucide-react'

export default function AuditManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [audits, setAudits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [newAudit, setNewAudit] = useState({
    audit_type: 'internal',
    scope: '',
    standard: '',
    scheduled_start_date: '',
    scheduled_end_date: '',
    lead_auditor_id: '',
    auditee: '',
    location: '',
    objectives: '',
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
      const [userRes, auditRes, usersRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/audit').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setAudits(auditRes.data.data || [])
      setUsers(usersRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/audit', {
        ...newAudit,
        lead_auditor_id: newAudit.lead_auditor_id || null,
        auditee: newAudit.auditee || null,
        location: newAudit.location || null,
        objectives: newAudit.objectives || null,
        standard: newAudit.standard || null,
      })
      alert('Audit plan created successfully!')
      setShowCreateModal(false)
      setNewAudit({
        audit_type: 'internal',
        scope: '',
        standard: '',
        scheduled_start_date: '',
        scheduled_end_date: '',
        lead_auditor_id: '',
        auditee: '',
        location: '',
        objectives: '',
      })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create audit plan')
    } finally {
      setSubmitting(false)
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
      newButtonOnClick={() => setShowCreateModal(true)}
      accentColor="amber"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div
            id="new-audit"
            className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6"
          >
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

      {/* Create Audit Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Create New Audit Plan</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateAudit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Audit Type *</label>
                <select
                  required
                  value={newAudit.audit_type}
                  onChange={(e) => setNewAudit({ ...newAudit, audit_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                  <option value="supplier">Supplier</option>
                  <option value="regulatory">Regulatory</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Scope *</label>
                <textarea
                  required
                  value={newAudit.scope}
                  onChange={(e) => setNewAudit({ ...newAudit, scope: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Audit scope (e.g., QMS, Design, Manufacturing)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Standard</label>
                <input
                  type="text"
                  value={newAudit.standard}
                  onChange={(e) => setNewAudit({ ...newAudit, standard: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., ISO 13485:2016"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newAudit.scheduled_start_date}
                    onChange={(e) => setNewAudit({ ...newAudit, scheduled_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newAudit.scheduled_end_date}
                    onChange={(e) => setNewAudit({ ...newAudit, scheduled_end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lead Auditor</label>
                <select
                  value={newAudit.lead_auditor_id}
                  onChange={(e) => setNewAudit({ ...newAudit, lead_auditor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Select lead auditor...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Auditee</label>
                  <input
                    type="text"
                    value={newAudit.auditee}
                    onChange={(e) => setNewAudit({ ...newAudit, auditee: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Department or supplier name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newAudit.location}
                    onChange={(e) => setNewAudit({ ...newAudit, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Audit location"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Objectives</label>
                <textarea
                  value={newAudit.objectives}
                  onChange={(e) => setNewAudit({ ...newAudit, objectives: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Audit objectives..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Audit Plan'}
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
