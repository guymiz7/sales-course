import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-site.com'

// ─── Email HTML templates ──────────────────────────────────────────────────────

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;max-width:520px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">קורס מכירות</p>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:36px 32px;">
          ${content}
        </td></tr>

        <!-- Footer -->
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

function welcomeHtml(name: string) {
  return baseLayout(`
    <p style="margin:0 0 8px;font-size:20px;font-weight:bold;color:#111827;">שלום ${name}! 👋</p>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.7;">
      תודה שנרשמת לקורס מכירות.<br/>
      הרשמתך התקבלה בהצלחה ועומדת לאישור.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      נשלח לך עדכון ברגע שהחשבון שלך יאושר ותוכל/י להתחיל.
    </p>
    <p style="margin:0;font-size:14px;color:#9ca3af;">
      לשאלות? פשוט השב/י למייל זה.
    </p>
  `)
}

function approvedHtml(name: string) {
  return baseLayout(`
    <p style="margin:0 0 8px;font-size:20px;font-weight:bold;color:#111827;">שלום ${name}! 🎉</p>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.7;">
      חשבונך אושר — ברוכ/ה הבא/ה לקורס מכירות!
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#374151;line-height:1.7;">
      הפלטפורמה פתוחה עבורך עכשיו. ניתן להיכנס ולהתחיל ללמוד.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:#4f46e5;border-radius:10px;padding:0;">
          <a href="${SITE_URL}/login"
             style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">
            כניסה לקורס ←
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#9ca3af;">
      אם הכפתור לא עובד, העתק את הקישור: <a href="${SITE_URL}/login" style="color:#4f46e5;">${SITE_URL}/login</a>
    </p>
  `)
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  }

  const { type, to, name } = await req.json()

  if (!to || !name || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  let subject: string
  let html: string

  if (type === 'welcome') {
    subject = 'ברוכים הבאים לקורס מכירות!'
    html = welcomeHtml(name)
  } else if (type === 'approved') {
    subject = 'חשבונך אושר — ברוכים הבאים!'
    html = approvedHtml(name)
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, html })

  if (error) {
    console.error('Email send error:', error)
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
