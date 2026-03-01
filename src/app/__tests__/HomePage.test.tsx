import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HomePage from '@/app/page'

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
              order: async () => ({ data: [] }),
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
    const page = await HomePage()
    render(page)

    expect(screen.getByTestId('add-article-fab')).toBeInTheDocument()
  })
})
