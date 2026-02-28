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
      .select('id, title, source_url, original_english, status, created_at, total_score')
      .eq('user_id', userId)
      .in('status', ['unread', 'reading'])
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('user_settings')
      .select('topik_level')
      .eq('user_id', userId)
      .single(),
  ])

  return (
    <main className="max-w-md mx-auto">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h1 className="font-bold text-lg">LangBuddy</h1>
        <div className="flex items-center gap-3">
          <TopikSelector initial={settings?.topik_level ?? 2} />
          <Link href="/archive" className="text-gray-500 text-sm">Archive</Link>
          <Link href="/wordbank" className="text-gray-500 text-sm">Words</Link>
        </div>
      </header>

      {articles && articles.length > 0 ? (
        articles.map(article => <ArticleCard key={article.id} article={article} />)
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <p className="text-gray-500 mb-2">Your reading queue is empty.</p>
          <p className="text-sm text-gray-400">
            Share any article or Reddit link to LangBuddy from your browser to get started.
          </p>
        </div>
      )}
    </main>
  )
}
