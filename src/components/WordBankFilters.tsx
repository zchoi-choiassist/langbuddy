'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TOPIK_LEVELS } from '@/lib/constants'

interface WordBankItem {
  id: number
  korean: string
  english: string | null
  romanization: string | null
  mastery: number
  topik_level: number
}

interface WordBankResponse {
  items: WordBankItem[]
  nextCursor: string | null
}

const FILTERS = [
  { key: 'all', label: 'All' },
  ...TOPIK_LEVELS.map(level => ({ key: `topik${level}`, label: `TOPIK ${level}` })),
] as const

type FilterKey = typeof FILTERS[number]['key']

function fallbackExample(word: WordBankItem) {
  return {
    korean: <>한국 <strong>{word.korean}</strong>를 자주 사용해요.</>,
    english: `I use the word "${word.english ?? word.korean}" often in Korean.`,
  }
}

async function fetchWordBankPage({
  topikLevel,
  cursor,
}: {
  topikLevel: number | null
  cursor: string | null
}): Promise<WordBankResponse> {
  const params = new URLSearchParams()
  params.set('limit', '40')
  if (topikLevel !== null) params.set('topikLevel', String(topikLevel))
  if (cursor) params.set('cursor', cursor)

  const res = await fetch(`/api/wordbank?${params.toString()}`)
  if (!res.ok) {
    throw new Error('Failed to load word bank')
  }
  return res.json()
}

export function WordBankFilters() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selectedWord, setSelectedWord] = useState<WordBankItem | null>(null)
  const [items, setItems] = useState<WordBankItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isPaging, setIsPaging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const topikLevel = useMemo(() => {
    const match = filter.match(/^topik(\d)$/)
    return match ? Number(match[1]) : null
  }, [filter])

  const loadFirstPage = useCallback(async () => {
    setIsInitialLoading(true)
    setError(null)
    try {
      const data = await fetchWordBankPage({ topikLevel, cursor: null })
      setItems(data.items)
      setNextCursor(data.nextCursor)
    } catch {
      setItems([])
      setNextCursor(null)
      setError('Unable to load words right now.')
    } finally {
      setIsInitialLoading(false)
    }
  }, [topikLevel])

  const loadNextPage = useCallback(async () => {
    if (isPaging || !nextCursor) return

    setIsPaging(true)
    try {
      const data = await fetchWordBankPage({ topikLevel, cursor: nextCursor })
      setItems(current => {
        const byId = new Map(current.map(word => [word.id, word]))
        for (const item of data.items) {
          byId.set(item.id, item)
        }
        return Array.from(byId.values())
      })
      setNextCursor(data.nextCursor)
    } catch {
      setError('Unable to load more words.')
    } finally {
      setIsPaging(false)
    }
  }, [isPaging, nextCursor, topikLevel])

  useEffect(() => {
    void loadFirstPage()
  }, [loadFirstPage])

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!sentinelRef.current || !nextCursor) return

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        void loadNextPage()
      }
    }, { rootMargin: '240px' })

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadNextPage, nextCursor])

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 rounded-pill border-[1.5px] px-4 py-1.5 text-[13px] font-medium transition-colors ${
              filter === key
                ? 'border-accent-celadon bg-accent-celadon text-white'
                : 'border-border-light bg-bg-surface text-text-secondary hover:border-accent-celadon hover:text-accent-celadon'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="px-5 pb-4 text-sm text-accent-vermillion">{error}</p>
      )}

      {isInitialLoading ? (
        <div className="space-y-2 px-4 pb-8" aria-label="wordbank-loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-button bg-bg-surface shadow-card" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-2 px-4 pb-2">
            {items.map((word, index) => (
              <WordRow key={word.id} word={word} index={index} onClick={() => setSelectedWord(word)} />
            ))}
          </div>

          <div ref={sentinelRef} data-testid="wordbank-sentinel" className="h-12" />

          {isPaging && (
            <p className="pb-8 text-center text-xs font-medium text-text-tertiary">Loading more words…</p>
          )}
        </>
      )}

      {selectedWord && (
        <WordDetailModal word={selectedWord} onClose={() => setSelectedWord(null)} />
      )}
    </>
  )
}

function WordRow({
  word,
  index,
  onClick,
}: {
  word: WordBankItem
  index: number
  onClick: () => void
}) {
  const isHighlighted = word.mastery > 0

  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${index * 40}ms` }}
      data-state={isHighlighted ? 'highlighted' : 'neutral'}
      className={`w-full rounded-button px-[18px] py-4 text-left shadow-card transition-all duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-px hover:shadow-card-hover animate-cardIn ${
        isHighlighted ? 'bg-accent-celadon-light' : 'bg-bg-surface'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-korean-serif text-lg font-semibold text-text-primary">{word.korean}</div>
          <p className="truncate text-[13px] text-text-secondary">{word.english ?? 'No definition yet'}</p>
        </div>
        <div className="h-1 w-12 shrink-0 overflow-hidden rounded bg-bg-subtle">
          <div
            className={`h-full rounded transition-[width] duration-[600ms] ${
              isHighlighted ? 'bg-accent-celadon' : 'bg-border-light'
            }`}
            style={{ width: `${Math.max(word.mastery, 2)}%` }}
          />
        </div>
      </div>
    </button>
  )
}

function WordDetailModal({ word, onClose }: { word: WordBankItem; onClose: () => void }) {
  const example = fallbackExample(word)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-modal bg-bg-surface px-6 pb-9 pt-7 shadow-modal animate-slideUp"
        onClick={event => event.stopPropagation()}
      >
        <div className="mx-auto mb-6 h-1 w-9 rounded bg-border-light" />
        <div className="mb-1 text-center font-korean-serif text-[32px] font-bold text-text-primary">{word.korean}</div>
        <div className="mb-6 text-center text-[15px] text-text-secondary">{word.english ?? 'No definition yet'}</div>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] text-text-secondary">Mastery</span>
          <span className="font-mono text-sm font-semibold text-accent-celadon">{word.mastery}%</span>
        </div>
        <div className="mb-5 h-1.5 w-full overflow-hidden rounded bg-bg-subtle">
          <div className="h-full rounded bg-accent-celadon transition-[width] duration-[600ms]" style={{ width: `${word.mastery}%` }} />
        </div>

        <div className="mb-5 rounded-[14px] bg-bg-subtle p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
            Example
          </div>
          <div className="mb-1 text-[15px] leading-relaxed text-text-primary">{example.korean}</div>
          <div className="text-[13px] text-text-secondary">{example.english}</div>
        </div>

        <div className="mb-4 text-center font-mono text-xs font-semibold text-accent-celadon">
          TOPIK {word.topik_level}
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-button bg-accent-celadon px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#3E8A7B]"
        >
          Done
        </button>
      </div>
    </div>
  )
}
