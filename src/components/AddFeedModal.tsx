'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function AddFeedModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    navigator.clipboard.readText()
      .then(text => {
        const trimmed = text.trim()
        if (trimmed.includes('substack.com') || trimmed.includes('/feed') || trimmed.includes('/rss')) {
          setUrl(trimmed)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSubmit() {
    const trimmed = url.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })

      if (res.status === 409) {
        setError('Feed already subscribed')
        setLoading(false)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to subscribe')
        setLoading(false)
        return
      }

      router.refresh()
      onClose()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <div
        aria-label="Close add feed modal"
        className="fixed inset-0 z-50 bg-black/40 animate-fadeIn"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto w-full max-w-md rounded-t-modal bg-bg-surface px-6 pb-9 pt-3 shadow-modal animate-slideUp">
          <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border-light" />
          <h2 className="mb-4 font-display text-xl text-text-primary">Add Feed</h2>
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="e.g. platformer or platformer.substack.com"
            className="w-full rounded-button border border-border-light px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-accent-celadon focus:outline-none focus:ring-1 focus:ring-accent-celadon/30"
          />
          {error && (
            <p className="mt-2 text-sm text-accent-vermillion">{error}</p>
          )}
          <button
            type="button"
            disabled={!url.trim() || loading}
            onClick={handleSubmit}
            className="mt-3 w-full rounded-button bg-accent-celadon py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-[#3E8A7B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>
      </div>
    </>
  )
}
