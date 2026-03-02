'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AddFeedModal } from '@/components/AddFeedModal'

interface Feed {
  id: string
  feed_url: string
  title: string | null
  last_polled_at: string | null
  error_count: number
  last_error: string | null
  created_at: string
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

export function FeedList({ initialFeeds }: { initialFeeds: Feed[] }) {
  const router = useRouter()
  const [feeds, setFeeds] = useState(initialFeeds)
  const [showModal, setShowModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  async function handleDelete(feedId: string) {
    setDeletingId(feedId)
    try {
      const res = await fetch(`/api/feeds/${feedId}`, { method: 'DELETE' })
      if (res.ok) {
        setFeeds(prev => prev.filter(f => f.id !== feedId))
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function handleRetry(feedId: string) {
    setRetryingId(feedId)
    try {
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetErrors: true }),
      })
      if (res.ok) {
        setFeeds(prev =>
          prev.map(f => f.id === feedId ? { ...f, error_count: 0, last_error: null } : f)
        )
        router.refresh()
      }
    } finally {
      setRetryingId(null)
    }
  }

  const isPaused = (feed: Feed) => feed.error_count >= 5

  return (
    <>
      <div className="px-5 pb-24">
        {feeds.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-text-secondary text-sm">No feeds yet.</p>
            <p className="text-text-tertiary text-xs mt-1">Subscribe to a Substack to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feeds.map((feed, index) => (
              <div
                key={feed.id}
                className="rounded-card bg-bg-surface p-4 shadow-card animate-cardIn"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold text-text-primary truncate">
                      {feed.title || feed.feed_url}
                    </h3>
                    {feed.title && (
                      <p className="mt-0.5 text-xs text-text-tertiary truncate">{feed.feed_url}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {feed.last_polled_at && (
                        <span className="text-xs text-text-tertiary">
                          Polled {formatRelativeTime(feed.last_polled_at)}
                        </span>
                      )}
                      {isPaused(feed) && (
                        <span className="rounded-pill border border-accent-vermillion/30 bg-accent-vermillion-light px-2 py-0.5 font-mono text-[11px] text-accent-vermillion">
                          Paused
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPaused(feed) && (
                      <button
                        type="button"
                        disabled={retryingId === feed.id}
                        onClick={() => handleRetry(feed.id)}
                        className="rounded-button px-3 py-1.5 text-xs font-medium text-accent-celadon border border-accent-celadon/30 hover:bg-accent-celadon-light transition-colors disabled:opacity-40"
                      >
                        {retryingId === feed.id ? '...' : 'Retry'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={deletingId === feed.id}
                      onClick={() => handleDelete(feed.id)}
                      className="rounded-button px-3 py-1.5 text-xs font-medium text-accent-vermillion border border-accent-vermillion/30 hover:bg-accent-vermillion-light transition-colors disabled:opacity-40"
                    >
                      {deletingId === feed.id ? '...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="mt-5 w-full rounded-button bg-accent-celadon py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-[#3E8A7B] active:scale-[0.98]"
        >
          + Add Feed
        </button>
      </div>

      {showModal && (
        <AddFeedModal onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
