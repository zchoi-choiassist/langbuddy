import type { TopikLevel } from '@/lib/constants'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchAndExtract } from '@/lib/extract'
import { injectMediaSegments } from '@/lib/media-placement'
import { adaptArticle } from '@/lib/claude'
import { analyzeAndPersistArticleWords } from '@/lib/persist-article-word-matches'

export function coerceTopikLevel(value: number | null | undefined): TopikLevel {
  if (value !== null && value !== undefined && value >= 1 && value <= 6) {
    return value as TopikLevel
  }
  return 2
}

export async function runBackgroundAdaptation(
  articleId: string,
  userId: string,
  url: string,
  topikLevel: TopikLevel,
  redditType?: 'post' | 'article'
) {
  try {
    const extracted = await fetchAndExtract(url, redditType)
    const adaptation = await adaptArticle(extracted.title, extracted.content, topikLevel)
    const adaptedWithMedia = injectMediaSegments(adaptation.adaptedKorean, extracted.images)

    const { error } = await supabaseAdmin
      .from('articles')
      .update({
        title: extracted.title,
        adapted_korean: adaptedWithMedia,
        original_english: extracted.content,
        comprehension_questions: adaptation.comprehensionQuestions,
      })
      .eq('id', articleId)

    if (error) {
      console.error('[adapt] Failed to persist adapted article:', {
        articleId,
        message: error.message,
      })
      return
    }

    try {
      await analyzeAndPersistArticleWords({
        articleId,
        userId,
        adaptedKorean: adaptedWithMedia,
      })
    } catch (analysisError) {
      const message = analysisError instanceof Error ? analysisError.message : 'Unknown analysis error'
      console.error('[adapt] Deterministic analysis failed:', {
        articleId,
        message,
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown adaptation error'
    console.error('[adapt] Background adaptation failed:', { articleId, message })

    await supabaseAdmin
      .from('articles')
      .update({
        title: 'Adaptation failed',
        original_english: `Unable to adapt this article right now. ${message}`,
        adapted_korean: [],
        comprehension_questions: [],
      })
      .eq('id', articleId)
  }
}
