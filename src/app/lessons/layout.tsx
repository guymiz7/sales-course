export const revalidate = 30 // refresh data every 30 seconds
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
    supabase.from('users').select('full_name, role, avatar_url').eq('id', user.id).single(),
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

  const { data: adminSettings } = await supabase
    .from('admin_settings')
    .select('google_review_url, facebook_page_url, facebook_follow_url, instagram_url, linkedin_url, youtube_url, tiktok_url, autotuesday_url')
    .eq('id', 1)
    .single()

  // Fetch views, lessons, parts, and forms in parallel
  const [{ data: views }, { data: lessons }, { data: parts }, { data: forms }, { data: submittedResponses }] = await Promise.all([
    supabase.from('lesson_views').select('lesson_id').eq('user_id', user.id),
    courseId
      ? supabase.from('lessons').select('id, number, title, part_id')
          .eq('course_id', courseId)
          .or(studentCohortId
            ? `cohort_id.is.null,cohort_id.eq.${studentCohortId}`
            : 'cohort_id.is.null')
          .order('number')
      : Promise.resolve({ data: [] as any[] }),
    courseId
      ? supabase.from('parts').select('id, number, title, image_url').eq('course_id', courseId).order('number')
      : Promise.resolve({ data: [] as any[] }),
    courseId && studentCohortId
      ? supabase.from('forms').select('id, title, order_num, form_cohorts!inner(cohort_id, is_released)').eq('course_id', courseId).eq('is_active', true).eq('form_cohorts.cohort_id', studentCohortId).eq('form_cohorts.is_released', true).order('order_num')
      : Promise.resolve({ data: [] as any[] }),
    courseId
      ? supabase.from('form_responses').select('form_id').eq('user_id', user.id).not('submitted_at', 'is', null)
      : Promise.resolve({ data: [] as any[] }),
  ])
  const viewedLessonIds = (views || []).map(v => v.lesson_id as string)
  const submittedFormIds = (submittedResponses || []).map(r => r.form_id as string)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile?.full_name || ''} role="student" courseName={courseName} socialLinks={adminSettings || {}} />
      <div className="flex max-w-6xl mx-auto">
        <LessonSidebar
          lessons={lessons || []}
          parts={parts || []}
          viewedLessonIds={viewedLessonIds}
          accessMode={effectiveMode}
          forms={forms || []}
          submittedFormIds={submittedFormIds}
          avatarUrl={profile?.avatar_url}
          userName={profile?.full_name}
          socialLinks={adminSettings || {}}
          userId={user.id}
          cohortId={studentCohortId}
        />
        <main className="flex-1 p-4 md:p-6 min-w-0">{children}</main>
      </div>
    </div>
  )
}
