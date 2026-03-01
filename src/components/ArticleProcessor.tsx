'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'processing' | 'reddit-choice' | 'error'
const HOME_REDIRECT_DELAY_MS = 5000

export function ArticleProcessor({ url }: { url: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('processing')
  const [hasLinkedArticle, setHasLinkedArticle] = useState(false)
  const [error, setError] = useState('')
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRedirectTimer = useCallback(() => {
    if (redirectTimerRef.current !== null) {
      clearTimeout(redirectTimerRef.current)
      redirectTimerRef.current = null
    }
  }, [])

  const scheduleHomeRedirect = useCallback(() => {
    clearRedirectTimer()
    redirectTimerRef.current = setTimeout(() => {
      router.push('/')
    }, HOME_REDIRECT_DELAY_MS)
  }, [clearRedirectTimer, router])

  const process = useCallback(async (redditType?: 'post' | 'article') => {
    setStep('processing')
    setError('')
    scheduleHomeRedirect()
    try {
      const res = await fetch('/api/articles/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, redditType }),
      })
      const data = await res.json()

      if (data.needsRedditChoice) {
        clearRedirectTimer()
        setHasLinkedArticle(data.hasLinkedArticle)
        setStep('reddit-choice')
        return
      }

      if (!res.ok) throw new Error(data.error || 'Failed to adapt article')
    } catch (e) {
      clearRedirectTimer()
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('error')
    }
  }, [clearRedirectTimer, scheduleHomeRedirect, url])

  useEffect(() => {
    void process()
    return clearRedirectTimer
  }, [clearRedirectTimer, process])

  if (step === 'processing') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base px-8 text-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-accent-celadon-light border-t-accent-celadon" />
        <p className="font-korean-serif text-lg font-semibold text-text-primary">기사를 적응하는 중...</p>
        <p className="text-sm text-text-secondary">Adapting article and returning home in 5 seconds</p>
      </div>
    )
  }

  if (step === 'reddit-choice') {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-bg-base px-8">
        <h2 className="text-center font-korean-serif text-2xl font-semibold text-text-primary">
          What would you like to adapt?
        </h2>
        {hasLinkedArticle && (
          <button
            onClick={() => process('article')}
            className="w-full rounded-button bg-accent-celadon px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3E8A7B]"
          >
            The linked article
          </button>
        )}
        <button
          onClick={() => process('post')}
          className="w-full rounded-button border border-border-light bg-bg-surface px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:border-accent-celadon hover:text-accent-celadon"
        >
          This Reddit discussion
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base px-8 text-center">
      <p className="font-semibold text-accent-vermillion">Failed to process article</p>
      <p className="text-sm text-text-secondary">{error}</p>
      <button
        onClick={() => router.push('/')}
        className="text-sm font-medium text-accent-celadon underline decoration-border-light underline-offset-4"
      >
        Go home
      </button>
    </div>
  )
}
