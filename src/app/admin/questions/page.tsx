import { createClient } from '@/lib/supabase/server'
import AdminQuestionList from '@/components/AdminQuestionList'

export default async function AllQuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">כל השאלות</h1>
        <p className="text-sm text-gray-500 mt-1">
          {questions?.length || 0} שאלות סה"כ
        </p>
      </div>
      <AdminQuestionList questions={(questions || []) as any} currentUserId={user!.id} showFilters />
    </div>
  )
}
