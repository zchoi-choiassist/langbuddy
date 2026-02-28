import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) redirect('/')
  redirect(`/articles/new?url=${encodeURIComponent(url)}`)
}
