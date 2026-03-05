'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function WatchTimeTracker({ lessonId, userId }: { lessonId: string; userId: string }) {
  const secondsRef = useRef(0)
  const savedRef = useRef(0)

  useEffect(() => {
    const supabase = createClient()

    async function flush() {
      const toSave = secondsRef.current - savedRef.current
      if (toSave <= 0) return
      savedRef.current = secondsRef.current
      await supabase.rpc('add_watch_time', {
        p_lesson_id: lessonId,
        p_user_id: userId,
        p_seconds: toSave,
      })
    }

    // Count seconds while tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        secondsRef.current += 1
      }
      // Save every 60 seconds
      if (secondsRef.current - savedRef.current >= 60) {
        flush()
      }
    }, 1000)

    // Save on visibility change (tab switch / minimize)
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flush()
    }
  }, [lessonId, userId])

  return null
}
