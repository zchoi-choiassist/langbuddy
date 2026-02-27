import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Comprehension() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { articles, handleComprehensionAnswer } = useApp()
  const [currentQ, setCurrentQ] = useState(0)
  const [answered, setAnswered] = useState(null)

  const article = articles.find(a => a.id === id)
  if (!article) return null

  const questions = article.comprehensionQuestions
  const question = questions[currentQ]

  function handleAnswer(index) {
    if (answered !== null) return
    setAnswered(index)
    handleComprehensionAnswer({ articleId: id, questionId: question.id, answerIndex: index })
  }

  function handleNext() {
    if (currentQ < questions.length - 1) {
      setCurrentQ(q => q + 1)
      setAnswered(null)
    } else {
      navigate(`/summary/${id}`)
    }
  }

  const isCorrect = answered === question.correct

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col">
      <header className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-800">Comprehension Check</h2>
          <span className="text-sm text-gray-400">{currentQ + 1} / {questions.length}</span>
        </div>
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentQ ? 'bg-green-400' : i === currentQ ? 'bg-blue-400' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 py-8">
        <p className="text-lg font-medium text-gray-900 mb-8 leading-snug">{question.question}</p>

        <div className="space-y-3">
          {question.options.map((option, i) => {
            let cls = 'w-full py-4 px-4 rounded-2xl border text-left font-medium text-sm transition-colors '
            if (answered === null) {
              cls += 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-800'
            } else if (i === question.correct) {
              cls += 'border-green-400 bg-green-50 text-green-800'
            } else if (i === answered) {
              cls += 'border-red-300 bg-red-50 text-red-800'
            } else {
              cls += 'border-gray-100 bg-gray-50 text-gray-400'
            }
            return (
              <button key={i} className={cls} onClick={() => handleAnswer(i)}>
                {option}
              </button>
            )
          })}
        </div>
      </div>

      {answered !== null && (
        <div className="px-4 pb-6 border-t border-gray-100 pt-4">
          <p className={`text-center font-semibold mb-3 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
            {isCorrect ? '정답! +1' : '틀렸습니다. -1'}
          </p>
          <button
            onClick={handleNext}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3.5 rounded-2xl font-semibold transition-colors"
          >
            {currentQ < questions.length - 1 ? 'Next Question →' : 'See Results →'}
          </button>
        </div>
      )}
    </div>
  )
}
