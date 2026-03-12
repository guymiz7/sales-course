'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import InlinePoll from './InlinePoll'

interface ReplyPreview {
  id: string
  content: string
  user_id: string
  users: { full_name: string | null } | null
}

interface ChatMessage {
  id: string
  content: string
  created_at: string
  user_id: string
  attachment_url?: string | null
  attachment_type?: string | null
  poll_id?: string | null
  reply_to_id?: string | null
  reply?: ReplyPreview | null
  users: { full_name: string | null; avatar_url: string | null; role: string | null } | null
}

type UserInfo = { full_name: string | null; avatar_url: string | null; role: string | null }

interface Props {
  cohortId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
  currentUserRole: 'admin' | 'student'
  initialMessages: ChatMessage[]
  onOpenDm?: (userId: string) => void
}

function getUserColor(userId: string): { bg: string; border: string } {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash = hash & hash
  }
  const hue = Math.abs(hash) % 360
  return { bg: `hsl(${hue}, 38%, 93%)`, border: `hsl(${hue}, 38%, 83%)` }
}

export default function ChatWindow({ cohortId, currentUserId, currentUserName, currentUserAvatar, currentUserRole, initialMessages, onOpenDm }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userCacheRef = useRef<Record<string, UserInfo>>({})
  const supabase = createClient()

  useEffect(() => {
    for (const msg of initialMessages) {
      if (msg.user_id && msg.users) userCacheRef.current[msg.user_id] = msg.users
    }
  }, [])

  useEffect(() => {
    if (cohortId) localStorage.setItem(`chat_last_seen_${cohortId}`, new Date().toISOString())
  }, [messages, cohortId])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!cohortId) return
    const channel = supabase
      .channel(`chat:${cohortId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `cohort_id=eq.${cohortId}` },
        async (payload) => {
          const p = payload.new as any
          let userInfo: UserInfo | null = userCacheRef.current[p.user_id] || null
          if (!userInfo) {
            try {
              const res = await fetch('/api/users/names', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [p.user_id] }) })
              const json = await res.json()
              if (json.users?.[0]) { userInfo = json.users[0]; userCacheRef.current[p.user_id] = userInfo! }
            } catch {}
          }
          setMessages(prev => {
            const replyMsg = p.reply_to_id ? prev.find(m => m.id === p.reply_to_id) : null
            const msg: ChatMessage = {
              id: p.id, content: p.content, created_at: p.created_at, user_id: p.user_id,
              attachment_url: p.attachment_url, attachment_type: p.attachment_type, poll_id: p.poll_id,
              reply_to_id: p.reply_to_id,
              reply: replyMsg ? { id: replyMsg.id, content: replyMsg.content, user_id: replyMsg.user_id, users: replyMsg.users } : null,
              users: userInfo,
            }
            return [...prev, msg]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cohortId])

  async function uploadFile(file: File): Promise<{ url: string; type: string } | null> {
    const ext = file.name.split('.').pop() || 'bin'
    const filePath = `group/${cohortId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('chat-files').upload(filePath, file)
    if (error) { alert('שגיאה בהעלאת הקובץ: ' + error.message); return null }
    const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath)
    return { url: data.publicUrl, type: file.type.startsWith('image/') ? 'image' : 'file' }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setPendingPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else setPendingPreview(null)
    e.target.value = ''
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageItem = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) {
        setPendingFile(file)
        const reader = new FileReader()
        reader.onload = ev => setPendingPreview(ev.target?.result as string)
        reader.readAsDataURL(file)
      }
    }
  }

  function clearPending() { setPendingFile(null); setPendingPreview(null) }

  async function send() {
    const content = text.trim()
    if ((!content && !pendingFile) || sending || !cohortId) return
    setSending(true)
    const msgText = content
    const fileToSend = pendingFile
    const replyId = replyingTo?.id || null
    setText('')
    clearPending()
    setReplyingTo(null)

    let attachment: { url: string; type: string } | null = null
    if (fileToSend) attachment = await uploadFile(fileToSend)

    await supabase.from('chat_messages').insert({
      cohort_id: cohortId, user_id: currentUserId, content: msgText,
      ...(attachment && { attachment_url: attachment.url, attachment_type: attachment.type }),
      ...(replyId && { reply_to_id: replyId }),
    })

    // Admin: *כולם triggers email notification to all students
    if (currentUserRole === 'admin' && msgText.includes('*כולם')) {
      fetch('/api/admin/notify-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId, message: msgText }),
      }).catch(() => {})
    }

    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    if (e.key === 'Escape' && replyingTo) setReplyingTo(null)
  }

  function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) }
  function formatDate(iso: string) { return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' }) }

  const grouped: { date: string; msgs: ChatMessage[] }[] = []
  for (const msg of messages) {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.date === date) last.msgs.push(msg)
    else grouped.push({ date, msgs: [msg] })
  }

  return (
    <div className="flex flex-col flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Notice banner */}
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 text-center">
        💬 הצ׳אט לשיחות ופאן בלבד · לשאלות שמחכות למענה מהמרצה — כנסו לאזור{' '}
        <a href="/lessons/questions" className="font-bold underline hover:text-amber-900 transition">השאלות</a>
      </div>
      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1">
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
              const userColor = (!isMine && !isAdmin) ? getUserColor(msg.user_id) : null

              return (
                <div key={msg.id} className={clsx('group flex items-end gap-2 mb-0.5', isMine ? 'flex-row-reverse' : 'flex-row')}>
                  {/* Avatar */}
                  <div className="w-7 h-7 shrink-0">
                    {showAvatar && !isMine && (
                      <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                        {msg.users?.avatar_url ? <img src={msg.users.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-gray-400 text-xs">👤</span>}
                      </div>
                    )}
                  </div>

                  <div className={clsx('max-w-[70%] flex flex-col', isMine ? 'items-end' : 'items-start')}>
                    {showAvatar && (
                      <span className={clsx('text-xs mb-0.5 flex items-center gap-1', isMine ? 'text-right' : 'text-left')}>
                        {isMine ? (
                          <span className="font-medium text-gray-500">אתה</span>
                        ) : onOpenDm ? (
                          <button onClick={() => onOpenDm(msg.user_id)} className={clsx('font-medium hover:underline cursor-pointer', isAdmin ? 'text-indigo-600' : 'text-gray-700')}>
                            {msg.users?.full_name || 'חבר קהילה'}
                          </button>
                        ) : (
                          <span className={clsx('font-medium', isAdmin ? 'text-indigo-600' : 'text-gray-700')}>
                            {msg.users?.full_name || 'חבר קהילה'}
                          </span>
                        )}
                        {isAdmin && <span className="text-xs bg-indigo-100 text-indigo-600 px-1 rounded">מרצה</span>}
                      </span>
                    )}

                    {/* Bubble + reply button */}
                    <div className={clsx('flex items-center gap-1', isMine ? 'flex-row' : 'flex-row-reverse')}>
                      {/* Reply button on hover */}
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 text-sm p-1 rounded-full hover:bg-gray-100 shrink-0"
                        title="הגב"
                      >
                        ↩
                      </button>

                      {/* Bubble */}
                      <div
                        className={clsx(
                          'px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words',
                          isMine ? 'bg-indigo-600 text-white rounded-br-sm' :
                          isAdmin ? 'bg-indigo-50 text-gray-900 border border-indigo-100 rounded-bl-sm' :
                          'text-gray-900 rounded-bl-sm border'
                        )}
                        style={userColor ? { backgroundColor: userColor.bg, borderColor: userColor.border } : undefined}
                      >
                        {/* Reply quote */}
                        {msg.reply && (
                          <div className={clsx(
                            'rounded-lg px-2 py-1.5 mb-2 border-r-2 cursor-pointer',
                            isMine ? 'bg-indigo-500/40 border-indigo-300' : 'bg-black/5 border-gray-400'
                          )} onClick={() => {
                            const el = document.getElementById(`msg-${msg.reply!.id}`)
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }}>
                            <p className={clsx('text-[11px] font-semibold mb-0.5', isMine ? 'text-indigo-200' : 'text-gray-600')}>
                              {msg.reply.user_id === currentUserId ? 'אתה' : (msg.reply.users?.full_name || 'חבר קהילה')}
                            </p>
                            <p className={clsx('text-xs truncate', isMine ? 'text-indigo-200' : 'text-gray-500')}>
                              {msg.reply.content || '📎 קובץ'}
                            </p>
                          </div>
                        )}

                        {msg.poll_id ? (
                          <InlinePoll pollId={msg.poll_id} currentUserId={currentUserId} />
                        ) : msg.content ? <span>{msg.content}</span> : null}
                        {msg.attachment_url && (
                          msg.attachment_type === 'image'
                            ? <img src={msg.attachment_url} alt="תמונה מצורפת" className="max-w-full rounded-lg mt-1 max-h-64 object-contain cursor-pointer" onClick={() => window.open(msg.attachment_url!, '_blank')} />
                            : <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={clsx('flex items-center gap-1 text-xs underline mt-1', isMine ? 'text-indigo-200' : 'text-indigo-600')}>📎 קובץ מצורף</a>
                        )}
                      </div>
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

      {/* Reply bar */}
      {replyingTo && (
        <div className="border-t border-gray-100 px-3 pt-2 pb-1 flex items-center gap-2 bg-gray-50/80">
          <div className="border-r-2 border-indigo-500 pr-2 flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-600">
              ↩ {replyingTo.user_id === currentUserId ? 'אתה' : (replyingTo.users?.full_name || 'חבר קהילה')}
            </p>
            <p className="text-xs text-gray-500 truncate">{replyingTo.content || '📎 קובץ'}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-red-500 text-xl leading-none shrink-0">×</button>
        </div>
      )}

      {/* Pending attachment preview */}
      {pendingFile && (
        <div className="border-t border-gray-100 px-3 pt-2 flex items-center gap-2">
          {pendingPreview ? <img src={pendingPreview} alt="" className="h-16 rounded-lg object-cover border border-gray-200" /> : <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">📎 {pendingFile.name}</div>}
          <button onClick={clearPending} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
        <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-indigo-500 transition text-xl shrink-0 pb-1.5" title="צרף קובץ">📎</button>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          placeholder="כתוב הודעה... (Enter לשליחה)"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          style={{ maxHeight: '120px' }}
        />
        <button onClick={send} disabled={(!text.trim() && !pendingFile) || sending} className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-indigo-700 transition shrink-0">
          {sending ? '...' : 'שלח'}
        </button>
      </div>
    </div>
  )
}
