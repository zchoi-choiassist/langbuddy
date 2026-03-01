'use client'

import { useRef, useState, useCallback, type TouchEvent, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArticleCard, type ArticleCardArticle } from '@/components/ArticleCard'

const SWIPE_THRESHOLD_RATIO = 0.40
const MIN_SWIPE_PX = 8

interface SwipeableArticleCardProps {
  article: ArticleCardArticle
  index?: number
  onRequestDelete: (article: ArticleCardArticle) => void
}

export function SwipeableArticleCard({ article, index = 0, onRequestDelete }: SwipeableArticleCardProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)

  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(0)
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null)
  const didSwipe = useRef(false)

  const href = article.status === 'completed' ? `/articles/${article.id}/summary` : `/articles/${article.id}`

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    currentX.current = 0
    directionLocked.current = null
    didSwipe.current = false
    setIsSwiping(true)
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Lock direction on first meaningful movement
    if (!directionLocked.current) {
      if (Math.abs(dx) < MIN_SWIPE_PX && Math.abs(dy) < MIN_SWIPE_PX) return
      directionLocked.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    }

    if (directionLocked.current === 'vertical') return

    // Only allow left swipe (negative dx)
    const clampedDx = Math.min(0, dx)
    if (clampedDx < -MIN_SWIPE_PX) {
      didSwipe.current = true
    }
    currentX.current = clampedDx
    setOffsetX(clampedDx)
  }, [])

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false)

    if (!containerRef.current) {
      setOffsetX(0)
      return
    }

    const containerWidth = containerRef.current.offsetWidth
    const swipeDistance = Math.abs(currentX.current)

    if (swipeDistance > containerWidth * SWIPE_THRESHOLD_RATIO) {
      // Passed threshold — trigger delete confirmation
      setOffsetX(0)
      onRequestDelete(article)
    } else {
      // Snap back
      setOffsetX(0)
    }
  }, [article, onRequestDelete])

  const handleClick = useCallback((e: MouseEvent) => {
    // If user swiped, suppress navigation
    if (didSwipe.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    router.push(href)
  }, [href, router])

  // Calculate the delete zone reveal width (absolute value of offset)
  const revealWidth = Math.abs(offsetX)
  const swipeProgress = containerRef.current
    ? Math.min(1, revealWidth / (containerRef.current.offsetWidth * SWIPE_THRESHOLD_RATIO))
    : 0

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-card"
      style={{
        height: isCollapsing ? 0 : undefined,
        opacity: isCollapsing ? 0 : 1,
        marginBottom: isCollapsing ? 0 : undefined,
        transition: isCollapsing
          ? 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease, margin-bottom 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
          : undefined,
        overflow: 'hidden',
      }}
    >
      {/* Delete zone behind card */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-accent-vermillion"
        style={{
          width: Math.max(revealWidth, 0),
          transition: isSwiping ? 'none' : 'width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        <div
          className="flex items-center gap-2 pr-6"
          style={{
            opacity: swipeProgress,
            transform: `scale(${0.7 + swipeProgress * 0.3})`,
            transition: isSwiping ? 'none' : 'all 0.3s ease',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          <span className="text-[13px] font-semibold text-white whitespace-nowrap">Delete</span>
        </div>
      </div>

      {/* The actual card — slides left */}
      <div
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative cursor-pointer"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          willChange: isSwiping ? 'transform' : 'auto',
        }}
      >
        <ArticleCard article={article} index={index} asDiv />
      </div>
    </div>
  )
}

export { type ArticleCardArticle }
