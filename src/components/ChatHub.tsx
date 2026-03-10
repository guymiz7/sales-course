'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatWindow from './ChatWindow'
import PrivateChatWindow from './PrivateChatWindow'
import clsx from 'clsx'

interface GroupMsg {
  id: string; content: string; created_at: string; user_id: string
  users: { full_name: string | null; avatar_url: string | null; role: string | null } | null
}
interface PM {
  id: string; content: string; created_at: string; sender_id: string; read_at: string | null
  attachment_url?: string | null; attachment_type?: string | null
}
interface Conversation {
  userId: string; userName: string; avatarUrl: string | null; role: string | null
  profileVisibility?: string | null
  lastMessage: string; lastAt: string; unread: number
}
interface DmPerson {
  userId: string; userName: string; avatarUrl: string | null; role: string | null
  profileVisibility?: string | null
}

interface Props {
  cohortId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
  currentUserRole: 'admin' | 'student'
  initialGroupMessages: GroupMsg[]
  initialConversations: Conversation[]
  adminUser: { id: string; full_name: string | null; avatar_url: string | null } | null
  initialDm?: string
}

export default function ChatHub({
  cohortId, currentUserId, currentUserName, currentUserAvatar, currentUserRole,
  initialGroupMessages, initialConversations, adminUser, initialDm
}: Props) {
  const [activeDm, setActiveDm] = useState<string | null>(null)
  const [activeDmInfo, setActiveDmInfo] = useState<DmPerson | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [pmMessages, setPmMessages] = useState<PM[]>([])
  const [loadingDm, setLoadingDm] = useState(false)
  const [showList, setShowList] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (initialDm) openDm(initialDm)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime: update conversation list when new PM arrives
  useEffect(() => {
    const channel = supabase.channel('chathub_pm')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `receiver_id=eq.${currentUserId}` },
        async (payload) => {
          const msg = payload.new as any
          const { data: sender } = await supabase.from('users').select('id, full_name, avatar_url, role, profile_visibility').eq('id', msg.sender_id).single()
          if (!sender) return
          setConversations(prev => {
            const existing = prev.find(c => c.userId === msg.sender_id)
            if (existing) {
              return prev.map(c => c.userId === msg.sender_id
                ? { ...c, lastMessage: msg.content, lastAt: msg.created_at, unread: activeDm === msg.sender_id ? 0 : c.unread + 1 }
                : c
              ).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
            }
            return [{
              userId: sender.id,
              userName: sender.full_name || 'חבר קהילה',
              avatarUrl: sender.avatar_url,
              role: sender.role,
              profileVisibility: (sender as any).profile_visibility,
              lastMessage: msg.content,
              lastAt: msg.created_at,
              unread: activeDm === msg.sender_id ? 0 : 1,
            }, ...prev]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeDm])

  async function openDm(userId: string) {
    setLoadingDm(true)
    setActiveDm(userId)
    setShowList(false)
    setConversations(prev => prev.map(c => c.userId === userId ? { ...c, unread: 0 } : c))

    const [{ data: msgs }, { data: otherUser }] = await Promise.all([
      supabase
        .from('private_messages')
        .select('id, content, created_at, sender_id, read_at, attachment_url, attachment_type')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })
        .limit(200),
      supabase.from('users').select('id, full_name, avatar_url, role, profile_visibility').eq('id', userId).single(),
    ])

    if (otherUser) {
      const info: DmPerson = {
        userId: otherUser.id,
        userName: otherUser.full_name || 'חבר קהילה',
        avatarUrl: otherUser.avatar_url,
        role: otherUser.role,
        profileVisibility: (otherUser as any).profile_visibility,
      }
      setActiveDmInfo(info)
      // Add to sidebar list if not already there
      setConversations(prev => {
        if (prev.find(c => c.userId === userId)) return prev
        return [{ ...info, lastMessage: '', lastAt: '', unread: 0 }, ...prev]
      })
    }

    setPmMessages((msgs || []) as any)
    setLoadingDm(false)
  }

  function openGroup() {
    setActiveDm(null)
    setActiveDmInfo(null)
    setShowList(false)
  }

  const totalUnreadDm = conversations.reduce((s, c) => s + c.unread, 0)

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

      {/* LEFT: Conversation list */}
      <div className={clsx(
        'w-full md:w-72 shrink-0 border-l border-gray-100 flex flex-col',
        !showList && 'hidden md:flex'
      )}>
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-sm">צ׳אט</h2>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Group chat */}
          <button
            onClick={openGroup}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-gray-50 transition border-b border-gray-50',
              !activeDm && !showList ? 'bg-indigo-50' : ''
            )}
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg shrink-0">
              👥
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">צ׳אט קבוצתי</p>
              <p className="text-xs text-gray-400 truncate">
                {initialGroupMessages[initialGroupMessages.length - 1]?.content || 'אין הודעות עדיין'}
              </p>
            </div>
          </button>

          {/* DM header */}
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">הודעות אישיות</p>
            {totalUnreadDm > 0 && (
              <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">{totalUnreadDm}</span>
            )}
          </div>

          {/* Admin DM (always show if not self and not already in conversations) */}
          {adminUser && adminUser.id !== currentUserId && !conversations.find(c => c.userId === adminUser.id) && (
            <button
              onClick={() => openDm(adminUser.id)}
              className={clsx('w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-gray-50 transition', activeDm === adminUser.id && 'bg-indigo-50')}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                {adminUser.avatar_url ? <img src={adminUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">👤</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{adminUser.full_name || 'מרצה'}</p>
                  <span className="text-xs text-indigo-500 shrink-0">מרצה</span>
                </div>
                <p className="text-xs text-gray-400">התחל שיחה</p>
              </div>
            </button>
          )}

          {/* Existing conversations */}
          {conversations.map(conv => (
            <button
              key={conv.userId}
              onClick={() => openDm(conv.userId)}
              className={clsx('w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-gray-50 transition', activeDm === conv.userId && 'bg-indigo-50')}
            >
              <div className="relative w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                {conv.avatarUrl ? <img src={conv.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">👤</span>}
                {conv.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{conv.unread}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 truncate">{conv.userName || 'חבר קהילה'}</p>
                  {conv.role === 'admin' && <span className="text-xs text-indigo-500 shrink-0">מרצה</span>}
                </div>
                <p className="text-xs text-gray-400 truncate">{conv.lastMessage || 'התחל שיחה'}</p>
              </div>
            </button>
          ))}

          {conversations.length === 0 && !adminUser && (
            <p className="text-xs text-gray-400 text-center py-6">אין שיחות פרטיות עדיין</p>
          )}
        </div>
      </div>

      {/* RIGHT: Active chat */}
      <div className={clsx('flex-1 flex flex-col min-w-0', showList && 'hidden md:flex')}>
        {/* Mobile back button */}
        <button
          onClick={() => setShowList(true)}
          className="md:hidden flex items-center gap-2 px-4 py-2 text-sm text-gray-500 border-b border-gray-100"
        >
          ← חזור
        </button>

        {activeDm && activeDmInfo ? (
          loadingDm ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">טוען...</div>
          ) : (
            <PrivateChatWindow
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              otherUserId={activeDmInfo.userId}
              otherUserName={activeDmInfo.userName}
              otherUserAvatar={activeDmInfo.avatarUrl}
              otherUserRole={activeDmInfo.role}
              otherUserProfileVisibility={activeDmInfo.profileVisibility}
              initialMessages={pmMessages}
            />
          )
        ) : loadingDm ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">טוען...</div>
        ) : !showList ? (
          <ChatWindow
            cohortId={cohortId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            currentUserRole={currentUserRole}
            initialMessages={initialGroupMessages}
            onOpenDm={openDm}
          />
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-gray-400 text-sm flex-col gap-2">
            <span className="text-4xl">💬</span>
            <p>בחר שיחה מהרשימה</p>
          </div>
        )}
      </div>
    </div>
  )
}
