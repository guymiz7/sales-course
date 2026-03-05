import { createClient } from '@/lib/supabase/server'
import FormBuilder from '@/components/FormBuilder'
import Link from 'next/link'

export default async function NewFormPage() {
  const supabase = await createClient()
  const { data: courses } = await supabase.from('courses').select('id, name').order('name')

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/forms" className="text-sm text-gray-400 hover:text-gray-600 transition">
          ← חזרה לטפסים
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">טופס חדש</h1>
      </div>
      <FormBuilder courses={courses || []} />
    </div>
  )
}
