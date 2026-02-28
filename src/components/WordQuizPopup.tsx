'use client'

import { useMemo } from 'react'

interface WordQuizPopupProps {
  word: {
    wordId: number
    korean: string
    english: string
    romanization: string
    distractors: [string, string, string]
  }
  onAnswer: (correct: boolean) => void
  onClose: () => void
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function WordQuizPopup({ word, onAnswer, onClose }: WordQuizPopupProps) {
  const choices = useMemo(
    () => shuffle([word.english, ...word.distractors]),
    [word]
  )

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-t-3xl p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <p className="text-4xl font-bold mb-1">{word.korean}</p>
          <p className="text-gray-400 text-sm">{word.romanization}</p>
        </div>
        <p className="text-center text-gray-600 font-medium mb-4 text-sm">
          What does this mean?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {choices.map(choice => (
            <button
              key={choice}
              onClick={() => onAnswer(choice === word.english)}
              className="py-3 px-4 border-2 border-gray-200 rounded-2xl text-sm font-medium hover:border-gray-400 active:bg-gray-50"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
