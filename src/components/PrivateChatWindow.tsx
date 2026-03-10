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
  attachment_url?: string | null
  attachment_type?: string | null
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
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
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
    } else {
      setPendingPreview(null)
    }
    e.target.value = ''
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
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

  function clearPending() {
    setPendingFile(null)
    setPendingPreview(null)
  }

  async function send() {
    const content = text.trim()
    if ((!content && !pendingFile) || sending) return
    setSending(true)
    const msgText = content
    const fileToSend = pendingFile
    setText('')
    clearPending()

    let attachment: { url: string; type: string } | null = null
    if (fileToSend) attachment = await uploadFile(fileToSend)

    await supabase.from('private_messages').insert({
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: msgText,
      ...(attachment && { attachment_url: attachment.url, attachment_type: attachment.type }),
    })
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1">
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

      {/* Pending attachment preview */}
      {pendingFile && (
        <div className="border-t border-gray-100 px-3 pt-2 flex items-center gap-2">
          {pendingPreview
            ? <img src={pendingPreview} alt="" className="h-16 rounded-lg object-cover border border-gray-200" />
            : <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">📎 {pendingFile.name}</div>
          }
          <button onClick={clearPending} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-400 hover:text-indigo-500 transition text-xl shrink-0 pb-1.5"
          title="צרף קובץ"
        >
          📎
        </button>
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
        <button
          onClick={send}
          disabled={(!text.trim() && !pendingFile) || sending}
          className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-indigo-700 transition shrink-0"
        >
          {sending ? '...' : 'שלח'}
        </button>
      </div>
    </div>
  )
}
