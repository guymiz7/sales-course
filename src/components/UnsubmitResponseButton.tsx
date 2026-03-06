'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UnsubmitResponseButton({ responseId }: { responseId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handle() {
    if (!confirm('לבטל את ההגשה ולאפשר לתלמיד למלא מחדש? הנתונים שמילא יישמרו כטיוטה.')) return
    setLoading(true)
    await supabase.from('form_responses').update({ submitted_at: null }).eq('id', responseId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="text-xs text-amber-600 hover:text-amber-800 transition disabled:opacity-50"
    >
      {loading ? '...' : 'בטל הגשה'}
    </button>
  )
}
