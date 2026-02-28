import Link from 'next/link'

interface ArticleCardProps {
  article: {
    id: string
    title: string
    source_url: string
    original_english: string
    status: 'unread' | 'reading' | 'completed'
    created_at: string
    total_score: number
  }
}

function getSourceLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    if (hostname.includes('reddit.com')) {
      const subreddit = pathname.match(/\/r\/([^/]+)/)?.[1]
      return subreddit ? `r/${subreddit}` : 'reddit.com'
    }
    return hostname.replace('www.', '')
  } catch {
    return url
  }
}

const STATUS_STYLES: Record<string, string> = {
  unread:    'bg-blue-100 text-blue-700',
  reading:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
}

export function ArticleCard({ article }: ArticleCardProps) {
  const excerpt = article.original_english.slice(0, 120).trim() + '…'
  const date = new Date(article.created_at).toLocaleDateString()

  return (
    <Link
      href={`/articles/${article.id}`}
      className="block px-4 py-4 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
            {article.title}
          </h2>
          <p className="text-gray-400 text-xs mb-2 line-clamp-2">{excerpt}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{getSourceLabel(article.source_url)}</span>
            <span>·</span>
            <span>{date}</span>
            {article.status === 'completed' && (
              <>
                <span>·</span>
                <span className="font-medium text-gray-600">{article.total_score} pts</span>
              </>
            )}
          </div>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[article.status]}`}>
          {article.status}
        </span>
      </div>
    </Link>
  )
}
