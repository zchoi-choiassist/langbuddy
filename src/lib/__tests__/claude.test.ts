import { describe, it, expect } from 'vitest'
import { parseAdaptationResponse, buildUserMessage } from '@/lib/claude'
import type { TopikLevel } from '@/lib/constants'

const MOCK_RESPONSE = JSON.stringify({
  adaptedKorean: [
    { type: 'text', text: '한국에서 ' },
    { type: 'word', text: '경제', wordId: 42, topikLevel: 2 },
    { type: 'text', text: '가 성장하고 있습니다.' },
  ],
  comprehensionQuestions: [
    { id: 'q1', question: '무엇이 성장합니까?', options: ['경제', '인구', '기술', '교육'], correct: 0 },
    { id: 'q2', question: '어느 나라입니까?', options: ['한국', '일본', '중국', '미국'], correct: 0 },
    { id: 'q3', question: '어떻게 되고 있습니까?', options: ['성장', '감소', '정체', '하락'], correct: 0 },
  ],
})

describe('parseAdaptationResponse', () => {
  it('parses valid JSON response', () => {
    const result = parseAdaptationResponse(MOCK_RESPONSE)
    expect(result.adaptedKorean).toHaveLength(3)
    expect(result.comprehensionQuestions).toHaveLength(3)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseAdaptationResponse('not json')).toThrow()
  })

  it('throws if fewer than 3 comprehension questions', () => {
    const bad = JSON.stringify({
      adaptedKorean: [],
      comprehensionQuestions: [{ id: 'q1', question: '?', options: ['a','b','c','d'], correct: 0 }],
    })
    expect(() => parseAdaptationResponse(bad)).toThrow('3 comprehension questions')
  })
})

describe('buildUserMessage', () => {
  it('includes TOPIK level', () => {
    const msg = buildUserMessage('article content', 3 as TopikLevel)
    expect(msg).toContain('TOPIK 3')
  })

  it('includes article content', () => {
    const msg = buildUserMessage('some article text here', 2 as TopikLevel)
    expect(msg).toContain('some article text here')
  })
})
