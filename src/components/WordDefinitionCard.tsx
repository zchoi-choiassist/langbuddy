'use client'

interface WordDefinitionCardProps {
  word: {
    korean: string
    english: string
    romanization: string
  }
  onClose: () => void
}

export function WordDefinitionCard({ word, onClose }: WordDefinitionCardProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-modal bg-bg-surface px-[22px] pb-9 pt-7 shadow-modal animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-6 h-1 w-9 rounded bg-border-light" />
        <div className="mb-6 text-center">
          <p className="font-korean-serif text-4xl font-bold text-text-primary">{word.korean}</p>
          <p className="mt-1 text-sm text-text-tertiary">{word.romanization}</p>
        </div>
        <div className="mx-auto mb-6 max-w-[280px] rounded-[14px] border-[1.5px] border-accent-celadon bg-accent-celadon-light px-4 py-4 text-center">
          <p className="text-sm font-medium text-text-primary">{word.english}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-button bg-accent-celadon px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#3E8A7B]"
        >
          Close
        </button>
      </div>
    </div>
  )
}
