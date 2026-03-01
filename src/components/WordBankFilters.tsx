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
}

const FILTERS = [
  { key: 'mastery', label: 'By Mastery' },
  { key: 'alpha',   label: 'Dictionary' },
  { key: 'added',   label: 'Added' },
  ...TOPIK_LEVELS.map(l => ({ key: `topik${l}`, label: `TOPIK ${l}` })),
] as const

type FilterKey = typeof FILTERS[number]['key']

export function WordBankFilters({ words }: { words: Word[] }) {
  const [filter, setFilter] = useState<FilterKey>('mastery')

  const filtered = useMemo(() => {
    let result = [...words]
    const topikMatch = filter.match(/^topik(\d)$/)
    if (topikMatch) {
      const level = Number(topikMatch[1])
      result = result.filter(w => w.topik_level === level)
    }
    if (filter === 'alpha') return result.sort((a, b) => a.korean.localeCompare(b.korean, 'ko'))
    if (filter === 'added') return result.sort((a, b) => b.times_seen - a.times_seen)
    return result.sort((a, b) => a.mastery - b.mastery)
  }, [words, filter])

  const active = filtered.filter(w => w.mastery < 100)
  const mastered = filtered.filter(w => w.mastery >= 100)

  return (
    <>
      <div className="flex flex-wrap gap-2 px-4 py-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === key
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <h2 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
        Active — {active.length} words
      </h2>
      <div className="space-y-1 px-4 mb-6">
        {active.map(word => <WordRow key={word.word_id} word={word} />)}
      </div>

      {mastered.length > 0 && (
        <>
          <h2 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Mastered — {mastered.length} words
          </h2>
          <div className="space-y-1 px-4">
            {mastered.map(word => <WordRow key={word.word_id} word={word} mastered />)}
          </div>
        </>
      )}
    </>
  )
}

function WordRow({ word, mastered }: { word: Word; mastered?: boolean }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border border-gray-100">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-gray-900">{word.korean}</span>
          <span className="text-xs text-gray-400">{word.romanization}</span>
        </div>
        <p className="text-sm text-gray-500 truncate">{word.english}</p>
      </div>
      <div className="w-16 shrink-0 text-right">
        {mastered ? (
          <span className="text-xs text-green-600 font-semibold">✓ Done</span>
        ) : (
          <>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${word.mastery}%` }} />
            </div>
            <p className="text-xs text-gray-400">{word.mastery}/100</p>
          </>
        )}
      </div>
    </div>
  )
}
