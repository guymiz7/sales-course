import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import LessonSidebar from '@/components/LessonSidebar'

export default async function LessonsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'pending') redirect('/pending')
  if (profile?.role === 'admin') redirect('/admin')

  // Get cohort + access mode chain
  const { data: cohortData } = await supabase
    .from('user_cohorts')
    .select('cohort_id, access_mode, cohorts(course_id, access_mode, courses(access_mode))')
    .eq('user_id', user.id)
    .single()

  const courseId = (cohortData?.cohorts as any)?.course_id
  const studentCohortId = cohortData?.cohort_id

  const effectiveMode: 'open' | 'sequential' =
    (cohortData?.access_mode as any) ||
    (cohortData?.cohorts as any)?.access_mode ||
    (cohortData?.cohorts as any)?.courses?.access_mode ||
    'open'

  // Fetch viewed lesson IDs for this student
  const { data: views } = await supabase
    .from('lesson_views')
    .select('lesson_id')
    .eq('user_id', user.id)
  const viewedLessonIds = (views || []).map(v => v.lesson_id as string)

  // Get lessons for this course (filtered by cohort_id)
  const { data: lessons } = courseId ? await supabase
    .from('lessons')
    .select('id, number, title')
    .eq('course_id', courseId)
    .or(studentCohortId
      ? `cohort_id.is.null,cohort_id.eq.${studentCohortId}`
      : 'cohort_id.is.null'
    )
    .order('number') : { data: [] }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile?.full_name || ''} role="student" />
      <div className="flex max-w-6xl mx-auto">
        <LessonSidebar
          lessons={lessons || []}
          viewedLessonIds={viewedLessonIds}
          accessMode={effectiveMode}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
