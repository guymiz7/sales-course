export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import ChatHub from '@/components/ChatHub'

export default async function AdminChatPage({ searchParams }: { searchParams: { dm?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const { data: adminCohort } = await supabase
    .from('user_cohorts')
    .select('cohort_id')
    .eq('user_id', user.id)
    .single()

  const { data: latestCohort } = await supabase
    .from('cohorts')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const cohortId = adminCohort?.cohort_id || latestCohort?.id || ''

  const [{ data: groupMessages }, { data: allPMs }] = await Promise.all([
    cohortId
      ? supabase.from('chat_messages').select('id, content, created_at, user_id, users(full_name, avatar_url, role)').eq('cohort_id', cohortId).order('created_at', { ascending: true }).limit(200)
      : Promise.resolve({ data: [] }),
    supabase.from('private_messages').select('id, content, created_at, sender_id, receiver_id, read_at').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false }),
  ])

  // Build conversation map
  const convMap = new Map<string, { lastMessage: string; lastAt: string; unread: number }>()
  for (const pm of (allPMs || []) as any[]) {
    const otherId = pm.sender_id === user.id ? pm.receiver_id : pm.sender_id
    if (!convMap.has(otherId)) convMap.set(otherId, { lastMessage: pm.content, lastAt: pm.created_at, unread: 0 })
    if (pm.sender_id !== user.id && !pm.read_at) convMap.get(otherId)!.unread++
  }

  // If initialDm user not in conv map yet, still fetch their profile
  const dmUserId = searchParams.dm
  if (dmUserId && !convMap.has(dmUserId)) convMap.set(dmUserId, { lastMessage: '', lastAt: '', unread: 0 })

  const otherIds = Array.from(convMap.keys())
  const { data: otherUsers } = otherIds.length > 0
    ? await supabase.from('users').select('id, full_name, avatar_url, role').in('id', otherIds)
    : { data: [] }

  const conversations = Array.from(convMap.entries()).map(([userId, conv]) => {
    const u = (otherUsers || []).find((u: any) => u.id === userId)
    return { userId, userName: u ? (u as any).full_name || '' : '', avatarUrl: u ? (u as any).avatar_url : null, role: u ? (u as any).role : null, ...conv }
  }).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())

  if (!cohortId) {
    return (
      <div className="text-center mt-20 text-gray-400 text-sm">
        אין מחזורים פעילים עדיין
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4"><h1 className="text-xl font-bold text-gray-900">צ׳אט</h1></div>
      <ChatHub
        cohortId={cohortId}
        currentUserId={user.id}
        currentUserName={profile?.full_name || 'מרצה'}
        currentUserAvatar={profile?.avatar_url || null}
        currentUserRole="admin"
        initialGroupMessages={(groupMessages || []) as any}
        initialConversations={conversations}
        adminUser={null}
        initialDm={dmUserId}
      />
    </div>
  )
}
