import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let topikLevel: unknown
  try {
    const body = await req.json()
    topikLevel = body.topikLevel
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (![1, 2, 3, 4, 5, 6].includes(topikLevel as number)) {
    return NextResponse.json({ error: 'Invalid topikLevel' }, { status: 400 })
  }

  await supabaseAdmin
    .from('user_settings')
    .update({ topik_level: topikLevel, updated_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
  return NextResponse.json({ ok: true })
}
