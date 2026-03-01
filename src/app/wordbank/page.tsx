import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { WordBankFilters } from '@/components/WordBankFilters'
import Link from 'next/link'

type TopikWordRow = {
  korean: string
  english: string
  romanization: string
  topik_level: number
}

type WordBankItem = {
  word_id: number
  mastery: number
  times_correct: number
  times_seen: number
  korean: string
  english: string
  romanization: string
  topik_level: number
}

export default async function WordBankPage() {
  const session = await auth()
  const userId = session!.user.id

  const { data: rows } = await supabaseAdmin
    .from('user_word_mastery')
    .select('word_id, mastery, times_correct, times_seen, topik_words(korean, english, romanization, topik_level)')
    .eq('user_id', userId)

  const words = (rows ?? [])
    .map((row): WordBankItem | null => {
      const relation = row.topik_words as TopikWordRow | TopikWordRow[] | null
      const topikWord = Array.isArray(relation) ? relation[0] : relation
      if (!topikWord) return null
      return {
        word_id: row.word_id,
        mastery: row.mastery,
        times_correct: row.times_correct,
        times_seen: row.times_seen,
        korean: topikWord.korean,
        english: topikWord.english,
        romanization: topikWord.romanization,
        topik_level: topikWord.topik_level,
      }
    })
    .filter((word): word is WordBankItem => word !== null)
  const masteryPct = words.length > 0
    ? Math.round(words.reduce((sum, word) => sum + word.mastery, 0) / words.length)
    : 0

  return (
    <main className="mx-auto min-h-screen max-w-md bg-bg-base">
      <header className="relative px-5 pt-4 pb-4">
        <div
          aria-hidden
          className="absolute -top-3 right-4 font-korean-serif text-[72px] font-light leading-none text-border-light opacity-50 select-none"
        >
          단어
        </div>
        <div className="relative flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-accent-celadon">← Back</Link>
        </div>
        <h1 className="relative font-display text-[28px] text-text-primary">Word Bank</h1>
        <p className="relative mt-0.5 text-sm text-text-secondary">
          {words.length} words · {masteryPct}% mastered
        </p>
      </header>

      {words.length > 0 ? (
        <WordBankFilters words={words} />
      ) : (
        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <p className="text-text-secondary">No words yet.</p>
          <p className="mt-1 text-sm text-text-tertiary">
            Tap highlighted words while reading to build your word bank.
          </p>
        </div>
      )}
    </main>
  )
}
