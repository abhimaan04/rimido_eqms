'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { AlertCircle, X } from 'lucide-react'

type ApproverDecision = 'approve' | 'disapprove' | ''
type ApproverEntry = {
  name: string
  decision: ApproverDecision
  password: string
}
type CapaDetailEntry = {
  title: string
  description: string
  images: File[]
}

const emptyApprover = (): ApproverEntry => ({
  name: '',
  decision: '',
  password: '',
})
const emptyDetailItem = (): CapaDetailEntry => ({
  title: '',
  description: '',
  images: [],
})

export default function CAPAManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [capaList, setCapaList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newCapa, setNewCapa] = useState({
    type: 'corrective',
    source: 'internal_audit',
    priority: 'medium',
    approvers: [emptyApprover()] as ApproverEntry[],
    details: [emptyDetailItem()] as CapaDetailEntry[],
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
      const [userRes, capaRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/capa').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setCapaList(capaRes.data.data || [])
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
      const approvers = newCapa.approvers
        .map((a) => ({
          name: a.name.trim(),
          decision: a.decision,
          password: a.password,
        }))
        .filter((a) => a.name.length > 0)

      if (approvers.length === 0) {
        alert('Please add at least one approver.')
        return
      }

      if (approvers.some((a) => a.decision !== 'approve' && a.decision !== 'disapprove')) {
        alert('Please select Approve or Disapprove for each approver.')
        return
      }

      if (approvers.some((a) => a.password.length === 0)) {
        alert('Password is required for each approver decision.')
        return
      }

      const details = newCapa.details
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          images: item.images,
        }))
        .filter((item) => item.title.length > 0 || item.description.length > 0 || item.images.length > 0)

      if (details.length === 0) {
        alert('Please add at least one CAPA detail item.')
        return
      }

      if (details.some((item) => item.title.length === 0 || item.description.length === 0)) {
        alert('Each CAPA detail item must include both title and description.')
        return
      }

      const formData = new FormData()
      formData.append('title', details[0].title)
      formData.append('type', newCapa.type)
      formData.append('source', newCapa.source)
      formData.append('priority', newCapa.priority)
      formData.append('description', details[0].description)
      formData.append('approvers', JSON.stringify(approvers))
      formData.append('custom_fields', JSON.stringify([]))
      formData.append(
        'detail_items',
        JSON.stringify(
          details.map((item) => ({
            title: item.title,
            description: item.description,
          }))
        )
      )
      details.forEach((item, detailIndex) => {
        item.images.forEach((file) => {
          formData.append(`detail_images_${detailIndex}`, file)
        })
      })

      await api.post('/capa', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      alert('CAPA created successfully!')
      setShowCreateModal(false)
      setNewCapa({
        type: 'corrective',
        source: 'internal_audit',
        priority: 'medium',
        approvers: [emptyApprover()],
        details: [emptyDetailItem()],
      })
      loadData()
    } catch (error: any) {
      let message = 'Failed to create CAPA'
      if (axios.isAxiosError(error) && error.response?.data) {
        const payload = error.response.data as any
        message = payload?.error?.message || payload?.message || message
      }
      alert(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproverNameChange = (index: number, name: string) => {
    setNewCapa((prev) => {
      const next = [...prev.approvers]
      next[index] = {
        ...next[index],
        name,
      }
      return {
        ...prev,
        approvers: next,
      }
    })
  }

  const handleApproverPasswordChange = (index: number, password: string) => {
    setNewCapa((prev) => {
      const next = [...prev.approvers]
      next[index] = {
        ...next[index],
        password,
      }
      return {
        ...prev,
        approvers: next,
      }
    })
  }

  const handleApproverDecisionChange = (index: number, decision: 'approve' | 'disapprove') => {
    const approver = newCapa.approvers[index]
    if (!approver?.password) {
      alert('Enter password before choosing Approve or Disapprove.')
      return
    }
    setNewCapa((prev) => {
      const next = [...prev.approvers]
      next[index] = {
        ...next[index],
        decision,
      }
      return {
        ...prev,
        approvers: next,
      }
    })
  }

  const addApprover = () => {
    setNewCapa((prev) => ({
      ...prev,
      approvers: [...prev.approvers, emptyApprover()],
    }))
  }

  const removeApprover = (index: number) => {
    setNewCapa((prev) => {
      const next = [...prev.approvers]
      next.splice(index, 1)
      return {
        ...prev,
        approvers: next.length > 0 ? next : [emptyApprover()],
      }
    })
  }

  const handleDetailTitleChange = (index: number, title: string) => {
    setNewCapa((prev) => {
      const next = [...prev.details]
      next[index] = {
        ...next[index],
        title,
      }
      return {
        ...prev,
        details: next,
      }
    })
  }

  const handleDetailDescriptionChange = (index: number, description: string) => {
    setNewCapa((prev) => {
      const next = [...prev.details]
      next[index] = {
        ...next[index],
        description,
      }
      return {
        ...prev,
        details: next,
      }
    })
  }

  const handleDetailImagesSelected = (detailIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }
    const selected = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setNewCapa((prev) => {
      const next = [...prev.details]
      const existing = next[detailIndex]?.images || []
      next[detailIndex] = {
        ...next[detailIndex],
        images: [...existing, ...selected].slice(0, 10),
      }
      return {
        ...prev,
        details: next,
      }
    })
  }

  const handleRemoveDetailImage = (detailIndex: number, imageIndex: number) => {
    setNewCapa((prev) => {
      const next = [...prev.details]
      const images = [...(next[detailIndex]?.images || [])]
      images.splice(imageIndex, 1)
      next[detailIndex] = {
        ...next[detailIndex],
        images,
      }
      return {
        ...prev,
        details: next,
      }
    })
  }

  const addDetailItem = () => {
    setNewCapa((prev) => ({
      ...prev,
      details: [...prev.details, emptyDetailItem()],
    }))
  }

  const removeDetailItem = (index: number) => {
    setNewCapa((prev) => {
      const next = [...prev.details]
      next.splice(index, 1)
      return {
        ...prev,
        details: next.length > 0 ? next : [emptyDetailItem()],
      }
    })
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

  const handleDeleteCapa = async (capaId: string, capaNumber: string) => {
    const confirmed = window.confirm(
      `Delete CAPA ${capaNumber}?\n\nThis will hide it from the CAPA list and remove server files.`
    )
    if (!confirmed) {
      return
    }

    try {
      let response
      try {
        response = await api.delete(`/capa/${capaId}`)
      } catch (error: any) {
        // Fallback for environments where DELETE may be blocked/routed differently.
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          response = await api.post(`/capa/${capaId}/delete`)
        } else {
          throw error
        }
      }

      const deleted = response.data?.data?.deleted_files ?? 0
      const missing = response.data?.data?.missing_files ?? 0
      const blocked = response.data?.data?.blocked_files ?? 0
      setCapaList((prev) => prev.filter((item: any) => item.id !== capaId))
      alert(`CAPA deleted. Removed ${deleted} file(s). Missing ${missing}. Blocked ${blocked}.`)
    } catch (error: any) {
      let message = 'Failed to delete CAPA'
      if (axios.isAxiosError(error) && error.response?.data) {
        const payload = error.response.data as any
        if (typeof payload === 'string') {
          message = payload
        } else {
          message = payload?.error?.message || payload?.message || message
        }
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
                      <button
                        type="button"
                        onClick={() => handleDeleteCapa(c.id, c.capa_number)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-red-500 bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete CAPA
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
                <h4 className="font-semibold text-slate-900 mb-3">Approval Section</h4>
                <p className="text-sm text-slate-600 mb-3">Enter approver name, type password, then choose Approve or Disapprove.</p>
                <div className="space-y-3">
                  {newCapa.approvers.map((approver, idx) => (
                    <div key={`approver-${idx}`} className="bg-white border border-slate-200 rounded-lg p-3">
                      <input
                        type="text"
                        value={approver.name}
                        onChange={(e) => handleApproverNameChange(idx, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Approver name"
                      />
                      <input
                        type="password"
                        value={approver.password}
                        onChange={(e) => handleApproverPasswordChange(idx, e.target.value)}
                        className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Enter password for approval action"
                      />
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproverDecisionChange(idx, 'approve')}
                          disabled={!approver.password}
                          className={`px-3 py-1.5 text-sm rounded-lg border ${
                            approver.decision === 'approve'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'border-slate-300 hover:bg-slate-50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproverDecisionChange(idx, 'disapprove')}
                          disabled={!approver.password}
                          className={`px-3 py-1.5 text-sm rounded-lg border ${
                            approver.decision === 'disapprove'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'border-slate-300 hover:bg-slate-50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          Disapprove
                        </button>
                        <button
                          type="button"
                          onClick={() => removeApprover(idx)}
                          className="ml-auto px-2.5 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addApprover}
                    className="text-sm px-3 py-2 border border-dashed border-slate-300 rounded-lg hover:bg-white"
                  >
                    Add Approver
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                <h4 className="font-semibold text-slate-900">CAPA Details</h4>
                {newCapa.details.map((detail, detailIndex) => (
                  <div key={`detail-${detailIndex}`} className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-slate-800">Detail {detailIndex + 1}</h5>
                      <button
                        type="button"
                        onClick={() => removeDetailItem(detailIndex)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                      <input
                        type="text"
                        required={detailIndex === 0}
                        value={detail.title}
                        onChange={(e) => handleDetailTitleChange(detailIndex, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="CAPA detail title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                      <textarea
                        required={detailIndex === 0}
                        value={detail.description}
                        onChange={(e) => handleDetailDescriptionChange(detailIndex, e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Describe this CAPA detail..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Images</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleDetailImagesSelected(detailIndex, e.target.files)}
                        className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:px-3 file:py-1.5 file:text-sm file:bg-white file:hover:bg-slate-50"
                      />
                      <p className="text-xs text-slate-500 mt-2">Optional. Up to 10 images per detail, 5MB each.</p>
                      {detail.images.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {detail.images.map((img, imageIndex) => (
                            <li key={`${img.name}-${imageIndex}`} className="flex items-center justify-between text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
                              <span className="text-slate-700 truncate pr-3">{img.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDetailImage(detailIndex, imageIndex)}
                                className="px-2 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 text-xs"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDetailItem}
                  className="text-sm px-3 py-2 border border-dashed border-slate-300 rounded-lg hover:bg-white"
                >
                  Add Detail Item
                </button>
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
