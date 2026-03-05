import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import VideoPlayer from '@/components/VideoPlayer'
import QuestionList from '@/components/QuestionList'
import NewQuestionForm from '@/components/NewQuestionForm'

export default async function LessonPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get lesson (include course_id for sequential guard)
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, number, title, google_drive_file_id, description, download_url, course_id')
    .eq('id', params.id)
    .single()

  if (!lesson) notFound()

  // Get student's cohort + access mode chain
  const { data: cohortData } = await supabase
    .from('user_cohorts')
    .select('cohort_id, access_mode, cohorts(access_mode, courses(access_mode))')
    .eq('user_id', user.id)
    .single()

  const cohortId = cohortData?.cohort_id
  const effectiveMode: 'open' | 'sequential' =
    (cohortData?.access_mode as any) ||
    (cohortData?.cohorts as any)?.access_mode ||
    (cohortData?.cohorts as any)?.courses?.access_mode ||
    'open'

  // Sequential access guard: if sequential and not lesson 1, check previous lesson was viewed
  if (effectiveMode === 'sequential' && lesson.number > 1) {
    const { data: prevLesson } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', (lesson as any).course_id)
      .eq('number', lesson.number - 1)
      .maybeSingle()

    if (prevLesson) {
      const { data: prevView } = await supabase
        .from('lesson_views')
        .select('lesson_id')
        .eq('lesson_id', prevLesson.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!prevView) redirect('/lessons')
    }
  }

  // Record this lesson as viewed
  await supabase.from('lesson_views').upsert(
    { lesson_id: lesson.id, user_id: user.id },
    { onConflict: 'lesson_id,user_id', ignoreDuplicates: true }
  )

  // Get questions for this lesson + cohort
  const { data: questions } = await supabase
    .from('questions')
    .select(`
      id, user_id, content, created_at, is_done, is_private, user_answered, last_reopened_at,
      users!questions_user_id_fkey(full_name),
      replies(id, content, created_at, user_id, edited_at, users!replies_user_id_fkey(full_name)),
      question_reads(user_id)
    `)
    .eq('lesson_id', lesson.id)
    .eq('cohort_id', cohortId || '')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl">
      {/* Lesson header */}
      <div className="mb-6">
        <p className="text-xs text-indigo-600 font-medium mb-1">שיעור {lesson.number}</p>
        <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
      </div>

      {/* Video */}
      <div className="mb-6">
        <VideoPlayer fileId={lesson.google_drive_file_id} />
      </div>

      {/* Description + Download */}
      {(lesson.description || lesson.download_url) && (
        <div className="mb-8 space-y-3">
          {lesson.description && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{lesson.description}</p>
          )}
          {lesson.download_url && (
            <a
              href={lesson.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              הורד חומרי לימוד
            </a>
          )}
        </div>
      )}

      {/* Q&A Section */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">שאלות ותמיכה</h2>
          <span className="text-xs text-gray-400">{questions?.length || 0} שאלות</span>
        </div>

        {/* New question form */}
        <NewQuestionForm
          lessonId={lesson.id}
          cohortId={cohortId || ''}
          userId={user.id}
        />

        {/* Questions list */}
        <div className="mt-5">
          <QuestionList
            questions={(questions || []) as any}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  )
}
