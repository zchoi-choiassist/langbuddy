import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchAndExtract } from '@/lib/extract'
import { adaptArticle } from '@/lib/claude'
import { NextResponse } from 'next/server'

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

  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('topik_level')
    .eq('user_id', userId)
    .single()
  const topikLevel = settings?.topik_level ?? 2

  let extracted: Awaited<ReturnType<typeof fetchAndExtract>>
  try {
    extracted = await fetchAndExtract(url, redditType as 'post' | 'article' | undefined)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 })
  }

  // Reddit URL without type choice yet — ask the client to choose
  if (extracted.isReddit && !redditType) {
    return NextResponse.json({
      needsRedditChoice: true,
      hasLinkedArticle: extracted.hasLinkedArticle ?? false,
    })
  }

  let adaptation: Awaited<ReturnType<typeof adaptArticle>>
  try {
    adaptation = await adaptArticle(extracted.title, extracted.content, topikLevel)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }

  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .insert({
      user_id: userId,
      source_url: url,
      title: extracted.title,
      adapted_korean: adaptation.adaptedKorean,
      original_english: extracted.content,
      topik_level_at_time: topikLevel,
      comprehension_questions: adaptation.comprehensionQuestions,
      status: 'unread',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articleId: article.id })
}
