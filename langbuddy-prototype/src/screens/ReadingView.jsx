import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import WordQuizPopup from '../components/WordQuizPopup'

export default function ReadingView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { articles, wordBank } = useApp()
  const [showEnglish, setShowEnglish] = useState(false)
  const [activeWord, setActiveWord] = useState(null)

  const article = articles.find(a => a.id === id)
  if (!article) return <div className="p-4 text-gray-500">Article not found.</div>

  function handleSegmentTap(segment) {
    if (segment.type === 'vocab') {
      const vocabItem = article.vocabulary.find(v => v.id === segment.vocabId)
      if (vocabItem) setActiveWord(vocabItem)
    } else if (segment.type === 'wordbank') {
      const wbWord = wordBank.find(w => w.id === segment.wordBankId)
      if (wbWord) {
        setActiveWord({
          id: String(wbWord.id),
          korean: wbWord.korean,
          english: wbWord.english,
          romanization: wbWord.romanization,
          example: wbWord.example,
        })
      }
    }
  }

  const score = article.wordQuizScore
  const scoreLabel = score > 0 ? `+${score}` : String(score)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-blue-600 font-medium text-sm">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">
            Quiz: <span className={score >= 0 ? 'text-green-600' : 'text-red-500'}>{scoreLabel}</span>
          </span>
          <button
            onClick={() => setShowEnglish(v => !v)}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full font-semibold transition-colors"
          >
            {showEnglish ? 'EN' : '한'}
          </button>
        </div>
      </header>

      <div className="flex-1 px-5 py-6 overflow-y-auto">
        <h1 className="text-lg font-bold text-gray-900 mb-4 leading-snug">{article.title}</h1>
        <p className="text-xs text-gray-400 mb-5">{article.sourceLabel}</p>

        {showEnglish ? (
          <p className="text-gray-700 leading-relaxed text-base">{article.englishText}</p>
        ) : (
          <p className="text-gray-900 leading-loose text-lg">
            {article.adaptedKorean.map((segment, i) => {
              if (segment.type === 'text') {
                return <span key={i}>{segment.text}</span>
              }
              if (segment.type === 'vocab') {
                return (
                  <span
                    key={i}
                    onClick={() => handleSegmentTap(segment)}
                    className="border-b-2 border-blue-400 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    {segment.text}
                  </span>
                )
              }
              if (segment.type === 'wordbank') {
                return (
                  <span
                    key={i}
                    onClick={() => handleSegmentTap(segment)}
                    className="border-b-2 border-orange-400 cursor-pointer hover:bg-orange-50 transition-colors"
                  >
                    {segment.text}
                  </span>
                )
              }
              return null
            })}
          </p>
        )}

        <div className="flex gap-4 mt-6 pt-4 border-t border-gray-100">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-4 h-0.5 bg-blue-400 inline-block" /> New word
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-4 h-0.5 bg-orange-400 inline-block" /> Your word bank
          </span>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-gray-100">
        <button
          onClick={() => navigate(`/comprehension/${id}`)}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3.5 rounded-2xl font-semibold text-base transition-colors"
        >
          다 읽었어요 →
        </button>
      </div>

      {activeWord && (
        <WordQuizPopup
          vocabItem={activeWord}
          articleId={id}
          onClose={() => setActiveWord(null)}
        />
      )}
    </div>
  )
}
