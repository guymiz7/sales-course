import { createClient } from '@/lib/supabase/server'
import CourseManager from '@/components/CourseManager'

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id, name, description, access_mode, image_url,
      cohorts(id, name, start_date, access_mode),
      lessons(id, number, title, google_drive_file_id, description, download_url, cohort_id, homework, part_id),
      parts(id, number, title, image_url)
    `)
    .order('id')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">ניהול קורסים</h1>
        <p className="text-sm text-gray-500 mt-1">הוספה ועריכת קורסים, מחזורים ושיעורים</p>
      </div>
      <CourseManager courses={courses || []} />
    </div>
  )
}
