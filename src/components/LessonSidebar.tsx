'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { RECOMMEND_PLATFORM, FOLLOW_PLATFORMS, SocialLinks } from '@/lib/recommendPlatforms'
import { createClient } from '@/lib/supabase/client'

interface Part {
  id: string
  number: number
  title: string
  image_url?: string | null
}

interface Lesson {
  id: string
  number: number
  title: string
  part_id?: string | null
}

interface SidebarForm {
  id: string
  title: string
}

interface Props {
  lessons: Lesson[]
  parts?: Part[]
  previewMode?: boolean
  viewedLessonIds?: string[]
  accessMode?: 'open' | 'sequential'
  forms?: SidebarForm[]
  submittedFormIds?: string[]
  avatarUrl?: string | null
  userName?: string
  socialLinks?: SocialLinks
  userId?: string
  cohortId?: string
}

export default function LessonSidebar({ lessons, parts, previewMode, viewedLessonIds, accessMode, forms, submittedFormIds, avatarUrl, userName, socialLinks, userId, cohortId }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [unreadPM, setUnreadPM] = useState(0)
  const [unreadGroup, setUnreadGroup] = useState(0)

  // Clear badge immediately when user is on any chat page
  useEffect(() => {
    if (pathname?.startsWith('/lessons/chat')) {
      if (cohortId) localStorage.setItem(`chat_last_seen_${cohortId}`, new Date().toISOString())
      setUnreadGroup(0)
      setUnreadPM(0)
    }
  }, [pathname, cohortId])

  useEffect(() => {
    if (!userId || !cohortId || previewMode) return
    const supabase = createClient()

    async function fetchPM() {
      const { count } = await supabase
        .from('private_messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId!)
        .is('read_at', null)
      setUnreadPM(count || 0)
    }

    async function fetchGroup() {
      const lastSeen = localStorage.getItem(`chat_last_seen_${cohortId}`) || '1970-01-01T00:00:00Z'
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('cohort_id', cohortId!)
        .neq('user_id', userId!)
        .gt('created_at', lastSeen)
      setUnreadGroup(count || 0)
    }

    fetchPM()
    fetchGroup()

    const pmChannel = supabase.channel('sidebar_pm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages', filter: `receiver_id=eq.${userId}` }, fetchPM)
      .subscribe()

    const groupChannel = supabase.channel('sidebar_group')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `cohort_id=eq.${cohortId}` }, fetchGroup)
      .subscribe()

    return () => {
      supabase.removeChannel(pmChannel)
      supabase.removeChannel(groupChannel)
    }
  }, [userId, cohortId])

  const maxViewedNumber = accessMode === 'sequential' && viewedLessonIds
    ? Math.max(0, ...lessons.filter(l => viewedLessonIds.includes(l.id)).map(l => l.number))
    : Infinity

  function renderLesson(lesson: Lesson) {
    const href = previewMode ? `/admin/preview/${lesson.id}` : `/lessons/${lesson.id}`
    const active = pathname === href
    const isLocked = accessMode === 'sequential' && lesson.number > maxViewedNumber + 1

    if (isLocked) {
      return (
        <div
          key={lesson.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 cursor-not-allowed"
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 bg-gray-100 text-gray-400">
            🔒
          </span>
          <span className="truncate">{lesson.title}</span>
        </div>
      )
    }

    return (
      <Link
        key={lesson.id}
        href={href}
        onClick={() => setMobileOpen(false)}
        className={clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
          active
            ? 'bg-indigo-50 text-indigo-700 font-medium'
            : 'text-gray-700 hover:bg-gray-50'
        )}
      >
        <span className={clsx(
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
          active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
        )}>
          {lesson.number}
        </span>
        <span className="truncate">{lesson.title}</span>
      </Link>
    )
  }

  // Build groups: one per part (sorted), then ungrouped at end
  const partMap = new Map((parts ?? []).map(p => [p.id, p]))
  const sortedParts = [...(parts ?? [])].sort((a, b) => a.number - b.number)

  const groups: { part: Part | null; lessons: Lesson[] }[] = sortedParts.map(part => ({
    part,
    lessons: lessons.filter(l => l.part_id === part.id).sort((a, b) => a.number - b.number),
  }))

  const ungrouped = lessons
    .filter(l => !l.part_id || !partMap.has(l.part_id))
    .sort((a, b) => a.number - b.number)

  if (ungrouped.length > 0 || groups.length === 0) {
    groups.push({ part: null, lessons: ungrouped })
  }

  const hasGroups = groups.some(g => g.part !== null)

  function SidebarLink({ href, icon, label, badge, exact }: { href: string; icon: string; label: string; badge?: React.ReactNode; exact?: boolean }) {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
          active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
        )}
      >
        <span className={clsx(
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
          active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
        )}>
          {icon}
        </span>
        <span className="flex-1 truncate">{label}</span>
        {badge}
      </Link>
    )
  }

  const sidebarContent = (
    <>
      {/* Close button (mobile only) */}
      <div className="flex items-center justify-end mb-2 md:hidden">
        <button
          className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
          onClick={() => setMobileOpen(false)}
        >
          ✕
        </button>
      </div>

      {/* Profile link */}
      {previewMode ? (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 mb-1">
          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
            <span className="text-gray-400 text-xs">👤</span>
          </div>
          <span className="flex-1 truncate text-gray-400">פרופיל תלמיד</span>
        </div>
      ) : (
        <Link
          href="/lessons/profile"
          onClick={() => setMobileOpen(false)}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition mb-1',
            pathname === '/lessons/profile'
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-gray-400 text-xs">👤</span>
            }
          </div>
          <span className="flex-1 truncate">{userName || 'הפרופיל שלי'}</span>
        </Link>
      )}

      {/* Community */}
      {previewMode ? (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400">
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">👥</span>
          <span>קהילה</span>
        </div>
      ) : (
        <SidebarLink href="/lessons/community" icon="👥" label="קהילה" />
      )}

      {/* Chat */}
      {previewMode ? (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400">
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">💬</span>
          <span>צ׳אט</span>
        </div>
      ) : (
        <SidebarLink
          href="/lessons/chat"
          icon="💬"
          label="צ'אט"
          badge={
            !pathname?.startsWith('/lessons/chat') && (unreadGroup + unreadPM) > 0
              ? <span className="text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-0.5 leading-none shrink-0">
                  {(unreadGroup + unreadPM) > 99 ? '99+' : unreadGroup + unreadPM}
                </span>
              : undefined
          }
        />
      )}

      <div className="my-3 border-t border-gray-100" />

      {/* Questions */}
      {previewMode ? (
        <>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400">
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">?</span>
            <span>שאלות</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400">
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">!</span>
            <span>השאלות שלי</span>
          </div>
        </>
      ) : (
        <>
          <SidebarLink href="/lessons/questions" icon="?" label="שאלות" exact />
          <SidebarLink href="/lessons/my-questions" icon="!" label="השאלות שלי" exact />
        </>
      )}

      {/* Forms section */}
      {forms && forms.length > 0 && (
        previewMode ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400">
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">✉</span>
            <span className="flex-1">טפסים</span>
            <span className="text-xs text-gray-400 shrink-0">0/{forms.length}</span>
          </div>
        ) : (
          <Link
            href="/lessons/forms"
            onClick={() => setMobileOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
              pathname?.startsWith('/lessons/forms')
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            )}
          >
            <span className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
              pathname?.startsWith('/lessons/forms') ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
            )}>
              ✉
            </span>
            <span className="flex-1">טפסים</span>
            <span className="text-xs text-gray-400 shrink-0">
              {(submittedFormIds?.filter(id => forms.some(f => f.id === id)).length ?? 0)}/{forms.length}
            </span>
          </Link>
        )
      )}

      <div className="my-3 border-t border-gray-100" />

      {/* Lessons */}
      <div className="flex items-center gap-2 mb-2 px-2">
        <span className="text-base">🎓</span>
        <p className="text-sm font-bold text-gray-700">מרכז הלמידה</p>
      </div>
      <nav className="space-y-0.5">
        {hasGroups ? (
          groups.map((group) => (
            <div key={group.part?.id ?? 'ungrouped'}>
              {group.part && (
                <div className="mt-3 mb-0.5">
                  {group.part.image_url && (
                    <img
                      src={group.part.image_url}
                      alt={group.part.title}
                      className="w-full rounded-lg mb-1.5 object-cover max-h-24 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setLightboxUrl(group.part!.image_url!)}
                    />
                  )}
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-xs font-semibold text-gray-500">
                      {group.part.number}. {group.part.title}
                    </span>
                    {viewedLessonIds && (
                      <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                        {group.lessons.filter(l => viewedLessonIds.includes(l.id)).length}/{group.lessons.length}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {group.lessons.length === 0 && group.part && (
                <p className="text-xs text-gray-300 px-3 py-1">אין שיעורים בחלק זה</p>
              )}
              {group.lessons.map(lesson => renderLesson(lesson))}
            </div>
          ))
        ) : (
          <>
            {lessons.sort((a, b) => a.number - b.number).map(lesson => renderLesson(lesson))}
            {lessons.length === 0 && (
              <p className="text-sm text-gray-400 px-3 py-2">אין שיעורים עדיין</p>
            )}
          </>
        )}
      </nav>

      {/* Recommend Guy — mobile only (shown in hamburger) */}
      {!previewMode && socialLinks && (
        (() => {
          const hasRecommend = socialLinks[RECOMMEND_PLATFORM.key]
          const followLinks = FOLLOW_PLATFORMS.filter(p => socialLinks[p.key])
          if (!hasRecommend && followLinks.length === 0) return null
          return (
            <div className="mt-4 pt-4 border-t border-gray-100 md:hidden space-y-2">
              {hasRecommend && (
                <a
                  href={socialLinks[RECOMMEND_PLATFORM.key]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 mx-2 px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
                >
                  <img src={`https://www.google.com/s2/favicons?domain=${RECOMMEND_PLATFORM.domain}&sz=32`} alt="" className="w-4 h-4" />
                  {RECOMMEND_PLATFORM.label}
                </a>
              )}
              {followLinks.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 px-2">עקוב אחרי גיא:</p>
                  <div className="flex flex-wrap gap-1 px-2">
                    {followLinks.map(p => (
                      <a
                        key={p.key}
                        href={socialLinks[p.key]!}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={p.label}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                      >
                        <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt={p.label} className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })()
      )}
    </>
  )

  return (
    <>
      {/* Desktop sidebar — always visible in flow */}
      <aside className="hidden md:block w-64 min-h-screen border-r border-gray-200 bg-white p-4 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile: backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: slide-in drawer from right */}
      <aside
        className={clsx(
          'md:hidden fixed top-0 right-0 bottom-0 w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto z-50 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}

      {/* Mobile: floating toggle button */}
      {!mobileOpen && (
        <button
          className="md:hidden fixed bottom-6 left-4 z-30 bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg text-lg"
          onClick={() => setMobileOpen(true)}
          aria-label="פתח תפריט שיעורים"
        >
          ☰
        </button>
      )}
    </>
  )
}
