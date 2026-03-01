import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ArticleCard } from '@/components/ArticleCard'
import { TopikSelector } from '@/components/TopikSelector'
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
  const newArticles = allArticles.filter(article => article.status === 'unread')
  const inProgressArticles = allArticles.filter(article => article.status === 'reading')
  const completedArticles = allArticles.filter(article => article.status === 'completed')
  const waitingCount = newArticles.length + inProgressArticles.length

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

      {allArticles.length > 0 ? (
        <div className="space-y-2 pb-8">
          <section>
            <h2 className="px-4 pt-1 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              New
            </h2>
            <div className="px-4 space-y-3">
              {newArticles.map((article, index) => (
                <ArticleCard key={article.id} article={article} index={index} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              In Progress
            </h2>
            <div className="px-4 space-y-3">
              {inProgressArticles.map((article, index) => (
                <ArticleCard key={article.id} article={article} index={index} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              Completed
            </h2>
            <div className="px-4 space-y-3">
              {completedArticles.map((article, index) => (
                <ArticleCard key={article.id} article={article} index={index} />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="px-4 py-20 text-center">
          <p className="mb-2 text-text-secondary">Your reading queue is empty.</p>
          <p className="text-sm text-text-tertiary">
            Share any article or Reddit link from your browser to get started.
          </p>
        </div>
      )}
    </main>
  )
}
