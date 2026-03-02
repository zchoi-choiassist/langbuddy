import { describe, expect, it } from 'vitest'

import { normalizeFeedInput } from '@/lib/normalize-feed-url'

describe('normalizeFeedInput', () => {
  it('converts a bare substack handle to a feed URL', () => {
    expect(normalizeFeedInput('platformer')).toBe('https://platformer.substack.com/feed')
  })

  it('normalizes substack host without scheme and appends /feed for root path', () => {
    expect(normalizeFeedInput('platformer.substack.com')).toBe('https://platformer.substack.com/feed')
  })

  it('appends /feed for a full substack root URL', () => {
    expect(normalizeFeedInput('https://platformer.substack.com')).toBe('https://platformer.substack.com/feed')
  })

  it('keeps explicit substack feed URL unchanged', () => {
    expect(normalizeFeedInput('https://platformer.substack.com/feed')).toBe('https://platformer.substack.com/feed')
  })

  it('adds https scheme for regular domains', () => {
    expect(normalizeFeedInput('example.com/rss.xml')).toBe('https://example.com/rss.xml')
  })
})
