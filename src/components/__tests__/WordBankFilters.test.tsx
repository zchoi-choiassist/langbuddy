import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WordBankFilters } from '@/components/WordBankFilters'

const words = [
  {
    word_id: 1,
    korean: '경제',
    english: 'economy',
    romanization: 'gyeongje',
    mastery: 25,
    topik_level: 2,
    times_seen: 8,
    times_correct: 5,
  },
  {
    word_id: 2,
    korean: '가족',
    english: 'family',
    romanization: 'gajok',
    mastery: 100,
    topik_level: 1,
    times_seen: 12,
    times_correct: 12,
  },
]

describe('WordBankFilters', () => {
  it('opens and closes word detail modal', () => {
    render(<WordBankFilters words={words} />)

    fireEvent.click(screen.getByRole('button', { name: /경제/ }))
    expect(screen.getByText('Example')).toBeInTheDocument()
    expect(screen.getByText('TOPIK 2 · Seen 8 · Correct 5')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Continue reading' }))
    expect(screen.queryByText('Example')).not.toBeInTheDocument()
  })
})
