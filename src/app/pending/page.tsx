import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'student') redirect('/lessons')
  if (profile?.role === 'admin') redirect('/admin')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-xl p-10 shadow-sm max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          שלום, {profile?.full_name || 'משתמש'}
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          הרישום שלך התקבל בהצלחה.
          <br />
          המנהל יאשר את הגישה שלך בקרוב.
          <br />
          <span className="text-gray-400">תקבל הודעה כשהחשבון יאושר.</span>
        </p>

        <div className="border-t border-gray-100 pt-5">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              יציאה מהמערכת
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
