import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import FormBuilder from '@/components/FormBuilder'
import Link from 'next/link'

interface Props {
  params: Promise<{ formId: string }>
}

export default async function EditFormPage({ params }: Props) {
  const { formId } = await params
  const supabase = await createClient()

  const [{ data: form }, { data: courses }] = await Promise.all([
    supabase.from('forms').select('id, title, description, course_id, schema').eq('id', formId).single(),
    supabase.from('courses').select('id, name').order('name'),
  ])

  if (!form) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/forms" className="text-sm text-gray-400 hover:text-gray-600 transition">
          ← חזרה לטפסים
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">עריכת טופס</h1>
      </div>
      <FormBuilder
        courses={courses || []}
        initialForm={{
          id: form.id,
          title: form.title,
          description: form.description || '',
          course_id: form.course_id,
          schema: (form.schema as any) || [],
        }}
      />
    </div>
  )
}
