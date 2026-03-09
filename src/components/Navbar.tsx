'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { RECOMMEND_PLATFORM, FOLLOW_PLATFORMS, SocialLinks } from '@/lib/recommendPlatforms'

interface NavbarProps {
  userName: string
  role: 'admin' | 'student'
  courseName?: string
  pendingCount?: number
  openQuestionsCount?: number
  socialLinks?: SocialLinks
}

export default function Navbar({ userName, role, courseName, pendingCount, openQuestionsCount, socialLinks }: NavbarProps) {
  const pathname = usePathname()

  const hasRecommend = socialLinks?.[RECOMMEND_PLATFORM.key]
  const followLinks = FOLLOW_PLATFORMS.filter(p => socialLinks?.[p.key])

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between sticky top-0 z-10">
      {/* Right: logo */}
      <Link href={role === 'admin' ? '/admin' : '/lessons'} className="flex items-center gap-2">
        <img src="/logo.png" alt="לוגו" className="h-8 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        {courseName && <span className="font-semibold text-gray-900 text-sm">{courseName}</span>}
      </Link>

      {/* Center: recommend + follow (student) or nav (admin) */}
      {role === 'student' && socialLinks && (hasRecommend || followLinks.length > 0) && (
        <nav className="hidden md:flex items-center gap-3">
          {/* Recommend button */}
          {hasRecommend && (
            <a
              href={socialLinks[RECOMMEND_PLATFORM.key]!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              <img src={`https://www.google.com/s2/favicons?domain=${RECOMMEND_PLATFORM.domain}&sz=32`} alt="" className="w-3.5 h-3.5" />
              {RECOMMEND_PLATFORM.label}
            </a>
          )}

          {/* Follow divider + icons */}
          {followLinks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">עקוב אחרי גיא:</span>
              {followLinks.map(p => (
                <a
                  key={p.key}
                  href={socialLinks[p.key]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.label}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition"
                >
                  <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt={p.label} className="w-4 h-4" />
                </a>
              ))}
            </div>
          )}
        </nav>
      )}

      {role === 'admin' && (
        <nav className="flex items-center gap-1 flex-wrap">
          <NavLink href="/admin" label="שאלות" pathname={pathname} badge={openQuestionsCount} exact />
          <NavLink href="/admin/questions" label="כל השאלות" pathname={pathname} />
          <NavLink href="/admin/pending" label="ממתינים" pathname={pathname} badge={pendingCount} />
          <NavLink href="/admin/courses" label="קורסים" pathname={pathname} />
          <NavLink href="/admin/students" label="תלמידים" pathname={pathname} />
          <NavLink href="/admin/forms" label="טפסים" pathname={pathname} />
          <NavLink href="/admin/community" label="קהילה" pathname={pathname} />
          <NavLink href="/admin/chat" label="צ׳אט" pathname={pathname} />
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
          <button type="submit" className="text-sm text-gray-400 hover:text-gray-700 transition">
            יציאה
          </button>
        </form>
      </div>
    </header>
  )
}

function NavLink({ href, label, pathname, badge, exact }: { href: string; label: string; pathname: string; badge?: number; exact?: boolean }) {
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
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
