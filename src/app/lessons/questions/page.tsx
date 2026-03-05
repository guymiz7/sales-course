import { createClient } from '@/lib/supabase/server'
import AllQuestionsView from '@/components/AllQuestionsView'

export default async function AllQuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: cohortData } = await supabase
    .from('user_cohorts')
    .select('cohort_id')
    .eq('user_id', user.id)
    .single()

  const cohortId = cohortData?.cohort_id

  const { data: questions } = await supabase
    .from('questions')
    .select(`
      id, user_id, content, created_at, is_done, is_private, user_answered, last_reopened_at,
      users!questions_user_id_fkey(full_name),
      replies(id, content, created_at, user_id, edited_at, users!replies_user_id_fkey(full_name)),
      question_reads(user_id),
      lessons(id, number, title)
    `)
    .eq('cohort_id', cohortId || '')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">כל השאלות</h1>
        <p className="text-sm text-gray-500 mt-1">שאלות מכל שיעורי הקורס</p>
      </div>
      <AllQuestionsView questions={(questions || []) as any} currentUserId={user.id} />
    </div>
  )
}
