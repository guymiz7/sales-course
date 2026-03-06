'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

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
}

export default function LessonSidebar({ lessons, parts, previewMode, viewedLessonIds, accessMode, forms, submittedFormIds }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between mb-3 px-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          שיעורים
        </p>
        <button
          className="md:hidden text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
          onClick={() => setMobileOpen(false)}
        >
          ✕
        </button>
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

      {/* All questions link */}
      {!previewMode && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            href="/lessons/questions"
            onClick={() => setMobileOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
              pathname === '/lessons/questions'
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            )}
          >
            <span className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
              pathname === '/lessons/questions' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
            )}>
              ?
            </span>
            <span>כל השאלות</span>
          </Link>
        </div>
      )}

      {/* Forms section */}
      {!previewMode && forms && forms.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
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
        </div>
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
