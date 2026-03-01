import { segmentColor } from '@/lib/mastery'
import type { Segment } from '@/lib/types'
import type { TopikLevel } from '@/lib/constants'

const COLOR_CLASSES: Record<string, string> = {
  orange: 'border-[#E2A563] hover:bg-[#FEF3C7]',
  blue: 'border-accent-celadon hover:bg-accent-celadon-light',
  gray: 'border-border-light hover:bg-bg-subtle',
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
    <div className="break-keep font-body text-[17px] leading-[2] text-text-primary">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.text}</span>
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
