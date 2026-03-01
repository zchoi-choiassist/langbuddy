import { auth } from '@/lib/auth'
import type { TopikLevel } from '@/lib/constants'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchAndExtract, isRedditUrl, normalizeArticleUrl } from '@/lib/extract'
import { adaptArticle } from '@/lib/claude'
import { after, NextResponse } from 'next/server'

const PLACEHOLDER_TITLE = 'Adapting article...'
const PLACEHOLDER_CONTENT = 'Your article is being prepared. This card will update automatically soon.'

function coerceTopikLevel(value: number | null | undefined): TopikLevel {
  if (value !== null && value !== undefined && value >= 1 && value <= 6) {
    return value as TopikLevel
  }
  return 2
}

async function runBackgroundAdaptation(
  articleId: string,
  url: string,
  topikLevel: TopikLevel,
  redditType?: 'post' | 'article'
) {
  try {
    const extracted = await fetchAndExtract(url, redditType)
    const adaptation = await adaptArticle(extracted.title, extracted.content, topikLevel)

    const { error } = await supabaseAdmin
      .from('articles')
      .update({
        title: extracted.title,
        adapted_korean: adaptation.adaptedKorean,
        original_english: extracted.content,
        comprehension_questions: adaptation.comprehensionQuestions,
      })
      .eq('id', articleId)

    if (error) {
      console.error('[adapt] Failed to persist adapted article:', {
        articleId,
        message: error.message,
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

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let url: string, redditType: string | undefined
  try {
    const body = await req.json()
    url = body.url
    redditType = body.redditType
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })
  let normalizedUrl: string
  try {
    normalizedUrl = normalizeArticleUrl(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (isRedditUrl(normalizedUrl) && !redditType) {
    try {
      const extracted = await fetchAndExtract(normalizedUrl)
      return NextResponse.json({
        needsRedditChoice: true,
        hasLinkedArticle: extracted.hasLinkedArticle ?? false,
      })
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 })
    }
  }

  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('topik_level')
    .eq('user_id', userId)
    .single()
  const topikLevel = coerceTopikLevel(settings?.topik_level)

  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .insert({
      user_id: userId,
      source_url: normalizedUrl,
      title: PLACEHOLDER_TITLE,
      adapted_korean: [],
      original_english: PLACEHOLDER_CONTENT,
      topik_level_at_time: topikLevel,
      comprehension_questions: [],
      status: 'unread',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  after(async () => {
    await runBackgroundAdaptation(
      article.id,
      normalizedUrl,
      topikLevel,
      redditType as 'post' | 'article' | undefined
    )
  })

  return NextResponse.json({ articleId: article.id })
}
