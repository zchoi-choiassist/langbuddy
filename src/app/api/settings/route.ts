import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { topikLevel } = await req.json()
  await supabaseAdmin
    .from('user_settings')
    .update({ topik_level: topikLevel, updated_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
  return NextResponse.json({ ok: true })
}
