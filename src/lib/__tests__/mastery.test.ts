import { describe, it, expect } from 'vitest'
import { updateMastery, segmentColor } from '@/lib/mastery'

describe('updateMastery', () => {
  it('increments on correct answer', () => {
    expect(updateMastery(50, true)).toBe(51)
  })
  it('decrements on wrong answer', () => {
    expect(updateMastery(50, false)).toBe(49)
  })
  it('floors at 0', () => {
    expect(updateMastery(0, false)).toBe(0)
  })
  it('caps at 100', () => {
    expect(updateMastery(100, true)).toBe(100)
  })
  it('graduated word wrong answer drops to 99', () => {
    expect(updateMastery(100, false)).toBe(99)
  })
})

describe('segmentColor', () => {
  it('returns gray for unseen words', () => {
    expect(segmentColor(3, 2, 0)).toBe('gray')
  })
  it('returns blue for encountered words', () => {
    expect(segmentColor(2, 2, 1)).toBe('blue')
  })
  it('ignores topik level when computing color', () => {
    expect(segmentColor(1, 6, 0)).toBe('gray')
    expect(segmentColor(6, 1, 5)).toBe('blue')
  })
})
