'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface NavbarProps {
  userName: string
  role: 'admin' | 'student'
  courseName?: string
}

export default function Navbar({ userName, role, courseName }: NavbarProps) {
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
          <NavLink href="/admin" label="שאלות פתוחות" pathname={pathname} />
          <NavLink href="/admin/questions" label="כל השאלות" pathname={pathname} />
          <NavLink href="/admin/pending" label="ממתינים לאישור" pathname={pathname} />
          <NavLink href="/admin/courses" label="ניהול קורסים" pathname={pathname} />
          <NavLink href="/admin/students" label="תלמידים" pathname={pathname} />
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

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href
  return (
    <Link
      href={href}
      className={clsx(
        'px-3 py-1.5 rounded-md text-sm transition',
        active
          ? 'bg-indigo-50 text-indigo-700 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      {label}
    </Link>
  )
}
