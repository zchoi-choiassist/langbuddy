import { render, screen, fireEvent } from '@testing-library/react'
import { SegmentRenderer } from '@/components/SegmentRenderer'
import { describe, it, expect, vi } from 'vitest'
import type { Segment } from '@/lib/types'

const segments: Segment[] = [
  { type: 'text', text: '한국의 ' },
  { type: 'word', text: '경제', wordId: 42, topikLevel: 2 },
  { type: 'text', text: '가 성장합니다.' },
]

describe('SegmentRenderer', () => {
  it('renders plain text segments', () => {
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map()}
        userTopikLevel={2}
        onWordTap={vi.fn()}
      />
    )
    expect(screen.getByText('한국의 ', { normalizer: (text) => text })).toBeInTheDocument()
  })

  it('renders word segment as a button', () => {
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map()}
        userTopikLevel={2}
        onWordTap={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: '경제' })).toBeInTheDocument()
  })

  it('calls onWordTap with wordId when word is tapped', () => {
    const onWordTap = vi.fn()
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map()}
        userTopikLevel={2}
        onWordTap={onWordTap}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '경제' }))
    expect(onWordTap).toHaveBeenCalledWith(42)
  })

  it('applies neutral gray color for unseen words regardless of topik level', () => {
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map([[42, 0]])}
        userTopikLevel={1}
        onWordTap={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', { name: '경제' })
    expect(btn).toHaveAttribute('data-color', 'gray')
  })

  it('renders break segment as a div spacer', () => {
    const withBreak: Segment[] = [
      { type: 'text', text: 'para 1' },
      { type: 'break' },
      { type: 'text', text: 'para 2' },
    ]
    const { container } = render(
      <SegmentRenderer
        segments={withBreak}
        masteryMap={new Map()}
        userTopikLevel={2}
        onWordTap={vi.fn()}
      />
    )
    expect(container.querySelectorAll('div.h-5').length).toBe(1)
  })

  it('applies blue color when mastery is above 0', () => {
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map([[42, 1]])}
        userTopikLevel={2}
        onWordTap={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: '경제' })).toHaveAttribute('data-color', 'blue')
  })

  it('defaults mastery to 0 when wordId is absent from masteryMap', () => {
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map()}
        userTopikLevel={2}
        onWordTap={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: '경제' })).toHaveAttribute('data-color', 'gray')
  })
})
