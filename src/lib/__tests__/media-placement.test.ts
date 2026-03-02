import { describe, expect, it } from 'vitest'
import type { Segment } from '@/lib/types'
import type { ExtractedImage } from '@/lib/extract'
import { injectMediaSegments } from '@/lib/media-placement'

describe('injectMediaSegments', () => {
  it('inserts media near paragraph boundaries based on paragraph index', () => {
    const segments: Segment[] = [
      { type: 'text', text: 'Para 1 sentence.' },
      { type: 'break' },
      { type: 'text', text: 'Para 2 sentence.' },
    ]

    const images: ExtractedImage[] = [
      { src: 'https://img.example.com/one.jpg', alt: 'one', caption: null, paragraphIndex: 0 },
      { src: 'https://img.example.com/two.jpg', alt: null, caption: 'cap', paragraphIndex: 1 },
    ]

    const merged = injectMediaSegments(segments, images)

    expect(merged.map(seg => seg.type)).toEqual(['text', 'media', 'break', 'text', 'media'])
    const media = merged.filter((seg): seg is Extract<Segment, { type: 'media' }> => seg.type === 'media')
    expect(media[0].src).toBe('https://img.example.com/one.jpg')
    expect(media[1].caption).toBe('cap')
  })

  it('is idempotent when media already exists', () => {
    const segments: Segment[] = [
      { type: 'text', text: 'Para 1 sentence.' },
      {
        type: 'media',
        kind: 'image',
        src: 'https://img.example.com/one.jpg',
        alt: 'one',
        caption: null,
      },
      { type: 'break' },
      { type: 'text', text: 'Para 2 sentence.' },
    ]

    const images: ExtractedImage[] = [
      { src: 'https://img.example.com/one.jpg', alt: 'one', caption: null, paragraphIndex: 0 },
    ]

    const merged = injectMediaSegments(segments, images)
    const mediaCount = merged.filter(seg => seg.type === 'media').length

    expect(mediaCount).toBe(1)
  })
})
