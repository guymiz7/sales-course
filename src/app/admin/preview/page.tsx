export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LessonSidebar from '@/components/LessonSidebar'

export default async function PreviewPage({ searchParams }: { searchParams: { cohort?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch all cohorts for selector
  const { data: allCohorts } = await supabase
    .from('cohorts')
    .select('id, name, course_id, courses(name)')
    .order('created_at', { ascending: false })

  // Use selected cohort from query param, fallback to admin's own enrollment
  let selectedCohortId = searchParams.cohort
  if (!selectedCohortId) {
    const { data: adminCohort } = await supabase
      .from('user_cohorts')
      .select('cohort_id')
      .eq('user_id', user.id)
      .single()
    selectedCohortId = adminCohort?.cohort_id
  }

  const selectedCohort = (allCohorts || []).find(c => c.id === selectedCohortId)
  const courseId = (selectedCohort?.courses as any)?.course_id || selectedCohort?.course_id

  const [{ data: lessons }, { data: parts }, { data: forms }] = await Promise.all([
    courseId
      ? supabase.from('lessons').select('id, number, title, part_id')
          .eq('course_id', courseId)
          .or(selectedCohortId ? `cohort_id.is.null,cohort_id.eq.${selectedCohortId}` : 'cohort_id.is.null')
          .order('number')
      : Promise.resolve({ data: [] as any[] }),
    courseId
      ? supabase.from('parts').select('id, number, title, image_url').eq('course_id', courseId).order('number')
      : Promise.resolve({ data: [] as any[] }),
    courseId && selectedCohortId
      ? supabase.from('forms').select('id, title, order_num, form_cohorts!inner(cohort_id, is_released)').eq('course_id', courseId).eq('is_active', true).eq('form_cohorts.cohort_id', selectedCohortId).eq('form_cohorts.is_released', true).order('order_num')
      : Promise.resolve({ data: [] as any[] }),
  ])

  const courseName = (selectedCohort?.courses as any)?.name || 'קורס'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview banner */}
      <div className="bg-indigo-600 text-white py-2 px-4 text-sm font-medium flex items-center justify-between gap-4">
        <span>מצב תצוגה מקדימה — כך התלמידים רואים את הפלטפורמה</span>
        <div className="flex items-center gap-3">
          {/* Cohort selector */}
          {(allCohorts || []).length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-indigo-200 text-xs">מחזור:</span>
              <div className="flex gap-1">
                {(allCohorts || []).map(c => (
                  <Link
                    key={c.id}
                    href={`/admin/preview?cohort=${c.id}`}
                    className={`text-xs px-2 py-1 rounded transition ${
                      selectedCohortId === c.id
                        ? 'bg-white text-indigo-700 font-semibold'
                        : 'text-indigo-200 hover:text-white hover:bg-indigo-500'
                    }`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <Link href="/admin" className="underline text-indigo-200 hover:text-white text-xs">
            חזור לניהול ←
          </Link>
        </div>
      </div>

      {/* Student navbar */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between">
        <span className="font-bold text-gray-900 text-base">{courseName}</span>
        <span className="text-sm text-gray-500">
          {selectedCohort?.name || 'תצוגת תלמיד'}
        </span>
      </header>

      <div className="flex max-w-6xl mx-auto">
        <LessonSidebar lessons={lessons || []} parts={parts || []} forms={forms || []} previewMode />
        <main className="flex-1 p-6">
          {!selectedCohortId ? (
            <div className="text-center mt-20">
              <p className="text-gray-400 text-sm mb-3">לא רשום למחזור</p>
              <Link href="/admin/courses" className="text-indigo-600 text-sm underline">
                לך לניהול קורסים ולחץ "הרשם כתלמיד"
              </Link>
            </div>
          ) : (lessons || []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center mt-20">אין שיעורים במחזור זה עדיין</p>
          ) : (
            <p className="text-gray-400 text-sm text-center mt-20">בחר שיעור מהסרגל הצדדי</p>
          )}
        </main>
      </div>
    </div>
  )
}
