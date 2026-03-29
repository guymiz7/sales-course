import { NextRequest, NextResponse } from 'next/server'
import { sendEmailJS, buildWelcomeParams, buildApprovedParams } from '@/lib/emailjs'

export async function POST(req: NextRequest) {
  const { type, to, name } = await req.json()

  if (!to || !name || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  let params: Record<string, string>

  if (type === 'welcome') {
    params = buildWelcomeParams(to, name)
  } else if (type === 'approved') {
    params = buildApprovedParams(to, name)
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  try {
    await sendEmailJS(params)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Email send error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
