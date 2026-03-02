import type { TopikLevel } from '@/lib/constants'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { runBackgroundAdaptation } from '@/lib/adapt-article-background'

const PLACEHOLDER_TITLE = 'Adapting article...'
const PLACEHOLDER_CONTENT = 'Your article is being prepared. This card will update automatically soon.'

/**
 * Adapt a single RSS feed item for a user.
 * Checks for existing articles with the same source_url (cross-feed dedup),
 * creates a placeholder, runs adaptation synchronously, and records the feed_item.
 */
export async function adaptFeedArticle(params: {
  feedId: string
  userId: string
  topikLevel: TopikLevel
  item: { guid: string; title: string; link: string; publishedAt: Date | null }
}): Promise<{ articleId: string } | null> {
  const { feedId, userId, topikLevel, item } = params

  // Cross-feed dedup: skip if this URL was already adapted for this user
  const { data: existing } = await supabaseAdmin
    .from('articles')
    .select('id')
    .eq('user_id', userId)
    .eq('source_url', item.link)
    .maybeSingle()

  if (existing) {
    // Still record the feed_item so we don't re-process it next poll
    await supabaseAdmin.from('feed_items').upsert(
      {
        feed_id: feedId,
        guid: item.guid,
        link: item.link,
        title: item.title,
        published_at: item.publishedAt?.toISOString() ?? null,
        article_id: existing.id,
      },
      { onConflict: 'feed_id,guid' }
    )
    return null
  }

  // Create placeholder article
  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .insert({
      user_id: userId,
      source_url: item.link,
      title: PLACEHOLDER_TITLE,
      adapted_korean: [],
      original_english: PLACEHOLDER_CONTENT,
      topik_level_at_time: topikLevel,
      comprehension_questions: [],
      status: 'unread',
    })
    .select('id')
    .single()

  if (error || !article) {
    console.error('[feed] Failed to create placeholder article:', {
      feedId,
      link: item.link,
      message: error?.message,
    })
    return null
  }

  // Run adaptation synchronously (cron has 300s timeout)
  await runBackgroundAdaptation(article.id, userId, item.link, topikLevel)

  // Record feed_item
  await supabaseAdmin.from('feed_items').insert({
    feed_id: feedId,
    guid: item.guid,
    link: item.link,
    title: item.title,
    published_at: item.publishedAt?.toISOString() ?? null,
    article_id: article.id,
  })

  return { articleId: article.id }
}
