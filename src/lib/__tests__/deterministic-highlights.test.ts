import { describe, expect, it } from 'vitest'
import type { Segment } from '@/lib/types'
import { applyDeterministicTopikHighlights } from '@/lib/deterministic-highlights'

describe('applyDeterministicTopikHighlights', () => {
  it('converts token matches into canonical word segments', () => {
    const input: Segment[] = [
      { type: 'text', text: '경제를 배우고 ' },
      { type: 'word', text: '가족과', wordId: 999, topikLevel: 6 },
      { type: 'text', text: ' 이야기했다.' },
      { type: 'break' },
      { type: 'text', text: '미국은 중요하다.' },
    ]

    const highlighted = applyDeterministicTopikHighlights(input, {
      '경제': { wordId: 10, topikLevel: 2 },
      '가족': { wordId: 11, topikLevel: 1 },
      '이야기': { wordId: 12, topikLevel: 3 },
      '미국': { wordId: 13, topikLevel: 2 },
    })

    expect(highlighted).toEqual([
      { type: 'word', text: '경제를', wordId: 10, topikLevel: 2 },
      { type: 'text', text: ' 배우고 ' },
      { type: 'word', text: '가족과', wordId: 11, topikLevel: 1 },
      { type: 'text', text: ' ' },
      { type: 'word', text: '이야기했다', wordId: 12, topikLevel: 3 },
      { type: 'text', text: '.' },
      { type: 'break' },
      { type: 'word', text: '미국은', wordId: 13, topikLevel: 2 },
      { type: 'text', text: ' 중요하다.' },
    ])
  })
})
