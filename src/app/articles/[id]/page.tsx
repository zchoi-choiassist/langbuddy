import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ReadingView } from '@/components/ReadingView'
import { notFound } from 'next/navigation'
import type { Article, Segment, TopikWord } from '@/lib/types'
import { applyDeterministicTopikHighlights } from '@/lib/deterministic-highlights'

interface Props {
  params: Promise<{ id: string }>
}

function hashSeed(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

function deterministicShuffle<T>(items: T[], seed: string, getKey: (item: T) => string): T[] {
  return [...items]
    .map(item => ({ item, rank: hashSeed(`${seed}:${getKey(item)}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item)
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
  const typedArticle = article as Article

  if (typedArticle.status === 'unread') {
    await supabaseAdmin.from('articles').update({ status: 'reading' }).eq('id', id)
  }

  const baseSegments: Segment[] = typedArticle.adapted_korean as Segment[]
  const [{ data: matchRows }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from('article_word_matches')
      .select('source, topik_word_id, base_form')
      .eq('article_id', id),
    supabaseAdmin
      .from('user_settings')
      .select('topik_level')
      .eq('user_id', userId)
      .single(),
  ])

  const topikMatchIds = [...new Set(
    (matchRows ?? [])
      .filter(row => row.source === 'topik')
      .map(row => row.topik_word_id)
      .filter((value): value is number => typeof value === 'number')
  )]

  const { data: matchedTopikRows } = await supabaseAdmin
    .from('topik_words')
    .select('id, topik_level')
    .in('id', topikMatchIds.length > 0 ? topikMatchIds : [-1])

  const topikLevelById = new Map((matchedTopikRows ?? []).map(row => [row.id, row.topik_level]))
  const canonicalLookup: Record<string, { wordId: number; topikLevel: 1 | 2 | 3 | 4 | 5 | 6 }> = {}
  for (const row of matchRows ?? []) {
    if (row.source !== 'topik' || row.topik_word_id === null) continue
    const topikLevel = topikLevelById.get(row.topik_word_id)
    if (!topikLevel) continue
    if (!canonicalLookup[row.base_form]) {
      canonicalLookup[row.base_form] = {
        wordId: row.topik_word_id,
        topikLevel: topikLevel as 1 | 2 | 3 | 4 | 5 | 6,
      }
    }
  }

  const renderSegments = Object.keys(canonicalLookup).length > 0
    ? applyDeterministicTopikHighlights(baseSegments, canonicalLookup)
    : baseSegments

  const wordIds = [...new Set(
    renderSegments
      .filter((s): s is Extract<Segment, { type: 'word' }> => s.type === 'word')
      .map(s => s.wordId)
  )]

  const [{ data: masteryRows }, { data: wordRows }] = await Promise.all([
    supabaseAdmin
      .from('user_word_mastery')
      .select('word_id, mastery')
      .eq('user_id', userId)
      .in('word_id', wordIds.length > 0 ? wordIds : [-1]),
    supabaseAdmin
      .from('topik_words')
      .select('id, korean, english, romanization, topik_level')
      .in('id', wordIds.length > 0 ? wordIds : [-1]),
  ])

  // Fetch distractor candidates per TOPIK level.
  // Use a deterministic page offset (0-4) per article+level for stable results.
  const levels = [...new Set((wordRows ?? []).map(r => r.topik_level))]
  const distractorResults = await Promise.all(
    levels.map(level => {
      const offset = (hashSeed(`${id}:${level}`) % 5) * 50
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
  const wordDetails = new Map<number, TopikWord>((wordRows ?? []).map(r => {
    const pool = (distractorPools[r.topik_level] ?? []).filter(e => e !== r.english)
    const distractors = deterministicShuffle(pool, `${id}:${r.id}`, english => english).slice(0, 3)
    // Guard: if pool is too small, pad with level label so quiz always has 4 choices
    while (distractors.length < 3) distractors.push(`(TOPIK ${r.topik_level} word)`)
    return [r.id, { ...r, distractors }]
  }))
  const userTopikLevel = settings?.topik_level ?? 2

  return (
    <ReadingView
      article={{
        ...typedArticle,
        adapted_korean: renderSegments,
      }}
      masteryMap={masteryMap}
      wordDetails={wordDetails}
      userTopikLevel={userTopikLevel}
    />
  )
}
