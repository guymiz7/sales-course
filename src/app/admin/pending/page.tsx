import { createClient } from '@/lib/supabase/server'
import PendingUsersList from '@/components/PendingUsersList'

export default async function PendingUsersPage() {
  const supabase = await createClient()

  const { data: pending } = await supabase
    .from('users')
    .select('id, full_name, email, created_at')
    .eq('role', 'pending')
    .order('created_at', { ascending: true })

  const { data: cohorts } = await supabase
    .from('cohorts')
    .select('id, name, courses(name)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">ממתינים לאישור</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pending?.length || 0} משתמשים ממתינים
        </p>
      </div>
      <PendingUsersList users={pending || []} cohorts={cohorts || []} />
    </div>
  )
}
