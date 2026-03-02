import { auth } from '@/lib/auth'
import { coerceTopikLevel, runBackgroundAdaptation } from '@/lib/adapt-article-background'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchAndExtract, isRedditUrl, normalizeArticleUrl } from '@/lib/extract'
import { after, NextResponse } from 'next/server'

const PLACEHOLDER_TITLE = 'Adapting article...'
const PLACEHOLDER_CONTENT = 'Your article is being prepared. This card will update automatically soon.'

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
      userId,
      normalizedUrl,
      topikLevel,
      redditType as 'post' | 'article' | undefined
    )
  })

  return NextResponse.json({ articleId: article.id })
}
