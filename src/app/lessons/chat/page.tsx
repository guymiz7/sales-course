import { createClient } from '@/lib/supabase/server'
import ChatWindow from '@/components/ChatWindow'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  const { data: cohortData } = await supabase
    .from('user_cohorts')
    .select('cohort_id')
    .eq('user_id', user.id)
    .single()

  const cohortId = cohortData?.cohort_id

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, content, created_at, user_id, users(full_name, avatar_url, role)')
    .eq('cohort_id', cohortId || '')
    .order('created_at', { ascending: true })
    .limit(200)

  return (
    <div className="max-w-3xl h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">צ׳אט הקהילה</h1>
        <p className="text-sm text-gray-500 mt-1">שיחה משותפת עם חברי הקורס והמרצה</p>
      </div>
      <ChatWindow
        cohortId={cohortId || ''}
        currentUserId={user.id}
        currentUserName={profile?.full_name || ''}
        currentUserAvatar={profile?.avatar_url || null}
        currentUserRole={(profile?.role as 'admin' | 'student') || 'student'}
        initialMessages={(messages || []) as any}
      />
    </div>
  )
}
