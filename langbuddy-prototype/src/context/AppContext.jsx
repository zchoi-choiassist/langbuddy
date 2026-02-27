import { createContext, useContext, useState } from 'react'
import { initialArticles } from '../data/articles'
import { initialWordBank } from '../data/wordBank'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [articles, setArticles] = useState(initialArticles)
  const [wordBank, setWordBank] = useState(initialWordBank)

  function startReading(articleId) {
    setArticles(prev =>
      prev.map(a => (a.id === articleId ? { ...a, status: 'reading' } : a))
    )
  }

  function handleWordQuizAnswer({ articleId, vocabItem, correct }) {
    setArticles(prev =>
      prev.map(a =>
        a.id === articleId
          ? { ...a, wordQuizScore: a.wordQuizScore + (correct ? 1 : -1) }
          : a
      )
    )
    setWordBank(prev => {
      const existing = prev.find(w => w.korean === vocabItem.korean)
      if (existing) {
        return prev.map(w =>
          w.korean === vocabItem.korean
            ? {
                ...w,
                masteryLevel: Math.max(0, Math.min(100, w.masteryLevel + (correct ? 1 : -1))),
                timesCorrect: w.timesCorrect + (correct ? 1 : 0),
                timesSeen: w.timesSeen + 1,
              }
            : w
        )
      }
      return [
        ...prev,
        {
          id: Date.now(),
          korean: vocabItem.korean,
          english: vocabItem.english,
          romanization: vocabItem.romanization,
          example: vocabItem.example,
          masteryLevel: correct ? 1 : 0,
          timesCorrect: correct ? 1 : 0,
          timesSeen: 1,
          addedAt: new Date().toISOString().split('T')[0],
        },
      ]
    })
  }

  function handleComprehensionAnswer({ articleId, questionId, answerIndex }) {
    setArticles(prev =>
      prev.map(a => {
        if (a.id !== articleId) return a
        const question = a.comprehensionQuestions.find(q => q.id === questionId)
        const correct = answerIndex === question.correct
        return {
          ...a,
          comprehensionScore: a.comprehensionScore + (correct ? 1 : -1),
          comprehensionQuestions: a.comprehensionQuestions.map(q =>
            q.id === questionId ? { ...q, userAnswer: answerIndex } : q
          ),
        }
      })
    )
  }

  function completeArticle(articleId) {
    setArticles(prev =>
      prev.map(a =>
        a.id === articleId
          ? {
              ...a,
              status: 'completed',
              completedAt: new Date().toISOString(),
            }
          : a
      )
    )
  }

  return (
    <AppContext.Provider
      value={{
        articles,
        wordBank,
        startReading,
        handleWordQuizAnswer,
        handleComprehensionAnswer,
        completeArticle,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
