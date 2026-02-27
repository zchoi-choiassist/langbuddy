import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function SummaryScore() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { articles, completeArticle } = useApp()

  const article = articles.find(a => a.id === id)

  useEffect(() => {
    if (article && article.status !== 'completed') {
      completeArticle(id)
    }
  }, [id])

  if (!article) return null

  const wordScore = article.wordQuizScore
  const compScore = article.comprehensionScore
  const total = wordScore + compScore

  function fmt(n) {
    return n > 0 ? `+${n}` : String(n)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center px-5">
      <div className="text-center w-full">
        <div className="text-6xl mb-3">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Article Complete!</h1>
        <p className="text-sm text-gray-400 mb-8 px-4 line-clamp-2">{article.title}</p>

        <div className="bg-gray-50 rounded-3xl p-6 space-y-4 mb-8 text-left">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">Vocabulary Quiz</p>
              <p className="text-xs text-gray-400 mt-0.5">Words tapped during reading</p>
            </div>
            <span className={`font-bold text-xl ${wordScore >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {fmt(wordScore)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">Comprehension</p>
              <p className="text-xs text-gray-400 mt-0.5">3 end-of-article questions</p>
            </div>
            <span className={`font-bold text-xl ${compScore >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {fmt(compScore)}
            </span>
          </div>

          <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
            <p className="font-bold text-gray-900 text-lg">Total Score</p>
            <span className={`font-bold text-3xl ${total >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {fmt(total)}
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3.5 rounded-2xl font-semibold text-base transition-colors"
        >
          Back to Reading List
        </button>
      </div>
    </div>
  )
}
