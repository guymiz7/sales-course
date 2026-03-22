'use client'
import { useState } from 'react'
import QuestionCard from './QuestionCard'

interface Reply { id: string; content: string; created_at: string; user_id: string; edited_at?: string; users: { full_name: string } | null }
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
  lessons: { id: string; number: number; title: string } | null
}

export default function AllQuestionsView({ questions, currentUserId }: { questions: Question[]; currentUserId: string }) {
  const [tab, setTab] = useState<'public' | 'mine'>('public')
  const [search, setSearch] = useState('')

  const searchLower = search.trim().toLowerCase()

  function matchesSearch(q: Question): boolean {
    if (!searchLower) return true
    // Search in question content
    if (q.content.toLowerCase().includes(searchLower)) return true
    // Search in author name
    if (q.users?.full_name?.toLowerCase().includes(searchLower)) return true
    // Search in all replies
    if (q.replies.some(r => r.content.toLowerCase().includes(searchLower))) return true
    if (q.replies.some(r => r.users?.full_name?.toLowerCase().includes(searchLower))) return true
    return false
  }

  // Others' public questions — unread first, then newest
  const othersQuestions = questions
    .filter(q => q.user_id !== currentUserId && !q.is_private)
    .filter(matchesSearch)
    .sort((a, b) => {
      const aRead = a.question_reads.some(r => r.user_id === currentUserId)
      const bRead = b.question_reads.some(r => r.user_id === currentUserId)
      if (aRead !== bRead) return aRead ? 1 : -1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  // My questions (public + private) — newest first
  const myQuestions = questions
    .filter(q => q.user_id === currentUserId)
    .filter(matchesSearch)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const unreadCount = othersQuestions.filter(
    q => !q.question_reads.some(r => r.user_id === currentUserId)
  ).length

  const myUnansweredCount = myQuestions.filter(
    q => q.replies.length === 0 && !q.user_answered
  ).length

  const displayed = tab === 'public' ? othersQuestions : myQuestions

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 חיפוש בשאלות ותשובות..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          )}
        </div>
        {searchLower && (
          <p className="text-xs text-gray-400 mt-1.5 px-1">
            נמצאו {displayed.length} תוצאות עבור &quot;{search.trim()}&quot;
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab('public')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition -mb-px flex items-center gap-1.5 ${
            tab === 'public' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          שאלות ציבוריות
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{unreadCount}</span>
          )}
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition -mb-px flex items-center gap-1.5 ${
            tab === 'mine' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          השאלות שלי
          {myUnansweredCount > 0 && (
            <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{myUnansweredCount}</span>
          )}
        </button>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {displayed.map(q => (
          <div key={q.id}>
            {q.lessons && (
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full">
                  שיעור {q.lessons.number}
                </span>
                <span className="text-xs text-gray-400 truncate">{q.lessons.title}</span>
              </div>
            )}
            <QuestionCard question={q} currentUserId={currentUserId} isAdmin={false} />
          </div>
        ))}
        {displayed.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">
            {tab === 'public' ? 'אין שאלות ציבוריות עדיין' : 'עדיין לא שאלת שאלות'}
          </p>
        )}
      </div>
    </div>
  )
}
