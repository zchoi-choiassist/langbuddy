import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { WordBankFilters } from '@/components/WordBankFilters'
import Link from 'next/link'

export default async function WordBankPage() {
  const session = await auth()
  const userId = session!.user.id

  const [{ count: totalTopikWords }, { count: highlightedWords }] = await Promise.all([
    supabaseAdmin
      .from('topik_words')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('user_word_mastery')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('mastery', 0),
  ])

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
          {(totalTopikWords ?? 0)} words · {(highlightedWords ?? 0)} highlighted
        </p>
      </header>

      <WordBankFilters />
    </main>
  )
}
