import { NextRequest, NextResponse } from 'next/server'
import { sendEmailJS } from '@/lib/emailjs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-site.com'

export async function POST(req: NextRequest) {
  const { type, to, name } = await req.json()

  if (!to || !name || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  let templateId: string

  if (type === 'welcome') {
    templateId = process.env.EMAILJS_TEMPLATE_WELCOME || 'template_welcome'
  } else if (type === 'approved') {
    templateId = process.env.EMAILJS_TEMPLATE_APPROVED || 'template_approved'
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  try {
    await sendEmailJS(templateId, {
      to_email: to,
      to_name: name,
      site_url: SITE_URL,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Email send error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
