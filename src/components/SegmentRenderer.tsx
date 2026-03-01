import { segmentColor } from '@/lib/mastery'
import type { Segment } from '@/lib/types'
import type { TopikLevel } from '@/lib/constants'

const COLOR_CLASSES: Record<string, string> = {
  orange: 'border-[#E2A563] hover:bg-[#FEF3C7]',
  blue: 'border-accent-celadon hover:bg-accent-celadon-light',
  gray: 'border-border-light hover:bg-bg-subtle',
  indigo: 'border-accent-indigo hover:bg-bg-subtle',
}

// Matches Korean characters (Hangul syllables, jamo, compatibility jamo)
const KOREAN_WORD_RE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/

/** Split a text segment into tokens: Korean words become tappable, everything else stays plain. */
function splitTextIntoTokens(text: string): { value: string; tappable: boolean }[] {
  const tokens: { value: string; tappable: boolean }[] = []
  // Split on whitespace boundaries but keep the whitespace
  const parts = text.split(/(\s+)/)
  for (const part of parts) {
    if (!part) continue
    // Whitespace stays as-is
    if (/^\s+$/.test(part)) {
      tokens.push({ value: part, tappable: false })
      continue
    }
    // Check if the part contains Korean characters worth tapping
    // A word is tappable if it contains at least one Korean syllable character
    if (KOREAN_WORD_RE.test(part)) {
      tokens.push({ value: part, tappable: true })
    } else {
      // Pure punctuation or non-Korean text
      tokens.push({ value: part, tappable: false })
    }
  }
  return tokens
}

interface SegmentRendererProps {
  segments: Segment[]
  masteryMap: Map<number, number>   // wordId → mastery (0–100)
  userTopikLevel: number
  onWordTap: (wordId: number) => void
  onTextWordTap?: (korean: string) => void
}

export function SegmentRenderer({
  segments,
  masteryMap,
  userTopikLevel,
  onWordTap,
  onTextWordTap,
}: SegmentRendererProps) {
  return (
    <div className="break-keep font-body text-[17px] leading-[2] text-text-primary">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          if (!onTextWordTap) {
            return <span key={i}>{seg.text}</span>
          }
          const tokens = splitTextIntoTokens(seg.text)
          return (
            <span key={i}>
              {tokens.map((token, j) =>
                token.tappable ? (
                  <button
                    key={j}
                    onClick={() => onTextWordTap(token.value)}
                    className="rounded-[2px] transition-colors duration-100 active:bg-bg-subtle"
                  >
                    {token.value}
                  </button>
                ) : (
                  <span key={j}>{token.value}</span>
                )
              )}
            </span>
          )
        }
        if (seg.type === 'break') {
          return <div key={i} className="h-5" />
        }
        // type === 'word'
        const mastery = masteryMap.get(seg.wordId) ?? 0
        const color = segmentColor(seg.topikLevel as TopikLevel, userTopikLevel as TopikLevel, mastery)
        return (
          <button
            key={i}
            onClick={() => onWordTap(seg.wordId)}
            data-color={color}
            className={`rounded-[2px] border-b-2 pb-px transition-colors duration-150 ${COLOR_CLASSES[color]}`}
          >
            {seg.text}
          </button>
        )
      })}
    </div>
  )
}
