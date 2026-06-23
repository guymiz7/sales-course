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

  let admin
  try {
    admin = createAdminClient()
  } catch (e: any) {
    console.error('Admin client error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  // Deletes the user from auth AND public.users. The public.users row has
  // ON DELETE CASCADE from auth.users, so removing the auth user also removes
  // the profile row. We delete the profile row too as a fallback, and we CHECK
  // every error instead of swallowing it.
  async function deleteOne(id: string) {
    const { error: authErr } = await admin.auth.admin.deleteUser(id)
    // "User not found" is fine — it means auth was already gone; keep cleaning up.
    if (authErr && !/not found/i.test(authErr.message)) {
      throw new Error(authErr.message)
    }
    const { error: rowErr } = await admin.from('users').delete().eq('id', id)
    if (rowErr) throw new Error(rowErr.message)
  }

  if (body.all) {
    const { data: pending, error: listErr } = await admin
      .from('users')
      .select('id')
      .eq('role', 'pending')
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })

    const ids = (pending || []).map(u => u.id)
    let deleted = 0
    const failures: string[] = []
    for (const id of ids) {
      try {
        await deleteOne(id)
        deleted++
      } catch (e: any) {
        console.error(`Failed to delete ${id}:`, e)
        failures.push(`${id}: ${e.message}`)
      }
    }

    if (failures.length > 0) {
      return NextResponse.json(
        { deleted, total: ids.length, error: `נכשלו ${failures.length} מחיקות: ${failures[0]}` },
        { status: 500 }
      )
    }
    return NextResponse.json({ deleted, total: ids.length })
  }

  const { userId } = body
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  try {
    await deleteOne(userId)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Reject user error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
