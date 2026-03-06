import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import VideoPlayer from '@/components/VideoPlayer'
import QuestionList from '@/components/QuestionList'
import NewQuestionForm from '@/components/NewQuestionForm'
import LessonSidebar from '@/components/LessonSidebar'

export default async function PreviewLessonPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, number, title, google_drive_file_id, description, download_url, course_id')
    .eq('id', params.id)
    .single()

  if (!lesson) notFound()

  // Get admin's cohort enrollment
  const { data: cohortData } = await supabase
    .from('user_cohorts')
    .select('cohort_id')
    .eq('user_id', user!.id)
    .single()

  const cohortId = cohortData?.cohort_id

  // Get all lessons and forms for sidebar
  const [{ data: lessons }, { data: forms }] = await Promise.all([
    supabase.from('lessons').select('id, number, title').eq('course_id', (lesson as { course_id: string }).course_id).order('number'),
    supabase.from('forms').select('id, title, order_num').eq('course_id', (lesson as { course_id: string }).course_id).eq('is_active', true).order('order_num'),
  ])

  // Get questions (same as student view)
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
    <div className="min-h-screen bg-gray-50">
      {/* Preview banner */}
      <div className="bg-indigo-600 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-4">
        <span>מצב תצוגה מקדימה — כך התלמידים רואים את הפלטפורמה</span>
        <Link href="/admin" className="underline text-indigo-200 hover:text-white text-xs">
          חזור לניהול ←
        </Link>
      </div>

      {/* Student navbar */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between">
        <span className="font-bold text-gray-900 text-base">קורס מכירות</span>
        <span className="text-sm text-gray-600">תצוגת תלמיד</span>
      </header>

      <div className="flex max-w-6xl mx-auto">
        <LessonSidebar lessons={lessons || []} forms={forms || []} previewMode />
        <main className="flex-1 p-6">
          <div className="max-w-3xl">
            <div className="mb-6">
              <p className="text-xs text-indigo-600 font-medium mb-1">שיעור {lesson.number}</p>
              <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
            </div>

            <div className="mb-6">
              <VideoPlayer fileId={lesson.google_drive_file_id} />
            </div>

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

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">שאלות ותמיכה</h2>
                <span className="text-xs text-gray-400">{questions?.length || 0} שאלות</span>
              </div>

              <NewQuestionForm
                lessonId={lesson.id}
                cohortId={cohortId || ''}
                userId={user!.id}
              />

              <div className="mt-5">
                <QuestionList
                  questions={(questions || []) as any}
                  currentUserId={user!.id}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
