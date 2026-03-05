'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface NavbarProps {
  userName: string
  role: 'admin' | 'student'
  courseName?: string
  pendingCount?: number
  openQuestionsCount?: number
}

export default function Navbar({ userName, role, courseName, pendingCount, openQuestionsCount }: NavbarProps) {
  const pathname = usePathname()

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between sticky top-0 z-10">
      {/* Right: logo */}
      <Link href={role === 'admin' ? '/admin' : '/lessons'} className="flex items-center gap-2">
        <img src="/logo.png" alt="לוגו" className="h-8 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        {courseName && <span className="font-semibold text-gray-900 text-sm">{courseName}</span>}
      </Link>

      {/* Center: navigation (admin only) */}
      {role === 'admin' && (
        <nav className="flex items-center gap-1">
          <NavLink href="/admin" label="שאלות פתוחות" pathname={pathname} badge={openQuestionsCount} />
          <NavLink href="/admin/questions" label="כל השאלות" pathname={pathname} />
          <NavLink href="/admin/pending" label="ממתינים לאישור" pathname={pathname} badge={pendingCount} />
          <NavLink href="/admin/courses" label="ניהול קורסים" pathname={pathname} />
          <NavLink href="/admin/students" label="תלמידים" pathname={pathname} />
          <NavLink href="/admin/settings" label="הגדרות" pathname={pathname} />
          <Link
            href="/admin/preview"
            className="px-3 py-1.5 rounded-md text-sm transition text-indigo-600 hover:bg-indigo-50 font-medium"
          >
            צפה כתלמיד
          </Link>
        </nav>
      )}

      {/* Left: user + logout */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{userName}</span>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-gray-400 hover:text-gray-700 transition"
          >
            יציאה
          </button>
        </form>
      </div>
    </header>
  )
}

function NavLink({ href, label, pathname, badge }: { href: string; label: string; pathname: string; badge?: number }) {
  const active = pathname === href
  return (
    <Link
      href={href}
      className={clsx(
        'relative px-3 py-1.5 rounded-md text-sm transition inline-flex items-center gap-1.5',
        active
          ? 'bg-indigo-50 text-indigo-700 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
