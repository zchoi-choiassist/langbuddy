import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchAndExtract } from '@/lib/extract'
import { injectMediaSegments } from '@/lib/media-placement'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Segment } from '@/lib/types'

interface BackfillBody {
  limit?: number
  cursor?: string
}

function isAdminUser(userId: string): boolean {
  const raw = process.env.ADMIN_USER_IDS ?? ''
  const allowed = raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  return allowed.includes(userId)
}

export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminUser(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: BackfillBody = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const limit = Math.max(1, Math.min(100, body.limit ?? 20))

  const baseQuery = supabaseAdmin
    .from('articles')
    .select('id, source_url, adapted_korean, created_at')
    .order('created_at', { ascending: false })

  const cursor = body.cursor?.trim()
  const pagedQuery = cursor && 'lt' in baseQuery
    ? (baseQuery as typeof baseQuery & { lt: (column: string, value: string) => typeof baseQuery }).lt('created_at', cursor)
    : baseQuery

  const { data: rows, error } = await pagedQuery.limit(limit)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let processed = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const row of rows ?? []) {
    processed += 1
    try {
      const extracted = await fetchAndExtract(row.source_url)
      const existingSegments = (row.adapted_korean ?? []) as Segment[]
      const merged = injectMediaSegments(existingSegments, extracted.images ?? [])

      if (JSON.stringify(existingSegments) === JSON.stringify(merged)) {
        skipped += 1
        continue
      }

      const { error: updateError } = await supabaseAdmin
        .from('articles')
        .update({ adapted_korean: merged })
        .eq('id', row.id)

      if (updateError) {
        failed += 1
        continue
      }

      updated += 1
    } catch {
      failed += 1
    }
  }

  const nextCursor = rows && rows.length === limit ? rows[rows.length - 1].created_at : null

  return NextResponse.json({
    processed,
    updated,
    skipped,
    failed,
    nextCursor,
  })
}
