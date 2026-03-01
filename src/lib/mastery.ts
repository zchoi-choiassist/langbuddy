import { MASTERY_MIN, MASTERY_MAX, TopikLevel } from './constants'

export function updateMastery(current: number, correct: boolean): number {
  const next = correct ? current + 1 : current - 1
  return Math.max(MASTERY_MIN, Math.min(MASTERY_MAX, next))
}

export type SegmentColor = 'blue' | 'orange' | 'gray' | 'indigo'

// Determines highlight color for a word segment:
// - gray: mastery is 0 (unseen)
// - blue: mastery is 1-99 (encountered)
// - indigo: mastery is 100 (mastered)
// - orange: word is above user's TOPIK level (challenge), unless mastered
export function segmentColor(
  wordTopikLevel: TopikLevel,
  userTopikLevel: TopikLevel,
  mastery: number
): SegmentColor {
  if (mastery >= 100) return 'indigo'
  if (wordTopikLevel > userTopikLevel) return 'orange'
  if (mastery > 0) return 'blue'
  return 'gray'
}
