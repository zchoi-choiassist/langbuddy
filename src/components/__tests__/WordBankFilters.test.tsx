import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { WordBankFilters } from '@/components/WordBankFilters'

class MockIntersectionObserver {
  private readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  observe = () => {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }

  disconnect = () => {}
  unobserve = () => {}
  takeRecords = () => []
  root = null
  rootMargin = '0px'
  thresholds = [0]
}

describe('WordBankFilters', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders neutral style for mastery 0 and highlighted style for mastery > 0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      items: [
        {
          id: 'topik:1',
          source: 'topik',
          korean: '경제',
          english: 'economy',
          romanization: 'gyeongje',
          topik_level: 2,
          mastery: 0,
        },
        {
          id: 'topik:2',
          source: 'topik',
          korean: '가족',
          english: 'family',
          romanization: 'gajok',
          topik_level: 1,
          mastery: 10,
        },
      ],
      nextCursor: null,
    }))))

    render(<WordBankFilters />)

    const neutral = await screen.findByRole('button', { name: /경제/i })
    const highlighted = await screen.findByRole('button', { name: /가족/i })

    expect(neutral).toHaveAttribute('data-state', 'neutral')
    expect(highlighted).toHaveAttribute('data-state', 'highlighted')
  })

  it('requests next page when sentinel intersects', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          {
            id: 'topik:1',
            source: 'topik',
            korean: '경제',
            english: 'economy',
            romanization: 'gyeongje',
            topik_level: 2,
            mastery: 0,
          },
        ],
        nextCursor: 'next-page',
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          {
            id: 'topik:2',
            source: 'topik',
            korean: '경험',
            english: 'experience',
            romanization: 'gyeongheom',
            topik_level: 2,
            mastery: 4,
          },
        ],
        nextCursor: null,
      })))

    vi.stubGlobal('fetch', fetchMock)

    render(<WordBankFilters />)

    await screen.findByRole('button', { name: /경제/i })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    expect(await screen.findByRole('button', { name: /경험/i })).toBeInTheDocument()
  })

  it('renders a custom filter pill and requests customOnly mode', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const isCustomOnly = url.includes('customOnly=true')
      return new Response(JSON.stringify({
        items: isCustomOnly
          ? [
              {
                id: 'custom:c-1',
                source: 'custom',
                korean: '어플',
                english: 'app',
                romanization: 'eopeul',
                topik_level: 2,
                mastery: 0,
              },
            ]
          : [],
        nextCursor: null,
      }))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<WordBankFilters />)
    const customButton = await screen.findByRole('button', { name: /custom/i })
    fireEvent.click(customButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('customOnly=true'))
    })
    expect(await screen.findByRole('button', { name: /어플/i })).toBeInTheDocument()
  })
})
