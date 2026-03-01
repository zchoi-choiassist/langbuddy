import { MASTERY_MIN, MASTERY_MAX, TopikLevel } from './constants'

export function updateMastery(current: number, correct: boolean): number {
  const next = correct ? current + 1 : current - 1
  return Math.max(MASTERY_MIN, Math.min(MASTERY_MAX, next))
}

export type SegmentColor = 'blue' | 'gray'

// Determines highlight color for a word segment:
// - gray: mastery is 0 (unseen)
// - blue: mastery is above 0 (encountered)
export function segmentColor(
  _wordTopikLevel: TopikLevel,
  _userTopikLevel: TopikLevel,
  mastery: number
): SegmentColor {
  return mastery > 0 ? 'blue' : 'gray'
}
