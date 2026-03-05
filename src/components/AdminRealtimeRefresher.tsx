'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminRealtimeRefresher() {
  const supabase = createClient()
  const router = useRouter()

  async function sendWebhook(type: 'new_question' | 'pending_user', id: string) {
    try {
      await fetch('/api/admin/send-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })
    } catch {}
  }

  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'questions' }, (payload) => {
        router.refresh()
        sendWebhook('new_question', payload.new.id)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
        if (payload.new.role === 'pending') {
          router.refresh()
          sendWebhook('pending_user', payload.new.id)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return null
}
