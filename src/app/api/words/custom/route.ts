import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let korean: string, english: string, romanization: string
  try {
    const body = await req.json()
    korean = body.korean?.trim()
    english = body.english?.trim()
    romanization = body.romanization?.trim()
    if (!korean || !english || !romanization) {
      return NextResponse.json(
        { error: 'Missing required fields: korean, english, romanization' },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Check if word already exists for this user
  const { data: existing } = await supabaseAdmin
    .from('user_custom_words')
    .select('id')
    .eq('user_id', userId)
    .eq('korean', korean)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Word already in your word bank' }, { status: 409 })
  }

  // Insert the custom word
  const { data: customWord, error: insertError } = await supabaseAdmin
    .from('user_custom_words')
    .insert({
      user_id: userId,
      korean,
      english,
      romanization,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[words/custom] Insert failed:', insertError)
    return NextResponse.json({ error: 'Failed to save word' }, { status: 500 })
  }

  return NextResponse.json(customWord, { status: 201 })
}
