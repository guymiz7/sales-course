'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface User { id: string; full_name: string; email: string; created_at: string }
interface Cohort { id: string; name: string; courses: { name: string } | null }

interface Props {
  users: User[]
  cohorts: Cohort[]
}

export default function PendingUsersList({ users, cohorts }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({}) // userId → cohortId
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  async function approve(user: User) {
    const cohortId = selected[user.id]
    if (!cohortId) {
      alert('אנא בחר מחזור תחילה')
      return
    }

    setLoading(user.id)
    const { data: { user: adminUser } } = await supabase.auth.getUser()

    // Update role to student
    await supabase.from('users').update({ role: 'student' }).eq('id', user.id)

    // Connect to cohort
    await supabase.from('user_cohorts').insert({
      user_id: user.id,
      cohort_id: cohortId,
      approved_by: adminUser?.id,
      approved_at: new Date().toISOString(),
    })

    // Send approval email + webhook (fire and forget)
    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'approved', to: user.email, name: user.full_name }),
    }).catch(() => {})
    fetch('/api/admin/send-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user_approved', id: user.id }),
    }).catch(() => {})

    setLoading(null)
    router.refresh()
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        אין משתמשים ממתינים לאישור
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {users.map(user => (
        <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold shrink-0">
            {user.full_name[0]}
          </div>

          {/* Info */}
          <div className="flex-1">
            <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>

          {/* Cohort selector */}
          <select
            value={selected[user.id] || ''}
            onChange={e => setSelected(prev => ({ ...prev, [user.id]: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">בחר מחזור...</option>
            {cohorts.map(c => (
              <option key={c.id} value={c.id}>
                {c.courses?.name} — {c.name}
              </option>
            ))}
          </select>

          {/* Approve button */}
          <button
            onClick={() => approve(user)}
            disabled={loading === user.id || !selected[user.id]}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition"
          >
            {loading === user.id ? 'מאשר...' : 'אשר גישה'}
          </button>
        </div>
      ))}
    </div>
  )
}
