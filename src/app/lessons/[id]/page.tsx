import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import VideoPlayer from '@/components/VideoPlayer'
import QuestionList from '@/components/QuestionList'
import NewQuestionForm from '@/components/NewQuestionForm'
import WatchTimeTracker from '@/components/WatchTimeTracker'
import { RECOMMEND_PLATFORM, FOLLOW_PLATFORMS } from '@/lib/recommendPlatforms'

function TextWithLinks({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return (
    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-indigo-600 underline hover:text-indigo-800 break-all">
            {part}
          </a>
        ) : part
      )}
    </p>
  )
}

export default async function LessonPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch lesson and cohort in parallel
  const [{ data: lesson }, { data: cohortData }] = await Promise.all([
    supabase.from('lessons')
      .select('id, number, title, google_drive_file_id, description, download_url, homework, course_id')
      .eq('id', params.id)
      .single(),
    supabase.from('user_cohorts')
      .select('cohort_id, access_mode, cohorts(access_mode, courses(access_mode))')
      .eq('user_id', user.id)
      .single(),
  ])

  if (!lesson) notFound()

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

  // Fetch prev/next lessons for navigation
  const [{ data: prevLesson }, { data: nextLesson }] = await Promise.all([
    supabase.from('lessons').select('id, number, title').eq('course_id', lesson.course_id).eq('number', lesson.number - 1).maybeSingle(),
    supabase.from('lessons').select('id, number, title').eq('course_id', lesson.course_id).eq('number', lesson.number + 1).maybeSingle(),
  ])

  // Record view, fetch questions, and fetch admin social links in parallel
  const [, { data: questions }, { data: adminSettings }] = await Promise.all([
    supabase.from('lesson_views').upsert(
      { lesson_id: lesson.id, user_id: user.id },
      { onConflict: 'lesson_id,user_id', ignoreDuplicates: true }
    ),
    supabase.from('questions')
      .select(`
        id, user_id, content, created_at, is_done, is_private, user_answered, last_reopened_at,
        users!questions_user_id_fkey(full_name),
        replies(id, content, created_at, user_id, edited_at, users!replies_user_id_fkey(full_name)),
        question_reads(user_id)
      `)
      .eq('lesson_id', lesson.id)
      .eq('cohort_id', cohortId || '')
      .order('created_at', { ascending: false }),
    supabase.from('admin_settings').select('google_review_url, facebook_page_url, facebook_follow_url, linkedin_url, youtube_url, tiktok_url, autotuesday_url').eq('id', 1).single(),
  ])

  const social = adminSettings as Record<string, string | null> | null
  const hasRecommend = social?.[RECOMMEND_PLATFORM.key]
  const followLinks = FOLLOW_PLATFORMS.filter(p => social?.[p.key])

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
        <WatchTimeTracker lessonId={lesson.id} userId={user.id} />
      </div>

      {/* Description + Download */}
      {(lesson.description || lesson.download_url) && (
        <div className="mb-8 space-y-3">
          {lesson.description && (
            <TextWithLinks text={lesson.description} />
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

      {/* Homework */}
      {(lesson as any).homework && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h2 className="text-sm font-semibold text-amber-800 mb-2">📝 שיעורי בית</h2>
          <TextWithLinks text={(lesson as any).homework} />
        </div>
      )}

      {/* Lesson navigation */}
      {(prevLesson || nextLesson) && (
        <div className="flex items-center justify-between gap-4 mb-8 mt-2">
          {prevLesson ? (
            <Link
              href={`/lessons/${prevLesson.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition min-w-0"
            >
              <svg className="w-4 h-4 shrink-0 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="truncate">{prevLesson.number}. {prevLesson.title}</span>
            </Link>
          ) : <div />}
          {nextLesson ? (
            <Link
              href={`/lessons/${nextLesson.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition min-w-0"
            >
              <span className="truncate">{nextLesson.number}. {nextLesson.title}</span>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : <div />}
        </div>
      )}

      {/* Recommend / Follow section */}
      {(hasRecommend || followLinks.length > 0) && (
        <div className="mb-8 p-4 bg-gradient-to-l from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">נהנית מהשיעור? 🙏</p>
            <p className="text-xs text-gray-500 mt-0.5">המלצה שלך עוזרת לגיא להגיע לאנשים נוספים</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
            {hasRecommend && (
              <a
                href={social![RECOMMEND_PLATFORM.key]!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
              >
                <img src={`https://www.google.com/s2/favicons?domain=${RECOMMEND_PLATFORM.domain}&sz=32`} alt="" className="w-3.5 h-3.5" />
                המלץ על גיא
              </a>
            )}
            {followLinks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">עקוב:</span>
                {followLinks.map(p => (
                  <a
                    key={p.key}
                    href={social![p.key]!}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={p.label}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition"
                  >
                    <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt={p.label} className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
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
