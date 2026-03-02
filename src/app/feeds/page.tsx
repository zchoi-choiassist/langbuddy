import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FeedList } from '@/components/FeedList'
import Link from 'next/link'

export default async function FeedsPage() {
  const session = await auth()
  const userId = session!.user.id

  const { data: feeds } = await supabaseAdmin
    .from('user_feeds')
    .select('id, feed_url, title, last_polled_at, error_count, last_error, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-md mx-auto min-h-screen bg-bg-base">
      <header className="relative px-5 pt-4 pb-5">
        <div
          aria-hidden
          className="absolute -top-1 right-4 font-korean-serif text-[80px] font-light leading-none text-border-light opacity-50 select-none"
        >
          구독
        </div>
        <h1 className="relative font-display text-[32px] font-normal leading-[1.15] text-text-primary">
          Feeds
        </h1>
        <p className="relative mt-1 text-sm text-text-secondary">
          {(feeds?.length ?? 0)} {(feeds?.length ?? 0) === 1 ? 'subscription' : 'subscriptions'}
        </p>
        <div className="relative mt-4 flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-text-secondary hover:text-accent-celadon transition-colors">
            ← Reading List
          </Link>
        </div>
      </header>

      <FeedList initialFeeds={feeds ?? []} />
    </main>
  )
}
