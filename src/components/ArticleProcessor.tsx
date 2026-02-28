'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'processing' | 'reddit-choice' | 'error'

export function ArticleProcessor({ url }: { url: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('processing')
  const [hasLinkedArticle, setHasLinkedArticle] = useState(false)
  const [error, setError] = useState('')

  async function process(redditType?: 'post' | 'article') {
    setStep('processing')
    try {
      const res = await fetch('/api/articles/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, redditType }),
      })
      const data = await res.json()

      if (data.needsRedditChoice) {
        setHasLinkedArticle(data.hasLinkedArticle)
        setStep('reddit-choice')
        return
      }

      if (!res.ok) throw new Error(data.error || 'Failed to adapt article')
      router.push(`/articles/${data.articleId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('error')
    }
  }

  useEffect(() => { process() }, [])

  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
        <p className="text-gray-500 text-sm">Adapting article to Korean…</p>
      </div>
    )
  }

  if (step === 'reddit-choice') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 max-w-md mx-auto">
        <h2 className="font-semibold text-lg text-center">What would you like to adapt?</h2>
        {hasLinkedArticle && (
          <button
            onClick={() => process('article')}
            className="w-full py-3 px-4 bg-black text-white rounded-2xl font-medium"
          >
            The linked article
          </button>
        )}
        <button
          onClick={() => process('post')}
          className="w-full py-3 px-4 border border-gray-300 rounded-2xl font-medium"
        >
          This Reddit discussion
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center">
      <p className="text-red-500 font-medium">Failed to process article</p>
      <p className="text-gray-500 text-sm">{error}</p>
      <button onClick={() => router.push('/')} className="text-blue-500 underline text-sm">
        Go home
      </button>
    </div>
  )
}
