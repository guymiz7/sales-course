import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import LessonSidebar from '@/components/LessonSidebar'

export default async function LessonsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile and cohort in parallel
  const [{ data: profile }, { data: cohortData }] = await Promise.all([
    supabase.from('users').select('full_name, role').eq('id', user.id).single(),
    supabase.from('user_cohorts')
      .select('cohort_id, access_mode, cohorts(course_id, access_mode, courses(name, access_mode))')
      .eq('user_id', user.id)
      .single(),
  ])

  if (profile?.role === 'pending') redirect('/pending')
  if (profile?.role === 'admin') redirect('/admin')

  const courseId = (cohortData?.cohorts as any)?.course_id
  const courseName = (cohortData?.cohorts as any)?.courses?.name as string | undefined
  const studentCohortId = cohortData?.cohort_id

  const effectiveMode: 'open' | 'sequential' =
    (cohortData?.access_mode as any) ||
    (cohortData?.cohorts as any)?.access_mode ||
    (cohortData?.cohorts as any)?.courses?.access_mode ||
    'open'

  // Fetch views and lessons in parallel
  const [{ data: views }, { data: lessons }] = await Promise.all([
    supabase.from('lesson_views').select('lesson_id').eq('user_id', user.id),
    courseId
      ? supabase.from('lessons').select('id, number, title')
          .eq('course_id', courseId)
          .or(studentCohortId
            ? `cohort_id.is.null,cohort_id.eq.${studentCohortId}`
            : 'cohort_id.is.null')
          .order('number')
      : Promise.resolve({ data: [] as any[] }),
  ])
  const viewedLessonIds = (views || []).map(v => v.lesson_id as string)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile?.full_name || ''} role="student" courseName={courseName} />
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
