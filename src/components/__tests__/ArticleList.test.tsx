import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ArticleList } from '@/components/ArticleList'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock('@/components/DeleteConfirmModal', () => ({
  DeleteConfirmModal: () => null,
}))

vi.mock('@/components/SwipeableArticleCard', () => ({
  SwipeableArticleCard: ({ article }: { article: { title: string, status: 'unread' | 'reading' | 'completed' } }) => {
    const statusLabel = article.status === 'unread'
      ? 'New'
      : article.status === 'reading'
        ? 'In Progress'
        : 'Completed'

    return (
      <article>
        <h3>{article.title}</h3>
        <span>{statusLabel}</span>
      </article>
    )
  },
}))

describe('ArticleList', () => {
  it('combines unread and reading into one section while keeping card statuses', () => {
    render(
      <ArticleList
        initialArticles={[
          {
            id: '1',
            title: 'Unread article',
            source_url: 'https://example.com/1',
            original_english: 'Unread preview',
            status: 'unread',
            created_at: new Date('2026-03-01T00:00:00.000Z').toISOString(),
            total_score: 0,
            topik_level_at_time: 2,
            word_quiz_score: 0,
            comprehension_score: 0,
          },
          {
            id: '2',
            title: 'Reading article',
            source_url: 'https://example.com/2',
            original_english: 'Reading preview',
            status: 'reading',
            created_at: new Date('2026-03-01T00:00:00.000Z').toISOString(),
            total_score: 0,
            topik_level_at_time: 2,
            word_quiz_score: 0,
            comprehension_score: 0,
          },
          {
            id: '3',
            title: 'Completed article',
            source_url: 'https://example.com/3',
            original_english: 'Completed preview',
            status: 'completed',
            created_at: new Date('2026-03-01T00:00:00.000Z').toISOString(),
            total_score: 6,
            topik_level_at_time: 2,
            word_quiz_score: 3,
            comprehension_score: 3,
          },
        ]}
      />
    )

    expect(screen.getByRole('heading', { name: 'New & In Progress' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'New' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'In Progress' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Completed' })).toBeInTheDocument()

    expect(screen.getByText('Unread article')).toBeInTheDocument()
    expect(screen.getByText('Reading article')).toBeInTheDocument()
    expect(screen.getAllByText('New')).toHaveLength(1)
    expect(screen.getAllByText('In Progress')).toHaveLength(1)
  })
})
