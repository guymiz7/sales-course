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
  const admin = createAdminClient()

  if (body.all) {
    // Get all pending users
    const { data: pending } = await admin.from('users').select('id').eq('role', 'pending')
    const ids = (pending || []).map(u => u.id)

    let deleted = 0
    for (const id of ids) {
      try {
        await admin.from('users').delete().eq('id', id)
        await admin.auth.admin.deleteUser(id)
        deleted++
      } catch (e) {
        console.error(`Failed to delete ${id}:`, e)
      }
    }

    return NextResponse.json({ deleted, total: ids.length })
  }

  const { userId } = body
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  try {
    await admin.from('users').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Reject user error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
