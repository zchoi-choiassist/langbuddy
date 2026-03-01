'use client'

import { useState, useMemo } from 'react'
import { TOPIK_LEVELS } from '@/lib/constants'

interface Word {
  word_id: number
  korean: string
  english: string
  romanization: string
  mastery: number
  topik_level: number
  times_seen: number
  times_correct: number
}

const FILTERS = [
  { key: 'mastery', label: 'Mastery' },
  { key: 'alpha', label: 'A-Z' },
  { key: 'added', label: 'Added' },
  ...TOPIK_LEVELS.map(level => ({ key: `topik${level}`, label: `TOPIK ${level}` })),
] as const

type FilterKey = typeof FILTERS[number]['key']

function fallbackExample(word: Word) {
  return {
    korean: <>한국 <strong>{word.korean}</strong>를 자주 사용해요.</>,
    english: `I use the word "${word.english}" often in Korean.`,
  }
}

export function WordBankFilters({ words }: { words: Word[] }) {
  const [filter, setFilter] = useState<FilterKey>('mastery')
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)

  const filtered = useMemo(() => {
    let result = [...words]
    const topikMatch = filter.match(/^topik(\d)$/)
    if (topikMatch) {
      const level = Number(topikMatch[1])
      result = result.filter(word => word.topik_level === level)
    }
    if (filter === 'alpha') return result.sort((a, b) => a.korean.localeCompare(b.korean, 'ko'))
    if (filter === 'added') return result.sort((a, b) => b.times_seen - a.times_seen)
    return result.sort((a, b) => a.mastery - b.mastery)
  }, [words, filter])

  const active = filtered.filter(word => word.mastery < 100)
  const mastered = filtered.filter(word => word.mastery >= 100)

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

      <h2 className="px-5 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
        Active · {active.length} words
      </h2>
      <div className="space-y-2 px-4 pb-5">
        {active.map((word, index) => (
          <WordRow key={word.word_id} word={word} index={index} onClick={() => setSelectedWord(word)} />
        ))}
      </div>

      {mastered.length > 0 && (
        <>
          <h2 className="px-5 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
            Mastered · {mastered.length} words
          </h2>
          <div className="space-y-2 px-4 pb-8">
            {mastered.map((word, index) => (
              <WordRow key={word.word_id} word={word} index={index} mastered onClick={() => setSelectedWord(word)} />
            ))}
          </div>
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
  mastered,
  index,
  onClick,
}: {
  word: Word
  mastered?: boolean
  index: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${index * 40}ms` }}
      className={`w-full rounded-button bg-bg-surface px-[18px] py-4 text-left shadow-card transition-all duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-px hover:shadow-card-hover animate-cardIn ${
        mastered ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-korean-serif text-lg font-semibold text-text-primary">{word.korean}</div>
          <p className="truncate text-[13px] text-text-secondary">{word.english}</p>
        </div>
        <div className="h-1 w-12 shrink-0 overflow-hidden rounded bg-bg-subtle">
          <div className="h-full rounded bg-accent-celadon transition-[width] duration-[600ms]" style={{ width: `${word.mastery}%` }} />
        </div>
      </div>
    </button>
  )
}

function WordDetailModal({ word, onClose }: { word: Word; onClose: () => void }) {
  const example = fallbackExample(word)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-modal bg-bg-surface px-6 pb-9 pt-7 shadow-modal animate-slideUp"
        onClick={event => event.stopPropagation()}
      >
        <div className="mx-auto mb-6 h-1 w-9 rounded bg-border-light" />
        <div className="mb-1 text-center font-korean-serif text-[32px] font-bold text-text-primary">{word.korean}</div>
        <div className="mb-6 text-center text-[15px] text-text-secondary">{word.english}</div>

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
          TOPIK {word.topik_level} · Seen {word.times_seen} · Correct {word.times_correct}
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-button bg-accent-celadon px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#3E8A7B]"
        >
          Continue reading
        </button>
      </div>
    </div>
  )
}
