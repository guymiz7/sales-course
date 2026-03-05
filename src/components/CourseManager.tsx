'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Part { id: string; number: number; title: string }
interface Lesson { id: string; number: number; title: string; google_drive_file_id: string; description: string; download_url: string; cohort_id: string | null; homework: string; part_id: string | null }
interface Cohort { id: string; name: string; start_date: string; access_mode: string | null }
interface Course { id: string; name: string; description: string; access_mode: string; image_url: string | null; cohorts: Cohort[]; lessons: Lesson[]; parts: Part[] }

function extractDriveId(input: string): string {
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : input
}

function toDownloadUrl(input: string): string {
  const trimmed = input.trim()
  const id = extractDriveId(trimmed)
  if (id !== trimmed) return `https://drive.google.com/file/d/${id}/view`
  return trimmed
}

export default function CourseManager({ courses }: { courses: Course[] }) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(courses[0] || null)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCohortName, setNewCohortName] = useState('')
  const [newLesson, setNewLesson] = useState({ title: '', drive_id: '' })
  const [loading, setLoading] = useState('')
  const [enrolledCohorts, setEnrolledCohorts] = useState<string[]>([])
  const [editingLesson, setEditingLesson] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Partial<Lesson>>({})
  const [newPartTitle, setNewPartTitle] = useState('')
  const [editingPartId, setEditingPartId] = useState<string | null>(null)
  const [editingPartTitle, setEditingPartTitle] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!selectedCourse) {
      setSelectedCourse(courses[0] || null)
      return
    }
    const updated = courses.find(c => c.id === selectedCourse.id)
    if (updated) setSelectedCourse(updated)
  }, [courses])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('user_cohorts').select('cohort_id').eq('user_id', user.id)
        .then(({ data }) => setEnrolledCohorts((data || []).map(r => r.cohort_id)))
    })
  }, [])

  async function addCourse() {
    if (!newCourseName.trim()) return
    setLoading('course')
    await supabase.from('courses').insert({ name: newCourseName.trim(), description: '' })
    setNewCourseName('')
    setLoading('')
    router.refresh()
  }

  async function deleteCourse(courseId: string, courseName: string) {
    if (!window.confirm(`למחוק את הקורס "${courseName}"?\nפעולה זו תמחק גם את כל המחזורים, השיעורים והשאלות שלו.`)) return
    setLoading('delete-' + courseId)
    await supabase.from('courses').delete().eq('id', courseId)
    if (selectedCourse?.id === courseId) setSelectedCourse(courses.find(c => c.id !== courseId) || null)
    setLoading('')
    router.refresh()
  }

  async function addPart() {
    if (!selectedCourse || !newPartTitle.trim()) return
    setLoading('part')
    const nextNumber = (selectedCourse.parts?.length || 0) + 1
    await supabase.from('parts').insert({ course_id: selectedCourse.id, number: nextNumber, title: newPartTitle.trim() })
    setNewPartTitle('')
    setLoading('')
    router.refresh()
  }

  async function deletePart(partId: string, partTitle: string) {
    if (!window.confirm(`למחוק את החלק "${partTitle}"?\nהשיעורים שלו לא יימחקו אלא יאבדו את השיוך לחלק.`)) return
    await supabase.from('parts').delete().eq('id', partId)
    router.refresh()
  }

  async function renamePart(partId: string) {
    if (!editingPartTitle.trim()) return
    await supabase.from('parts').update({ title: editingPartTitle.trim() }).eq('id', partId)
    setEditingPartId(null)
    setEditingPartTitle('')
    router.refresh()
  }

  async function setCourseAccessMode(mode: 'open' | 'sequential') {
    if (!selectedCourse) return
    await supabase.from('courses').update({ access_mode: mode }).eq('id', selectedCourse.id)
    router.refresh()
  }

  async function uploadCourseImage(file: File) {
    if (!selectedCourse) return
    const ext = file.name.split('.').pop()
    const path = `course-${selectedCourse.id}/banner.${ext}`
    setLoading('course-image')
    const { error } = await supabase.storage.from('lesson-files').upload(path, file, { upsert: true })
    if (error) { setLoading(''); return }
    const { data } = supabase.storage.from('lesson-files').getPublicUrl(path)
    await supabase.from('courses').update({ image_url: data.publicUrl }).eq('id', selectedCourse.id)
    setLoading('')
    router.refresh()
  }

  async function setCohortAccessMode(cohortId: string, mode: 'open' | 'sequential' | null) {
    await supabase.from('cohorts').update({ access_mode: mode }).eq('id', cohortId)
    router.refresh()
  }

  async function addCohort() {
    if (!selectedCourse || !newCohortName.trim()) return
    setLoading('cohort')
    await supabase.from('cohorts').insert({
      course_id: selectedCourse.id,
      name: newCohortName.trim(),
      start_date: new Date().toISOString().split('T')[0],
    })
    setNewCohortName('')
    setLoading('')
    router.refresh()
  }

  async function addLesson() {
    if (!selectedCourse || !newLesson.title.trim()) return
    setLoading('lesson')
    const nextNumber = (selectedCourse.lessons?.length || 0) + 1
    await supabase.from('lessons').insert({
      course_id: selectedCourse.id,
      number: nextNumber,
      title: newLesson.title.trim(),
      google_drive_file_id: extractDriveId(newLesson.drive_id.trim()),
    })
    setNewLesson({ title: '', drive_id: '' })
    setLoading('')
    router.refresh()
  }

  async function enrollSelf(cohortId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_cohorts').upsert({ user_id: user.id, cohort_id: cohortId, approved_by: user.id })
    setEnrolledCohorts(prev => [...prev, cohortId])
  }

  async function unenrollSelf(cohortId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_cohorts').delete().eq('user_id', user.id).eq('cohort_id', cohortId)
    setEnrolledCohorts(prev => prev.filter(id => id !== cohortId))
  }

  function startEdit(lesson: Lesson) {
    setEditingLesson(lesson.id)
    setEditFields({
      title: lesson.title,
      google_drive_file_id: lesson.google_drive_file_id,
      description: lesson.description,
      download_url: lesson.download_url,
      cohort_id: lesson.cohort_id,
      homework: lesson.homework,
      part_id: lesson.part_id,
    })
  }

  async function uploadFile(file: File, lessonId: string): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${lessonId}/${Date.now()}.${ext}`
    setLoading('upload-' + lessonId)
    const { error } = await supabase.storage.from('lesson-files').upload(path, file, { upsert: true })
    if (error) { setLoading(''); return null }
    const { data } = supabase.storage.from('lesson-files').getPublicUrl(path)
    setLoading('')
    return data.publicUrl
  }

  async function saveLesson(lessonId: string) {
    setLoading('save-' + lessonId)
    await supabase.from('lessons').update({
      title: editFields.title?.trim(),
      google_drive_file_id: extractDriveId(editFields.google_drive_file_id?.trim() || ''),
      description: editFields.description?.trim(),
      download_url: toDownloadUrl(editFields.download_url || ''),
      cohort_id: editFields.cohort_id || null,
      homework: editFields.homework?.trim() || null,
      part_id: editFields.part_id || null,
    }).eq('id', lessonId)
    setEditingLesson(null)
    setEditFields({})
    setLoading('')
    router.refresh()
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Courses list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">קורסים</h2>
        <div className="space-y-1 mb-4">
          {courses.map(c => (
            <div key={c.id} className="flex items-center gap-1">
              <button
                onClick={() => setSelectedCourse(c)}
                className={`flex-1 text-right px-3 py-2 rounded-lg text-sm transition ${
                  selectedCourse?.id === c.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {c.name}
              </button>
              <button
                onClick={() => deleteCourse(c.id, c.name)}
                disabled={loading === 'delete-' + c.id}
                className="text-gray-300 hover:text-red-500 transition p-1 text-base leading-none"
                title="מחק קורס"
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        {/* Course access mode + image */}
        {selectedCourse && (
          <div className="mb-4 px-1 space-y-2">
            <p className="text-xs text-gray-500 mb-1.5">גישה לשיעורים — {selectedCourse.name}</p>
            <div className="flex gap-1">
              {(['open', 'sequential'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setCourseAccessMode(m)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    selectedCourse.access_mode === m
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m === 'open' ? 'פתוח' : 'רצף'}
                </button>
              ))}
            </div>
            {/* Course banner image */}
            <div>
              <p className="text-xs text-gray-500 mb-1">תמונת נושא לקורס</p>
              {selectedCourse.image_url && (
                <img src={selectedCourse.image_url} alt="banner" className="w-full rounded mb-1 object-cover max-h-20" />
              )}
              <label className={`cursor-pointer inline-block text-xs px-2 py-1 rounded transition ${loading === 'course-image' ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {loading === 'course-image' ? 'מעלה...' : selectedCourse.image_url ? 'החלף תמונה' : 'העלה תמונה'}
                <input type="file" accept="image/*" className="hidden" disabled={loading === 'course-image'}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadCourseImage(f) }} />
              </label>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={newCourseName}
            onChange={e => setNewCourseName(e.target.value)}
            placeholder="שם קורס חדש"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addCourse}
            disabled={loading === 'course'}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Cohorts */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          מחזורים {selectedCourse && `— ${selectedCourse.name}`}
        </h2>
        {selectedCourse ? (
          <>
            <div className="space-y-2 mb-4">
              {selectedCourse.cohorts?.map(c => (
                <div key={c.id} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-gray-700">{c.name}</span>
                    {enrolledCohorts.includes(c.id) ? (
                      <button onClick={() => unenrollSelf(c.id)} className="text-xs text-red-400 hover:text-red-600 transition">
                        הסר הרשמה
                      </button>
                    ) : (
                      <button onClick={() => enrollSelf(c.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
                        הרשם כתלמיד
                      </button>
                    )}
                  </div>
                  {/* Cohort access mode override */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-gray-400">גישה:</span>
                    {([null, 'open', 'sequential'] as const).map(m => (
                      <button
                        key={String(m)}
                        onClick={() => setCohortAccessMode(c.id, m)}
                        className={`px-2 py-0.5 rounded text-xs transition ${
                          c.access_mode === m
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {m === null ? 'לפי קורס' : m === 'open' ? 'פתוח' : 'רצף'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCohortName}
                onChange={e => setNewCohortName(e.target.value)}
                placeholder='מחזור 1 — ינואר 2025'
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={addCohort}
                disabled={loading === 'cohort'}
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition"
              >
                +
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">בחר קורס</p>
        )}
      </div>

      {/* Lessons */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">שיעורים</h2>
        {selectedCourse ? (
          <>
            {/* Parts management */}
            <div className="mb-4 bg-purple-50 border border-purple-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-700 mb-2">חלקים</p>
              <div className="space-y-1 mb-2">
                {(selectedCourse.parts || []).sort((a, b) => a.number - b.number).map(part => (
                  <div key={part.id} className="flex items-center gap-1 text-xs text-purple-800">
                    {editingPartId === part.id ? (
                      <>
                        <input
                          value={editingPartTitle}
                          onChange={e => setEditingPartTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renamePart(part.id); if (e.key === 'Escape') setEditingPartId(null) }}
                          autoFocus
                          className="flex-1 border border-purple-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                        />
                        <button onClick={() => renamePart(part.id)} className="text-purple-600 hover:text-purple-800 font-medium">✓</button>
                        <button onClick={() => setEditingPartId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{part.number}. {part.title}</span>
                        <button
                          onClick={() => { setEditingPartId(part.id); setEditingPartTitle(part.title) }}
                          className="text-purple-300 hover:text-purple-600 transition p-0.5"
                          title="ערוך שם"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deletePart(part.id, part.title)}
                          className="text-purple-300 hover:text-red-500 transition p-0.5"
                          title="מחק חלק"
                        >
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {!selectedCourse.parts?.length && (
                  <p className="text-xs text-purple-400">אין חלקים עדיין</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={newPartTitle}
                  onChange={e => setNewPartTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPart()}
                  placeholder="שם החלק"
                  className="flex-1 border border-purple-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
                <button
                  onClick={addPart}
                  disabled={loading === 'part'}
                  className="bg-purple-600 text-white px-2.5 py-1 rounded text-xs hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {selectedCourse.lessons?.sort((a, b) => a.number - b.number).map(lesson => (
                <div key={lesson.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">שיעור {lesson.number}</p>
                    {editingLesson === lesson.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingLesson(null); setEditFields({}) }}
                          className="text-xs text-gray-400 hover:text-gray-600 transition"
                        >
                          ביטול
                        </button>
                        <button
                          onClick={() => saveLesson(lesson.id)}
                          disabled={loading === 'save-' + lesson.id}
                          className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                          {loading === 'save-' + lesson.id ? 'שומר...' : 'שמור'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(lesson)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 transition"
                      >
                        עריכה
                      </button>
                    )}
                  </div>

                  {editingLesson === lesson.id ? (
                    <div className="space-y-2">
                      <input
                        value={editFields.title || ''}
                        onChange={e => setEditFields(p => ({ ...p, title: e.target.value }))}
                        placeholder="כותרת השיעור"
                        className="w-full text-sm font-medium text-gray-900 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <input
                        value={editFields.google_drive_file_id || ''}
                        onChange={e => setEditFields(p => ({ ...p, google_drive_file_id: e.target.value }))}
                        placeholder="Google Drive URL או File ID"
                        className="w-full text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <textarea
                        value={editFields.description || ''}
                        onChange={e => setEditFields(p => ({ ...p, description: e.target.value }))}
                        placeholder="תיאור השיעור (אופציונלי)"
                        rows={2}
                        className="w-full text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <textarea
                        value={editFields.homework || ''}
                        onChange={e => setEditFields(p => ({ ...p, homework: e.target.value }))}
                        placeholder="שיעורי בית (אופציונלי)"
                        rows={2}
                        className="w-full text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <div className="flex gap-1.5 items-center">
                        <input
                          value={editFields.download_url || ''}
                          onChange={e => setEditFields(p => ({ ...p, download_url: e.target.value }))}
                          placeholder="קישור לקובץ (אופציונלי)"
                          className="flex-1 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <label className={`cursor-pointer text-xs px-2 py-1 rounded transition whitespace-nowrap ${loading === 'upload-' + lesson.id ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {loading === 'upload-' + lesson.id ? 'מעלה...' : 'העלה קובץ'}
                          <input
                            type="file"
                            className="hidden"
                            disabled={loading === 'upload-' + lesson.id}
                            onChange={async e => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const url = await uploadFile(file, lesson.id)
                              if (url) setEditFields(p => ({ ...p, download_url: url }))
                            }}
                          />
                        </label>
                      </div>
                      {/* Cohort assignment */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">גלוי למחזורים:</p>
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => setEditFields(p => ({ ...p, cohort_id: null }))}
                            className={`px-2 py-0.5 rounded text-xs transition ${
                              !editFields.cohort_id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            כולם
                          </button>
                          {selectedCourse.cohorts?.map(cohort => (
                            <button
                              key={cohort.id}
                              onClick={() => setEditFields(p => ({ ...p, cohort_id: cohort.id }))}
                              className={`px-2 py-0.5 rounded text-xs transition ${
                                editFields.cohort_id === cohort.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {cohort.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Part assignment */}
                      {selectedCourse.parts?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">חלק:</p>
                          <div className="flex gap-1 flex-wrap">
                            <button
                              onClick={() => setEditFields(p => ({ ...p, part_id: null }))}
                              className={`px-2 py-0.5 rounded text-xs transition ${
                                !editFields.part_id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              ללא חלק
                            </button>
                            {selectedCourse.parts.sort((a, b) => a.number - b.number).map(part => (
                              <button
                                key={part.id}
                                onClick={() => setEditFields(p => ({ ...p, part_id: part.id }))}
                                className={`px-2 py-0.5 rounded text-xs transition ${
                                  editFields.part_id === part.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {part.number}. {part.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
                      {lesson.google_drive_file_id && (
                        <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{lesson.google_drive_file_id}</p>
                      )}
                      {lesson.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{lesson.description}</p>
                      )}
                      {lesson.download_url && (
                        <p className="text-xs text-indigo-400 mt-0.5 truncate">📎 קובץ להורדה</p>
                      )}
                      {lesson.cohort_id && (
                        <p className="text-xs text-orange-400 mt-0.5">
                          🔒 {selectedCourse.cohorts?.find(c => c.id === lesson.cohort_id)?.name || 'מחזור ספציפי'}
                        </p>
                      )}
                      {lesson.part_id && (
                        <p className="text-xs text-purple-400 mt-0.5">
                          📁 {selectedCourse.parts?.find(p => p.id === lesson.part_id)?.title || 'חלק'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add lesson */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-medium text-gray-600">הוסף שיעור</p>
              <input
                value={newLesson.title}
                onChange={e => setNewLesson(p => ({ ...p, title: e.target.value }))}
                placeholder="כותרת השיעור"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={newLesson.drive_id}
                onChange={e => setNewLesson(p => ({ ...p, drive_id: e.target.value }))}
                placeholder="Google Drive URL או File ID"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={addLesson}
                disabled={loading === 'lesson'}
                className="w-full bg-indigo-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading === 'lesson' ? 'מוסיף...' : 'הוסף שיעור'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">בחר קורס</p>
        )}
      </div>
    </div>
  )
}
