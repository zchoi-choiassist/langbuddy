'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 60
const MAX_PULL = 100

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)

  const isAtTop = useCallback(() => {
    return window.scrollY <= 0
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return
      if (isAtTop()) {
        touchStartY.current = e.touches[0].clientY
        isPulling.current = true
      }
    },
    [refreshing, isAtTop]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || refreshing) return
      if (!isAtTop()) {
        isPulling.current = false
        setPullDistance(0)
        return
      }

      const deltaY = e.touches[0].clientY - touchStartY.current
      if (deltaY > 0) {
        // Apply diminishing resistance as pull increases
        const distance = Math.min(deltaY * 0.45, MAX_PULL)
        setPullDistance(distance)
      }
    },
    [refreshing, isAtTop]
  )

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current || refreshing) return
    isPulling.current = false

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true)
      setPullDistance(THRESHOLD * 0.6) // Settle to a smaller position while refreshing
      router.refresh()
      // Give the refresh a moment to propagate, then reset
      setTimeout(() => {
        setRefreshing(false)
        setPullDistance(0)
      }, 800)
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, refreshing, router])

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const showIndicator = pullDistance > 4 || refreshing

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{
          height: showIndicator ? `${Math.max(pullDistance, refreshing ? 36 : 0)}px` : '0px',
          transitionTimingFunction: isPulling.current ? 'linear' : 'var(--ease-out)',
          transitionDuration: isPulling.current ? '0ms' : '200ms',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            opacity: progress,
            transform: `scale(${0.5 + progress * 0.5})`,
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            className="text-accent-celadon"
            style={{
              transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
              transition: 'transform 0ms',
            }}
          >
            {refreshing ? (
              // Spinning animation during refresh
              <g>
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="42 14"
                  opacity="0.9"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="0.7s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            ) : (
              // Static arc that fills as you pull
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${progress * 56.5} 56.5`}
                opacity="0.85"
              />
            )}
          </svg>
        </div>
      </div>
      {children}
    </div>
  )
}
