'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import CopyButton from '@/components/CopyButton'

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

interface Part {
  id: string
  number: number
  title: string
  course_id: string
}

interface Lesson {
  id: string
  number: number
  title: string
  course_id: string
  cohort_id: string | null
  part_id?: string | null
}

interface LessonView {
  lesson_id: string
  user_id: string
  watch_seconds?: number | null
}

interface CohortOption {
  id: string
  name: string
  course_id: string
  courses: { name: string } | null
}

interface CourseForm {
  id: string
  title: string
  course_id: string
}

interface FormResponse {
  form_id: string
  user_id: string
  submitted_at: string | null
}

interface Props {
  enrollments: Enrollment[]
  lessons: Lesson[]
  lessonViews: LessonView[]
  parts?: Part[]
  allCohorts?: CohortOption[]
  forms?: CourseForm[]
  formResponses?: FormResponse[]
}

export default function StudentProgressGrid({ enrollments, lessons, lessonViews, parts, allCohorts, forms, formResponses }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [managingUserId, setManagingUserId] = useState<string | null>(null)

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
  const watchMap = new Map(lessonViews.map(v => [`${v.user_id}:${v.lesson_id}`, v.watch_seconds || 0]))

  // Build part groups for the table header
  const courseParts = (parts || [])
    .filter(p => p.course_id === cohortCourseId)
    .sort((a, b) => a.number - b.number)
  const partMap = new Map(courseParts.map(p => [p.id, p]))
  const partGroups: { part: Part | null; lessons: Lesson[] }[] = courseParts.map(part => ({
    part,
    lessons: cohortLessons.filter(l => l.part_id === part.id),
  }))
  const ungroupedLessons = cohortLessons.filter(l => !l.part_id || !partMap.has(l.part_id))
  if (ungroupedLessons.length > 0) partGroups.push({ part: null, lessons: ungroupedLessons })
  const hasPartGroups = courseParts.length > 0

  function getEffectiveMode(e: Enrollment): 'open' | 'sequential' {
    const mode = e.access_mode || e.cohorts?.access_mode || e.cohorts?.courses?.access_mode || 'open'
    return mode as 'open' | 'sequential'
  }

  async function updateMode(userId: string, cohortId: string, mode: 'open' | 'sequential' | null) {
    await supabase.from('user_cohorts').update({ access_mode: mode }).eq('user_id', userId).eq('cohort_id', cohortId)
    router.refresh()
  }

  async function deleteStudent(userId: string, name: string) {
    if (!window.confirm(`למחוק את "${name}" לגמרי מהמערכת? הפעולה בלתי הפיכה.`)) return
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) { alert('שגיאה במחיקה'); return }
    router.refresh()
  }

  async function removeFromCohort(userId: string, cohortId: string) {
    await supabase.from('user_cohorts').delete().eq('user_id', userId).eq('cohort_id', cohortId)
    router.refresh()
  }

  async function addToCohort(userId: string, cohortId: string) {
    await supabase.from('user_cohorts').upsert({ user_id: userId, cohort_id: cohortId }, { onConflict: 'user_id,cohort_id', ignoreDuplicates: true })
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
              {hasPartGroups && (
                <tr>
                  <th />
                  {partGroups.map(pg => (
                    <th
                      key={pg.part?.id ?? 'none'}
                      colSpan={pg.lessons.length}
                      className="text-center text-xs font-semibold text-purple-600 pb-1 px-1 border-b border-purple-100"
                    >
                      {pg.part ? `${pg.part.number}. ${pg.part.title}` : ''}
                    </th>
                  ))}
                  <th />
                  <th />
                </tr>
              )}
              <tr className="border-b border-gray-200">
                <th className="text-right py-2 pr-4 font-semibold text-gray-700 min-w-[160px]">תלמיד</th>
                {cohortLessons.map(l => (
                  <th key={l.id} className="text-center py-2 px-2 font-medium text-gray-400 min-w-[2.5rem]" title={l.title}>
                    <span className="text-xs">{l.number}</span>
                  </th>
                ))}
                <th className="text-center py-2 px-3 font-semibold text-gray-700 min-w-[100px]">גישה</th>
                <th className="py-2 px-2 min-w-[60px]" />
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const effectiveMode = getEffectiveMode(student)
                const viewedCount = cohortLessons.filter(l => viewedSet.has(`${student.user_id}:${l.id}`)).length

                return (
                  <React.Fragment key={student.user_id}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-800">{student.users?.full_name || '—'}</p>
                      {student.users?.email && <p className="text-xs text-gray-500">{student.users.email}</p>}
                      <p className="text-xs text-gray-400">{viewedCount}/{cohortLessons.length} שיעורים</p>
                    </td>
                    {cohortLessons.map(l => {
                      const key = `${student.user_id}:${l.id}`
                      const viewed = viewedSet.has(key)
                      const mins = Math.round((watchMap.get(key) || 0) / 60)
                      return (
                        <td key={l.id} className="text-center py-2.5 px-2">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`inline-block w-5 h-5 rounded-full ${viewed ? 'bg-green-400' : 'bg-gray-200'}`}
                              title={`${l.title}${viewed ? ` — ${mins} דק'` : ' — לא נצפה'}`}
                            />
                            {viewed && mins > 0 && (
                              <span className="text-[10px] text-gray-400 leading-none">{mins}′</span>
                            )}
                          </div>
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
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1 justify-center">
                        <Link
                          href={`/admin/students/${student.user_id}`}
                          className="text-gray-400 hover:text-indigo-600 transition text-sm"
                          title="עריכת תלמיד"
                        >
                          ✏️
                        </Link>
                        <button
                          onClick={() => setManagingUserId(managingUserId === student.user_id ? null : student.user_id)}
                          className="text-gray-400 hover:text-indigo-600 transition text-sm"
                          title="ניהול מחזורים"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => deleteStudent(student.user_id, student.users?.full_name || '')}
                          className="text-gray-300 hover:text-red-500 transition text-sm"
                          title="מחק תלמיד"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                  {managingUserId === student.user_id && (
                    <tr className="bg-indigo-50">
                      <td colSpan={cohortLessons.length + 3} className="px-4 py-3">
                        <div className="flex flex-wrap gap-6 items-start">
                          {/* Cohorts */}
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">מחזורים נוכחיים:</p>
                            <div className="flex flex-wrap gap-1">
                              {enrollments.filter(e => e.user_id === student.user_id).map(e => (
                                <span key={e.cohort_id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-700">
                                  {e.cohorts?.name}
                                  <button onClick={() => removeFromCohort(student.user_id, e.cohort_id)} className="text-gray-400 hover:text-red-500 ml-0.5">✕</button>
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">הוסף למחזור:</p>
                            <select
                              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                              defaultValue=""
                              onChange={e => { if (e.target.value) { addToCohort(student.user_id, e.target.value); e.target.value = '' } }}
                            >
                              <option value="">בחר מחזור...</option>
                              {(allCohorts || [])
                                .filter(c => !enrollments.find(e => e.user_id === student.user_id && e.cohort_id === c.id))
                                .map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.courses?.name ? `${c.courses.name} — ` : ''}{c.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          {/* Forms */}
                          {(() => {
                            const studentCourseIds = new Set(
                              enrollments.filter(e => e.user_id === student.user_id).map(e => e.cohorts?.course_id).filter(Boolean)
                            )
                            const studentForms = (forms || []).filter(f => studentCourseIds.has(f.course_id))
                            if (studentForms.length === 0) return null
                            return (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">טפסים:</p>
                                <div className="space-y-1">
                                  {studentForms.map(form => {
                                    const response = (formResponses || []).find(r => r.form_id === form.id && r.user_id === student.user_id)
                                    const submitted = !!response?.submitted_at
                                    return (
                                      <div key={form.id} className="flex items-center gap-2">
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${submitted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                          {submitted ? '✓ הוגש' : 'לא הוגש'}
                                        </span>
                                        <span className="text-xs text-gray-700 truncate max-w-[140px]">{form.title}</span>
                                        <CopyButton
                                          text={`/forms/${form.id}`}
                                          label="העתק לינק"
                                          copiedLabel="✓ הועתק"
                                          className="text-xs text-indigo-600 hover:text-indigo-800 transition"
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
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
