'use client'

import { useMemo, useState } from 'react'

interface WordQuizPopupProps {
  word: {
    wordId: number
    korean: string
    english: string
    romanization: string
    distractors: string[]
  }
  onAnswer: (correct: boolean) => void
  onClose: () => void
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function WordQuizPopup({ word, onAnswer, onClose }: WordQuizPopupProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const choices = useMemo(
    () => shuffle([word.english, ...word.distractors]),
    [word]
  )
  const answered = selectedChoice !== null
  const isCorrect = selectedChoice === word.english

  function handleSelect(choice: string) {
    if (answered) return
    setSelectedChoice(choice)
    onAnswer(choice === word.english)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fadeIn"
      onClick={answered ? onClose : undefined}
    >
      <div
        className="w-full max-w-md rounded-t-modal bg-bg-surface px-[22px] pb-9 pt-7 shadow-modal animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-6 h-1 w-9 rounded bg-border-light" />

        {/* Word display */}
        <div className="mb-6 text-center">
          <p className="font-korean-serif text-4xl font-bold text-text-primary">{word.korean}</p>
          <p className="mt-1 text-sm text-text-tertiary">{word.romanization}</p>
        </div>

        {/* Question or result icon */}
        {!answered ? (
          <p className="mb-4 text-center text-sm text-text-secondary">
            What does this mean?
          </p>
        ) : (
          <div className="mb-5 flex flex-col items-center gap-1 [animation:resultReveal_0.4s_var(--ease-spring)]">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full ${
                isCorrect
                  ? 'bg-accent-celadon shadow-[0_0_0_6px_var(--accent-celadon-light)]'
                  : 'bg-accent-vermillion shadow-[0_0_0_6px_var(--accent-vermillion-light)]'
              }`}
            >
              {isCorrect ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>
            <span
              className={`mt-1.5 font-mono text-lg font-bold [animation:scorePopIn_0.3s_var(--ease-spring)_0.15s_both] ${
                isCorrect ? 'text-accent-celadon' : 'text-accent-vermillion'
              }`}
            >
              {isCorrect ? '+1' : '−1'}
            </span>
          </div>
        )}

        {/* Answer choices */}
        <div className="flex flex-col gap-2">
          {choices.map(choice => {
            const isThisCorrect = choice === word.english
            const isThisSelected = choice === selectedChoice
            const isWrongSelection = isThisSelected && !isThisCorrect

            return (
              <button
                key={choice}
                onClick={() => handleSelect(choice)}
                className={[
                  'w-full rounded-[14px] border-[1.5px] px-4 py-3.5 text-left text-sm font-medium transition-all',
                  !answered && 'border-border-light bg-bg-surface text-text-primary hover:border-accent-celadon active:scale-[0.98]',
                  answered && isThisCorrect && 'border-accent-celadon bg-accent-celadon-light text-text-primary [animation:popCorrect_0.3s_var(--ease-spring)]',
                  answered && isWrongSelection && 'border-accent-vermillion bg-accent-vermillion-light text-text-primary [animation:shake_0.4s_ease]',
                  answered && !isThisCorrect && !isThisSelected && 'border-border-light bg-bg-surface text-text-tertiary opacity-40',
                ].filter(Boolean).join(' ')}
              >
                {/* Show check/x icons on answered choices */}
                {answered && isThisCorrect && (
                  <span className="mr-2 inline-block text-accent-celadon">✓</span>
                )}
                {answered && isWrongSelection && (
                  <span className="mr-2 inline-block text-accent-vermillion">✗</span>
                )}
                {choice}
              </button>
            )
          })}
        </div>

        {/* Feedback + continue */}
        {answered && (
          <div className="mt-5 [animation:feedbackSlideUp_0.35s_var(--ease-out)_0.1s_both]">
            <div
              className={`rounded-button px-4 py-3 text-sm ${
                isCorrect ? 'bg-accent-celadon-light text-[#1C6B5E]' : 'bg-accent-vermillion-light text-[#9B2C1C]'
              }`}
            >
              <strong>{isCorrect ? '맞아요!' : '틀렸어요.'}</strong>{' '}
              <span className="font-korean-serif">{word.korean}</span> means <em>{word.english}</em>.
            </div>
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-button bg-accent-celadon px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#3E8A7B] active:scale-[0.98] [animation:fadeUp_0.3s_var(--ease-out)_0.25s_both]"
            >
              Continue reading
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
