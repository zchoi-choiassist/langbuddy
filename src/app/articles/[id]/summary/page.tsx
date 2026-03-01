import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SummaryPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user.id

  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('title, word_quiz_score, comprehension_score, total_score, user_id')
    .eq('id', id)
    .single()

  if (!article || article.user_id !== userId) notFound()

  const scoreRows = [
    { label: 'Word Quiz', value: article.word_quiz_score },
    { label: 'Comprehension', value: article.comprehension_score },
  ]

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-bg-base px-6 text-center">
      <div className="mb-5 text-5xl [animation:popIn_0.5s_var(--ease-spring)_0.2s_backwards]">🏆</div>
      <h1 className="mb-1 font-display text-[28px] text-text-primary [animation:fadeUp_0.5s_var(--ease-out)_0.3s_backwards]">
        Well done!
      </h1>
      <p className="mb-8 line-clamp-2 text-sm text-text-secondary [animation:fadeUp_0.5s_var(--ease-out)_0.4s_backwards]">
        {article.title}
      </p>

      <div className="w-full rounded-card bg-bg-subtle p-6 text-left [animation:fadeUp_0.5s_var(--ease-out)_0.5s_backwards]">
        <div className="mb-1 font-mono text-[40px] font-semibold text-accent-celadon">
          {article.total_score > 0 ? '+' : ''}
          {article.total_score}
        </div>
        <div className="mb-5 text-[13px] text-text-tertiary">Total Score</div>
        {scoreRows.map(row => (
          <div key={row.label} className="flex items-center justify-between border-t border-border-light py-2.5 text-sm">
            <span className="text-text-secondary">{row.label}</span>
            <span className={`font-mono font-semibold ${row.value >= 0 ? 'text-accent-celadon' : 'text-accent-vermillion'}`}>
              {row.value > 0 ? '+' : ''}
              {row.value}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border-light py-2.5 text-sm">
          <span className="text-text-secondary">Mistakes</span>
          <span className="font-mono font-semibold text-accent-vermillion">
            -{Math.abs(Math.min(article.word_quiz_score, 0) + Math.min(article.comprehension_score, 0))}
          </span>
        </div>
      </div>

      <Link
        href="/"
        className="mt-7 block rounded-button border-[1.5px] border-border-light bg-bg-surface px-12 py-4 text-[15px] font-semibold text-text-primary transition-colors [animation:fadeUp_0.5s_var(--ease-out)_0.6s_backwards] hover:border-accent-celadon hover:text-accent-celadon"
      >
        ← Back to reading list
      </Link>
    </div>
  )
}
