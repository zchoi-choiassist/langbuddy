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
    topik_level_at_time: number
    word_quiz_score: number
    comprehension_score: number
  }
  index?: number
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

const STATUS_STYLES: Record<ArticleCardProps['article']['status'], string> = {
  unread: 'bg-accent-celadon-light text-accent-celadon',
  reading: 'bg-[#FEF3C7] text-[#92400E]',
  completed: 'bg-bg-subtle text-text-secondary',
}

const STATUS_LABELS: Record<ArticleCardProps['article']['status'], string> = {
  unread: 'New',
  reading: 'In Progress',
  completed: 'Complete',
}

export function ArticleCard({ article, index = 0 }: ArticleCardProps) {
  const excerpt = article.original_english.slice(0, 130).trim() + '…'
  const wordCount = article.original_english.trim().split(/\s+/).filter(Boolean).length
  const readTime = Math.max(1, Math.round(wordCount / 200))
  const sourceLabel = getSourceLabel(article.source_url)
  const href = article.status === 'completed' ? `/articles/${article.id}/summary` : `/articles/${article.id}`

  return (
    <Link
      href={href}
      className="block cursor-pointer rounded-card bg-bg-surface px-5 py-[18px] shadow-card transition-all duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-card-hover animate-cardIn"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className={`mb-2 inline-block rounded-pill px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[article.status]}`}>
        {STATUS_LABELS[article.status]}
      </span>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="mb-1 line-clamp-2 font-korean-serif text-[17px] font-semibold leading-[1.45] text-text-primary">
            {article.title}
          </h2>
          <p className="line-clamp-2 text-[13px] leading-[1.55] text-text-secondary">{excerpt}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
            <span className="font-mono text-[11px] font-semibold text-accent-celadon">
              TOPIK {article.topik_level_at_time}
            </span>
            <span className="h-[3px] w-[3px] rounded-full bg-text-tertiary" />
            <span>{wordCount} words</span>
            <span className="h-[3px] w-[3px] rounded-full bg-text-tertiary" />
            <span>{readTime} min read</span>
            <span className="h-[3px] w-[3px] rounded-full bg-text-tertiary" />
            <span className="truncate">{sourceLabel}</span>
          </div>
        </div>
        {article.status === 'completed' && (
          <span className="shrink-0 rounded-pill bg-bg-subtle px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary">
            {article.total_score > 0 ? '+' : ''}
            {article.total_score}
          </span>
        )}
      </div>
    </Link>
  )
}
