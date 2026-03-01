'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SegmentRenderer } from './SegmentRenderer'
import { WordQuizPopup } from './WordQuizPopup'
import type { Article, TopikWord } from '@/lib/types'

interface ReadingViewProps {
  article: Article
  masteryMap: Map<number, number>
  wordDetails: Map<number, TopikWord>
  userTopikLevel: number
}

function getSourceLabel(url: string): string {
  try {
    const { hostname } = new URL(url)
    return hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function ReadingView({ article, masteryMap, wordDetails, userTopikLevel }: ReadingViewProps) {
  const router = useRouter()
  const [showKorean, setShowKorean] = useState(true)
  const [activeWordId, setActiveWordId] = useState<number | null>(null)
  const [wordQuizScore, setWordQuizScore] = useState(article.word_quiz_score)

  const activeWord = activeWordId !== null ? wordDetails.get(activeWordId) : null

  async function handleQuizAnswer(correct: boolean) {
    if (activeWordId === null) return
    setActiveWordId(null)
    const res = await fetch('/api/words/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: article.id, wordId: activeWordId, correct }),
    })
    if (res.ok) {
      setWordQuizScore(s => s + (correct ? 1 : -1))
    }
  }

  const sourceLine = `${getSourceLabel(article.source_url)} · ${new Date(article.created_at).toLocaleDateString('ko-KR')}`

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-bg-base">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-bg-base px-5 py-3">
        <button onClick={() => router.back()} className="text-sm font-medium text-accent-celadon">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] font-semibold text-accent-celadon">
            {wordQuizScore > 0 ? '+' : ''}
            {wordQuizScore}
          </span>
          <div className="flex items-center gap-0.5 rounded-pill bg-bg-subtle p-1">
            <button
              onClick={() => setShowKorean(true)}
              className={`rounded-pill px-3.5 py-1.5 text-xs font-semibold transition-all ${
                showKorean
                  ? 'bg-bg-surface text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                  : 'text-text-tertiary'
              }`}
            >
              한
            </button>
            <button
              onClick={() => setShowKorean(false)}
              className={`rounded-pill px-3.5 py-1.5 text-xs font-semibold transition-all ${
                showKorean
                  ? 'text-text-tertiary'
                  : 'bg-bg-surface text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-[22px] pb-28 pt-6">
          <h1 className="mb-1 font-korean-serif text-[22px] font-bold leading-[1.5] text-text-primary">
            {article.title}
          </h1>
          <p className="mb-6 border-b border-border-subtle pb-5 text-xs text-text-tertiary">
            {sourceLine}
          </p>

          {showKorean ? (
            <>
              <SegmentRenderer
                segments={article.adapted_korean}
                masteryMap={masteryMap}
                userTopikLevel={userTopikLevel}
                onWordTap={setActiveWordId}
              />
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-border-subtle pt-5 text-xs text-text-tertiary">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded-sm bg-border-light" />
                  Unseen (mastery 0)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded-sm bg-accent-celadon" />
                  Encountered (1-99)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded-sm bg-accent-indigo" />
                  Mastered (100)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded-sm bg-[#E2A563]" />
                  Above TOPIK level
                </span>
              </div>
            </>
          ) : (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-text-secondary">
              {article.original_english}
            </p>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,var(--bg-base)_30%)] px-5 pb-8 pt-4">
          <button
            onClick={() => router.push(`/articles/${article.id}/comprehension`)}
            className="w-full rounded-button bg-accent-celadon px-4 py-4 text-[15px] font-semibold text-white transition-all hover:bg-[#3E8A7B] active:scale-[0.98]"
          >
            다 읽었어요 →
          </button>
        </div>
      </div>

      {activeWord && (
        <WordQuizPopup
          word={{
            wordId: activeWord.id,
            korean: activeWord.korean,
            english: activeWord.english,
            romanization: activeWord.romanization,
            distractors: activeWord.distractors,
          }}
          onAnswer={handleQuizAnswer}
          onClose={() => setActiveWordId(null)}
        />
      )}
    </div>
  )
}
