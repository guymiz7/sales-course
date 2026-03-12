import { createClient } from '@/lib/supabase/server'
import StudentProgressGrid from '@/components/StudentProgressGrid'

export default async function StudentsPage() {
  const supabase = await createClient()

  // All enrollments with user info + cohort + course + access modes
  const { data: enrollments } = await supabase
    .from('user_cohorts')
    .select(`
      user_id, cohort_id, access_mode,
      users!user_cohorts_user_id_fkey(id, full_name, email, registration_number),
      cohorts(id, name, access_mode, course_id, courses(name, access_mode))
    `)
    .order('cohort_id')

  // All lessons, views, parts, cohorts, forms, and form_responses in parallel
  const [{ data: lessons }, { data: lessonViews }, { data: parts }, { data: allCohorts }, { data: forms }, { data: formResponses }] = await Promise.all([
    supabase.from('lessons').select('id, number, title, course_id, cohort_id, part_id').order('number'),
    supabase.from('lesson_views').select('lesson_id, user_id, watch_seconds'),
    supabase.from('parts').select('id, number, title, course_id').order('number'),
    supabase.from('cohorts').select('id, name, course_id, courses(name)').order('name'),
    supabase.from('forms').select('id, title, course_id').eq('is_active', true).order('order_num'),
    supabase.from('form_responses').select('form_id, user_id, submitted_at'),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">תלמידים</h1>
        <p className="text-sm text-gray-500 mt-1">מעקב התקדמות ומצב גישה לכל תלמיד</p>
      </div>
      <StudentProgressGrid
        enrollments={(enrollments || []) as any}
        lessons={(lessons || []) as any}
        lessonViews={lessonViews || []}
        parts={parts || []}
        allCohorts={(allCohorts || []) as any}
        forms={(forms || []) as any}
        formResponses={formResponses || []}
      />
    </div>
  )
}
