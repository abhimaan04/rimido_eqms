'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import ModulePageLayout from '@/components/ModulePageLayout'
import { Users } from 'lucide-react'

export default function UserManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
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
      const [userRes, usersRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/users').catch(() => ({ data: { data: [] } })),
      ])
      setUser(userRes.data.data)
      setUsers(usersRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModulePageLayout
      user={user}
      title="User & Role Management"
      subtitle="Access control and roles — Remidio eQMS users, permissions, and 21 CFR Part 11 accountability"
      imageUrl="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80"
      imageAlt="Team and users"
      newButtonLabel="Add User"
      accentColor="indigo"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Remidio roles
            </h2>
            <ul className="text-slate-700 space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">•</span> <strong>Quality Manager</strong> — full QMS access</li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">•</span> <strong>Document Control</strong> — document lifecycle</li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">•</span> <strong>CAPA Owner</strong> — CAPA initiation and closure</li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">•</span> <strong>Change Control Board</strong> — ECO approval</li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">•</span> <strong>Auditor</strong> — audit plans and findings</li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">•</span> <strong>Risk Manager</strong> — risk assessments</li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">•</span> <strong>Training Coordinator</strong> — training programs & records</li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">•</span> <strong>Employee</strong> — basic access; <strong>Admin</strong> — system admin</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Users</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Loading...</div>
            ) : users.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No users listed (or you don&apos;t have permission to view).</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {users.slice(0, 15).map((u: any) => (
                  <li key={u.id} className="py-4 flex items-center justify-between group hover:bg-slate-50 -mx-2 px-2 rounded-xl transition">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <span className="font-medium text-slate-900">{u.first_name} {u.last_name}</span>
                        <span className="text-slate-500 text-sm block">{u.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {(u.roles || []).filter(Boolean).map((r: string) => (
                        <span key={r} className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">{r}</span>
                      ))}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
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
              <li><Link href="#" className="text-indigo-600 hover:underline">Add user</Link></li>
              <li><Link href="#" className="text-indigo-600 hover:underline">Assign role</Link></li>
              <li><Link href="#" className="text-indigo-600 hover:underline">Reset password</Link></li>
              <li><Link href="#" className="text-indigo-600 hover:underline">Lock / unlock account</Link></li>
            </ul>
          </div>
          <div className="bg-indigo-50 rounded-2xl p-4 text-sm text-slate-700 border border-indigo-100">
            <strong className="text-indigo-800">Compliance:</strong> FDA 21 CFR Part 11 — user identification, access control, and accountability. All actions are logged in the audit trail.
          </div>
        </div>
      </div>
    </ModulePageLayout>
  )
}
