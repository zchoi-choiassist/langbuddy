import { supabaseAdmin } from '@/lib/supabase/admin'
import { analyzeVocabulary } from '@/lib/vocabulary-analyzer'
import type { Segment } from '@/lib/types'

interface AnalyzeAndPersistArgs {
  articleId: string
  userId: string
  adaptedKorean: Segment[]
}

function flattenSegmentsToText(segments: Segment[]): string {
  return segments
    .map(segment => {
      if (segment.type === 'break') return '\n'
      return segment.text
    })
    .join(' ')
}

export async function analyzeAndPersistArticleWords({
  articleId,
  userId,
  adaptedKorean,
}: AnalyzeAndPersistArgs): Promise<void> {
  const [topikResponse, customResponse] = await Promise.all([
    supabaseAdmin
      .from('topik_words')
      .select('id, korean'),
    supabaseAdmin
      .from('user_custom_words')
      .select('id, korean')
      .eq('user_id', userId),
  ])

  if (topikResponse.error) {
    throw new Error(`Failed to load topik words: ${topikResponse.error.message}`)
  }
  if (customResponse.error) {
    throw new Error(`Failed to load custom words: ${customResponse.error.message}`)
  }

  const text = flattenSegmentsToText(adaptedKorean)
  const matches = analyzeVocabulary({
    text,
    topikWords: topikResponse.data ?? [],
    customWords: customResponse.data ?? [],
  })

  const { error: deleteError } = await supabaseAdmin
    .from('article_word_matches')
    .delete()
    .eq('article_id', articleId)

  if (deleteError) {
    throw new Error(`Failed to clear existing article matches: ${deleteError.message}`)
  }

  if (matches.length > 0) {
    const rows = matches.map(match => ({
      article_id: articleId,
      user_id: userId,
      source: match.source,
      topik_word_id: match.source === 'topik' ? match.wordId : null,
      custom_word_id: match.source === 'custom' ? match.wordId : null,
      surface_form: match.surfaceForm,
      normalized_form: match.normalizedForm,
      base_form: match.baseForm,
      match_confidence: match.matchConfidence,
    }))

    const { error: insertError } = await supabaseAdmin
      .from('article_word_matches')
      .insert(rows)

    if (insertError) {
      throw new Error(`Failed to persist article matches: ${insertError.message}`)
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('articles')
    .update({ last_analyzed_at: new Date().toISOString() })
    .eq('id', articleId)

  if (updateError) {
    throw new Error(`Failed to mark article analysis completion: ${updateError.message}`)
  }
}
