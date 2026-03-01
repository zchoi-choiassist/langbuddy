import { describe, expect, it } from 'vitest'
import { analyzeVocabulary } from '@/lib/vocabulary-analyzer'

describe('analyzeVocabulary', () => {
  it('matches exact and derived forms deterministically', () => {
    const results = analyzeVocabulary({
      text: '경제를 배우고 가족과 이야기했다. 경제는 중요하다.',
      topikWords: [
        { id: 10, korean: '경제' },
        { id: 11, korean: '가족' },
      ],
      customWords: [
        { id: 99, korean: '이야기' },
      ],
    })

    expect(results).toEqual([
      {
        source: 'topik',
        wordId: 10,
        surfaceForm: '경제를',
        normalizedForm: '경제를',
        baseForm: '경제',
        matchConfidence: 'derived',
      },
      {
        source: 'topik',
        wordId: 11,
        surfaceForm: '가족과',
        normalizedForm: '가족과',
        baseForm: '가족',
        matchConfidence: 'derived',
      },
      {
        source: 'custom',
        wordId: 99,
        surfaceForm: '이야기했다',
        normalizedForm: '이야기했다',
        baseForm: '이야기',
        matchConfidence: 'derived',
      },
    ])
  })

  it('prefers exact match confidence when surface form equals base word', () => {
    const results = analyzeVocabulary({
      text: '경제 성장',
      topikWords: [{ id: 10, korean: '경제' }],
      customWords: [],
    })

    expect(results[0]).toEqual({
      source: 'topik',
      wordId: 10,
      surfaceForm: '경제',
      normalizedForm: '경제',
      baseForm: '경제',
      matchConfidence: 'exact',
    })
  })
})
