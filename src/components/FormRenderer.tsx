'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ──────────────────────────────────────────────────────────────────

type SubField = { id: string; type: 'text' | 'textarea' | 'number'; label: string }

type FormField =
  | { id: string; type: 'text' | 'textarea' | 'number'; label: string; description?: string; required?: boolean }
  | { id: string; type: 'select'; label: string; description?: string; required?: boolean; options: string[] }
  | { id: string; type: 'multiselect'; label: string; description?: string; options: string[] }
  | { id: string; type: 'repeating_group'; label: string; description?: string; minItems?: number; maxItems?: number; addLabel?: string; subFields: SubField[] }

type FormSection = { id: string; title: string; fields: FormField[] }

type GroupItem = { [subFieldId: string]: string }
type ResponseData = { [fieldId: string]: string | string[] | GroupItem[] }

interface FormData {
  id: string
  title: string
  description?: string | null
  schema: FormSection[]
}

interface Props {
  form: FormData
  initialData: ResponseData
  submittedAt: string | null
  userId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function emptyGroup(subFields: SubField[]): GroupItem {
  return Object.fromEntries(subFields.map(sf => [sf.id, '']))
}

// ─── Read-only field display ──────────────────────────────────────────────────

function ReadonlyField({ field, value }: { field: FormField; value: string | string[] | GroupItem[] | undefined }) {
  if (field.type === 'repeating_group') {
    const items = (value as GroupItem[] | undefined) || []
    if (items.length === 0) return <p className="text-sm text-gray-400 italic">לא מולא</p>
    return (
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">פריט {i + 1}</p>
            {field.subFields.map(sf => (
              <div key={sf.id} className="mb-2">
                <p className="text-xs text-gray-500 mb-0.5">{sf.label}</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{item[sf.id] || '—'}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (field.type === 'multiselect') {
    const vals = (value as string[] | undefined) || []
    return vals.length > 0
      ? <p className="text-sm text-gray-800">{vals.join(', ')}</p>
      : <p className="text-sm text-gray-400 italic">לא נבחר</p>
  }

  const str = (value as string | undefined) || ''
  return str
    ? <p className="text-sm text-gray-800 whitespace-pre-wrap">{str}</p>
    : <p className="text-sm text-gray-400 italic">לא מולא</p>
}

// ─── Editable field ───────────────────────────────────────────────────────────

function EditableField({
  field,
  value,
  onChange,
}: {
  field: FormField
  value: string | string[] | GroupItem[] | undefined
  onChange: (val: string | string[] | GroupItem[]) => void
}) {
  const baseInput = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white'

  if (field.type === 'text' || field.type === 'number') {
    return (
      <input
        type={field.type}
        value={(value as string) || ''}
        onChange={e => onChange(e.target.value)}
        className={baseInput}
        dir={field.type === 'number' ? 'ltr' : undefined}
      />
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        rows={4}
        value={(value as string) || ''}
        onChange={e => onChange(e.target.value)}
        className={`${baseInput} resize-y`}
      />
    )
  }

  if (field.type === 'select') {
    return (
      <select
        value={(value as string) || ''}
        onChange={e => onChange(e.target.value)}
        className={baseInput}
      >
        <option value="">בחר...</option>
        {field.options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  if (field.type === 'multiselect') {
    const selected = (value as string[]) || []
    return (
      <div className="space-y-2">
        {field.options.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={e => {
                const next = e.target.checked
                  ? [...selected, opt]
                  : selected.filter(v => v !== opt)
                onChange(next)
              }}
              className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
            />
            <span className="text-sm text-gray-700">{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (field.type === 'repeating_group') {
    const items: GroupItem[] = (value as GroupItem[]) || Array.from({ length: field.minItems || 1 }, () => emptyGroup(field.subFields))
    const addLabel = field.addLabel || 'הוסף פריט'
    const maxItems = field.maxItems || 20

    const updateItem = (idx: number, subFieldId: string, val: string) => {
      const next = items.map((item, i) => i === idx ? { ...item, [subFieldId]: val } : item)
      onChange(next)
    }

    const addItem = () => {
      if (items.length >= maxItems) return
      onChange([...items, emptyGroup(field.subFields)])
    }

    const removeItem = (idx: number) => {
      const minItems = field.minItems || 1
      if (items.length <= minItems) return
      onChange(items.filter((_, i) => i !== idx))
    }

    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">פריט {idx + 1}</span>
              {items.length > (field.minItems || 1) && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-xs text-red-400 hover:text-red-600 transition"
                >
                  הסר
                </button>
              )}
            </div>
            {field.subFields.map(sf => (
              <div key={sf.id} className="mb-2">
                <label className="block text-xs text-gray-600 mb-1">{sf.label}</label>
                {sf.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={item[sf.id] || ''}
                    onChange={e => updateItem(idx, sf.id, e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white resize-y"
                  />
                ) : (
                  <input
                    type={sf.type}
                    value={item[sf.id] || ''}
                    onChange={e => updateItem(idx, sf.id, e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
        {items.length < maxItems && (
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
          >
            + {addLabel}
          </button>
        )}
      </div>
    )
  }

  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FormRenderer({ form, initialData, submittedAt, userId }: Props) {
  const supabase = createClient()
  const [data, setData] = useState<ResponseData>(initialData || {})
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function setField(fieldId: string, value: string | string[] | GroupItem[]) {
    setData(prev => ({ ...prev, [fieldId]: value }))
  }

  async function saveDraft() {
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('form_responses').upsert(
      { form_id: form.id, user_id: userId, data, updated_at: new Date().toISOString() },
      { onConflict: 'form_id,user_id' }
    )
    setSaving(false)
    if (err) { setError('שגיאה בשמירה'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function submitForm() {
    if (!window.confirm('לאחר הגשה לא ניתן לערוך את הטופס. להגיש?')) return
    setSubmitting(true)
    setError('')
    const { error: err } = await supabase.from('form_responses').upsert(
      { form_id: form.id, user_id: userId, data, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'form_id,user_id' }
    )
    setSubmitting(false)
    if (err) { setError('שגיאה בהגשה'); return }
    window.location.reload()
  }

  const schema: FormSection[] = Array.isArray(form.schema) ? form.schema : []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
        {form.description && <p className="text-gray-500 mt-1 text-sm whitespace-pre-wrap">{form.description}</p>}
      </div>

      {/* Submitted banner */}
      {submittedAt && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-green-500 text-xl mt-0.5">✓</span>
          <div>
            <p className="font-semibold text-green-800 text-sm">הטופס הוגש בהצלחה</p>
            <p className="text-green-600 text-xs mt-0.5">{formatDate(submittedAt)}</p>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-8">
        {schema.map(section => (
          <div key={section.id}>
            {section.title && (
              <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {section.title}
              </h2>
            )}
            <div className="space-y-5">
              {section.fields.map(field => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    {field.label}
                    {('required' in field) && field.required && (
                      <span className="text-red-500 mr-1">*</span>
                    )}
                  </label>
                  {field.description && (
                    <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                  )}
                  {submittedAt ? (
                    <ReadonlyField field={field} value={data[field.id]} />
                  ) : (
                    <EditableField
                      field={field}
                      value={data[field.id]}
                      onChange={val => setField(field.id, val)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      {!submittedAt && (
        <div className="mt-8 flex items-center gap-3 flex-wrap">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'שומר...' : saved ? '✓ נשמר' : 'שמור טיוטה'}
          </button>
          <button
            onClick={submitForm}
            disabled={submitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {submitting ? 'שולח...' : 'שלח טופס'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {schema.length === 0 && (
        <p className="text-gray-400 text-sm py-12 text-center">הטופס ריק</p>
      )}
    </div>
  )
}
