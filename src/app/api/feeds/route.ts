import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseFeed } from '@/lib/rss'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('user_feeds')
    .select('id, feed_url, title, last_polled_at, error_count, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { url } = body

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  let feedUrl = url.trim()

  // Ensure URL has a scheme
  if (!/^https?:\/\//i.test(feedUrl)) {
    feedUrl = 'https://' + feedUrl
  }

  // Normalize Substack URLs: append /feed if no path beyond root
  if (/^https?:\/\/[^/]+\.substack\.com\/?$/i.test(feedUrl)) {
    feedUrl = feedUrl.replace(/\/?$/, '/feed')
  }

  let parsedFeed: Awaited<ReturnType<typeof parseFeed>>
  try {
    parsedFeed = await parseFeed(feedUrl)
  } catch {
    return NextResponse.json({ error: 'Unable to parse feed. Please check the URL.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_feeds')
    .insert({
      user_id: session.user.id,
      feed_url: feedUrl,
      title: parsedFeed.title || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Feed already subscribed' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
