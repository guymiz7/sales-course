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
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmRejectAll, setConfirmRejectAll] = useState(false)
  const [rejectingAll, setRejectingAll] = useState(false)
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

    await supabase.from('users').update({ role: 'student' }).eq('id', user.id)

    await supabase.from('user_cohorts').insert({
      user_id: user.id,
      cohort_id: cohortId,
      approved_by: adminUser?.id,
      approved_at: new Date().toISOString(),
    })

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

  async function reject(user: User) {
    if (!confirm(`למחוק את ${user.full_name}?\nהמשתמש יימחק לצמיתות ולא יוכל להתחבר.`)) return

    setLoading(user.id)
    try {
      const res = await fetch('/api/admin/reject-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`שגיאה במחיקה: ${err.error || res.statusText}`)
      } else {
        router.refresh()
      }
    } catch (e: any) {
      alert(`שגיאה: ${e.message}`)
    }
    setLoading(null)
  }

  async function rejectAll() {
    setRejectingAll(true)
    try {
      const res = await fetch('/api/admin/reject-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`שגיאה: ${err.error || res.statusText}`)
      } else {
        router.refresh()
      }
    } catch (e: any) {
      alert(`שגיאה: ${e.message}`)
    }
    setRejectingAll(false)
    setConfirmRejectAll(false)
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
      {users.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={() => setConfirmRejectAll(true)}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition"
          >
            🗑 מחק את כולם ({users.length})
          </button>
        </div>
      )}

      {users.map(user => (
        <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold shrink-0">
            {user.full_name[0]}
          </div>

          <div className="flex-1">
            <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>

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

          <button
            onClick={() => approve(user)}
            disabled={loading === user.id || !selected[user.id]}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition"
          >
            {loading === user.id ? 'מאשר...' : 'אשר גישה'}
          </button>

          <button
            onClick={() => reject(user)}
            disabled={loading === user.id}
            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg disabled:opacity-40 transition"
            title="מחק משתמש"
          >
            🗑
          </button>
        </div>
      ))}

      {confirmRejectAll && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <p className="text-lg font-bold text-gray-900 mb-2">מחיקת כל הממתינים</p>
            <p className="text-sm text-gray-600 mb-6">
              פעולה זו תמחק את כל {users.length} המשתמשים הממתינים לצמיתות. לא ניתן לבטל.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmRejectAll(false)}
                disabled={rejectingAll}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                ביטול
              </button>
              <button
                onClick={rejectAll}
                disabled={rejectingAll}
                className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg disabled:opacity-50 transition"
              >
                {rejectingAll ? 'מוחק...' : 'מחק את כולם'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
