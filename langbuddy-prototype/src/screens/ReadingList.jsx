import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import ArticleCard from '../components/ArticleCard'

export default function ReadingList() {
  const { articles, wordBank } = useApp()
  const navigate = useNavigate()

  const activeArticles = articles.filter(a => a.status !== 'completed')
  const archivedArticles = articles.filter(a => a.status === 'completed')

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">LangBuddy</h1>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/wordbank')}
            className="text-sm text-blue-600 font-medium"
          >
            Word Bank ({wordBank.length})
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {activeArticles.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📖</p>
            <p className="font-medium">No articles yet</p>
            <p className="text-sm mt-1">Share a link to get started</p>
          </div>
        ) : (
          activeArticles.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))
        )}

        {archivedArticles.length > 0 && (
          <>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2">
              Archived
            </h2>
            {archivedArticles.map(article => (
              <div
                key={article.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 opacity-60"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-medium text-gray-700 text-sm leading-tight">{article.title}</h3>
                  <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    +{article.wordQuizScore + article.comprehensionScore}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{article.sourceLabel}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
