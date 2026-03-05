import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/lessons')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name || 'מנהל'} role="admin" />
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  )
}
