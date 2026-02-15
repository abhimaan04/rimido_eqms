'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { AlertCircle, X } from 'lucide-react'

export default function CAPAManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [capaList, setCapaList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [newCapa, setNewCapa] = useState({
    title: '',
    type: 'corrective',
    source: '',
    priority: 'medium',
    description: '',
    owner_id: '',
    assigned_to: '',
    target_completion_date: '',
    approvers: [] as string[],
    custom_fields: [] as Array<{ label: string; value: string }>,
  })
  const [approverInputCount, setApproverInputCount] = useState(1)
  const [customFieldCount, setCustomFieldCount] = useState(1)

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
      const [userRes, capaRes, usersRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/capa').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setCapaList(capaRes.data.data || [])
      setUsers(usersRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCAPA = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/capa', {
        ...newCapa,
        owner_id: newCapa.owner_id || null,
        assigned_to: newCapa.assigned_to || null,
        target_completion_date: newCapa.target_completion_date || null,
        approvers: newCapa.approvers.filter((a) => a && a.trim().length > 0),
        custom_fields: newCapa.custom_fields
          .filter((f) => f.label && f.label.trim().length > 0)
          .map((f) => ({ label: f.label.trim(), value: f.value || '' })),
      })
      alert('CAPA created successfully!')
      setShowCreateModal(false)
      setNewCapa({
        title: '',
        type: 'corrective',
        source: '',
        priority: 'medium',
        description: '',
        owner_id: '',
        assigned_to: '',
        target_completion_date: '',
        approvers: [],
        custom_fields: [],
      })
      setApproverInputCount(1)
      setCustomFieldCount(1)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create CAPA')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async (capaId: string, type: 'pdf' | 'docx', capaNumber: string) => {
    try {
      const response = await api.get(`/capa/${capaId}/download?type=${type}`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], {
        type: type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${capaNumber}.${type}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      let message = 'Failed to download file'
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text()
          const parsed = JSON.parse(text)
          message = parsed?.error?.message || parsed?.message || message
        } catch {
          // Fallback to default message when blob isn't JSON
        }
      } else {
        message = error?.response?.data?.error?.message || error?.response?.data?.message || message
      }
      alert(message)
    }
  }

  const handleViewPdf = async (capaId: string) => {
    try {
      const response = await api.get(`/capa/${capaId}/download?type=pdf`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      let message = 'Failed to open PDF'
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text()
          const parsed = JSON.parse(text)
          message = parsed?.error?.message || parsed?.message || message
        } catch {
          // Fallback to default message when blob isn't JSON
        }
      } else {
        message = error?.response?.data?.error?.message || error?.response?.data?.message || message
      }
      alert(message)
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
      newButtonOnClick={() => setShowCreateModal(true)}
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
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${c.priority === 'critical' ? 'bg-red-100 text-red-700' : c.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                        {c.priority}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleViewPdf(c.id)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50"
                      >
                        View PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(c.id, 'pdf', c.capa_number)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50"
                      >
                        Download PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(c.id, 'docx', c.capa_number)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50"
                      >
                        Download Word
                      </button>
                    </div>
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

      {/* Create CAPA Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Create New CAPA</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateCAPA} className="p-6 space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h4 className="font-semibold text-slate-900 mb-3">Approvers</h4>
                <div className="space-y-2">
                  {Array.from({ length: approverInputCount }).map((_, idx) => (
                    <div key={`approver-${idx}`} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCapa.approvers[idx] || ''}
                        onChange={(e) => {
                          const next = [...newCapa.approvers]
                          next[idx] = e.target.value
                          setNewCapa({ ...newCapa, approvers: next })
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Approver name"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...newCapa.approvers]
                          next.splice(idx, 1)
                          setNewCapa({ ...newCapa, approvers: next })
                          setApproverInputCount(Math.max(1, approverInputCount - 1))
                        }}
                        className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setApproverInputCount(approverInputCount + 1)}
                    className="text-sm px-3 py-2 border border-dashed border-slate-300 rounded-lg hover:bg-white"
                  >
                    Add Approver
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newCapa.title}
                  onChange={(e) => setNewCapa({ ...newCapa, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="CAPA title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select
                    required
                    value={newCapa.type}
                    onChange={(e) => setNewCapa({ ...newCapa, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="corrective">Corrective</option>
                    <option value="preventive">Preventive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority *</label>
                  <select
                    required
                    value={newCapa.priority}
                    onChange={(e) => setNewCapa({ ...newCapa, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Source *</label>
                <select
                  required
                  value={newCapa.source}
                  onChange={(e) => setNewCapa({ ...newCapa, source: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select source...</option>
                  <option value="customer_complaint">Customer Complaint</option>
                  <option value="internal_audit">Internal Audit</option>
                  <option value="non_conformance">Non-Conformance</option>
                  <option value="post_market">Post-Market Surveillance</option>
                  <option value="software_defect">Software Defect</option>
                  <option value="risk_finding">Risk Finding</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  required
                  value={newCapa.description}
                  onChange={(e) => setNewCapa({ ...newCapa, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Describe the issue..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Owner</label>
                  <select
                    value={newCapa.owner_id}
                    onChange={(e) => setNewCapa({ ...newCapa, owner_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select owner...</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
                  <select
                    value={newCapa.assigned_to}
                    onChange={(e) => setNewCapa({ ...newCapa, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select assignee...</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={newCapa.target_completion_date}
                  onChange={(e) => setNewCapa({ ...newCapa, target_completion_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h4 className="font-semibold text-slate-900 mb-3">Custom Parameters</h4>
                <div className="space-y-2">
                  {Array.from({ length: customFieldCount }).map((_, idx) => (
                    <div key={`custom-${idx}`} className="grid grid-cols-2 gap-2 items-center">
                      <input
                        type="text"
                        value={newCapa.custom_fields[idx]?.label || ''}
                        onChange={(e) => {
                          const next = [...newCapa.custom_fields]
                          const current = next[idx] || { label: '', value: '' }
                          next[idx] = { ...current, label: e.target.value }
                          setNewCapa({ ...newCapa, custom_fields: next })
                        }}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Label"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newCapa.custom_fields[idx]?.value || ''}
                          onChange={(e) => {
                            const next = [...newCapa.custom_fields]
                            const current = next[idx] || { label: '', value: '' }
                            next[idx] = { ...current, value: e.target.value }
                            setNewCapa({ ...newCapa, custom_fields: next })
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Value"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...newCapa.custom_fields]
                            next.splice(idx, 1)
                            setNewCapa({ ...newCapa, custom_fields: next })
                            setCustomFieldCount(Math.max(1, customFieldCount - 1))
                          }}
                          className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomFieldCount(customFieldCount + 1)}
                    className="text-sm px-3 py-2 border border-dashed border-slate-300 rounded-lg hover:bg-white"
                  >
                    Add Parameter
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create CAPA'}
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
