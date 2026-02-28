import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchAndExtract } from '@/lib/extract'
import { adaptArticle } from '@/lib/claude'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { url, redditType } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('topik_level')
    .eq('user_id', userId)
    .single()
  const topikLevel = settings?.topik_level ?? 2

  const extracted = await fetchAndExtract(url, redditType)

  // Reddit URL without type choice yet — ask the client to choose
  if (extracted.isReddit && !redditType) {
    return NextResponse.json({
      needsRedditChoice: true,
      hasLinkedArticle: extracted.hasLinkedArticle ?? false,
    })
  }

  const adaptation = await adaptArticle(extracted.title, extracted.content, topikLevel)

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
