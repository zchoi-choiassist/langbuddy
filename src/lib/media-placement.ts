import type { ExtractedImage } from '@/lib/extract'
import type { Segment } from '@/lib/types'

function buildMediaSegment(image: ExtractedImage): Extract<Segment, { type: 'media' }> {
  return {
    type: 'media',
    kind: 'image',
    src: image.src,
    alt: image.alt,
    caption: image.caption,
    ...(image.width ? { width: image.width } : {}),
    ...(image.height ? { height: image.height } : {}),
  }
}

function findParagraphInsertIndex(segments: Segment[], paragraphIndex: number): number {
  let currentParagraph = 0
  for (let i = 0; i < segments.length; i += 1) {
    if (segments[i].type === 'break') {
      if (currentParagraph >= paragraphIndex) return i
      currentParagraph += 1
    }
  }
  return segments.length
}

export function injectMediaSegments(segments: Segment[], images: ExtractedImage[]): Segment[] {
  if (images.length === 0) return segments

  const output = [...segments]
  const existingSources = new Set(
    output
      .filter((segment): segment is Extract<Segment, { type: 'media' }> => segment.type === 'media')
      .map(segment => segment.src)
  )

  for (const image of images) {
    if (existingSources.has(image.src)) continue
    const insertAt = findParagraphInsertIndex(output, Math.max(0, image.paragraphIndex))
    output.splice(insertAt, 0, buildMediaSegment(image))
    existingSources.add(image.src)
  }

  return output
}
