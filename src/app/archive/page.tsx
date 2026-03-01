import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ArticleCard } from '@/components/ArticleCard'
import Link from 'next/link'

export default async function ArchivePage() {
  const session = await auth()

  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('id, title, source_url, original_english, status, created_at, total_score')
    .eq('user_id', session!.user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  return (
    <main className="max-w-md mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <Link href="/" className="text-blue-600 font-medium text-sm">← Back</Link>
        <h1 className="font-bold text-lg">Archive</h1>
        <span className="ml-auto text-sm text-gray-400">{articles?.length ?? 0} articles</span>
      </header>

      {articles && articles.length > 0 ? (
        articles.map(article => <ArticleCard key={article.id} article={article} />)
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <p className="text-gray-500">No completed articles yet.</p>
        </div>
      )}
    </main>
  )
}
