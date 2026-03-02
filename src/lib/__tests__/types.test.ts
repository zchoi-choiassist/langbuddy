import { describe, expect, it } from 'vitest'
import type { ArticleWordMatch, Segment } from '@/lib/types'

describe('ArticleWordMatch type shape', () => {
  it('accepts topik match rows', () => {
    const row: ArticleWordMatch = {
      id: 1,
      article_id: '00000000-0000-0000-0000-000000000001',
      user_id: 'user-1',
      source: 'topik',
      topik_word_id: 42,
      custom_word_id: null,
      surface_form: '경제를',
      normalized_form: '경제를',
      base_form: '경제',
      match_confidence: 'derived',
      created_at: '2026-03-01T00:00:00.000Z',
    }

    expect(row.source).toBe('topik')
  })
})

describe('Segment type shape', () => {
  it('accepts media image segments', () => {
    const mediaSegment: Segment = {
      type: 'media',
      kind: 'image',
      src: 'https://example.com/image.jpg',
      alt: 'Example image',
      caption: 'Example caption',
      width: 1200,
      height: 675,
    }

    expect(mediaSegment.type).toBe('media')
  })
})
