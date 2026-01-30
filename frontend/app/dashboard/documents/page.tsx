'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { FileText } from 'lucide-react'

export default function DocumentControlPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
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
      const [userRes, docsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/documents').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setDocuments(docsRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

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
            className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6"
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
            className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6"
          >
            <h2 className="font-semibold text-slate-900 mb-4">Controlled documents</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            ) : documents.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No documents yet. Create one to get started.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {documents.slice(0, 10).map((doc: any) => (
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
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
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
              <li><Link href="#new-document" className="text-sky-600 hover:text-sky-700 hover:underline">Create new document</Link></li>
              <li><Link href="#submit-approval" className="text-sky-600 hover:text-sky-700 hover:underline">Submit for approval</Link></li>
              <li><Link href="#approval-queue" className="text-sky-600 hover:text-sky-700 hover:underline">View approval queue</Link></li>
              <li><Link href="#obsolete" className="text-sky-600 hover:text-sky-700 hover:underline">Obsolete / supersede</Link></li>
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
    </ModulePageLayout>
  )
}
