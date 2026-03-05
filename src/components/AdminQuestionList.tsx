'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
  lessons: { number: number; title: string } | null
  cohorts: { name: string } | null
}

interface Props {
  questions: Question[]
  currentUserId: string
  showFilters?: boolean
}

export default function AdminQuestionList({ questions, currentUserId, showFilters }: Props) {
  const [filter, setFilter] = useState<'all' | 'answered' | 'unanswered'>('all')
  const supabase = createClient()
  const router = useRouter()

  const filtered = questions.filter(q => {
    if (filter === 'answered') return q.replies.length > 0
    if (filter === 'unanswered') return q.replies.length === 0
    return true
  })

  async function handleMarkDone(questionId: string) {
    await supabase.from('questions').update({ is_done: true }).eq('id', questionId)
    router.refresh()
  }

  return (
    <div>
      {showFilters && (
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {(['all', 'unanswered', 'answered'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                filter === f
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'הכל' : f === 'unanswered' ? 'לא נענו' : 'נענו'}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(q => (
          <div key={q.id}>
            <p className="text-xs text-gray-400 mb-1 px-1">
              שיעור {q.lessons?.number} — {q.lessons?.title}
              {q.cohorts && <span> · {q.cohorts.name}</span>}
              {q.is_private && <span className="text-indigo-400"> · פרטי</span>}
            </p>
            <QuestionCard
              question={q}
              currentUserId={currentUserId}
              isAdmin
              onMarkDone={handleMarkDone}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-12">אין שאלות</p>
        )}
      </div>
    </div>
  )
}
