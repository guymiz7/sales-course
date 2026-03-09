import { createClient } from '@/lib/supabase/server'

export default async function MyQuestionsPage() {
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
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">השאלות שלי</h1>
        <p className="text-sm text-gray-500 mt-1">כל השאלות שפרסמת בקורס</p>
      </div>

      {(questions || []).length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">עדיין לא שאלת שאלות</p>
      ) : (
        <div className="space-y-3">
          {(questions || []).map((q: any) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              {q.lessons && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full">
                    שיעור {q.lessons.number}
                  </span>
                  <span className="text-xs text-gray-400 truncate">{q.lessons.title}</span>
                </div>
              )}
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.content}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                <span>{new Date(q.created_at).toLocaleDateString('he-IL')}</span>
                {q.is_private && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">פרטית</span>}
                {q.is_done
                  ? <span className="text-green-600 font-medium">✓ נענתה</span>
                  : q.replies?.length > 0
                    ? <span className="text-indigo-600">{q.replies.length} תגובות</span>
                    : <span className="text-orange-500">ממתינה לתשובה</span>
                }
              </div>
              {q.replies?.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                  {q.replies.map((r: any) => (
                    <div key={r.id} className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-gray-600 mb-0.5">{r.users?.full_name || 'אנונימי'}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
