import { useNavigate } from 'react-router-dom'

export default function ArticleCard({ article }) {
  const navigate = useNavigate()

  function handleClick() {
    if (article.status === 'reading') {
      navigate(`/reading/${article.id}`)
    } else {
      navigate(`/processing/${article.id}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-98 transition-transform"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="font-semibold text-gray-900 text-base leading-tight">{article.title}</h2>
        <StatusBadge status={article.status} />
      </div>
      <p className="text-xs text-gray-400 mb-2">{article.sourceLabel}</p>
      <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'reading') {
    return (
      <span className="shrink-0 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
        In progress
      </span>
    )
  }
  return (
    <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
      Unread
    </span>
  )
}
