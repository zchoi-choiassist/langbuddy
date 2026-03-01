'use client'

import { useState, useRef, useCallback } from 'react'
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

export function ReadingView({ article, masteryMap, wordDetails, userTopikLevel }: ReadingViewProps) {
  const router = useRouter()
  const [showKorean, setShowKorean] = useState(true)
  const [showToggleLabel, setShowToggleLabel] = useState(false)
  const [activeWordId, setActiveWordId] = useState<number | null>(null)
  const [wordQuizScore, setWordQuizScore] = useState(article.word_quiz_score)
  const lastTapRef = useRef(0)
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const activeWord = activeWordId !== null ? wordDetails.get(activeWordId) : null

  const handleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      setShowKorean(prev => !prev)
      setShowToggleLabel(true)
      clearTimeout(labelTimerRef.current)
      labelTimerRef.current = setTimeout(() => setShowToggleLabel(false), 1000)
    }
    lastTapRef.current = now
  }, [])

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

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="text-blue-600 text-sm font-medium">
          ← Back
        </button>
        <span className="text-sm text-gray-500">Score: {wordQuizScore}</span>
      </header>

      <div
        className="flex-1 px-5 py-6 overflow-y-auto relative select-none"
        onClick={handleTap}
      >
        {showToggleLabel && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
            <span className="bg-black/70 text-white text-lg px-5 py-2 rounded-full">
              {showKorean ? '한국어' : 'English'}
            </span>
          </div>
        )}

        <h1 className="text-lg font-bold text-gray-900 mb-4 leading-snug">{article.title}</h1>

        {showKorean ? (
          <SegmentRenderer
            segments={article.adapted_korean}
            masteryMap={masteryMap}
            userTopikLevel={userTopikLevel}
            onWordTap={setActiveWordId}
          />
        ) : (
          <p className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
            {article.original_english}
          </p>
        )}
      </div>

      <div className="px-5 py-6 border-t border-gray-100">
        <button
          onClick={() => router.push(`/articles/${article.id}/comprehension`)}
          className="w-full py-3 bg-blue-500 text-white rounded-2xl font-semibold text-base"
        >
          I&apos;m done reading
        </button>
      </div>

      {activeWord && (
        <WordQuizPopup
          word={{
            wordId: activeWord.id,
            korean: activeWord.korean,
            english: activeWord.english,
            romanization: activeWord.romanization,
            distractors: ['option 2', 'option 3', 'option 4'],
          }}
          onAnswer={handleQuizAnswer}
          onClose={() => setActiveWordId(null)}
        />
      )}
    </div>
  )
}
