import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ArticleCard } from '@/components/ArticleCard'
import Link from 'next/link'

export default async function ArchivePage() {
  const session = await auth()

  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('id, title, source_url, original_english, status, created_at, total_score, topik_level_at_time, word_quiz_score, comprehension_score')
    .eq('user_id', session!.user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  return (
    <main className="max-w-md mx-auto min-h-screen bg-bg-base">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-bg-base px-4 py-3">
        <Link href="/" className="text-sm font-medium text-accent-celadon">← Back</Link>
        <h1 className="font-display text-2xl text-text-primary">Archive</h1>
        <span className="ml-auto text-sm text-text-tertiary">{articles?.length ?? 0} articles</span>
      </header>

      {articles && articles.length > 0 ? (
        <div className="space-y-3 px-4 py-4">
          {articles.map((article, index) => <ArticleCard key={article.id} article={article} index={index} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <p className="text-text-secondary">No completed articles yet.</p>
        </div>
      )}
    </main>
  )
}
