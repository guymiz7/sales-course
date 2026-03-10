import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AdminStudentEditForm from '@/components/AdminStudentEditForm'

export default async function StudentEditPage({ params }: { params: { userId: string } }) {
  const supabase = await createClient()

  const [{ data: student }, { data: cohorts }, { data: allCohorts }] = await Promise.all([
    supabase.from('users').select('id, full_name, email, bio, avatar_url, role, profile_visibility, website_url, facebook_url, instagram_url, linkedin_url, systems, niches').eq('id', params.userId).single(),
    supabase.from('user_cohorts').select('cohort_id, cohorts(id, name, courses(name))').eq('user_id', params.userId),
    supabase.from('cohorts').select('id, name, courses(name)').order('name'),
  ])

  if (!student) notFound()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/admin/students" className="text-xs text-gray-400 hover:text-gray-600 transition">← חזרה לתלמידים</a>
        <h1 className="text-xl font-bold text-gray-900 mt-1">עריכת תלמיד</h1>
        <p className="text-sm text-gray-500">{student.full_name} · {student.email}</p>
      </div>
      <AdminStudentEditForm
        student={student as any}
        cohorts={(cohorts || []) as any}
        allCohorts={(allCohorts || []) as any}
      />
    </div>
  )
}
