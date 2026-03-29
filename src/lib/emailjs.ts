const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || ''
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || ''

export async function sendEmailJS(templateId: string, templateParams: Record<string, string>) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`EmailJS error (${res.status}): ${text}`)
  }

  return { success: true }
}
