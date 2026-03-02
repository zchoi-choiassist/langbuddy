import Parser from 'rss-parser'

export interface FeedItem {
  guid: string
  title: string
  link: string
  publishedAt: Date | null
}

export interface ParsedFeed {
  title: string
  items: FeedItem[]
}

const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent': 'LangBuddy/1.0 (RSS reader)',
  },
})

export async function parseFeed(feedUrl: string): Promise<ParsedFeed> {
  const feed = await parser.parseURL(feedUrl)

  const items: FeedItem[] = feed.items
    .filter((item) => item.link)
    .map((item) => ({
      guid: item.guid || item.link!,
      title: item.title || '',
      link: item.link!,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    }))

  return {
    title: feed.title || '',
    items,
  }
}
