'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  lessonId: string
  cohortId: string
  userId: string
}

export default function NewQuestionForm({ lessonId, cohortId, userId }: Props) {
  const [content, setContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)

    await supabase.from('questions').insert({
      lesson_id: lessonId,
      cohort_id: cohortId,
      user_id: userId,
      content: content.trim(),
      is_private: isPrivate,
      is_done: false,
    })

    setContent('')
    setIsPrivate(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="כתוב את שאלתך כאן..."
        rows={3}
        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
      />

      <div className="flex items-center justify-between mt-3">
        {/* Private toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setIsPrivate(!isPrivate)}
            className={`w-9 h-5 rounded-full transition-colors ${isPrivate ? 'bg-indigo-600' : 'bg-gray-300'} relative cursor-pointer`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPrivate ? 'translate-x-0.5' : 'translate-x-4'}`} />
          </div>
          <span className="text-sm text-gray-600">
            {isPrivate ? 'שאלה פרטית (למנהל בלבד)' : 'שאלה פומבית (כולם רואים)'}
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition"
        >
          {loading ? 'שולח...' : 'שלח שאלה'}
        </button>
      </div>
    </form>
  )
}
