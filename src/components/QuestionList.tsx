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
}

interface Props {
  questions: Question[]
  currentUserId: string
}

export default function QuestionList({ questions, currentUserId }: Props) {
  const [tab, setTab] = useState<'public' | 'mine'>('public')

  // Others' public questions — unread first, then newest
  const othersQuestions = questions
    .filter(q => q.user_id !== currentUserId && !q.is_private)
    .sort((a, b) => {
      const aRead = a.question_reads.some(r => r.user_id === currentUserId)
      const bRead = b.question_reads.some(r => r.user_id === currentUserId)
      if (aRead !== bRead) return aRead ? 1 : -1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  // My questions (public + private) — newest first
  const myQuestions = questions
    .filter(q => q.user_id === currentUserId)
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
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab('public')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition -mb-px flex items-center gap-1.5 ${
            tab === 'public'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          שאלות ציבוריות
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition -mb-px flex items-center gap-1.5 ${
            tab === 'mine'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          השאלות שלי
          {myUnansweredCount > 0 && (
            <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
              {myUnansweredCount}
            </span>
          )}
        </button>
      </div>

      {/* Questions */}
      <div className="space-y-2">
        {displayed.map(q => (
          <QuestionCard
            key={q.id}
            question={q}
            currentUserId={currentUserId}
            isAdmin={false}
          />
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
