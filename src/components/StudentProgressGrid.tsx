'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Enrollment {
  user_id: string
  cohort_id: string
  access_mode: string | null
  users: { id: string; full_name: string; email: string } | null
  cohorts: {
    id: string
    name: string
    access_mode: string | null
    course_id: string
    courses: { name: string; access_mode: string } | null
  } | null
}

interface Lesson {
  id: string
  number: number
  title: string
  course_id: string
  cohort_id: string | null
}

interface LessonView {
  lesson_id: string
  user_id: string
}

interface Props {
  enrollments: Enrollment[]
  lessons: Lesson[]
  lessonViews: LessonView[]
}

export default function StudentProgressGrid({ enrollments, lessons, lessonViews }: Props) {
  const supabase = createClient()
  const router = useRouter()

  // Unique cohorts from enrollments
  const cohorts = Array.from(
    new Map(enrollments.map(e => [e.cohort_id, { id: e.cohort_id, name: e.cohorts?.name || e.cohort_id }])).values()
  )

  const [selectedCohortId, setSelectedCohortId] = useState(cohorts[0]?.id || '')

  const students = enrollments.filter(e => e.cohort_id === selectedCohortId)
  const cohortCourseId = students[0]?.cohorts?.course_id

  // Lessons for this cohort's course (all cohorts or specific to this cohort)
  const cohortLessons = lessons
    .filter(l => l.course_id === cohortCourseId && (l.cohort_id === null || l.cohort_id === selectedCohortId))
    .sort((a, b) => a.number - b.number)

  const viewedSet = new Set(lessonViews.map(v => `${v.user_id}:${v.lesson_id}`))

  function getEffectiveMode(e: Enrollment): 'open' | 'sequential' {
    const mode = e.access_mode || e.cohorts?.access_mode || e.cohorts?.courses?.access_mode || 'open'
    return mode as 'open' | 'sequential'
  }

  async function updateMode(userId: string, cohortId: string, mode: 'open' | 'sequential' | null) {
    await supabase.from('user_cohorts').update({ access_mode: mode }).eq('user_id', userId).eq('cohort_id', cohortId)
    router.refresh()
  }

  if (cohorts.length === 0) {
    return <p className="text-gray-400 text-sm py-8 text-center">אין תלמידים רשומים</p>
  }

  return (
    <div>
      {/* Cohort tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {cohorts.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCohortId(c.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              selectedCohortId === c.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {students.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">אין תלמידים במחזור זה</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-2 pr-4 font-semibold text-gray-700 min-w-[160px]">תלמיד</th>
                {cohortLessons.map(l => (
                  <th key={l.id} className="text-center py-2 px-2 font-medium text-gray-400 min-w-[2.5rem]" title={l.title}>
                    <span className="text-xs">{l.number}</span>
                  </th>
                ))}
                <th className="text-center py-2 px-3 font-semibold text-gray-700 min-w-[100px]">גישה</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const effectiveMode = getEffectiveMode(student)
                const viewedCount = cohortLessons.filter(l => viewedSet.has(`${student.user_id}:${l.id}`)).length

                return (
                  <tr key={student.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-800">{student.users?.full_name || '—'}</p>
                      <p className="text-xs text-gray-400">{viewedCount}/{cohortLessons.length} שיעורים</p>
                    </td>
                    {cohortLessons.map(l => {
                      const viewed = viewedSet.has(`${student.user_id}:${l.id}`)
                      return (
                        <td key={l.id} className="text-center py-2.5 px-2">
                          <span
                            className={`inline-block w-5 h-5 rounded-full ${viewed ? 'bg-green-400' : 'bg-gray-200'}`}
                            title={`${l.title}${viewed ? ' — נצפה' : ' — לא נצפה'}`}
                          />
                        </td>
                      )
                    })}
                    <td className="text-center py-2.5 px-3">
                      <AccessModeSelector
                        current={student.access_mode}
                        effective={effectiveMode}
                        onChange={mode => updateMode(student.user_id, student.cohort_id, mode)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AccessModeSelector({
  current,
  effective,
  onChange,
}: {
  current: string | null
  effective: string
  onChange: (mode: 'open' | 'sequential' | null) => void
}) {
  const [open, setOpen] = useState(false)

  const modeColor = effective === 'sequential' ? 'text-orange-700 bg-orange-50' : 'text-green-700 bg-green-50'
  const modeLabel = effective === 'sequential' ? 'רצף' : 'פתוח'
  const hasOverride = current !== null

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition hover:opacity-80 ${modeColor}`}
      >
        {modeLabel}
        {hasOverride && <span className="opacity-50 text-[10px]">*</span>}
      </button>
    )
  }

  return (
    <div className="flex gap-1 flex-wrap justify-center items-center">
      {([null, 'open', 'sequential'] as const).map(m => (
        <button
          key={String(m)}
          onClick={() => { onChange(m); setOpen(false) }}
          className={`px-1.5 py-0.5 rounded text-xs transition ${
            current === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {m === null ? 'ירושה' : m === 'open' ? 'פתוח' : 'רצף'}
        </button>
      ))}
      <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
    </div>
  )
}
