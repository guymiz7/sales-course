import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailJS } from '@/lib/emailjs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-site.com'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify admin
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { cohortId, message } = await req.json()
  if (!cohortId || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Get all students in cohort
  const admin = createAdminClient()
  const { data: cohortUsers } = await admin
    .from('user_cohorts')
    .select('user_id, users!user_cohorts_user_id_fkey(email, full_name, role)')
    .eq('cohort_id', cohortId)

  const students = (cohortUsers || [])
    .filter((u: any) => u.users?.role !== 'admin' && u.users?.email)
    .map((u: any) => ({ email: u.users.email, name: u.users.full_name || 'תלמיד/ה' }))

  if (students.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  const templateId = process.env.EMAILJS_TEMPLATE_NOTIFY || 'template_notify_chat'
  const messagePreview = message.replace('*כולם', '').trim()

  let sent = 0
  for (const student of students) {
    try {
      await sendEmailJS(templateId, {
        to_email: student.email,
        to_name: student.name,
        message_preview: messagePreview,
        site_url: SITE_URL,
      })
      sent++
    } catch (e) {
      console.error(`Failed to send to ${student.email}:`, e)
    }
  }

  return NextResponse.json({ sent, total: students.length })
}
