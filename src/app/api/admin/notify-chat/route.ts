import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-site.com'

function notificationHtml(messagePreview: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;max-width:520px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 32px;text-align:center;">
            <img src="${SITE_URL}/logo.png" alt="קורס מכירות" style="height:64px;width:auto;object-fit:contain;display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr><td style="padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:bold;color:#111827;">יש הודעה חדשה בצ׳אט! 💬</p>
          <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.7;">
            המרצה פרסם הודעה בצ׳אט הקבוצתי ומחכה לתגובתך:
          </p>
          <div style="background:#f9fafb;border-right:3px solid #4f46e5;padding:16px 20px;border-radius:8px;margin:0 0 28px;">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${messagePreview}</p>
          </div>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr>
              <td style="background:#4f46e5;border-radius:10px;padding:0;">
                <a href="${SITE_URL}/lessons/chat"
                   style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">
                  כניסה לצ׳אט ←
                </a>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© קורס מכירות | כל הזכויות שמורות</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  }

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

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const messagePreview = message.replace('*כולם', '').trim()

  let sent = 0
  // Send in batches to avoid rate limits
  for (const student of students) {
    try {
      await resend.emails.send({
        from: FROM,
        to: student.email,
        subject: '💬 הודעה חדשה בצ׳אט — מחכים לתגובתך!',
        html: notificationHtml(messagePreview),
      })
      sent++
    } catch (e) {
      console.error(`Failed to send to ${student.email}:`, e)
    }
  }

  return NextResponse.json({ sent, total: students.length })
}
