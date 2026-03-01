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
  const [submitting, setSubmitting] = useState(false)

  const q = questions[current]

  async function handleAnswer(choiceIndex: number) {
    const newAnswers = [...answers, choiceIndex]
    setAnswers(newAnswers)

    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      return
    }

    setSubmitting(true)
    const answeredQuestions = questions.map((q, i) => ({ ...q, userAnswer: newAnswers[i] }))
    const comprehensionScore = answeredQuestions.reduce(
      (sum, q) => sum + (q.userAnswer === q.correct ? 1 : -1),
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col px-5 py-8">
      <p className="text-sm text-gray-400 mb-2">
        Question {current + 1} of {questions.length}
      </p>
      <div className="w-full bg-gray-100 rounded-full h-1 mb-8">
        <div
          className="bg-blue-500 h-1 rounded-full transition-all"
          style={{ width: `${(current / questions.length) * 100}%` }}
        />
      </div>

      <h2 className="text-xl font-semibold mb-8 leading-snug">{q.question}</h2>

      <div className="flex flex-col gap-3">
        {q.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className="text-left py-4 px-5 border-2 border-gray-200 rounded-2xl font-medium hover:border-gray-400 active:bg-gray-50"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
