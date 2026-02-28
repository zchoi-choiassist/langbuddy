import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { updateMastery } from '@/lib/mastery'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let articleId: string | undefined, wordId: number, correct: boolean
  try {
    const body = await req.json()
    articleId = body.articleId
    wordId = body.wordId
    correct = body.correct
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Fetch or create user_word_mastery row
  const { data: existing } = await supabaseAdmin
    .from('user_word_mastery')
    .select('mastery, times_correct, times_seen')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .single()

  const currentMastery = existing?.mastery ?? 0
  const newMastery = updateMastery(currentMastery, correct)

  await supabaseAdmin
    .from('user_word_mastery')
    .upsert(
      {
        user_id: userId,
        word_id: wordId,
        mastery: newMastery,
        times_seen: (existing?.times_seen ?? 0) + 1,
        times_correct: (existing?.times_correct ?? 0) + (correct ? 1 : 0),
      },
      { onConflict: 'user_id,word_id' }
    )

  // Update article word_quiz_score
  if (articleId) {
    const { data: article } = await supabaseAdmin
      .from('articles')
      .select('word_quiz_score')
      .eq('id', articleId)
      .single()
    const delta = correct ? 1 : -1
    await supabaseAdmin
      .from('articles')
      .update({ word_quiz_score: (article?.word_quiz_score ?? 0) + delta })
      .eq('id', articleId)
  }

  return NextResponse.json({ mastery: newMastery, correct })
}
