'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface Lesson {
  id: string
  number: number
  title: string
}

interface Props {
  lessons: Lesson[]
  previewMode?: boolean
  viewedLessonIds?: string[]
  accessMode?: 'open' | 'sequential'
}

export default function LessonSidebar({ lessons, previewMode, viewedLessonIds, accessMode }: Props) {
  const pathname = usePathname()

  const maxViewedNumber = accessMode === 'sequential' && viewedLessonIds
    ? Math.max(0, ...lessons.filter(l => viewedLessonIds.includes(l.id)).map(l => l.number))
    : Infinity

  return (
    <aside className="w-64 min-h-screen border-r border-gray-200 bg-white p-4 shrink-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
        שיעורים
      </p>
      <nav className="space-y-0.5">
        {lessons.map(lesson => {
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
        })}

        {lessons.length === 0 && (
          <p className="text-sm text-gray-400 px-3 py-2">אין שיעורים עדיין</p>
        )}
      </nav>

      {/* All questions link */}
      {!previewMode && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            href="/lessons/questions"
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
    </aside>
  )
}
