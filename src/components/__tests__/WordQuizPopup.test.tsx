import { render, screen, fireEvent } from '@testing-library/react'
import { WordQuizPopup } from '@/components/WordQuizPopup'
import { describe, it, expect, vi } from 'vitest'

const word = {
  wordId: 42,
  korean: '경제',
  english: 'economy',
  romanization: 'gyeongje',
  distractors: ['society', 'culture', 'education'] as [string, string, string],
}

describe('WordQuizPopup', () => {
  it('shows the Korean word', () => {
    render(<WordQuizPopup word={word} onAnswer={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('경제')).toBeInTheDocument()
  })

  it('shows 4 answer choices', () => {
    render(<WordQuizPopup word={word} onAnswer={vi.fn()} onClose={vi.fn()} />)
    const choices = screen.getAllByRole('button').filter(b => !b.textContent?.includes('×'))
    expect(choices).toHaveLength(4)
  })

  it('calls onAnswer(true) when correct choice selected', () => {
    const onAnswer = vi.fn()
    render(<WordQuizPopup word={word} onAnswer={onAnswer} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('economy'))
    expect(onAnswer).toHaveBeenCalledWith(true)
  })

  it('calls onAnswer(false) when wrong choice selected', () => {
    const onAnswer = vi.fn()
    render(<WordQuizPopup word={word} onAnswer={onAnswer} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('society'))
    expect(onAnswer).toHaveBeenCalledWith(false)
  })
})
