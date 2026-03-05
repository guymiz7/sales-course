import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Public routes — no auth needed
  const publicRoutes = ['/login', '/register', '/auth/callback', '/auth/update-password']
  if (publicRoutes.some(r => pathname.startsWith(r))) {
    return supabaseResponse
  }

  // Not logged in → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get user role from DB
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Pending users → pending page
  if (role === 'pending' && pathname !== '/pending') {
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  // Students trying to access /admin → lessons
  if (role === 'student' && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/lessons', request.url))
  }

  return supabaseResponse
}
