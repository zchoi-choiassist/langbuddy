import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function ArticleProcessing() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { startReading } = useApp()

  useEffect(() => {
    const timer = setTimeout(() => {
      startReading(id)
      navigate(`/reading/${id}`)
    }, 2000)
    return () => clearTimeout(timer)
  }, [id, navigate, startReading])

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="text-center px-8">
        <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-6" />
        <p className="text-gray-800 font-semibold text-lg mb-1">기사를 적응하는 중...</p>
        <p className="text-sm text-gray-400">Adapting article to TOPIK 2 level</p>
      </div>
    </div>
  )
}
