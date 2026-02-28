import { describe, it, expect } from 'vitest'
import { calculateQuizScore, calculateTotalScore } from '@/lib/scoring'

describe('calculateQuizScore', () => {
  it('returns positive for all correct', () => {
    expect(calculateQuizScore(3, 0)).toBe(3)
  })
  it('returns net negative for mostly wrong', () => {
    expect(calculateQuizScore(1, 4)).toBe(-3)
  })
  it('returns 0 for no answers', () => {
    expect(calculateQuizScore(0, 0)).toBe(0)
  })
})

describe('calculateTotalScore', () => {
  it('sums word and comprehension scores', () => {
    expect(calculateTotalScore(5, 2)).toBe(7)
  })
  it('handles negative scores', () => {
    expect(calculateTotalScore(-2, 1)).toBe(-1)
  })
})
