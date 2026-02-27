import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

export default function WordQuizPopup({ vocabItem, articleId, onClose }) {
  const { wordBank, handleWordQuizAnswer } = useApp()
  const [answered, setAnswered] = useState(null)

  const options = useMemo(() => {
    const distractors = wordBank
      .map(w => w.english)
      .filter(e => e !== vocabItem.english)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    return [vocabItem.english, ...distractors].sort(() => Math.random() - 0.5)
  }, [vocabItem.korean])

  function handleAnswer(option) {
    if (answered !== null) return
    const correct = option === vocabItem.english
    setAnswered(correct ? 'correct' : 'wrong')
    handleWordQuizAnswer({ articleId, vocabItem, correct })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-gray-900 mb-1">{vocabItem.korean}</div>
          <div className="text-sm text-gray-400">{vocabItem.romanization}</div>
        </div>

        <p className="text-sm text-gray-500 text-center mb-4">What does this word mean?</p>

        <div className="space-y-2">
          {options.map((option, i) => {
            let cls = 'w-full py-3.5 px-4 rounded-xl border text-left font-medium text-sm transition-colors '
            if (answered === null) {
              cls += 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-800'
            } else if (option === vocabItem.english) {
              cls += 'border-green-400 bg-green-50 text-green-800'
            } else {
              cls += 'border-gray-100 bg-gray-50 text-gray-400'
            }
            return (
              <button key={i} className={cls} onClick={() => handleAnswer(option)}>
                {option}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="mt-5 text-center">
            <p className={`font-semibold mb-2 ${answered === 'correct' ? 'text-green-600' : 'text-red-500'}`}>
              {answered === 'correct' ? '✓ Correct! +1' : '✗ Wrong. -1'}
            </p>
            <p className="text-xs text-gray-400 mb-1">Example:</p>
            <p className="text-sm text-gray-700 italic">{vocabItem.example}</p>
            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 bg-blue-500 text-white rounded-xl font-semibold text-sm"
            >
              Continue reading
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
