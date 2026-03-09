import { createClient } from '@/lib/supabase/server'
import ChatWindow from '@/components/ChatWindow'

export default async function AdminChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  // Admin sees all cohorts — pick the first one (or let them select)
  const { data: cohorts } = await supabase
    .from('cohorts')
    .select('id, name:id') // will use id as display name fallback
    .order('created_at', { ascending: false })

  // Try to use the admin's own cohort enrollment first; fallback to latest cohort
  const { data: adminCohort } = await supabase
    .from('user_cohorts')
    .select('cohort_id')
    .eq('user_id', user.id)
    .single()

  const cohortId = adminCohort?.cohort_id || cohorts?.[0]?.id || ''

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, content, created_at, user_id, users(full_name, avatar_url, role)')
    .eq('cohort_id', cohortId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (!cohortId) {
    return (
      <div className="text-center mt-20 text-gray-400 text-sm">
        אין מחזורים פעילים עדיין
      </div>
    )
  }

  return (
    <div className="max-w-3xl" style={{ height: 'calc(100vh - 10rem)' }}>
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">צ׳אט הקהילה</h1>
        <p className="text-sm text-gray-500 mt-1">שיחה עם תלמידי המחזור</p>
      </div>
      <div className="flex flex-col" style={{ height: 'calc(100% - 5rem)' }}>
        <ChatWindow
          cohortId={cohortId}
          currentUserId={user.id}
          currentUserName={profile?.full_name || 'מרצה'}
          currentUserAvatar={profile?.avatar_url || null}
          currentUserRole="admin"
          initialMessages={(messages || []) as any}
        />
      </div>
    </div>
  )
}
