'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('אימייל או סיסמה שגויים')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') router.push('/admin')
    else if (profile?.role === 'pending') router.push('/pending')
    else router.push('/lessons')
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/update-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    setLoading(false)
    if (error) {
      setError('שגיאה בשליחת המייל. בדוק שהאימייל נכון.')
      return
    }
    setResetSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">קורס מכירות</h1>
          <p className="text-gray-500 text-sm mt-1">
            {forgotMode ? 'איפוס סיסמה' : 'כניסה לפלטפורמה'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {resetSent ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">📬</div>
              <p className="text-sm font-medium text-gray-900">נשלח מייל לאיפוס הסיסמה</p>
              <p className="text-sm text-gray-500">בדוק את תיבת הדואר שלך ולחץ על הקישור במייל</p>
              <button
                onClick={() => { setForgotMode(false); setResetSent(false) }}
                className="text-indigo-600 text-sm hover:underline"
              >
                חזור לכניסה
              </button>
            </div>
          ) : forgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אימייל
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
              </button>

              <button
                type="button"
                onClick={() => { setForgotMode(false); setError('') }}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                חזור לכניסה
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אימייל
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    סיסמה
                  </label>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError('') }}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    שכחתי סיסמה
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? 'מתחבר...' : 'כניסה'}
              </button>
            </form>
          )}

          {!forgotMode && !resetSent && (
            <p className="text-center text-sm text-gray-500 mt-4">
              אין לך חשבון?{' '}
              <Link href="/register" className="text-indigo-600 hover:underline font-medium">
                הרשמה
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
