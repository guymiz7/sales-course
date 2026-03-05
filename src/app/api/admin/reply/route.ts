import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { question_id, content, api_key } = await req.json()

  if (!question_id || !content || !api_key) {
    return NextResponse.json({ error: 'חסרים שדות' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify api_key
  const { data: settings } = await supabase
    .from('admin_settings')
    .select('api_key')
    .eq('id', 1)
    .single()

  if (!settings || settings.api_key !== api_key) {
    return NextResponse.json({ error: 'מפתח API לא תקין' }, { status: 401 })
  }

  // Get admin user id
  const { data: adminUser } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .single()

  if (!adminUser) {
    return NextResponse.json({ error: 'לא נמצא אדמין' }, { status: 500 })
  }

  // Insert reply
  const { error: replyError } = await supabase
    .from('replies')
    .insert({
      question_id,
      user_id: adminUser.id,
      content: content.trim(),
    })

  if (replyError) {
    return NextResponse.json({ error: replyError.message }, { status: 500 })
  }

  // Mark question as done
  await supabase.from('questions').update({ is_done: true }).eq('id', question_id)

  return NextResponse.json({ success: true })
}
