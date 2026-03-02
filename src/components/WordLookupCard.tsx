'use client'

import { useCallback, useEffect, useState } from 'react'

interface WordLookupCardProps {
  korean: string
  onClose: () => void
}

interface LookupResult {
  korean: string
  english: string
  romanization: string
  topikLevel: number
}

type SaveState = 'idle' | 'saving' | 'saved' | 'conflict'

export function WordLookupCard({ korean, onClose }: WordLookupCardProps) {
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const fetchDefinition = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/words/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ korean }),
      })
      if (!res.ok) {
        throw new Error('Lookup failed')
      }
      const data: LookupResult = await res.json()
      setResult(data)
    } catch {
      setError('Could not look up this word. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [korean])

  useEffect(() => {
    void fetchDefinition()
  }, [fetchDefinition])

  async function handleAddToWordBank() {
    if (!result || saveState !== 'idle') return
    setSaveState('saving')
    try {
      const res = await fetch('/api/words/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          korean: result.korean,
          english: result.english,
          romanization: result.romanization,
          topikLevel: result.topikLevel,
        }),
      })
      if (res.status === 409) {
        setSaveState('conflict')
        return
      }
      if (!res.ok) {
        throw new Error('Save failed')
      }
      setSaveState('saved')
    } catch {
      setSaveState('idle')
    }
  }

  const isSaved = saveState === 'saved' || saveState === 'conflict'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-modal bg-bg-surface px-6 pb-9 pt-7 shadow-modal animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal handle */}
        <div className="mx-auto mb-6 h-1 w-9 rounded bg-border-light" />

        {/* Korean word display */}
        <div className="mb-6 text-center">
          <p className="font-korean-serif text-[36px] font-bold text-text-primary">{korean}</p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="mb-6 space-y-3">
            <div className="mx-auto h-5 w-40 animate-pulse rounded bg-bg-subtle" />
            <div className="mx-auto h-4 w-28 animate-pulse rounded bg-bg-subtle" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="mb-6 text-center">
            <p className="mb-3 text-sm text-accent-vermillion">{error}</p>
            <button
              onClick={() => void fetchDefinition()}
              className="rounded-button border-[1.5px] border-accent-celadon px-5 py-2 text-sm font-medium text-accent-celadon transition-colors hover:bg-accent-celadon-light"
            >
              Retry
            </button>
          </div>
        )}

        {/* Definition result */}
        {result && !loading && !error && (
          <div className="mb-6 text-center">
            <p className="text-lg font-medium text-text-primary">{result.english}</p>
            <p className="mt-1 text-sm text-text-tertiary">{result.romanization}</p>
            <p className="mt-2 font-mono text-xs font-semibold text-accent-celadon">TOPIK {result.topikLevel}</p>
          </div>
        )}

        {/* Add to Word Bank button */}
        {result && !loading && !error && (
          <button
            onClick={() => void handleAddToWordBank()}
            disabled={isSaved || saveState === 'saving'}
            className={`w-full rounded-button px-4 py-3.5 text-[15px] font-semibold transition-all ${
              isSaved
                ? 'bg-accent-celadon-light text-[#1C6B5E] cursor-default'
                : saveState === 'saving'
                  ? 'bg-accent-celadon/70 text-white cursor-wait'
                  : 'bg-accent-celadon text-white hover:bg-[#3E8A7B] active:scale-[0.98]'
            }`}
          >
            {isSaved ? 'Added to Word Bank' : saveState === 'saving' ? 'Adding...' : 'Add to Word Bank'}
          </button>
        )}

        {/* Close button (always available) */}
        {(loading || error || isSaved) && (
          <button
            onClick={onClose}
            className={`w-full rounded-button px-4 py-3.5 text-[15px] font-semibold text-text-secondary transition-colors hover:bg-bg-subtle ${
              loading || error ? '' : 'mt-3'
            }`}
          >
            {isSaved ? 'Continue reading' : 'Close'}
          </button>
        )}
      </div>
    </div>
  )
}
