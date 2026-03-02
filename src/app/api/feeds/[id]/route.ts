import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify ownership before deleting
  const { data: feed } = await supabaseAdmin
    .from('user_feeds')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (!feed || feed.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('user_feeds')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Verify ownership before updating
  const { data: feed } = await supabaseAdmin
    .from('user_feeds')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (!feed || feed.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!body.resetErrors) {
    return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_feeds')
    .update({ error_count: 0, last_error: null })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
