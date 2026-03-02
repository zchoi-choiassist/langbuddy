import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseFeed } from '@/lib/rss'
import { coerceTopikLevel } from '@/lib/adapt-article-background'
import { adaptFeedArticle } from '@/lib/adapt-feed-article'

export const MAX_NEW_ARTICLES_PER_FEED = 3
export const MAX_TOTAL_ARTICLES = 10
export const TIME_BUDGET_MS = 250_000

interface UserFeedRow {
  id: string
  user_id: string
  feed_url: string
  title: string | null
  error_count: number
}

export async function pollSingleFeed(
  feed: UserFeedRow,
  options?: { maxNewArticlesPerFeed?: number }
): Promise<{ processed: boolean; errors: number; totalArticles: number }> {
  const maxNewArticlesPerFeed = options?.maxNewArticlesPerFeed ?? MAX_NEW_ARTICLES_PER_FEED

  try {
    const parsedFeed = await parseFeed(feed.feed_url)
    const currentGuids = parsedFeed.items.map(i => i.guid)

    let existingGuids = new Set<string>()
    if (currentGuids.length > 0) {
      const { data: existingItems } = await supabaseAdmin
        .from('feed_items')
        .select('guid')
        .eq('feed_id', feed.id)
        .in('guid', currentGuids)

      existingGuids = new Set((existingItems ?? []).map((item: Record<string, string>) => item.guid))
    }

    const newItems = parsedFeed.items
      .filter((item) => !existingGuids.has(item.guid))
      .sort((a, b) =>
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
      )
      .slice(0, maxNewArticlesPerFeed)

    const { data: userSettings } = await supabaseAdmin
      .from('user_settings')
      .select('topik_level')
      .eq('user_id', feed.user_id)
      .single()

    const topikLevel = coerceTopikLevel(userSettings?.topik_level)

    for (const item of newItems) {
      await adaptFeedArticle({ feedId: feed.id, userId: feed.user_id, item, topikLevel })
    }

    await supabaseAdmin
      .from('user_feeds')
      .update({
        last_polled_at: new Date().toISOString(),
        error_count: 0,
        last_error: null,
        title: parsedFeed.title || feed.title,
      })
      .eq('id', feed.id)

    return { processed: true, errors: 0, totalArticles: newItems.length }
  } catch (err) {
    await supabaseAdmin
      .from('user_feeds')
      .update({
        error_count: feed.error_count + 1,
        last_error: err instanceof Error ? err.message : String(err),
      })
      .eq('id', feed.id)

    return { processed: false, errors: 1, totalArticles: 0 }
  }
}

export async function pollAllFeeds(): Promise<{ processed: number; errors: number; totalArticles: number }> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0
  let totalArticles = 0

  const { data: feeds, error: feedsError } = await supabaseAdmin
    .from('user_feeds')
    .select('*')
    .lt('error_count', 5)

  if (feedsError || !feeds) {
    throw new Error('Failed to fetch feeds')
  }

  for (const feed of feeds as UserFeedRow[]) {
    if (totalArticles >= MAX_TOTAL_ARTICLES || Date.now() - startTime > TIME_BUDGET_MS) break

    const remainingArticleBudget = MAX_TOTAL_ARTICLES - totalArticles
    const result = await pollSingleFeed(feed, {
      maxNewArticlesPerFeed: Math.min(MAX_NEW_ARTICLES_PER_FEED, remainingArticleBudget),
    })

    if (result.processed) processed++
    errors += result.errors
    totalArticles += result.totalArticles
  }

  return { processed, errors, totalArticles }
}
