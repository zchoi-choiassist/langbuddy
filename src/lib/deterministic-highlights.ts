import type { Segment } from '@/lib/types'
import type { TopikLevel } from '@/lib/constants'
import { deriveBaseCandidates, normalizeKoreanToken } from '@/lib/vocabulary-analyzer'

interface CanonicalTopikWord {
  wordId: number
  topikLevel: TopikLevel
}

type CanonicalLookup = Record<string, CanonicalTopikWord>

function splitKoreanTokens(text: string): string[] {
  return text.split(/([가-힣]+)/g).filter(Boolean)
}

function resolveTopikWord(token: string, lookup: CanonicalLookup): CanonicalTopikWord | null {
  const normalized = normalizeKoreanToken(token)
  const candidates = deriveBaseCandidates(normalized)

  for (const candidate of candidates) {
    const match = lookup[candidate]
    if (match) return match
  }

  return null
}

function mapTextChunkToSegments(text: string, lookup: CanonicalLookup): Segment[] {
  const parts: Segment[] = []

  for (const chunk of splitKoreanTokens(text)) {
    if (/^[가-힣]+$/.test(chunk)) {
      const match = resolveTopikWord(chunk, lookup)
      if (match) {
        parts.push({
          type: 'word',
          text: chunk,
          wordId: match.wordId,
          topikLevel: match.topikLevel,
        })
        continue
      }
    }

    parts.push({ type: 'text', text: chunk })
  }

  return parts
}

function mergeTextSegments(segments: Segment[]): Segment[] {
  const merged: Segment[] = []

  for (const segment of segments) {
    const previous = merged[merged.length - 1]
    if (segment.type === 'text' && previous?.type === 'text') {
      previous.text += segment.text
      continue
    }
    merged.push(segment)
  }

  return merged
}

export function applyDeterministicTopikHighlights(
  segments: Segment[],
  canonicalLookup: CanonicalLookup
): Segment[] {
  const expanded: Segment[] = []

  for (const segment of segments) {
    if (segment.type === 'break') {
      expanded.push(segment)
      continue
    }

    expanded.push(...mapTextChunkToSegments(segment.text, canonicalLookup))
  }

  return mergeTextSegments(expanded)
}
