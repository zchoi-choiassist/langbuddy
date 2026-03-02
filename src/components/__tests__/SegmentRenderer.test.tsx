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

  it('applies orange color for words above user topik level', () => {
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map([[42, 0]])}
        userTopikLevel={1}
        onWordTap={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', { name: '경제' })
    expect(btn).toHaveAttribute('data-color', 'orange')
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

  it('applies indigo color for mastery 100 even above user level', () => {
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map([[42, 100]])}
        userTopikLevel={1}
        onWordTap={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: '경제' })).toHaveAttribute('data-color', 'indigo')
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

  describe('text word tapping', () => {
    it('splits text segments into tappable Korean words when onTextWordTap is provided', () => {
      const textSegments: Segment[] = [
        { type: 'text', text: '한국의 경제는' },
      ]
      render(
        <SegmentRenderer
          segments={textSegments}
          masteryMap={new Map()}
          userTopikLevel={2}
          onWordTap={vi.fn()}
          onTextWordTap={vi.fn()}
        />
      )
      // Each Korean word should be a separate tappable button
      expect(screen.getByRole('button', { name: '한국의' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '경제는' })).toBeInTheDocument()
    })

    it('calls onTextWordTap with the Korean word when tapped', () => {
      const onTextWordTap = vi.fn()
      const textSegments: Segment[] = [
        { type: 'text', text: '한국의 경제는' },
      ]
      render(
        <SegmentRenderer
          segments={textSegments}
          masteryMap={new Map()}
          userTopikLevel={2}
          onWordTap={vi.fn()}
          onTextWordTap={onTextWordTap}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: '한국의' }))
      expect(onTextWordTap).toHaveBeenCalledWith('한국의')
    })

    it('does not make punctuation-only tokens tappable', () => {
      const textSegments: Segment[] = [
        { type: 'text', text: '... !' },
      ]
      render(
        <SegmentRenderer
          segments={textSegments}
          masteryMap={new Map()}
          userTopikLevel={2}
          onWordTap={vi.fn()}
          onTextWordTap={vi.fn()}
        />
      )
      expect(screen.queryAllByRole('button')).toHaveLength(0)
    })

    it('still renders text as plain span when onTextWordTap is not provided', () => {
      const textSegments: Segment[] = [
        { type: 'text', text: '한국의 경제는' },
      ]
      render(
        <SegmentRenderer
          segments={textSegments}
          masteryMap={new Map()}
          userTopikLevel={2}
          onWordTap={vi.fn()}
        />
      )
      // No buttons for text segments
      expect(screen.queryAllByRole('button')).toHaveLength(0)
      expect(screen.getByText('한국의 경제는')).toBeInTheDocument()
    })

    it('still renders word segments as colored buttons when onTextWordTap is provided', () => {
      render(
        <SegmentRenderer
          segments={segments}
          masteryMap={new Map()}
          userTopikLevel={2}
          onWordTap={vi.fn()}
          onTextWordTap={vi.fn()}
        />
      )
      const wordBtn = screen.getByRole('button', { name: '경제' })
      expect(wordBtn).toHaveAttribute('data-color', 'gray')
    })
  })

  describe('media segments', () => {
    it('renders inline image segments with lazy loading and caption', () => {
      const withMedia: Segment[] = [
        { type: 'text', text: '문단 1' },
        {
          type: 'media',
          kind: 'image',
          src: 'https://images.example.com/one.jpg',
          alt: 'Inline photo',
          caption: 'Photo caption',
        },
      ]

      render(
        <SegmentRenderer
          segments={withMedia}
          masteryMap={new Map()}
          userTopikLevel={2}
        />
      )

      const image = screen.getByRole('img', { name: 'Inline photo' })
      expect(image).toHaveAttribute('loading', 'lazy')
      expect(image).toHaveAttribute('src', 'https://images.example.com/one.jpg')
      expect(screen.getByText('Photo caption')).toBeInTheDocument()
    })

    it('shows image placeholder when media fails to load', () => {
      const withMedia: Segment[] = [
        {
          type: 'media',
          kind: 'image',
          src: 'https://images.example.com/broken.jpg',
          alt: null,
          caption: null,
        },
      ]

      render(
        <SegmentRenderer
          segments={withMedia}
          masteryMap={new Map()}
          userTopikLevel={2}
        />
      )

      fireEvent.error(document.querySelector('img') as HTMLImageElement)
      expect(screen.getByText('Image unavailable')).toBeInTheDocument()
    })
  })
})
