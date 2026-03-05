import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LessonSidebar from '@/components/LessonSidebar'

export default async function PreviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use admin's own cohort enrollment
  const { data: cohortData } = await supabase
    .from('user_cohorts')
    .select('cohort_id, cohorts(course_id)')
    .eq('user_id', user!.id)
    .single()

  const courseId = (cohortData?.cohorts as { course_id: string } | null)?.course_id

  const { data: lessons } = courseId ? await supabase
    .from('lessons')
    .select('id, number, title')
    .eq('course_id', courseId)
    .order('number') : { data: [] }

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
        <LessonSidebar lessons={lessons || []} previewMode />
        <main className="flex-1 p-6">
          {!courseId ? (
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
