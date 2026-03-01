'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function AddArticleFab() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!isOpen) return

    navigator.clipboard.readText()
      .then(text => {
        const trimmed = text.trim()
        if (isValidUrl(trimmed)) setUrl(trimmed)
      })
      .catch(() => {
        // Ignore clipboard permission or API support issues.
      })
  }, [isOpen])

  function handleClose() {
    setIsOpen(false)
    setUrl('')
  }

  function handleSubmit() {
    const trimmed = url.trim()
    if (!isValidUrl(trimmed)) return
    setIsOpen(false)
    router.push(`/articles/new?url=${encodeURIComponent(trimmed)}`)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Add article"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-accent-celadon shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
          className="mx-auto"
        >
          <path d="M12 5V19" />
          <path d="M5 12H19" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            aria-label="Close add article modal"
            className="fixed inset-0 z-50 bg-black/40 animate-fadeIn"
            onClick={handleClose}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50">
            <div className="mx-auto w-full max-w-md rounded-t-modal bg-bg-surface px-6 pb-9 pt-3 shadow-modal animate-slideUp">
              <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border-light" />
              <h2 className="mb-4 font-display text-xl text-text-primary">Add Article</h2>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                placeholder="Paste article or Reddit link"
                className="w-full rounded-button border border-border-light px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-accent-celadon focus:outline-none focus:ring-1 focus:ring-accent-celadon/30"
              />
              <button
                type="button"
                disabled={!isValidUrl(url.trim())}
                onClick={handleSubmit}
                className="mt-3 w-full rounded-button bg-accent-celadon py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-[#3E8A7B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Adapt to Korean →
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
