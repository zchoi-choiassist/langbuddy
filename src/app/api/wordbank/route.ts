import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface CursorPayload {
  level: number
  korean: string
  id: number
}

interface WordRow {
  id: number
  korean: string
  english: string | null
  romanization: string | null
  topik_level: number
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(`${payload.level}|${payload.korean}|${payload.id}`, 'utf8').toString('base64')
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8')
    const [levelText, korean, idText] = decoded.split('|')
    const level = Number(levelText)
    const id = Number(idText)
    if (!korean || Number.isNaN(level) || Number.isNaN(id)) return null
    return { level, korean, id }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') ?? '40'), 100))
  const topikLevel = url.searchParams.get('topikLevel')
  const cursor = url.searchParams.get('cursor')

  let query = supabaseAdmin
    .from('topik_words')
    .select('id, korean, english, romanization, topik_level')

  if (topikLevel) {
    const level = Number(topikLevel)
    if (!Number.isNaN(level)) {
      query = query.eq('topik_level', level)
    }
  }

  query = query
    .order('topik_level', { ascending: true })
    .order('korean', { ascending: true })
    .order('id', { ascending: true })

  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (decoded) {
      query = query.or(
        `topik_level.gt.${decoded.level},and(topik_level.eq.${decoded.level},korean.gt.${decoded.korean}),and(topik_level.eq.${decoded.level},korean.eq.${decoded.korean},id.gt.${decoded.id})`
      )
    }
  }

  const { data: rows, error } = await query.range(0, limit - 1)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const safeRows = (rows ?? []) as WordRow[]
  const ids = safeRows.map(row => row.id)

  const masteryByWord = new Map<number, number>()
  if (ids.length > 0) {
    const { data: masteryRows, error: masteryError } = await supabaseAdmin
      .from('user_word_mastery')
      .select('word_id, mastery')
      .eq('user_id', session.user.id)
      .in('word_id', ids)

    if (masteryError) {
      return NextResponse.json({ error: masteryError.message }, { status: 500 })
    }

    for (const row of masteryRows ?? []) {
      masteryByWord.set(row.word_id as number, row.mastery as number)
    }
  }

  const items = safeRows.map(row => ({
    ...row,
    mastery: masteryByWord.get(row.id) ?? 0,
  }))

  const last = items[items.length - 1]
  const nextCursor = last
    ? encodeCursor({ level: last.topik_level, korean: last.korean, id: last.id })
    : null

  return NextResponse.json({ items, nextCursor })
}
