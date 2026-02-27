import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function WordBank() {
  const navigate = useNavigate()
  const { wordBank } = useApp()
  const [selectedWord, setSelectedWord] = useState(null)
  const [sortBy, setSortBy] = useState('mastery')

  const activeWords = wordBank
    .filter(w => w.masteryLevel < 100)
    .sort((a, b) =>
      sortBy === 'mastery'
        ? a.masteryLevel - b.masteryLevel
        : new Date(b.addedAt) - new Date(a.addedAt)
    )

  const masteredWords = wordBank.filter(w => w.masteryLevel >= 100)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-blue-600 font-medium text-sm">
          ← Back
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Word Bank</h1>
        <span className="text-sm text-gray-400">{wordBank.length} words</span>
      </header>

      <div className="px-4 py-4">
        <div className="flex gap-2 mb-5">
          {['mastery', 'date'].map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
                sortBy === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {key === 'mastery' ? 'By Mastery' : 'By Date'}
            </button>
          ))}
        </div>

        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Active — {activeWords.length} words
        </h2>
        <div className="space-y-2 mb-6">
          {activeWords.map(word => (
            <WordCard key={word.id} word={word} onClick={() => setSelectedWord(word)} />
          ))}
        </div>

        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Mastered — {masteredWords.length} words
        </h2>
        <div className="space-y-2">
          {masteredWords.map(word => (
            <WordCard key={word.id} word={word} mastered onClick={() => setSelectedWord(word)} />
          ))}
        </div>
      </div>

      {selectedWord && (
        <WordDetailModal word={selectedWord} onClose={() => setSelectedWord(null)} />
      )}
    </div>
  )
}

function WordCard({ word, mastered, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-gray-900">{word.korean}</span>
          <span className="text-xs text-gray-400">{word.romanization}</span>
        </div>
        <p className="text-sm text-gray-500 truncate">{word.english}</p>
      </div>
      <div className="w-16 shrink-0 text-right">
        {mastered ? (
          <span className="text-xs text-green-600 font-semibold">✓ Done</span>
        ) : (
          <>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
              <div
                className="h-full bg-blue-400 rounded-full"
                style={{ width: `${word.masteryLevel}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{word.masteryLevel}/100</p>
          </>
        )}
      </div>
    </div>
  )
}

function WordDetailModal({ word, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="text-4xl font-bold text-gray-900">{word.korean}</div>
          <div className="text-sm text-gray-400 mt-1">{word.romanization}</div>
          <div className="text-base font-medium text-gray-700 mt-1">{word.english}</div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-1">Example sentence:</p>
          <p className="text-sm text-gray-800">{word.example}</p>
        </div>

        <div className="flex justify-between text-sm text-gray-500 mb-3">
          <span>Mastery: {word.masteryLevel}/100</span>
          <span>Seen: {word.timesSeen}×</span>
          <span>Correct: {word.timesCorrect}×</span>
        </div>

        {word.masteryLevel < 100 && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-blue-400 rounded-full"
              style={{ width: `${word.masteryLevel}%` }}
            />
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 text-blue-600 font-semibold text-sm"
        >
          Close
        </button>
      </div>
    </div>
  )
}
