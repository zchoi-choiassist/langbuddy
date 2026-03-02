import { NextResponse } from 'next/server'
import { pollAllFeeds } from '@/lib/feed-poller'

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await pollAllFeeds()
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch feeds' }, { status: 500 })
  }
}
