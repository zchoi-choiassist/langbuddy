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
  it('returns orange for words above user level', () => {
    expect(segmentColor(3, 2, 50)).toBe('orange')
  })
  it('returns blue for same-level low mastery', () => {
    expect(segmentColor(2, 2, 60)).toBe('blue')
  })
  it('returns gray for same-level high mastery', () => {
    expect(segmentColor(2, 2, 70)).toBe('gray')
  })
  it('returns blue for lower-level low mastery', () => {
    expect(segmentColor(1, 2, 30)).toBe('blue')
  })
})
