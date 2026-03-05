import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { user_id, api_key } = await req.json()

  if (!user_id || !api_key) {
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

  // Approve user
  const { error } = await supabase
    .from('users')
    .update({ role: 'student' })
    .eq('id', user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
