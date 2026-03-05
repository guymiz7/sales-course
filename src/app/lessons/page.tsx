import { createClient } from '@/lib/supabase/server'

export default async function LessonsIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let courseName: string | null = null
  if (user) {
    const { data } = await supabase
      .from('user_cohorts')
      .select('cohorts(courses(name))')
      .eq('user_id', user.id)
      .single()
    courseName = (data?.cohorts as any)?.courses?.name ?? null
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      {courseName && (
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{courseName}</h1>
      )}
      <img
        src="/logo row.png"
        alt="לוגו"
        className="w-full max-w-md object-contain mb-8"
      />
      <p className="text-gray-400 text-sm">בחר שיעור מהרשימה משמאל</p>
    </div>
  )
}
