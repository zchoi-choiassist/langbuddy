import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseAdaptationResponse, buildUserMessage } from '@/lib/claude'
import type { TopikLevel } from '@/lib/constants'

const VALID_RESPONSE = {
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
}

const MOCK_RESPONSE = JSON.stringify(VALID_RESPONSE)

describe('parseAdaptationResponse', () => {
  it('parses valid JSON response', () => {
    const result = parseAdaptationResponse(MOCK_RESPONSE)
    expect(result.adaptedKorean).toHaveLength(3)
    expect(result.comprehensionQuestions).toHaveLength(3)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseAdaptationResponse('not json')).toThrow('Claude returned invalid JSON')
  })

  it('throws if fewer than 3 comprehension questions', () => {
    const bad = JSON.stringify({
      adaptedKorean: [],
      comprehensionQuestions: [{ id: 'q1', question: '?', options: ['a','b','c','d'], correct: 0 }],
    })
    expect(() => parseAdaptationResponse(bad)).toThrow('3 comprehension questions')
  })

  it('handles markdown-wrapped JSON with language tag', () => {
    const wrapped = '```json\n' + MOCK_RESPONSE + '\n```'
    const result = parseAdaptationResponse(wrapped)
    expect(result.adaptedKorean).toHaveLength(3)
    expect(result.comprehensionQuestions).toHaveLength(3)
  })

  it('handles markdown-wrapped JSON without language tag', () => {
    const wrapped = '```\n' + MOCK_RESPONSE + '\n```'
    const result = parseAdaptationResponse(wrapped)
    expect(result.adaptedKorean).toHaveLength(3)
  })

  it('handles leading/trailing whitespace', () => {
    const padded = '  \n\n  ' + MOCK_RESPONSE + '  \n\n  '
    const result = parseAdaptationResponse(padded)
    expect(result.adaptedKorean).toHaveLength(3)
  })

  it('handles BOM character', () => {
    const bommed = '\uFEFF' + MOCK_RESPONSE
    const result = parseAdaptationResponse(bommed)
    expect(result.adaptedKorean).toHaveLength(3)
  })

  it('handles mixed edge cases: BOM + whitespace + markdown fences', () => {
    const messy = '\uFEFF  \n```json\n' + MOCK_RESPONSE + '\n```\n  '
    const result = parseAdaptationResponse(messy)
    expect(result.adaptedKorean).toHaveLength(3)
    expect(result.comprehensionQuestions).toHaveLength(3)
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

  it('includes correct TOPIK level for each level 1-6', () => {
    for (let level = 1; level <= 6; level++) {
      const msg = buildUserMessage('test', level as TopikLevel)
      expect(msg).toContain(`TOPIK ${level}`)
    }
  })

  it('caps challenge level at 6 for TOPIK 6 users', () => {
    const msg = buildUserMessage('test', 6 as TopikLevel)
    // Should contain TOPIK 6 for both base and challenge (not TOPIK 7)
    expect(msg).not.toContain('TOPIK 7')
    expect(msg).toContain('TOPIK 6')
  })
})

// Test adaptArticle with mocked Anthropic client
describe('adaptArticle', () => {
  // Response text as if Claude continued from the '{' prefill
  const continuedResponse = MOCK_RESPONSE.slice(1) // everything after the leading '{'

  beforeEach(() => {
    vi.resetModules()
  })

  it('uses assistant prefill, max_tokens 8192, and parses response', async () => {
    const createMock = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: continuedResponse }],
    })

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = { create: createMock }
      },
    }))

    const { adaptArticle } = await import('@/lib/claude')
    const result = await adaptArticle('Test Title', 'Test content', 2 as TopikLevel)

    expect(result.adaptedKorean).toHaveLength(3)
    expect(result.comprehensionQuestions).toHaveLength(3)

    // Verify API call parameters
    const callArgs = createMock.mock.calls[0][0]
    expect(callArgs.max_tokens).toBe(8192)
    // Verify assistant prefill message
    const assistantMsg = callArgs.messages.find((m: { role: string }) => m.role === 'assistant')
    expect(assistantMsg).toBeDefined()
    expect(assistantMsg.content).toBe('{')
  })

  it('retries once on JSON parse failure then succeeds', async () => {
    let callCount = 0
    const createMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          content: [{ type: 'text', text: 'this is not valid json continuation' }],
        })
      }
      return Promise.resolve({
        content: [{ type: 'text', text: continuedResponse }],
      })
    })

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = { create: createMock }
      },
    }))

    const { adaptArticle } = await import('@/lib/claude')
    const result = await adaptArticle('Test Title', 'Test content', 2 as TopikLevel)

    expect(result.adaptedKorean).toHaveLength(3)
    expect(createMock).toHaveBeenCalledTimes(2)
  })

  it('throws after retry exhaustion', async () => {
    const createMock = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'not json at all' }],
    })

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = { create: createMock }
      },
    }))

    const { adaptArticle } = await import('@/lib/claude')
    await expect(adaptArticle('Test Title', 'Test content', 1 as TopikLevel))
      .rejects.toThrow('Claude returned invalid JSON')
    expect(createMock).toHaveBeenCalledTimes(2)
  })
})
