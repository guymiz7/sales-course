import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LessonsFormsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cohortData } = await supabase
    .from('user_cohorts')
    .select('cohort_id, cohorts(course_id)')
    .eq('user_id', user.id)
    .single()

  const courseId = (cohortData?.cohorts as any)?.course_id as string | undefined
  const cohortId = cohortData?.cohort_id as string | undefined

  // Get released form IDs for this cohort
  const { data: releasedForms } = cohortId
    ? await supabase.from('form_cohorts').select('form_id').eq('cohort_id', cohortId).eq('is_released', true)
    : { data: [] as any[] }

  const releasedFormIds = (releasedForms || []).map(r => r.form_id as string)

  const [{ data: forms }, { data: responses }] = await Promise.all([
    releasedFormIds.length > 0
      ? supabase.from('forms').select('id, title, description, order_num').in('id', releasedFormIds).eq('is_active', true).order('order_num')
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('form_responses').select('form_id, submitted_at').eq('user_id', user.id),
  ])

  const responseMap = new Map((responses || []).map(r => [r.form_id as string, r]))

  const submitted = (forms || []).filter(f => !!responseMap.get(f.id)?.submitted_at).length
  const total = (forms || []).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">טפסים</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total > 0 ? `${submitted} מתוך ${total} הוגשו` : 'מלא את הטפסים שהוקצו לך'}
        </p>
      </div>

      {total === 0 ? (
        <p className="text-gray-400 text-sm py-12 text-center">אין טפסים פעילים כרגע</p>
      ) : (
        <div className="space-y-3">
          {(forms as any[]).map(form => {
            const response = responseMap.get(form.id)
            const isSubmitted = !!response?.submitted_at
            const hasDraft = !!response && !isSubmitted
            return (
              <Link
                key={form.id}
                href={`/forms/${form.id}`}
                className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-indigo-300 transition"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{form.title}</p>
                    {form.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{form.description}</p>
                    )}
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                    isSubmitted
                      ? 'bg-green-100 text-green-700'
                      : hasDraft
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {isSubmitted ? '✓ הוגש' : hasDraft ? 'טיוטה' : 'ממתין למילוי'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
