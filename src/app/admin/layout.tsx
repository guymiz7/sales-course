import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AdminRealtimeRefresher from '@/components/AdminRealtimeRefresher'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { count: pendingCount }, { count: openQuestionsCount }] = await Promise.all([
    supabase.from('users').select('full_name, role').eq('id', user.id).single(),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'pending'),
    supabase.from('questions').select('*', { count: 'exact', head: true }).eq('is_done', false),
  ])

  if (profile?.role !== 'admin') redirect('/lessons')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        userName={profile.full_name || 'מנהל'}
        role="admin"
        pendingCount={pendingCount || 0}
        openQuestionsCount={openQuestionsCount || 0}
        userId={user.id}
      />
      <AdminRealtimeRefresher />
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  )
}
