import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReadingView } from '@/components/ReadingView'
import type { Article, TopikWord } from '@/lib/types'

const push = vi.fn()
const back = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back }),
}))

function makeArticle(): Article {
  return {
    id: 'article-1',
    user_id: 'user-1',
    source_url: 'https://example.com/story',
    title: 'Sample article',
    adapted_korean: [
      { type: 'text', text: '첫 문단입니다.' },
      {
        type: 'media',
        kind: 'image',
        src: 'https://images.example.com/inline.jpg',
        alt: 'Inline image',
        caption: 'Image caption',
      },
      { type: 'break' },
      { type: 'text', text: '둘째 문단입니다.' },
    ],
    original_english: 'First paragraph.\n\nSecond paragraph.',
    topik_level_at_time: 2,
    status: 'reading',
    word_quiz_score: 0,
    comprehension_score: 0,
    total_score: 0,
    comprehension_questions: [],
    created_at: '2026-03-02T00:00:00.000Z',
    completed_at: null,
  }
}

describe('ReadingView', () => {
  it('shows inline media in both Korean and English modes', () => {
    const wordDetails = new Map<number, TopikWord>()

    render(
      <ReadingView
        article={makeArticle()}
        masteryMap={new Map()}
        wordDetails={wordDetails}
        userTopikLevel={2}
      />
    )

    expect(screen.getByRole('img', { name: 'Inline image' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'EN' }))

    expect(screen.getByText('First paragraph.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Inline image' })).toBeInTheDocument()
  })
})
