import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!ids || !Array.isArray(ids) || ids.length === 0) return NextResponse.json({ users: [] })

  const admin = createAdminClient()
  const { data } = await admin.from('users').select('id, full_name, avatar_url, role, profile_visibility').in('id', ids)
  return NextResponse.json({ users: data || [] })
}
