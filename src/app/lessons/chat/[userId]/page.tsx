import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PrivateChatWindow from '@/components/PrivateChatWindow'

export default async function PrivateChatPage({ params }: { params: { userId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: me } = await supabase.from('users').select('full_name').eq('id', user.id).single()

  const { data: other } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, role, profile_visibility')
    .eq('id', params.userId)
    .single()

  if (!other) notFound()

  const { data: messages } = await supabase
    .from('private_messages')
    .select('id, content, created_at, sender_id, read_at, attachment_url, attachment_type')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${params.userId}),and(sender_id.eq.${params.userId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })
    .limit(200)

  return (
    <div className="max-w-3xl" style={{ height: 'calc(100vh - 8rem)' }}>
      <div className="mb-3 flex items-center gap-2 shrink-0">
        <Link href="/lessons/chat" className="text-sm text-gray-400 hover:text-gray-600">← צ׳אט</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">{other.full_name}</span>
      </div>
      <div className="flex flex-col" style={{ height: 'calc(100% - 2.5rem)' }}>
        <PrivateChatWindow
          currentUserId={user.id}
          currentUserName={me?.full_name || ''}
          otherUserId={other.id}
          otherUserName={other.full_name || 'חבר קהילה'}
          otherUserAvatar={other.avatar_url}
          otherUserRole={other.role}
          otherUserProfileVisibility={(other as any).profile_visibility}
          initialMessages={(messages || []) as any}
        />
      </div>
    </div>
  )
}
