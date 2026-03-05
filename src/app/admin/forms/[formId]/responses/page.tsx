import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ formId: string }>
}

type SubField = { id: string; label: string; type: string }
type FormField = {
  id: string
  type: string
  label: string
  options?: string[]
  subFields?: SubField[]
}
type FormSection = { id: string; title: string; fields: FormField[] }
type GroupItem = { [subFieldId: string]: string }
type ResponseData = { [fieldId: string]: string | string[] | GroupItem[] }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function renderAnswerValue(field: FormField, value: string | string[] | GroupItem[] | undefined) {
  if (value === undefined || value === null || value === '') {
    return <span className="text-gray-400 italic text-xs">לא מולא</span>
  }

  if (field.type === 'multiselect') {
    const vals = value as string[]
    return vals.length > 0
      ? <span>{vals.join(', ')}</span>
      : <span className="text-gray-400 italic text-xs">לא נבחר</span>
  }

  if (field.type === 'repeating_group') {
    const items = value as GroupItem[]
    if (!items?.length) return <span className="text-gray-400 italic text-xs">לא מולא</span>
    return (
      <div className="space-y-2 mt-1">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-2 text-xs">
            <p className="font-semibold text-gray-500 mb-1">פריט {i + 1}</p>
            {(field.subFields || []).map(sf => (
              <div key={sf.id} className="mb-1">
                <span className="text-gray-500">{sf.label}: </span>
                <span className="text-gray-800">{item[sf.id] || '—'}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return <span className="whitespace-pre-wrap">{value as string}</span>
}

export default async function FormResponsesPage({ params }: Props) {
  const { formId } = await params
  const supabase = await createClient()

  const [{ data: form }, { data: responses }] = await Promise.all([
    supabase.from('forms').select('id, title, schema').eq('id', formId).single(),
    supabase
      .from('form_responses')
      .select('id, data, submitted_at, created_at, users!form_responses_user_id_fkey(full_name, email)')
      .eq('form_id', formId)
      .order('created_at', { ascending: false }),
  ])

  if (!form) notFound()

  const schema: FormSection[] = Array.isArray(form.schema) ? (form.schema as any) : []
  const allFields: FormField[] = schema.flatMap(s => s.fields)

  const submitted = (responses || []).filter(r => r.submitted_at)
  const drafts = (responses || []).filter(r => !r.submitted_at)

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/forms" className="text-sm text-gray-400 hover:text-gray-600 transition">
          ← חזרה לטפסים
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-xl font-bold text-gray-900">{form.title}</h1>
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-900">{submitted.length}</span> הגשות
            {drafts.length > 0 && <span className="mr-3 text-amber-600">+ {drafts.length} טיוטות</span>}
          </div>
        </div>
      </div>

      {(responses || []).length === 0 ? (
        <p className="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl">
          אין תשובות עדיין
        </p>
      ) : (
        <div className="space-y-4">
          {(responses || []).map(response => {
            const user = response.users as any
            const data: ResponseData = (response.data as any) || {}
            const isSubmitted = !!response.submitted_at

            return (
              <details key={response.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition list-none">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{user?.full_name || '—'}</p>
                      <p className="text-xs text-gray-400">{user?.email || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSubmitted ? (
                      <span className="text-xs bg-green-50 text-green-700 border border-green-100 rounded px-2 py-0.5">
                        הוגש {formatDate(response.submitted_at!)}
                      </span>
                    ) : (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded px-2 py-0.5">
                        טיוטה
                      </span>
                    )}
                    <span className="text-gray-400 text-sm group-open:rotate-180 transition-transform">▼</span>
                  </div>
                </summary>

                <div className="border-t border-gray-100 px-5 py-4 space-y-6">
                  {schema.map(section => (
                    <div key={section.id}>
                      {section.title && (
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                          {section.title}
                        </h3>
                      )}
                      <div className="space-y-3">
                        {section.fields.map(field => (
                          <div key={field.id}>
                            <p className="text-xs font-medium text-gray-600 mb-0.5">{field.label}</p>
                            <div className="text-sm text-gray-800">
                              {renderAnswerValue(field, data[field.id])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {allFields.length === 0 && (
                    <p className="text-xs text-gray-400">הטופס ריק</p>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}
