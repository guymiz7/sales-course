'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

interface ChatMessage {
  id: string
  content: string
  created_at: string
  user_id: string
  users: { full_name: string | null; avatar_url: string | null; role: string | null } | null
}

interface Props {
  cohortId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
  currentUserRole: 'admin' | 'student'
  initialMessages: ChatMessage[]
}

export default function ChatWindow({ cohortId, currentUserId, currentUserName, currentUserAvatar, currentUserRole, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Mark group chat as seen when opened and when new messages arrive
  useEffect(() => {
    if (cohortId) {
      localStorage.setItem(`chat_last_seen_${cohortId}`, new Date().toISOString())
    }
  }, [messages, cohortId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    if (!cohortId) return
    const channel = supabase
      .channel(`chat:${cohortId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `cohort_id=eq.${cohortId}` },
        async (payload) => {
          // Fetch the full row with user info
          const { data } = await supabase
            .from('chat_messages')
            .select('id, content, created_at, user_id, users(full_name, avatar_url, role)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setMessages(prev => [...prev, data as any])
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cohortId])

  async function send() {
    const content = text.trim()
    if (!content || sending || !cohortId) return
    setSending(true)
    setText('')
    await supabase.from('chat_messages').insert({ cohort_id: cohortId, user_id: currentUserId, content })
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })
  }

  // Group messages by date
  const grouped: { date: string; msgs: ChatMessage[] }[] = []
  for (const msg of messages) {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.date === date) last.msgs.push(msg)
    else grouped.push({ date, msgs: [msg] })
  }

  return (
    <div className="flex flex-col flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">אין הודעות עדיין. היה הראשון לכתוב! 👋</p>
        )}
        {grouped.map(group => (
          <div key={group.date}>
            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 shrink-0">{group.date}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            {group.msgs.map((msg, i) => {
              const isMine = msg.user_id === currentUserId
              const prevMsg = group.msgs[i - 1]
              const showAvatar = !prevMsg || prevMsg.user_id !== msg.user_id
              const isAdmin = msg.users?.role === 'admin'

              return (
                <div key={msg.id} className={clsx('flex items-end gap-2 mb-0.5', isMine ? 'flex-row-reverse' : 'flex-row')}>
                  {/* Avatar spacer or avatar */}
                  <div className="w-7 h-7 shrink-0">
                    {showAvatar && !isMine && (
                      <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                        {msg.users?.avatar_url
                          ? <img src={msg.users.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-gray-400 text-xs">👤</span>
                        }
                      </div>
                    )}
                  </div>

                  <div className={clsx('max-w-[70%]', isMine ? 'items-end' : 'items-start', 'flex flex-col')}>
                    {showAvatar && (
                      <span className={clsx('text-xs mb-0.5 flex items-center gap-1', isMine ? 'text-right' : 'text-left')}>
                        <span className={clsx('font-medium', isAdmin ? 'text-indigo-600' : 'text-gray-600')}>
                          {isMine ? 'אתה' : (msg.users?.full_name || 'חבר קהילה')}
                        </span>
                        {isAdmin && <span className="text-xs bg-indigo-100 text-indigo-600 px-1 rounded">מרצה</span>}
                      </span>
                    )}
                    <div className={clsx(
                      'px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words',
                      isMine
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : isAdmin
                          ? 'bg-indigo-50 text-gray-900 border border-indigo-100 rounded-bl-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="כתוב הודעה... (Enter לשליחה)"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-indigo-700 transition shrink-0"
        >
          שלח
        </button>
      </div>
    </div>
  )
}
