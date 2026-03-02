import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseFeed } from '@/lib/rss'
import { coerceTopikLevel } from '@/lib/adapt-article-background'
import { adaptFeedArticle } from '@/lib/adapt-feed-article'

const MAX_NEW_ARTICLES_PER_FEED = 3
const MAX_TOTAL_ARTICLES = 10
const TIME_BUDGET_MS = 250_000 // 250s, well within 300s limit

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  let processed = 0
  let errors = 0
  let totalArticles = 0

  const { data: feeds, error: feedsError } = await supabaseAdmin
    .from('user_feeds')
    .select('*')
    .lt('error_count', 5)

  if (feedsError || !feeds) {
    return NextResponse.json({ error: 'Failed to fetch feeds' }, { status: 500 })
  }

  for (const feed of feeds) {
    if (totalArticles >= MAX_TOTAL_ARTICLES || Date.now() - startTime > TIME_BUDGET_MS) break

    try {
      const parsedFeed = await parseFeed(feed.feed_url)

      const currentGuids = parsedFeed.items.map(i => i.guid)
      const { data: existingItems } = await supabaseAdmin
        .from('feed_items')
        .select('guid')
        .eq('feed_id', feed.id)
        .in('guid', currentGuids)

      const existingGuids = new Set((existingItems ?? []).map((item: Record<string, string>) => item.guid))

      const newItems = parsedFeed.items
        .filter((item) => !existingGuids.has(item.guid))
        .sort((a, b) =>
          (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
        )
        .slice(0, MAX_NEW_ARTICLES_PER_FEED)

      const { data: userSettings } = await supabaseAdmin
        .from('user_settings')
        .select('topik_level')
        .eq('user_id', feed.user_id)
        .single()

      const topikLevel = coerceTopikLevel(userSettings?.topik_level)

      for (const item of newItems) {
        if (totalArticles >= MAX_TOTAL_ARTICLES || Date.now() - startTime > TIME_BUDGET_MS) break
        await adaptFeedArticle({ feedId: feed.id, userId: feed.user_id, item, topikLevel })
        totalArticles++
      }

      await supabaseAdmin
        .from('user_feeds')
        .update({
          last_polled_at: new Date().toISOString(),
          error_count: 0,
          title: parsedFeed.title || feed.title,
        })
        .eq('id', feed.id)

      processed++
    } catch (err) {
      errors++
      await supabaseAdmin
        .from('user_feeds')
        .update({
          error_count: feed.error_count + 1,
          last_error: err instanceof Error ? err.message : String(err),
        })
        .eq('id', feed.id)
    }
  }

  return NextResponse.json({ processed, errors, totalArticles })
}
