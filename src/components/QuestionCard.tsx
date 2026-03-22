'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

interface Reply {
  id: string
  content: string
  created_at: string
  user_id: string
  edited_at?: string
  users: { full_name: string } | null
}

interface Question {
  id: string
  user_id: string
  content: string
  created_at: string
  is_done: boolean
  is_private: boolean
  user_answered: boolean
  last_reopened_at?: string
  users: { full_name: string } | null
  replies: Reply[]
  question_reads: { user_id: string }[]
}

interface Props {
  question: Question
  currentUserId: string
  isAdmin: boolean
  onMarkDone?: (questionId: string) => Promise<void>
  onDelete?: (questionId: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'עכשיו'
  if (min < 60) return `לפני ${min} דקות`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `לפני ${hr} שעות`
  return `לפני ${Math.floor(hr / 24)} ימים`
}

function elapsedBadge(dateStr: string): { label: string; classes: string } {
  const hr = (Date.now() - new Date(dateStr).getTime()) / 3600000
  const label = hr < 1
    ? `${Math.floor(hr * 60)} דק'`
    : hr < 24
    ? `${Math.floor(hr)} שע'`
    : `${Math.floor(hr / 24)} ימים`
  const classes = hr < 12
    ? 'bg-green-50 text-green-700'
    : hr < 48
    ? 'bg-orange-50 text-orange-700'
    : 'bg-red-50 text-red-700'
  return { label, classes }
}

export default function QuestionCard({ question, currentUserId, isAdmin, onMarkDone, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localReplies, setLocalReplies] = useState<Reply[]>(() =>
    [...question.replies].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  )
  const [isDone, setIsDone] = useState(question.is_done)
  const [userAnswered, setUserAnswered] = useState(question.user_answered)
  const [localIsRead, setLocalIsRead] = useState(
    question.question_reads.some(r => r.user_id === currentUserId)
  )
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Ref guard against double-submit (faster than React state)
  const submittingRef = useRef(false)
  const repliesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const supabase = createClient()
  const router = useRouter()

  const isOwnQuestion = !isAdmin && question.user_id === currentUserId
  const timerStart = question.last_reopened_at || question.created_at
  const elapsed = isAdmin && !isDone ? elapsedBadge(timerStart) : null

  // Scroll to latest reply when new one arrives
  useEffect(() => {
    if (expanded && repliesEndRef.current) {
      repliesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [localReplies.length, expanded])

  async function markAsRead() {
    if (localIsRead) return
    setLocalIsRead(true) // immediate — no page jump
    await supabase.from('question_reads').insert({
      question_id: question.id,
      user_id: currentUserId,
      read_at: new Date().toISOString(),
    })
    // No router.refresh() — state persists in DB, shows correct on next load
  }

  async function markUserAnswered() {
    setUserAnswered(true)
    await supabase.from('questions').update({ user_answered: true }).eq('id', question.id)
  }

  async function handleReopen() {
    setIsDone(false)
    await supabase.from('questions')
      .update({ is_done: false, last_reopened_at: new Date().toISOString() })
      .eq('id', question.id)
  }

  function handleExpand() {
    setExpanded(e => !e)
    if (!localIsRead && !isAdmin && !isOwnQuestion) markAsRead()
  }

  async function handleEditReply(replyId: string) {
    if (!editContent.trim()) return
    const now = new Date().toISOString()
    setLocalReplies(prev => prev.map(r =>
      r.id === replyId ? { ...r, content: editContent.trim(), edited_at: now } : r
    ))
    setEditingReplyId(null)
    setEditContent('')
    await supabase.from('replies')
      .update({ content: editContent.trim(), edited_at: now })
      .eq('id', replyId)
  }

  async function submitReply() {
    // Ref-based guard prevents double-fire before React state updates
    if (!replyText.trim() || submittingRef.current) return
    submittingRef.current = true

    const text = replyText.trim()
    setReplyText('')
    setSubmitting(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '38px'
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      submittingRef.current = false
      setSubmitting(false)
      return
    }

    const { data: newReply } = await supabase
      .from('replies')
      .insert({
        question_id: question.id,
        user_id: user.id,
        content: text,
        ...(isAdmin ? { admin_id: user.id } : {}),
      })
      .select('id, content, created_at, user_id, users!replies_user_id_fkey(full_name)')
      .single()

    if (newReply) {
      setLocalReplies(prev => [...prev, newReply as unknown as Reply])
    }

    // Admin reply → auto-mark done
    if (isAdmin) {
      setIsDone(true)
      await supabase.from('questions').update({ is_done: true }).eq('id', question.id)
      router.refresh()
    }

    // Owner replies on closed question → reopen with timer reset
    if (isDone && isOwnQuestion) {
      setIsDone(false)
      await supabase.from('questions')
        .update({ is_done: false, last_reopened_at: new Date().toISOString() })
        .eq('id', question.id)
    }

    submittingRef.current = false
    setSubmitting(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitReply()
    }
  }

  return (
    <div className={clsx(
      'border rounded-xl overflow-hidden border-gray-200 bg-white transition-opacity duration-200',
      isDone && 'opacity-70'
    )}>
      {/* Header */}
      <div
        className="flex items-start gap-3 p-5 cursor-pointer select-none hover:bg-gray-50 active:bg-gray-100 transition-colors"
        onClick={handleExpand}
      >
        {/* Unread dot */}
        <div className="mt-2 shrink-0">
          <div className={clsx(
            'w-2.5 h-2.5 rounded-full transition-colors duration-300',
            !localIsRead && !isAdmin && !isOwnQuestion ? 'bg-indigo-600' : 'bg-transparent'
          )} />
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5">
          {(question.users?.full_name || 'א')[0]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-1.5 flex flex-wrap gap-x-2 items-center">
            <span className="font-medium text-gray-600">{question.users?.full_name}</span>
            <span>· {timeAgo(question.created_at)}</span>
            {question.is_private && <span className="text-indigo-400">🔒 פרטי</span>}
          </p>
          <p className={clsx(
            'text-sm leading-relaxed whitespace-pre-wrap text-gray-900',
            !localIsRead && !isAdmin && !isOwnQuestion && 'font-semibold'
          )}>
            {question.content}
          </p>
          <div className="flex flex-wrap gap-x-3 items-center mt-2">
            {localReplies.length > 0 && <span className="text-xs text-blue-500">💬 {localReplies.length} תגובות</span>}
            {userAnswered && <span className="text-xs text-green-600 font-medium">✓ קיבלתי מענה</span>}
            {isDone && <span className="text-xs text-gray-400">✓ טופל</span>}
          </div>
        </div>

        {/* Right controls */}
        <div className="shrink-0" onClick={e => e.stopPropagation()}>
          {isAdmin ? (
            isDone ? (
              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full">טופל</span>
            ) : elapsed ? (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${elapsed.classes}`}>
                ⏱ {elapsed.label}
              </span>
            ) : null
          ) : isOwnQuestion ? (
            !userAnswered ? (
              <button
                onClick={markUserAnswered}
                className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full hover:bg-green-100 active:bg-green-200 transition font-medium border border-green-200"
              >
                קיבלתי מענה ✓
              </button>
            ) : (
              <span className="text-xs text-green-600 font-medium">✓ קיבלתי מענה</span>
            )
          ) : (
            <button
              onClick={markAsRead}
              className={clsx(
                'text-xs px-2 py-1 rounded-md transition-colors',
                localIsRead ? 'text-gray-300 cursor-default' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100'
              )}
            >
              {localIsRead ? '✓' : 'סמן קרא'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50">

          {/* Replies thread */}
          {localReplies.length > 0 && (
            <div className="px-4 pt-4 pb-2 space-y-3">
              {localReplies.map(reply => {
                // In RTL: ml-auto pushes element to the RIGHT (start direction)
                //         mr-auto pushes element to the LEFT (end direction)
                const isMyReply = reply.user_id === currentUserId
                const isEditing = editingReplyId === reply.id
                return (
                  <div key={reply.id} className={clsx(
                    'rounded-2xl px-4 py-3 text-sm max-w-[85%] shadow-sm',
                    isMyReply
                      ? 'bg-indigo-600 text-white ml-auto'   // my messages → RIGHT in RTL
                      : 'bg-white border border-gray-200 mr-auto'  // others → LEFT in RTL
                  )}>
                    <p className={clsx(
                      'text-xs font-medium mb-1',
                      isMyReply ? 'text-indigo-200' : 'text-gray-500'
                    )}>
                      {reply.users?.full_name || 'משתמש'}
                    </p>

                    {isEditing ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={2}
                          className="w-full border border-indigo-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-start">
                          <button
                            onClick={() => handleEditReply(reply.id)}
                            disabled={!editContent.trim()}
                            className="text-xs bg-white text-indigo-700 px-2.5 py-0.5 rounded-full font-medium hover:bg-indigo-50 disabled:opacity-40"
                          >
                            שמור
                          </button>
                          <button
                            onClick={() => { setEditingReplyId(null); setEditContent('') }}
                            className="text-xs text-indigo-200 hover:text-white"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                        <div className={clsx(
                          'flex items-center justify-between mt-1.5 gap-3',
                          isMyReply ? 'text-indigo-300' : 'text-gray-400'
                        )}>
                          <div className="flex items-center gap-2 text-xs">
                            {reply.edited_at && <span className="italic opacity-75">נערך</span>}
                            {isMyReply && (
                              <button
                                onClick={() => { setEditingReplyId(reply.id); setEditContent(reply.content) }}
                                className="opacity-50 hover:opacity-100 transition-opacity text-xs underline underline-offset-2"
                              >
                                עריכה
                              </button>
                            )}
                          </div>
                          <span className="text-xs shrink-0">{timeAgo(reply.created_at)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              {/* Scroll anchor */}
              <div ref={repliesEndRef} />
            </div>
          )}

          {/* Action buttons */}
          {((isOwnQuestion && isDone) || isAdmin) && (
            <div className="px-4 pt-2 pb-0 flex gap-2 flex-wrap">
              {isAdmin && onMarkDone && !isDone && (
                <button
                  onClick={() => { setIsDone(true); onMarkDone(question.id) }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 bg-white transition hover:bg-gray-50 active:bg-gray-100"
                >
                  סמן טופל ✓
                </button>
              )}
              {isAdmin && onDelete && (
                <button
                  onClick={() => {
                    if (window.confirm('למחוק את השאלה הזו לצמיתות?')) onDelete(question.id)
                  }}
                  className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition"
                >
                  מחק שאלה 🗑
                </button>
              )}
              {isOwnQuestion && isDone && (
                <button
                  onClick={handleReopen}
                  className="text-xs text-orange-600 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 transition"
                >
                  אין מענה — פתח מחדש
                </button>
              )}
            </div>
          )}

          {/* Reply input */}
          <div className="px-4 py-3 flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={e => {
                setReplyText(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder={submitting ? 'שולח...' : 'כתוב תגובה...'}
              disabled={submitting}
              rows={1}
              className="flex-1 border border-gray-200 rounded-2xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-50 transition-opacity overflow-hidden"
              style={{ minHeight: '38px', maxHeight: '120px' }}
            />
            <button
              onClick={submitReply}
              disabled={submitting || !replyText.trim()}
              className="bg-indigo-600 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 mb-px"
            >
              {submitting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Hint */}
          <p className="px-4 pb-3 text-xs text-gray-400">Enter לשליחה · Shift+Enter לשורה חדשה</p>
        </div>
      )}
    </div>
  )
}
