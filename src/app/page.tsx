import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ArticleList } from '@/components/ArticleList'
import { TopikSelector } from '@/components/TopikSelector'
import { AddArticleFab } from '@/components/AddArticleFab'
import Link from 'next/link'

export default async function HomePage() {
  const session = await auth()
  const userId = session!.user.id

  const [{ data: articles }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from('articles')
      .select('id, title, source_url, original_english, status, created_at, total_score, topik_level_at_time, word_quiz_score, comprehension_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('user_settings')
      .select('topik_level')
      .eq('user_id', userId)
      .single(),
  ])

  const allArticles = articles ?? []
  const waitingCount = allArticles.filter(a => a.status !== 'completed').length

  return (
    <main className="max-w-md mx-auto min-h-screen bg-bg-base">
      <header className="relative px-5 pt-4 pb-5">
        <div
          aria-hidden
          className="absolute -top-1 right-4 font-korean-serif text-[80px] font-light leading-none text-border-light opacity-50 select-none"
        >
          읽기
        </div>
        <h1 className="relative font-display text-[32px] font-normal leading-[1.15] text-text-primary">
          Reading List
        </h1>
        <p className="relative mt-1 text-sm text-text-secondary">
          {waitingCount} {waitingCount === 1 ? 'article' : 'articles'} waiting
        </p>
        <div className="relative mt-4 flex items-center gap-3">
          <TopikSelector initial={settings?.topik_level ?? 2} />
          <Link href="/archive" className="text-sm font-medium text-text-secondary hover:text-accent-celadon transition-colors">
            Archive
          </Link>
          <Link href="/wordbank" className="text-sm font-medium text-text-secondary hover:text-accent-celadon transition-colors">
            Words
          </Link>
        </div>
      </header>

      <ArticleList initialArticles={allArticles} />
      <AddArticleFab />
    </main>
  )
}
