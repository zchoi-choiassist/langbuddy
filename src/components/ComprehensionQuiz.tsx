'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ComprehensionQuestion } from '@/lib/types'

export function ComprehensionQuiz({
  articleId,
  questions,
}: {
  articleId: string
  questions: ComprehensionQuestion[]
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const q = questions[current]

  function handleAnswer(choiceIndex: number) {
    if (selectedChoice !== null || submitting) return
    setSelectedChoice(choiceIndex)
    setAnswers(prev => {
      const next = [...prev]
      next[current] = choiceIndex
      return next
    })
  }

  async function handleNext() {
    if (selectedChoice === null) return
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      setSelectedChoice(null)
      return
    }

    setSubmitting(true)
    const answeredQuestions = questions.map((question, i) => ({ ...question, userAnswer: answers[i] }))
    const comprehensionScore = answeredQuestions.reduce(
      (sum, question) => sum + (question.userAnswer === question.correct ? 1 : -1),
      0
    )

    await fetch(`/api/articles/${articleId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comprehensionScore, answeredQuestions }),
    })
    router.push(`/articles/${articleId}/summary`)
  }

  if (submitting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-celadon-light border-t-accent-celadon" />
      </div>
    )
  }

  const isCorrect = selectedChoice === q.correct

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-bg-surface">
      <header className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
        <span className="font-mono text-[13px] font-semibold text-text-secondary">
          Q{current + 1} / {questions.length}
        </span>
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <span
              key={i}
              className={[
                'h-2 w-2 rounded-full transition-all duration-300 [transition-property:background-color,transform]',
                '[transition-timing-function:var(--ease-spring)]',
                i < current && 'bg-accent-celadon',
                i === current && 'bg-accent-celadon scale-[1.3]',
                i > current && 'bg-border-light',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </div>
      </header>

      <div className="flex-1 px-[22px] py-8">
        <h2 key={current} className="mb-7 font-korean-serif text-[20px] font-semibold leading-[1.6] text-text-primary animate-fadeUp">
          {q.question}
        </h2>
        <div className="flex flex-col gap-2.5">
          {q.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              style={{ animationDelay: `${(i + 1) * 50}ms` }}
              className={[
                'animate-fadeUp rounded-button border-[1.5px] px-[18px] py-4 text-left text-[15px] font-medium transition-all',
                selectedChoice === null && 'border-border-light bg-bg-surface text-text-primary hover:border-accent-celadon hover:bg-accent-celadon-light',
                selectedChoice !== null && i === q.correct && 'border-accent-celadon bg-accent-celadon-light text-text-primary [animation:popCorrect_0.3s_var(--ease-spring)]',
                selectedChoice !== null && i === selectedChoice && i !== q.correct && 'border-accent-vermillion bg-accent-vermillion-light text-text-primary [animation:shake_0.4s_ease]',
                selectedChoice !== null && i !== selectedChoice && i !== q.correct && 'border-border-light bg-bg-surface text-text-tertiary opacity-50',
              ].filter(Boolean).join(' ')}
            >
              {option}
            </button>
          ))}
        </div>

        {selectedChoice !== null && (
          <div className={`mt-5 animate-fadeUp rounded-button px-[18px] py-4 text-sm leading-relaxed ${
            isCorrect ? 'bg-accent-celadon-light text-[#1C6B5E]' : 'bg-accent-vermillion-light text-[#9B2C1C]'
          }`}>
            <strong>{isCorrect ? '맞았어요!' : '틀렸어요.'}</strong>{' '}
            {isCorrect ? 'Great work.' : 'Review the highlighted correct answer.'}
          </div>
        )}
      </div>

      {selectedChoice !== null && (
        <div className="border-t border-border-subtle px-[22px] pb-8 pt-4">
          <button
            onClick={handleNext}
            className="w-full rounded-button bg-accent-celadon px-4 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#3E8A7B]"
          >
            {current < questions.length - 1 ? 'Next Question →' : 'See Results →'}
          </button>
        </div>
      )}
    </div>
  )
}
