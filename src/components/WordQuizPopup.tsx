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
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-modal bg-bg-surface px-[22px] pb-9 pt-7 shadow-modal animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-6 h-1 w-9 rounded bg-border-light" />
        <div className="mb-6 text-center">
          <p className="font-korean-serif text-4xl font-bold text-text-primary">{word.korean}</p>
          <p className="mt-1 text-sm text-text-tertiary">{word.romanization}</p>
        </div>
        <p className="mb-4 text-center text-sm text-text-secondary">
          What does this mean?
        </p>
        <div className="flex flex-col gap-2">
          {choices.map(choice => (
            <button
              key={choice}
              onClick={() => handleSelect(choice)}
              className={[
                'w-full rounded-[14px] border-[1.5px] px-4 py-3.5 text-left text-sm font-medium transition-all',
                !answered && 'border-border-light bg-bg-surface text-text-primary hover:border-accent-celadon',
                answered && choice === word.english && 'border-accent-celadon bg-accent-celadon-light text-text-primary [animation:popCorrect_0.3s_var(--ease-spring)]',
                answered && choice === selectedChoice && choice !== word.english && 'border-accent-vermillion bg-accent-vermillion-light text-text-primary [animation:shake_0.4s_ease]',
                answered && choice !== selectedChoice && choice !== word.english && 'border-border-light bg-bg-surface text-text-tertiary opacity-50',
              ].filter(Boolean).join(' ')}
            >
              {choice}
            </button>
          ))}
        </div>

        {answered && (
          <div className="mt-4 animate-fadeUp">
            <div
              className={`rounded-button px-4 py-3 text-sm ${
                isCorrect ? 'bg-accent-celadon-light text-[#1C6B5E]' : 'bg-accent-vermillion-light text-[#9B2C1C]'
              }`}
            >
              <strong>{isCorrect ? 'Correct!' : 'Wrong.'}</strong>{' '}
              {word.korean} means {word.english}.
            </div>
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-button bg-accent-celadon px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#3E8A7B]"
            >
              Continue reading
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
