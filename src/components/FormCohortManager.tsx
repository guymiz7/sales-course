'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Cohort {
  id: string
  name: string
}

interface Props {
  formId: string
  courseId: string
}

export default function FormCohortManager({ formId, courseId }: Props) {
  const supabase = createClient()
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [released, setReleased] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: cohortData }, { data: releasedData }] = await Promise.all([
        supabase.from('cohorts').select('id, name').eq('course_id', courseId).order('name'),
        supabase.from('form_cohorts').select('cohort_id').eq('form_id', formId).eq('is_released', true),
      ])
      setCohorts(cohortData || [])
      setReleased(new Set((releasedData || []).map(r => r.cohort_id as string)))
      setLoading(false)
    }
    load()
  }, [formId, courseId])

  async function toggle(cohortId: string) {
    const isReleased = released.has(cohortId)
    setSaving(cohortId)
    await supabase.from('form_cohorts').upsert(
      { form_id: formId, cohort_id: cohortId, is_released: !isReleased },
      { onConflict: 'form_id,cohort_id' }
    )
    setReleased(prev => {
      const next = new Set(prev)
      if (isReleased) next.delete(cohortId)
      else next.add(cohortId)
      return next
    })
    setSaving(null)
  }

  if (loading) return <p className="text-xs text-gray-400 py-2">טוען מחזורים...</p>
  if (cohorts.length === 0) return <p className="text-xs text-gray-400 py-2">אין מחזורים לקורס זה</p>

  return (
    <div className="space-y-2 py-2">
      {cohorts.map(cohort => {
        const isReleased = released.has(cohort.id)
        return (
          <div key={cohort.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">{cohort.name}</span>
            <button
              onClick={() => toggle(cohort.id)}
              disabled={saving === cohort.id}
              title={isReleased ? 'לחץ לסגירה' : 'לחץ לחשיפה'}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${isReleased ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isReleased ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
