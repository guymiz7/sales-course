import { createClient } from '@/lib/supabase/server'
import AdminQuestionList from '@/components/AdminQuestionList'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // All unanswered, non-done questions
  const { data: questions } = await supabase
    .from('questions')
    .select(`
      id, user_id, content, created_at, is_done, is_private, user_answered, last_reopened_at,
      users!questions_user_id_fkey(full_name),
      replies(id, content, created_at, user_id, edited_at, users!replies_user_id_fkey(full_name)),
      question_reads(user_id),
      lessons(number, title),
      cohorts(name)
    `)
    .eq('is_done', false)
    .order('created_at', { ascending: false })

  const openQuestions = (questions || []) as any
  const unansweredCount = openQuestions.filter((q: any) => q.replies.length === 0).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">שאלות פתוחות</h1>
        <p className="text-sm text-gray-500 mt-1">
          {openQuestions.length} שאלות פתוחות · {unansweredCount} ממתינות לתשובה ראשונה
        </p>
      </div>
      <AdminQuestionList questions={openQuestions} currentUserId={user!.id} showFilters />
    </div>
  )
}
