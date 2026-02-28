import { segmentColor } from '@/lib/mastery'
import type { Segment } from '@/lib/types'
import type { TopikLevel } from '@/lib/constants'

const COLOR_CLASSES: Record<string, string> = {
  orange: 'decoration-orange-400',
  blue:   'decoration-blue-500',
  gray:   'decoration-gray-300',
}

interface SegmentRendererProps {
  segments: Segment[]
  masteryMap: Map<number, number>   // wordId → mastery (0–100)
  userTopikLevel: number
  onWordTap: (wordId: number) => void
}

export function SegmentRenderer({
  segments,
  masteryMap,
  userTopikLevel,
  onWordTap,
}: SegmentRendererProps) {
  return (
    <div className="text-gray-900 leading-loose text-lg">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.text}</span>
        }
        if (seg.type === 'break') {
          return <div key={i} className="mt-4" />
        }
        // type === 'word'
        const mastery = masteryMap.get(seg.wordId) ?? 0
        const color = segmentColor(seg.topikLevel as TopikLevel, userTopikLevel as TopikLevel, mastery)
        return (
          <button
            key={i}
            onClick={() => onWordTap(seg.wordId)}
            className={`underline decoration-2 underline-offset-2 ${COLOR_CLASSES[color]}`}
          >
            {seg.text}
          </button>
        )
      })}
    </div>
  )
}
