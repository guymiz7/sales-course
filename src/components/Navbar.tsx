'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'
import { RECOMMEND_PLATFORMS_LIST, FOLLOW_PLATFORMS, SocialLinks } from '@/lib/recommendPlatforms'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  userName: string
  role: 'admin' | 'student'
  courseName?: string
  pendingCount?: number
  openQuestionsCount?: number
  socialLinks?: SocialLinks
  userId?: string
}

export default function Navbar({ userName, role, courseName, pendingCount, openQuestionsCount, socialLinks, userId }: NavbarProps) {
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [adminChatUnread, setAdminChatUnread] = useState(0)

  const recommendLinks = RECOMMEND_PLATFORMS_LIST.filter(p => socialLinks?.[p.key])
  const followLinks = FOLLOW_PLATFORMS.filter(p => socialLinks?.[p.key])

  // Admin: clear badge when on chat page
  useEffect(() => {
    if (role === 'admin' && pathname.startsWith('/admin/chat')) {
      setAdminChatUnread(0)
    }
  }, [pathname, role])

  // Admin: live unread PM badge
  useEffect(() => {
    if (role !== 'admin' || !userId) return
    const supabase = createClient()

    async function fetchUnread() {
      const { count } = await supabase
        .from('private_messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId!)
        .is('read_at', null)
      if (!pathnameRef.current.startsWith('/admin/chat')) {
        setAdminChatUnread(count || 0)
      }
    }

    fetchUnread()

    const channel = supabase.channel('admin_navbar_pm')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `receiver_id=eq.${userId}` }, fetchUnread)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [role, userId])

  // Close mobile nav on route change
  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  const adminLinks = [
    { href: '/admin', label: 'שאלות', badge: openQuestionsCount, exact: true },
    { href: '/admin/questions', label: 'כל השאלות' },
    { href: '/admin/pending', label: 'ממתינים', badge: pendingCount },
    { href: '/admin/courses', label: 'קורסים' },
    { href: '/admin/students', label: 'תלמידים' },
    { href: '/admin/forms', label: 'טפסים' },
    { href: '/admin/community', label: 'קהילה' },
    { href: '/admin/chat', label: 'צ׳אט', badge: pathname.startsWith('/admin/chat') ? 0 : adminChatUnread },
    { href: '/admin/settings', label: 'הגדרות' },
  ]

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between sticky top-0 z-10">
      {/* Right: logo */}
      <Link href={role === 'admin' ? '/admin' : '/lessons'} className="flex items-center gap-2">
        <img src="/logo.png" alt="לוגו" className="h-8 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        {courseName && <span className="font-semibold text-gray-900 text-sm">{courseName}</span>}
      </Link>

      {/* Center: recommend + follow (student, desktop only) */}
      {role === 'student' && socialLinks && (recommendLinks.length > 0 || followLinks.length > 0) && (
        <nav className="hidden md:flex items-center gap-2">
          {recommendLinks.map(p => (
            <a
              key={p.key}
              href={socialLinks[p.key]!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt="" className="w-3.5 h-3.5" />
              {p.label}
            </a>
          ))}
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

      {/* Admin: desktop nav */}
      {role === 'admin' && (
        <nav className="hidden md:flex items-center gap-1 flex-wrap">
          {adminLinks.map(l => (
            <NavLink key={l.href} href={l.href} label={l.label} pathname={pathname} badge={l.badge} exact={l.exact} />
          ))}
          <Link
            href="/admin/preview"
            className="px-3 py-1.5 rounded-md text-sm transition text-indigo-600 hover:bg-indigo-50 font-medium"
          >
            צפה כתלמיד
          </Link>
        </nav>
      )}

      {/* Left: user + logout + mobile hamburger (admin) */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 hidden sm:block">{userName}</span>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm text-gray-400 hover:text-gray-700 transition">
            יציאה
          </button>
        </form>
        {/* Admin mobile hamburger */}
        {role === 'admin' && (
          <button
            className="md:hidden flex flex-col gap-1 p-1"
            onClick={() => setMobileNavOpen(v => !v)}
            aria-label="תפריט ניהול"
          >
            <span className="w-5 h-0.5 bg-gray-600 block" />
            <span className="w-5 h-0.5 bg-gray-600 block" />
            <span className="w-5 h-0.5 bg-gray-600 block" />
            {((!pathname.startsWith('/admin/chat') && adminChatUnread > 0) || (pendingCount || 0) > 0 || (openQuestionsCount || 0) > 0) && (
              <span className="absolute top-2 left-4 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        )}
      </div>

      {/* Admin mobile dropdown */}
      {role === 'admin' && mobileNavOpen && (
        <div className="md:hidden absolute top-14 right-0 left-0 bg-white border-b border-gray-200 shadow-md z-50 p-3 flex flex-col gap-1">
          {adminLinks.map(l => (
            <NavLink key={l.href} href={l.href} label={l.label} pathname={pathname} badge={l.badge} exact={l.exact} />
          ))}
          <Link
            href="/admin/preview"
            className="px-3 py-2 rounded-md text-sm text-indigo-600 hover:bg-indigo-50 font-medium"
            onClick={() => setMobileNavOpen(false)}
          >
            צפה כתלמיד
          </Link>
        </div>
      )}
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
