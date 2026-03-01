import { render, screen } from '@testing-library/react'
import { ArticleCard } from '@/components/ArticleCard'
import { describe, it, expect } from 'vitest'

const article = {
  id: '1',
  title: 'Test Article',
  source_url: 'https://reddit.com/r/korea/comments/abc/test',
  original_english: 'Preview text for the article.',
  status: 'unread' as const,
  created_at: new Date().toISOString(),
  total_score: 0,
}

describe('ArticleCard', () => {
  it('renders article title', () => {
    render(<ArticleCard article={article} />)
    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  it('shows subreddit for Reddit URLs', () => {
    render(<ArticleCard article={article} />)
    expect(screen.getByText('r/korea')).toBeInTheDocument()
  })

  it('shows domain for non-Reddit URLs', () => {
    render(<ArticleCard article={{ ...article, source_url: 'https://bbc.com/news/article' }} />)
    expect(screen.getByText('bbc.com')).toBeInTheDocument()
  })

  it('shows score for completed articles', () => {
    render(<ArticleCard article={{ ...article, status: 'completed', total_score: 42 }} />)
    expect(screen.getByText(/42/)).toBeInTheDocument()
  })

  it('does not show score for unread articles', () => {
    render(<ArticleCard article={{ ...article, status: 'unread', total_score: 0 }} />)
    expect(screen.queryByText(/pts/i)).not.toBeInTheDocument()
  })
})
