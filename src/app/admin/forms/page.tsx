import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CopyButton from '@/components/CopyButton'
import FormCohortManager from '@/components/FormCohortManager'

export default async function AdminFormsPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, forms(id, title, order_num, is_active)')
    .order('name')

  const { data: responseCounts } = await supabase
    .from('form_responses')
    .select('form_id')
    .not('submitted_at', 'is', null)

  const countMap = new Map<string, number>()
  for (const r of responseCounts || []) {
    countMap.set(r.form_id, (countMap.get(r.form_id) || 0) + 1)
  }


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">טפסים</h1>
          <p className="text-sm text-gray-500 mt-1">ניהול טפסים לפי קורס</p>
        </div>
        <Link
          href="/admin/forms/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
        >
          + צור טופס חדש
        </Link>
      </div>

      <div className="space-y-8">
        {(courses || []).map(course => {
          const forms = (course.forms as any[] | null) || []
          return (
            <div key={course.id}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{course.name}</h2>
              {forms.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-xl">
                  אין טפסים לקורס זה
                </p>
              ) : (
                <div className="space-y-2">
                  {forms.map((form: any) => {
                    const submitted = countMap.get(form.id) || 0
                    const formUrl = `/forms/${form.id}`
                    return (
                      <div key={form.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {/* Form row */}
                        <div className="px-5 py-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${form.is_active ? 'bg-green-400' : 'bg-gray-300'}`}
                              title={form.is_active ? 'פעיל' : 'לא פעיל'}
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{form.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{submitted} הגשות</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <CopyButton text={formUrl} label="העתק לינק" copiedLabel="✓ הועתק" />
                            <Link
                              href={`/admin/forms/${form.id}/responses`}
                              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                            >
                              תשובות
                            </Link>
                            <Link
                              href={`/admin/forms/${form.id}/edit`}
                              className="px-3 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition"
                            >
                              עריכה
                            </Link>
                          </div>
                        </div>

                        {/* Cohort visibility toggle */}
                        <details className="group border-t border-gray-100">
                          <summary className="px-5 py-2.5 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-50 flex items-center gap-1.5 list-none select-none">
                            <span className="text-gray-400 group-open:rotate-90 transition-transform inline-block">▶</span>
                            חשיפה למחזורים
                          </summary>
                          <div className="px-5 pb-4">
                            <FormCohortManager formId={form.id} courseId={course.id} />
                          </div>
                        </details>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {(!courses || courses.length === 0) && (
          <p className="text-gray-400 text-sm py-12 text-center">אין קורסים עדיין</p>
        )}
      </div>
    </div>
  )
}
