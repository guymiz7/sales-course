import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { userId, password, email, ...fields } = body
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const admin = createAdminClient()

  // Update auth (email and/or password)
  if (email || password) {
    const authUpdate: { email?: string; password?: string } = {}
    if (email) authUpdate.email = email
    if (password) authUpdate.password = password
    const { error } = await admin.auth.admin.updateUserById(userId, authUpdate)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update public.users profile fields
  const updateFields = {
    ...(fields.full_name !== undefined && { full_name: fields.full_name }),
    ...(email !== undefined && { email }),
    ...(fields.bio !== undefined && { bio: fields.bio || null }),
    ...(fields.website_url !== undefined && { website_url: fields.website_url || null }),
    ...(fields.facebook_url !== undefined && { facebook_url: fields.facebook_url || null }),
    ...(fields.instagram_url !== undefined && { instagram_url: fields.instagram_url || null }),
    ...(fields.linkedin_url !== undefined && { linkedin_url: fields.linkedin_url || null }),
    ...(fields.systems !== undefined && { systems: fields.systems }),
    ...(fields.niches !== undefined && { niches: fields.niches }),
    ...(fields.profile_visibility !== undefined && { profile_visibility: fields.profile_visibility }),
    ...(fields.role !== undefined && { role: fields.role }),
  }

  if (Object.keys(updateFields).length > 0) {
    const { error } = await supabase.from('users').update(updateFields).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
