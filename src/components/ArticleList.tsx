'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SwipeableArticleCard } from '@/components/SwipeableArticleCard'
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal'
import type { ArticleCardArticle } from '@/components/ArticleCard'

const PLACEHOLDER_TITLE = 'Adapting article...'
const POLL_INTERVAL_MS = 5000

interface ArticleListProps {
  initialArticles: ArticleCardArticle[]
}

function groupArticles(articles: ArticleCardArticle[]) {
  return {
    newArticles: articles.filter(a => a.status === 'unread'),
    inProgressArticles: articles.filter(a => a.status === 'reading'),
    completedArticles: articles.filter(a => a.status === 'completed'),
  }
}

function hasPlaceholders(articles: ArticleCardArticle[]): boolean {
  return articles.some(a => a.title === PLACEHOLDER_TITLE)
}

export function ArticleList({ initialArticles }: ArticleListProps) {
  const router = useRouter()
  const [articles, setArticles] = useState<ArticleCardArticle[]>(initialArticles)
  const [deleteTarget, setDeleteTarget] = useState<ArticleCardArticle | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState(() => new Set<string>())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Polling for placeholder articles
  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/articles')
      if (!res.ok) return
      const data: ArticleCardArticle[] = await res.json()
      setArticles(data)
    } catch {
      // Silently ignore network errors during polling
    }
  }, [])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (hasPlaceholders(articles)) {
      intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [articles, poll])

  // Sync with new initial data when server re-renders (e.g., navigation)
  useEffect(() => {
    setArticles(initialArticles)
  }, [initialArticles])

  // Delete handlers
  const handleRequestDelete = useCallback((article: ArticleCardArticle) => {
    setDeleteTarget(article)
  }, [])

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return

    const articleId = deleteTarget.id
    setDeleteTarget(null)
    setDeletingId(articleId)

    try {
      const res = await fetch(`/api/articles/${articleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')

      collapseTimerRef.current = setTimeout(() => {
        setDeletedIds(prev => new Set(prev).add(articleId))
        setDeletingId(null)
        router.refresh()
      }, 400)
    } catch {
      setDeletingId(null)
    }
  }, [deleteTarget, router])

  const { newArticles, inProgressArticles, completedArticles } = groupArticles(articles)
  const activeArticles = [...newArticles, ...inProgressArticles]

  if (articles.length === 0) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="mb-2 text-text-secondary">Your reading queue is empty.</p>
        <p className="text-sm text-text-tertiary">
          Share any article or Reddit link from your browser to get started.
        </p>
      </div>
    )
  }

  const renderSection = (title: string, sectionArticles: ArticleCardArticle[], paddingTop: string) => {
    const visibleArticles = sectionArticles.filter(a => !deletedIds.has(a.id))
    if (visibleArticles.length === 0 && deletedIds.size > 0) return null

    return (
      <section>
        <h2 className={`px-4 ${paddingTop} pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary`}>
          {title}
        </h2>
        <div className="px-4 space-y-3">
          {visibleArticles.map((article, index) => (
            <div
              key={article.id}
              style={{
                height: deletingId === article.id ? 0 : undefined,
                opacity: deletingId === article.id ? 0 : 1,
                marginBottom: deletingId === article.id ? 0 : undefined,
                paddingTop: deletingId === article.id ? 0 : undefined,
                overflow: 'hidden',
                transition: deletingId === article.id
                  ? 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease, margin-bottom 0.35s cubic-bezier(0.32, 0.72, 0, 1), padding-top 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
                  : undefined,
              }}
            >
              <SwipeableArticleCard
                article={article}
                index={index}
                onRequestDelete={handleRequestDelete}
              />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <>
      <div className="space-y-2 pb-8">
        {renderSection('New & In Progress', activeArticles, 'pt-1')}
        {renderSection('Completed', completedArticles, 'pt-4')}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          articleTitle={deleteTarget.title}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </>
  )
}
