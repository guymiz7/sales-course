const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || ''
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || ''
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || ''
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_arp3s6s'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sales-course-six.vercel.app'

export async function sendEmailJS(templateParams: Record<string, string>) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: templateParams,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`EmailJS error (${res.status}): ${text}`)
  }

  return { success: true }
}

const FEATURES_HTML = `
<div style="background:#f5f3ff;border-radius:12px;padding:20px;margin:0 0 24px;text-align:right;">
  <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#2d1b69;text-align:right;">מה מחכה לך בפורטל?</p>
  <table dir="rtl" cellpadding="0" cellspacing="0" style="width:100%;font-family:'Rubik',Arial,Helvetica,sans-serif;direction:rtl;">
    <tr><td style="padding:7px 0;font-size:13px;color:#4b5563;line-height:1.5;border-bottom:1px solid #e9e5f5;text-align:right;">🎬&nbsp;&nbsp;הקלטות מלאות של כל השיעורים</td></tr>
    <tr><td style="padding:7px 0;font-size:13px;color:#4b5563;line-height:1.5;border-bottom:1px solid #e9e5f5;text-align:right;">💬&nbsp;&nbsp;צ׳אט קבוצתי עם המרצה וחברי הקורס</td></tr>
    <tr><td style="padding:7px 0;font-size:13px;color:#4b5563;line-height:1.5;border-bottom:1px solid #e9e5f5;text-align:right;">❓&nbsp;&nbsp;אזור שאלות ותשובות אישי</td></tr>
    <tr><td style="padding:7px 0;font-size:13px;color:#4b5563;line-height:1.5;border-bottom:1px solid #e9e5f5;text-align:right;">👥&nbsp;&nbsp;קהילת בוגרים ונטוורקינג</td></tr>
    <tr><td style="padding:7px 0;font-size:13px;color:#4b5563;line-height:1.5;text-align:right;">📝&nbsp;&nbsp;טפסים ומשימות לתרגול</td></tr>
  </table>
</div>
<p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.7;text-align:center;">נשלח לך עדכון ברגע שהחשבון שלך יאושר ותוכל/י להתחיל.</p>`

const NOTIFY_QUOTE = (message: string) => `
<div style="background:#f5f3ff;border-radius:12px;padding:20px;margin:0 0 24px;text-align:right;border-right:3px solid #4f46e5;">
  <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${message}</p>
</div>`

export function buildWelcomeParams(to: string, name: string) {
  return {
    to_email: to,
    email_subject: `שלום ${name} — ברוכים הבאים לקורס מכירות!`,
    hero_label: 'ברוכים הבאים',
    hero_title: `שלום ${name}! 👋`,
    body_text: 'תודה שנרשמת לקורס <strong style="color:#4f46e5;font-weight:700;">תמחור ומכירות</strong>.<br/>הרשמתך התקבלה בהצלחה ועומדת לאישור.',
    extra_section: FEATURES_HTML,
    cta_url: `${SITE_URL}/login`,
    cta_text: '→ כניסה לפורטל',
    bottom_note: 'שאלות? היכנס/י לפורטל ושלח/י הודעה באזור השאלות 💬',
  }
}

export function buildApprovedParams(to: string, name: string) {
  return {
    to_email: to,
    email_subject: `${name} — חשבונך אושר! ברוכים הבאים לקורס`,
    hero_label: 'חשבונך אושר',
    hero_title: `${name}, הכל מוכן! 🎉`,
    body_text: 'חשבונך אושר בהצלחה — ברוכ/ה הבא/ה לקורס <strong style="color:#4f46e5;font-weight:700;">תמחור ומכירות</strong>!<br/><br/>הפורטל פתוח עבורך עכשיו. ניתן להיכנס ולהתחיל ללמוד — הקלטות, צ׳אט קבוצתי, שאלות ותשובות, קהילה ועוד מחכים לך.',
    extra_section: '',
    cta_url: `${SITE_URL}/login`,
    cta_text: '→ כניסה לפורטל',
    bottom_note: `אם הכפתור לא עובד, העתק/י את הקישור:<br/><a href="${SITE_URL}/login" style="color:#4f46e5;text-decoration:underline;">${SITE_URL}/login</a>`,
  }
}

export function buildNotifyParams(to: string, name: string, message: string) {
  return {
    to_email: to,
    email_subject: '💬 הודעה חדשה בצ׳אט — מחכים לתגובתך!',
    hero_label: 'הודעה חדשה',
    hero_title: `${name}, יש עדכון בצ׳אט! 💬`,
    body_text: 'המרצה פרסם הודעה בצ׳אט הקבוצתי ומחכה לתגובתך:',
    extra_section: NOTIFY_QUOTE(message),
    cta_url: `${SITE_URL}/lessons/chat`,
    cta_text: '→ כניסה לצ׳אט',
    bottom_note: '',
  }
}
