'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

interface ReplyPreview {
  id: string
  content: string
  sender_id: string
}

interface PM {
  id: string
  content: string
  created_at: string
  sender_id: string
  read_at: string | null
  attachment_url?: string | null
  attachment_type?: string | null
  reply_to_id?: string | null
  reply?: ReplyPreview | null
}

interface Props {
  currentUserId: string
  currentUserName: string
  otherUserId: string
  otherUserName: string
  otherUserAvatar: string | null
  otherUserRole: string | null
  otherUserProfileVisibility?: string | null
  initialMessages: PM[]
}

export default function PrivateChatWindow({ currentUserId, currentUserName, otherUserId, otherUserName, otherUserAvatar, otherUserRole, otherUserProfileVisibility, initialMessages }: Props) {
  const [messages, setMessages] = useState<PM[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<PM | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
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
        const p = payload.new as any
        const isRelevant = (p.sender_id === currentUserId && p.receiver_id === otherUserId) ||
                           (p.sender_id === otherUserId && p.receiver_id === currentUserId)
        if (isRelevant) {
          setMessages(prev => {
            const replyMsg = p.reply_to_id ? prev.find(m => m.id === p.reply_to_id) : null
            const msg: PM = { ...p, reply: replyMsg ? { id: replyMsg.id, content: replyMsg.content, sender_id: replyMsg.sender_id } : null }
            return [...prev, msg]
          })
          if (p.sender_id === otherUserId) {
            await supabase.from('private_messages').update({ read_at: new Date().toISOString() }).eq('id', p.id)
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function uploadFile(file: File): Promise<{ url: string; type: string } | null> {
    const ext = file.name.split('.').pop() || 'bin'
    const filePath = `pm/${[currentUserId, otherUserId].sort().join('_')}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
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
    if ((!content && !pendingFile) || sending) return
    setSending(true)
    const msgText = content
    const fileToSend = pendingFile
    const replyId = replyingTo?.id || null
    setText('')
    clearPending()
    setReplyingTo(null)

    let attachment: { url: string; type: string } | null = null
    if (fileToSend) attachment = await uploadFile(fileToSend)

    await supabase.from('private_messages').insert({
      sender_id: currentUserId, receiver_id: otherUserId, content: msgText,
      ...(attachment && { attachment_url: attachment.url, attachment_type: attachment.type }),
      ...(replyId && { reply_to_id: replyId }),
    })
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    if (e.key === 'Escape' && replyingTo) setReplyingTo(null)
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shrink-0">
          {otherUserAvatar ? <img src={otherUserAvatar} alt="" className="w-full h-full object-cover" /> : <span className="text-sm">👤</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{otherUserName}</p>
            {otherUserRole === 'admin' && <span className="text-xs text-indigo-500">מרצה</span>}
            {otherUserProfileVisibility === 'public' && (
              <a href="/lessons/community" className="text-xs text-indigo-400 hover:text-indigo-600 hover:underline transition">צפה בפרופיל</a>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">אין הודעות עדיין — שלח הודעה ראשונה! 👋</p>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === currentUserId
          const prevMsg = messages[i - 1]
          const showTime = !prevMsg || new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000
          return (
            <div key={msg.id} id={`pm-${msg.id}`} className="group">
              {showTime && <p className="text-center text-[10px] text-gray-400 my-2">{formatTime(msg.created_at)}</p>}
              <div className={clsx('flex items-end gap-1 mb-0.5', isMine ? 'justify-start' : 'justify-end')}>
                {/* Reply button */}
                <button
                  onClick={() => setReplyingTo(msg)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 text-sm p-1 rounded-full hover:bg-gray-100 shrink-0"
                  title="הגב"
                >
                  ↩
                </button>
                <div className={clsx(
                  'max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words overflow-hidden',
                  isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                )}>
                  {/* Reply quote */}
                  {msg.reply && (
                    <div
                      className={clsx('rounded-lg px-2 py-1.5 mb-2 border-r-2 cursor-pointer', isMine ? 'bg-indigo-500/40 border-indigo-300' : 'bg-black/5 border-gray-400')}
                      onClick={() => { document.getElementById(`pm-${msg.reply!.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}
                    >
                      <p className={clsx('text-[11px] font-semibold mb-0.5', isMine ? 'text-indigo-200' : 'text-gray-600')}>
                        {msg.reply.sender_id === currentUserId ? 'אתה' : otherUserName}
                      </p>
                      <p className={clsx('text-xs truncate', isMine ? 'text-indigo-200' : 'text-gray-500')}>
                        {msg.reply.content || '📎 קובץ'}
                      </p>
                    </div>
                  )}
                  {msg.content && <span>{msg.content}</span>}
                  {msg.attachment_url && (
                    msg.attachment_type === 'image'
                      ? <img src={msg.attachment_url} alt="תמונה מצורפת" className="max-w-full rounded-lg mt-1 max-h-64 object-contain cursor-pointer" onClick={() => window.open(msg.attachment_url!, '_blank')} />
                      : <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={clsx('flex items-center gap-1 text-xs underline mt-1', isMine ? 'text-indigo-200' : 'text-indigo-600')}>📎 קובץ מצורף</a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyingTo && (
        <div className="border-t border-gray-100 px-3 pt-2 pb-1 flex items-center gap-2 bg-gray-50/80">
          <div className="border-r-2 border-indigo-500 pr-2 flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-600">
              ↩ {replyingTo.sender_id === currentUserId ? 'אתה' : otherUserName}
            </p>
            <p className="text-xs text-gray-500 truncate">{replyingTo.content || '📎 קובץ'}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-red-500 text-xl leading-none shrink-0">×</button>
        </div>
      )}

      {/* Pending attachment preview */}
      {pendingFile && (
        <div className="border-t border-gray-100 px-3 pt-2 flex items-center gap-2">
          {pendingPreview ? <img src={pendingPreview} alt="" className="h-16 rounded-lg object-cover border border-gray-200" /> : <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">📎 {pendingFile.name}</div>}
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
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          style={{ maxHeight: '120px' }}
        />
        <button onClick={send} disabled={(!text.trim() && !pendingFile) || sending} className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-indigo-700 transition shrink-0">
          {sending ? '...' : 'שלח'}
        </button>
      </div>
    </div>
  )
}
