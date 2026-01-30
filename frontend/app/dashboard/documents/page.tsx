'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { FileText, X, Plus } from 'lucide-react'

export default function DocumentControlPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAction, setSelectedAction] = useState<
    'create' | 'submit' | 'queue' | 'obsolete' | null
  >(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showObsoleteModal, setShowObsoleteModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])

  // Form states
  const [newDoc, setNewDoc] = useState({
    document_number: '',
    title: '',
    document_type: 'SOP',
    version: '1.0',
    description: '',
  })
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [approverIds, setApproverIds] = useState<string[]>([])
  const [obsoleteDocId, setObsoleteDocId] = useState<string>('')
  const [supersedingDocId, setSupersedingDocId] = useState<string>('')

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
      const [userRes, docsRes, usersRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/documents').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setDocuments(docsRes.data.data || [])
      setUsers(usersRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/documents', newDoc)
      alert('Document created successfully!')
      setShowCreateModal(false)
      setNewDoc({ document_number: '', title: '', document_type: 'SOP', version: '1.0', description: '' })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create document')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitForApproval = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDocId || approverIds.length === 0) {
      alert('Please select a document and at least one approver')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/documents/${selectedDocId}/submit`, { approver_ids: approverIds })
      alert('Document submitted for approval!')
      setShowSubmitModal(false)
      setSelectedDocId('')
      setApproverIds([])
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit document')
    } finally {
      setSubmitting(false)
    }
  }

  const handleObsolete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!obsoleteDocId) {
      alert('Please select a document to obsolete')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/documents/${obsoleteDocId}/obsolete`, { superseded_by: supersedingDocId || null })
      alert('Document obsoleted successfully!')
      setShowObsoleteModal(false)
      setObsoleteDocId('')
      setSupersedingDocId('')
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to obsolete document')
    } finally {
      setSubmitting(false)
    }
  }

  const handleActionClick = (action: 'create' | 'submit' | 'queue' | 'obsolete', targetId: string) => {
    setSelectedAction(action)
    if (action === 'create') {
      setShowCreateModal(true)
    } else if (action === 'submit') {
      setShowSubmitModal(true)
    } else if (action === 'obsolete') {
      setShowObsoleteModal(true)
    } else {
      if (typeof document !== 'undefined') {
        const el = document.getElementById(targetId)
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const pendingDocuments = documents.filter((d: any) => d.status === 'under_review' || d.status === 'draft')

  return (
    <ModulePageLayout
      user={user}
      title="Document Control"
      subtitle="Remidio Innovative Solutions — controlled documents for ophthalmic devices and quality system"
      imageUrl="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80"
      imageAlt="Documents and quality"
      newButtonLabel="New Document"
      newButtonHref="#new-document"
      accentColor="blue"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div
            id="new-document"
            className={`bg-white rounded-2xl shadow-soft border p-6 transition ${
              selectedAction === 'create'
                ? 'border-sky-400 ring-2 ring-sky-100'
                : 'border-slate-100'
            }`}
          >
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600" />
              Remidio document scope
            </h2>
            <ul className="text-slate-700 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-sky-500 mt-0.5">•</span>
                SOPs for FOP (Fundus on Phone) cameras and accessories
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 mt-0.5">•</span>
                Design & development documentation (IEC 62304)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 mt-0.5">•</span>
                Manufacturing and calibration procedures
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 mt-0.5">•</span>
                Quality manual, policies, and work instructions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 mt-0.5">•</span>
                Regulatory and CE/FDA submission documents
              </li>
            </ul>

            <h3 className="mt-5 font-semibold text-slate-900">Function</h3>
            <ul className="mt-2 text-slate-700 space-y-1.5 text-sm">
              <li>• Upload quality documents (SOPs, policies, manuals)</li>
              <li>• View and manage document versions</li>
              <li>• Track document approvals</li>
              <li>• Maintain document lifecycle</li>
            </ul>
          </div>

          <div
            id="approval-queue"
            className={`bg-white rounded-2xl shadow-soft border p-6 transition ${
              selectedAction === 'queue'
                ? 'border-sky-400 ring-2 ring-sky-100'
                : 'border-slate-100'
            }`}
          >
            <h2 className="font-semibold text-slate-900 mb-4">
              {selectedAction === 'queue' ? 'Approval Queue' : 'Controlled documents'}
            </h2>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            ) : selectedAction === 'queue' && pendingDocuments.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No documents pending approval.</p>
            ) : documents.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No documents yet. Create one to get started.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(selectedAction === 'queue' ? pendingDocuments : documents).slice(0, 10).map((doc: any) => (
                  <li key={doc.id} className="py-4 flex items-center justify-between group hover:bg-slate-50 -mx-2 px-2 rounded-xl transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium text-slate-900">{doc.title}</span>
                        <span className="text-slate-500 text-sm ml-2">{doc.document_number} v{doc.version}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : doc.status === 'under_review' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                      {doc.status}
                    </span>
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
              <li>
                <button
                  type="button"
                  onClick={() => handleActionClick('create', 'new-document')}
                  className="text-sky-600 hover:text-sky-700 hover:underline"
                >
                  Create new document
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleActionClick('submit', 'submit-approval')}
                  className="text-sky-600 hover:text-sky-700 hover:underline"
                >
                  Submit for approval
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleActionClick('queue', 'approval-queue')}
                  className="text-sky-600 hover:text-sky-700 hover:underline"
                >
                  View approval queue
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleActionClick('obsolete', 'obsolete')}
                  className="text-sky-600 hover:text-sky-700 hover:underline"
                >
                  Obsolete / supersede
                </button>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <div
              id="submit-approval"
              className="bg-sky-50 rounded-2xl p-4 text-sm text-slate-700 border border-sky-100"
            >
              <strong className="text-sky-800">Submit for approval:</strong>{' '}
              Route draft SOPs, IFUs, and procedures for review and electronic
              signatures in line with Remidio&apos;s quality workflow.
            </div>
            <div
              id="obsolete"
              className="bg-sky-50 rounded-2xl p-4 text-sm text-slate-700 border border-sky-100"
            >
              <strong className="text-sky-800">Obsolete / supersede:</strong>{' '}
              Retire older document versions while keeping full traceability to FOP
              cameras, risk files, training, and regulatory submissions.
            </div>
          </div>
        </div>
      </div>

      {/* Create Document Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Create New Document</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateDocument} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Document Number *</label>
                <input
                  type="text"
                  required
                  value={newDoc.document_number}
                  onChange={(e) => setNewDoc({ ...newDoc, document_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="e.g., SOP-QA-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Document title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Document Type *</label>
                  <select
                    required
                    value={newDoc.document_type}
                    onChange={(e) => setNewDoc({ ...newDoc, document_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="SOP">SOP</option>
                    <option value="Work Instruction">Work Instruction</option>
                    <option value="IFU">IFU / Label</option>
                    <option value="Policy">Policy</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Version *</label>
                  <input
                    type="text"
                    required
                    value={newDoc.version}
                    onChange={(e) => setNewDoc({ ...newDoc, version: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="1.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newDoc.description}
                  onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Document description..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Document'}
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

      {/* Submit for Approval Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Submit Document for Approval</h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmitForApproval} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Document *</label>
                <select
                  required
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Choose a document...</option>
                  {documents.filter((d: any) => d.status === 'draft').map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.document_number} - {doc.title} (v{doc.version})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Approvers *</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                  {users.map((u: any) => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={approverIds.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setApproverIds([...approverIds, u.id])
                          } else {
                            setApproverIds(approverIds.filter((id) => id !== u.id))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{u.first_name} {u.last_name} ({u.email})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || !selectedDocId || approverIds.length === 0}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Obsolete Document Modal */}
      {showObsoleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Obsolete / Supersede Document</h3>
              <button
                onClick={() => setShowObsoleteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleObsolete} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Document to Obsolete *</label>
                <select
                  required
                  value={obsoleteDocId}
                  onChange={(e) => setObsoleteDocId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Choose a document...</option>
                  {documents.filter((d: any) => d.status === 'approved').map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.document_number} - {doc.title} (v{doc.version})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Superseding Document (Optional)</label>
                <select
                  value={supersedingDocId}
                  onChange={(e) => setSupersedingDocId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">None</option>
                  {documents.filter((d: any) => d.id !== obsoleteDocId && d.status === 'approved').map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.document_number} - {doc.title} (v{doc.version})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || !obsoleteDocId}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Obsolete Document'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowObsoleteModal(false)}
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
