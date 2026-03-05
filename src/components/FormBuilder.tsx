'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

type SubField = { id: string; type: 'text' | 'textarea' | 'number'; label: string }

type FormField =
  | { id: string; type: 'text' | 'textarea' | 'number'; label: string; description: string; required: boolean }
  | { id: string; type: 'select'; label: string; description: string; required: boolean; options: string[]; optionsText: string }
  | { id: string; type: 'multiselect'; label: string; description: string; options: string[]; optionsText: string }
  | { id: string; type: 'repeating_group'; label: string; description: string; minItems: number; maxItems: number; addLabel: string; subFields: SubField[] }

type FormSection = { id: string; title: string; fields: FormField[] }

interface Course { id: string; name: string }

interface InitialForm {
  id: string
  title: string
  description: string
  course_id: string
  schema: FormSection[]
}

interface Props {
  courses: Course[]
  initialForm?: InitialForm
}

const FIELD_TYPES = [
  { value: 'text', label: 'טקסט קצר' },
  { value: 'textarea', label: 'טקסט ארוך' },
  { value: 'number', label: 'מספר' },
  { value: 'select', label: 'בחירה מרשימה' },
  { value: 'multiselect', label: 'בחירה מרובה' },
  { value: 'repeating_group', label: 'קבוצה חוזרת' },
]

const SUB_FIELD_TYPES = [
  { value: 'text', label: 'טקסט קצר' },
  { value: 'textarea', label: 'טקסט ארוך' },
  { value: 'number', label: 'מספר' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID() }

function newField(type: FormField['type']): FormField {
  const base = { id: uid(), label: '', description: '' }
  if (type === 'select') return { ...base, type, required: false, options: [], optionsText: '' }
  if (type === 'multiselect') return { ...base, type, options: [], optionsText: '' }
  if (type === 'repeating_group') return { ...base, type, minItems: 1, maxItems: 10, addLabel: 'הוסף פריט', subFields: [] }
  return { ...base, type, required: false }
}

function newSection(): FormSection {
  return { id: uid(), title: '', fields: [] }
}

// ─── Serialise for DB (strips optionsText helper field) ──────────────────────

function serialiseSchema(sections: FormSection[]) {
  return sections.map(sec => ({
    ...sec,
    fields: sec.fields.map(f => {
      if (f.type === 'select' || f.type === 'multiselect') {
        const { optionsText, ...rest } = f as any
        return { ...rest, options: optionsText.split('\n').map((s: string) => s.trim()).filter(Boolean) }
      }
      return f
    }),
  }))
}

// ─── Deserialise from DB (adds optionsText helper) ───────────────────────────

function deserialiseSchema(schema: any[]): FormSection[] {
  return (schema || []).map(sec => ({
    ...sec,
    fields: (sec.fields || []).map((f: any) => {
      if (f.type === 'select' || f.type === 'multiselect') {
        return { ...f, optionsText: (f.options || []).join('\n') }
      }
      return f
    }),
  }))
}

// ─── Sub-field editor ─────────────────────────────────────────────────────────

function SubFieldEditor({
  subFields,
  onChange,
}: {
  subFields: SubField[]
  onChange: (sfs: SubField[]) => void
}) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-semibold text-gray-500">תת-שדות:</p>
      {subFields.map((sf, i) => (
        <div key={sf.id} className="flex items-center gap-2">
          <input
            type="text"
            value={sf.label}
            onChange={e => onChange(subFields.map((s, j) => j === i ? { ...s, label: e.target.value } : s))}
            placeholder="שם השדה"
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <select
            value={sf.type}
            onChange={e => onChange(subFields.map((s, j) => j === i ? { ...s, type: e.target.value as any } : s))}
            className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
          >
            {SUB_FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => onChange(subFields.filter((_, j) => j !== i))}
            className="text-gray-400 hover:text-red-500 text-sm transition"
          >
            🗑
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...subFields, { id: uid(), type: 'text', label: '' }])}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        + הוסף תת-שדה
      </button>
    </div>
  )
}

// ─── Field editor ─────────────────────────────────────────────────────────────

function FieldEditor({
  field,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  field: FormField
  onChange: (f: FormField) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const inputClass = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400'

  function update(patch: Partial<FormField>) {
    onChange({ ...field, ...patch } as FormField)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-2">
        {/* Move up/down */}
        <div className="flex flex-col gap-0.5 shrink-0 mt-1">
          <button type="button" onClick={onMoveUp} disabled={!onMoveUp}
            className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
          <button type="button" onClick={onMoveDown} disabled={!onMoveDown}
            className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
        </div>
        {/* Type badge */}
        <span className="shrink-0 mt-1 text-xs bg-indigo-50 text-indigo-700 rounded px-1.5 py-0.5 font-medium">
          {FIELD_TYPES.find(t => t.value === field.type)?.label}
        </span>
        {/* Label */}
        <input
          type="text"
          value={field.label}
          onChange={e => update({ label: e.target.value })}
          placeholder="כותרת השדה"
          className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition text-sm shrink-0"
        >
          🗑
        </button>
      </div>

      {/* Description */}
      <input
        type="text"
        value={field.description}
        onChange={e => update({ description: e.target.value })}
        placeholder="תיאור / הוראות (אופציונלי)"
        className={inputClass}
      />

      {/* Required (for text/textarea/number/select) */}
      {(field.type === 'text' || field.type === 'textarea' || field.type === 'number' || field.type === 'select') && (
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={(field as any).required}
            onChange={e => update({ required: e.target.checked } as any)}
            className="w-3.5 h-3.5"
          />
          שדה חובה
        </label>
      )}

      {/* Options (select / multiselect) */}
      {(field.type === 'select' || field.type === 'multiselect') && (
        <div>
          <p className="text-xs text-gray-500 mb-1">אפשרויות (שורה לכל אפשרות):</p>
          <textarea
            rows={4}
            value={(field as any).optionsText}
            onChange={e => update({ optionsText: e.target.value } as any)}
            placeholder={'אפשרות 1\nאפשרות 2\nאפשרות 3'}
            className={`${inputClass} resize-y font-mono text-xs`}
            dir="auto"
          />
        </div>
      )}

      {/* Repeating group settings */}
      {field.type === 'repeating_group' && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">מינימום פריטים</label>
              <input
                type="number"
                min={1}
                value={field.minItems}
                onChange={e => update({ minItems: Number(e.target.value) } as any)}
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none"
                dir="ltr"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">מקסימום פריטים</label>
              <input
                type="number"
                min={1}
                value={field.maxItems}
                onChange={e => update({ maxItems: Number(e.target.value) } as any)}
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none"
                dir="ltr"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">טקסט כפתור הוספה</label>
              <input
                type="text"
                value={field.addLabel}
                onChange={e => update({ addLabel: e.target.value } as any)}
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none"
              />
            </div>
          </div>
          <SubFieldEditor
            subFields={field.subFields}
            onChange={sfs => update({ subFields: sfs } as any)}
          />
        </>
      )}
    </div>
  )
}

// ─── Section editor ───────────────────────────────────────────────────────────

function SectionEditor({
  section,
  onChange,
  onDelete,
  isOnly,
}: {
  section: FormSection
  onChange: (s: FormSection) => void
  onDelete: () => void
  isOnly: boolean
}) {
  const [addingType, setAddingType] = useState<FormField['type'] | ''>('')

  function addField() {
    if (!addingType) return
    const f = newField(addingType as FormField['type'])
    onChange({ ...section, fields: [...section.fields, f] })
    setAddingType('')
  }

  function updateField(idx: number, f: FormField) {
    onChange({ ...section, fields: section.fields.map((x, i) => i === idx ? f : x) })
  }

  function deleteField(idx: number) {
    onChange({ ...section, fields: section.fields.filter((_, i) => i !== idx) })
  }

  function moveField(idx: number, dir: 'up' | 'down') {
    const fields = [...section.fields]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= fields.length) return;
    [fields[idx], fields[swapIdx]] = [fields[swapIdx], fields[idx]]
    onChange({ ...section, fields })
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={section.title}
          onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder="כותרת חלק (אופציונלי)"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        {!isOnly && (
          <button
            type="button"
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 transition text-sm px-2"
            title="מחק חלק"
          >
            🗑 חלק
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-2">
        {section.fields.map((f, i) => (
          <FieldEditor
            key={f.id}
            field={f}
            onChange={updated => updateField(i, updated)}
            onDelete={() => deleteField(i)}
            onMoveUp={i > 0 ? () => moveField(i, 'up') : undefined}
            onMoveDown={i < section.fields.length - 1 ? () => moveField(i, 'down') : undefined}
          />
        ))}
      </div>

      {/* Add field */}
      <div className="flex gap-2 items-center pt-1">
        <select
          value={addingType}
          onChange={e => setAddingType(e.target.value as any)}
          className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
        >
          <option value="">בחר סוג שדה...</option>
          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button
          type="button"
          onClick={addField}
          disabled={!addingType}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition disabled:opacity-40"
        >
          + הוסף שדה
        </button>
      </div>
    </div>
  )
}

// ─── Main FormBuilder component ───────────────────────────────────────────────

export default function FormBuilder({ courses, initialForm }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [title, setTitle] = useState(initialForm?.title || '')
  const [description, setDescription] = useState(initialForm?.description || '')
  const [courseId, setCourseId] = useState(initialForm?.course_id || '')
  const [sections, setSections] = useState<FormSection[]>(
    initialForm?.schema?.length ? deserialiseSchema(initialForm.schema) : [newSection()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateSection(idx: number, s: FormSection) {
    setSections(prev => prev.map((x, i) => i === idx ? s : x))
  }

  function deleteSection(idx: number) {
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  async function save() {
    if (!title.trim()) { setError('חסרה כותרת לטופס'); return }
    if (!courseId) { setError('יש לבחור קורס'); return }
    setSaving(true)
    setError('')

    const schema = serialiseSchema(sections)
    const payload = { title, description, course_id: courseId, schema }

    const { error: err } = initialForm?.id
      ? await supabase.from('forms').update(payload).eq('id', initialForm.id)
      : await supabase.from('forms').insert(payload)

    setSaving(false)
    if (err) { setError('שגיאה בשמירה: ' + err.message); return }
    router.push('/admin/forms')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Meta */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">כותרת הטופס *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="למשל: שאלון פתיחה — קורס מכירות"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תיאור (אופציונלי)</label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="הסבר קצר לתלמיד מה מטרת הטופס"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">קורס *</label>
          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">בחר קורס...</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((sec, i) => (
          <SectionEditor
            key={sec.id}
            section={sec}
            onChange={s => updateSection(i, s)}
            onDelete={() => deleteSection(i)}
            isOnly={sections.length === 1}
          />
        ))}
        <button
          type="button"
          onClick={() => setSections(prev => [...prev, newSection()])}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition"
        >
          + הוסף חלק חדש
        </button>
      </div>

      {/* Save */}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'שומר...' : initialForm ? 'עדכן טופס' : 'צור טופס'}
        </button>
        <button
          onClick={() => router.push('/admin/forms')}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition"
        >
          ביטול
        </button>
      </div>
    </div>
  )
}
