import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { type, id } = await req.json()
  const supabase = createAdminClient()

  // Get webhook settings
  const { data: settings } = await supabase
    .from('admin_settings')
    .select('webhook_url, api_key')
    .eq('id', 1)
    .single()

  if (!settings?.webhook_url) return NextResponse.json({ skipped: true })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || ''
  let payload: object

  if (type === 'new_question') {
    const { data: question } = await supabase
      .from('questions')
      .select('id, content, users!questions_user_id_fkey(full_name), lessons(number, title)')
      .eq('id', id)
      .single()

    if (!question) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })

    payload = {
      type: 'new_question',
      id: question.id,
      content: question.content,
      student_name: (question.users as any)?.full_name || 'לא ידוע',
      lesson_title: (question.lessons as any)
        ? `שיעור ${(question.lessons as any).number} — ${(question.lessons as any).title}`
        : '',
      reply_url: `${baseUrl}/api/admin/reply`,
    }
  } else if (type === 'pending_user') {
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', id)
      .single()

    if (!user) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })

    payload = {
      type: 'pending_user',
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      approve_url: `${baseUrl}/api/admin/approve`,
    }
  } else {
    return NextResponse.json({ error: 'סוג לא תקין' }, { status: 400 })
  }

  try {
    await fetch(settings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    // Webhook failed — don't throw, just log
    console.error('Webhook send failed:', e)
  }

  return NextResponse.json({ success: true })
}
