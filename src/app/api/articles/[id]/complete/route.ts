import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { calculateTotalScore } from '@/lib/scoring'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { comprehensionScore, answeredQuestions } = await req.json()

  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('word_quiz_score, user_id')
    .eq('id', id)
    .single()

  if (!article || article.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const totalScore = calculateTotalScore(article.word_quiz_score, comprehensionScore)

  await supabaseAdmin
    .from('articles')
    .update({
      status: 'completed',
      comprehension_score: comprehensionScore,
      total_score: totalScore,
      comprehension_questions: answeredQuestions,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({
    totalScore,
    wordQuizScore: article.word_quiz_score,
    comprehensionScore,
  })
}
