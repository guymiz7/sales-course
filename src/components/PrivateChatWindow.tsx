'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

interface PM {
  id: string
  content: string
  created_at: string
  sender_id: string
  read_at: string | null
}

interface Props {
  currentUserId: string
  currentUserName: string
  otherUserId: string
  otherUserName: string
  otherUserAvatar: string | null
  otherUserRole: string | null
  initialMessages: PM[]
}

export default function PrivateChatWindow({ currentUserId, currentUserName, otherUserId, otherUserName, otherUserAvatar, otherUserRole, initialMessages }: Props) {
  const [messages, setMessages] = useState<PM[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark messages as read
  useEffect(() => {
    const unread = messages.filter(m => m.sender_id === otherUserId && !m.read_at).map(m => m.id)
    if (unread.length > 0) {
      supabase.from('private_messages').update({ read_at: new Date().toISOString() }).in('id', unread)
    }
  }, [messages])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`pm:${[currentUserId, otherUserId].sort().join(':')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, async (payload) => {
        const msg = payload.new as any
        const isRelevant = (msg.sender_id === currentUserId && msg.receiver_id === otherUserId) ||
                           (msg.sender_id === otherUserId && msg.receiver_id === currentUserId)
        if (isRelevant) {
          setMessages(prev => [...prev, msg])
          if (msg.sender_id === otherUserId) {
            await supabase.from('private_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id)
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function send() {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText('')
    await supabase.from('private_messages').insert({ sender_id: currentUserId, receiver_id: otherUserId, content })
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shrink-0">
          {otherUserAvatar
            ? <img src={otherUserAvatar} alt="" className="w-full h-full object-cover" />
            : <span className="text-sm">👤</span>
          }
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{otherUserName}</p>
          {otherUserRole === 'admin' && <p className="text-xs text-indigo-600">מרצה</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">אין הודעות עדיין — שלח הודעה ראשונה! 👋</p>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === currentUserId
          const prevMsg = messages[i - 1]
          const showTime = !prevMsg || new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000
          return (
            <div key={msg.id}>
              {showTime && (
                <p className="text-center text-[10px] text-gray-400 my-2">{formatTime(msg.created_at)}</p>
              )}
              <div className={clsx('flex mb-0.5', isMine ? 'justify-start' : 'justify-end')}>
                <div className={clsx(
                  'max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words',
                  isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                )}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
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
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
