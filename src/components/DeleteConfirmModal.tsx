'use client'

interface DeleteConfirmModalProps {
  articleTitle: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({ articleTitle, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        aria-label="Close delete confirmation"
        className="fixed inset-0 z-50 bg-black/40 animate-fadeIn"
        onClick={onCancel}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto w-full max-w-md rounded-t-modal bg-bg-surface px-6 pb-9 pt-3 shadow-modal animate-slideUp">
          {/* Handle */}
          <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border-light" />

          {/* Warning icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-vermillion-light">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-vermillion)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>

          <h2 className="mb-2 text-center font-display text-xl text-text-primary">
            Delete this article?
          </h2>

          <p className="mb-6 text-center text-[14px] leading-relaxed text-text-secondary">
            <span className="font-korean-serif font-semibold text-text-primary">{articleTitle}</span>
            {' '}will be permanently removed, including all quiz progress and scores.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onConfirm}
              className="w-full rounded-button bg-accent-vermillion py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-[#C4432F] active:scale-[0.98]"
            >
              Delete Article
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-button py-3.5 text-[15px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
