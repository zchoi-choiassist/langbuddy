import { MASTERY_MIN, MASTERY_MAX, MASTERY_KNOWN_THRESHOLD } from './constants'

export function updateMastery(current: number, correct: boolean): number {
  const next = correct ? current + 1 : current - 1
  return Math.max(MASTERY_MIN, Math.min(MASTERY_MAX, next))
}

export type SegmentColor = 'blue' | 'orange' | 'gray'

// Determines highlight color for a word segment:
// - orange: word is above the user's current TOPIK level (challenge)
// - blue:   word is at or below user's level AND mastery is low (needs practice)
// - gray:   word is at or below user's level AND mastery is high (known)
export function segmentColor(
  wordTopikLevel: number,
  userTopikLevel: number,
  mastery: number
): SegmentColor {
  if (wordTopikLevel > userTopikLevel) return 'orange'
  return mastery >= MASTERY_KNOWN_THRESHOLD ? 'gray' : 'blue'
}
