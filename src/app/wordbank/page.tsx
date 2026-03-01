import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { WordBankFilters } from '@/components/WordBankFilters'
import Link from 'next/link'

export default async function WordBankPage() {
  const session = await auth()
  const userId = session!.user.id

  const { data: rows } = await supabaseAdmin
    .from('user_word_mastery')
    .select('word_id, mastery, times_correct, times_seen, topik_words(korean, english, romanization, topik_level)')
    .eq('user_id', userId)

  const words = (rows ?? []).map(r => ({
    word_id: r.word_id,
    mastery: r.mastery,
    times_seen: r.times_seen,
    korean: (r.topik_words as any).korean,
    english: (r.topik_words as any).english,
    romanization: (r.topik_words as any).romanization,
    topik_level: (r.topik_words as any).topik_level,
  }))

  return (
    <main className="max-w-md mx-auto bg-gray-50 min-h-screen">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-blue-600 font-medium text-sm">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Word Bank</h1>
        <span className="text-sm text-gray-400">{words.length} words</span>
      </header>

      {words.length > 0 ? (
        <WordBankFilters words={words} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <p className="text-gray-500">No words yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Tap highlighted words while reading to build your word bank.
          </p>
        </div>
      )}
    </main>
  )
}
