import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ComprehensionQuiz } from '@/components/ComprehensionQuiz'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

describe('ComprehensionQuiz', () => {
  beforeEach(() => {
    push.mockReset()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })

  it('shows feedback state before submitting final answer', async () => {
    render(
      <ComprehensionQuiz
        articleId="article-1"
        questions={[
          {
            id: 'q1',
            question: '질문',
            options: ['A', 'B', 'C', 'D'],
            correct: 1,
          },
        ]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'A' }))

    expect(screen.getByText('틀렸어요.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'See Results →' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(push).toHaveBeenCalledWith('/articles/article-1/summary')
    })
  })
})
