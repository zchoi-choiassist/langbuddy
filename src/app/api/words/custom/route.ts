import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  canonicalizeKoreanToken,
  deriveBaseCandidates,
  extractPrimaryKoreanToken,
} from '@/lib/vocabulary-analyzer'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let rawKorean: string, english: string, romanization: string, topikLevel: number
  try {
    const body = await req.json()
    rawKorean = body.korean?.trim()
    english = body.english?.trim()
    romanization = body.romanization?.trim()
    topikLevel = Number(body.topikLevel)
    if (!rawKorean || !english || !romanization || ![1, 2, 3, 4, 5, 6].includes(topikLevel)) {
      return NextResponse.json(
        { error: 'Missing required fields: korean, english, romanization, topikLevel (1-6)' },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const normalizedInput = extractPrimaryKoreanToken(rawKorean)
  if (!normalizedInput) {
    return NextResponse.json({ error: 'Missing required fields: korean' }, { status: 400 })
  }
  const inputCandidates = deriveBaseCandidates(normalizedInput)

  const [topikResponse, customCandidatesResponse] = await Promise.all([
    supabaseAdmin
      .from('topik_words')
      .select('korean')
      .in('korean', inputCandidates)
      .limit(inputCandidates.length),
    supabaseAdmin
      .from('user_custom_words')
      .select('korean')
      .eq('user_id', userId)
      .in('korean', inputCandidates)
      .limit(inputCandidates.length),
  ])

  if (topikResponse.error) {
    return NextResponse.json({ error: topikResponse.error.message }, { status: 500 })
  }
  if (customCandidatesResponse.error) {
    return NextResponse.json({ error: customCandidatesResponse.error.message }, { status: 500 })
  }

  const knownBaseForms = new Set<string>([
    ...(topikResponse.data ?? []).map(row => row.korean as string),
    ...(customCandidatesResponse.data ?? []).map(row => row.korean as string),
  ])
  const korean = canonicalizeKoreanToken(normalizedInput, knownBaseForms)
  const dedupeCandidates = [...new Set([...inputCandidates, ...deriveBaseCandidates(korean)])]

  // Check if canonical word already exists for this user
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('user_custom_words')
    .select('id')
    .eq('user_id', userId)
    .in('korean', dedupeCandidates)
    .limit(1)

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  if ((existingRows ?? []).length > 0) {
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
      topik_level: topikLevel,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[words/custom] Insert failed:', insertError)
    return NextResponse.json({ error: 'Failed to save word' }, { status: 500 })
  }

  return NextResponse.json(customWord, { status: 201 })
}
