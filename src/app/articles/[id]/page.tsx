import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ReadingView } from '@/components/ReadingView'
import { notFound } from 'next/navigation'
import type { Segment } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user.id

  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!article) notFound()

  if (article.status === 'unread') {
    await supabaseAdmin.from('articles').update({ status: 'reading' }).eq('id', id)
  }

  const segments: Segment[] = article.adapted_korean as Segment[]
  const wordIds = [...new Set(
    segments
      .filter((s): s is Extract<Segment, { type: 'word' }> => s.type === 'word')
      .map(s => s.wordId)
  )]

  const [{ data: masteryRows }, { data: wordRows }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from('user_word_mastery')
      .select('word_id, mastery')
      .eq('user_id', userId)
      .in('word_id', wordIds),
    supabaseAdmin
      .from('topik_words')
      .select('id, korean, english, romanization, topik_level')
      .in('id', wordIds),
    supabaseAdmin
      .from('user_settings')
      .select('topik_level')
      .eq('user_id', userId)
      .single(),
  ])

  // Fetch distractor candidates per TOPIK level.
  // Use a random page offset (0-4) so different article loads surface different words.
  const levels = [...new Set((wordRows ?? []).map(r => r.topik_level))]
  const distractorResults = await Promise.all(
    levels.map(level => {
      const offset = Math.floor(Math.random() * 5) * 50
      return supabaseAdmin
        .from('topik_words')
        .select('english')
        .eq('topik_level', level)
        .order('id', { ascending: true })
        .range(offset, offset + 49)
    })
  )
  const distractorPools: Record<number, string[]> = {}
  levels.forEach((level, i) => {
    distractorPools[level] = (distractorResults[i].data ?? []).map(r => r.english)
  })

  const masteryMap = new Map((masteryRows ?? []).map(r => [r.word_id, r.mastery]))
  const wordDetails = new Map((wordRows ?? []).map(r => {
    const pool = (distractorPools[r.topik_level] ?? []).filter(e => e !== r.english)
    const distractors = [...pool].sort(() => Math.random() - 0.5).slice(0, 3)
    // Guard: if pool is too small, pad with level label so quiz always has 4 choices
    while (distractors.length < 3) distractors.push(`(TOPIK ${r.topik_level} word)`)
    return [r.id, { ...r, distractors }]
  }))
  const userTopikLevel = settings?.topik_level ?? 2

  return (
    <ReadingView
      article={article as any}
      masteryMap={masteryMap}
      wordDetails={wordDetails as any}
      userTopikLevel={userTopikLevel}
    />
  )
}
