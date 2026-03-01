import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HomePage from '@/app/page'

type MockArticle = {
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

let mockArticles: MockArticle[] = []

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'user-1' } })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'articles') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: mockArticles }),
            }),
          }),
        }
      }

      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { topik_level: 2 } }),
          }),
        }),
      }
    },
  },
}))

vi.mock('@/components/TopikSelector', () => ({
  TopikSelector: () => <div data-testid="topik-selector" />,
}))

vi.mock('@/components/ArticleCard', () => ({
  ArticleCard: () => <div data-testid="article-card" />,
}))

vi.mock('@/components/AddArticleFab', () => ({
  AddArticleFab: () => <div data-testid="add-article-fab" />,
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

describe('HomePage', () => {
  it('renders AddArticleFab in main content', async () => {
    mockArticles = []
    const page = await HomePage()
    render(page)

    expect(screen.getByTestId('add-article-fab')).toBeInTheDocument()
  })

  it('renders an article card for unread articles', async () => {
    mockArticles = [{
      id: 'article-1',
      title: 'Queued article',
      source_url: 'https://example.com/story',
      original_english: 'placeholder',
      status: 'unread',
      created_at: new Date().toISOString(),
      total_score: 0,
      topik_level_at_time: 2,
      word_quiz_score: 0,
      comprehension_score: 0,
    }]

    const page = await HomePage()
    render(page)

    expect(screen.getByTestId('article-card')).toBeInTheDocument()
  })
})
