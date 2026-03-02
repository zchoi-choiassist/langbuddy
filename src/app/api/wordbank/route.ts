import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface CursorPayload {
  offset: number
}

interface TopikWordRow {
  id: number
  korean: string
  english: string | null
  romanization: string | null
  topik_level: number
}

interface CustomWordRow {
  id: string
  korean: string
  english: string | null
  romanization: string | null
  topik_level: number
}

interface WordBankItem {
  id: string
  source: 'topik' | 'custom'
  korean: string
  english: string | null
  romanization: string | null
  topik_level: number
  mastery: number
  topikWordId: number | null
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(String(payload.offset), 'utf8').toString('base64')
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const offset = Number(Buffer.from(cursor, 'base64').toString('utf8'))
    if (Number.isNaN(offset) || offset < 0) return null
    return { offset }
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
  const customOnly = ['1', 'true', 'yes'].includes((url.searchParams.get('customOnly') ?? '').toLowerCase())
  const cursor = url.searchParams.get('cursor')

  const parsedTopikLevel = topikLevel ? Number(topikLevel) : null
  const hasTopikLevel = parsedTopikLevel !== null && !Number.isNaN(parsedTopikLevel)

  let topikPromise: PromiseLike<{ data: TopikWordRow[] | null; error: { message: string } | null }> | null = null
  if (!customOnly) {
    let topikQuery = supabaseAdmin
      .from('topik_words')
      .select('id, korean, english, romanization, topik_level')

    if (hasTopikLevel) {
      topikQuery = topikQuery.eq('topik_level', parsedTopikLevel!)
    }

    topikPromise = topikQuery
      .order('topik_level', { ascending: true })
      .order('korean', { ascending: true })
      .order('id', { ascending: true })
  }

  let customQuery = supabaseAdmin
    .from('user_custom_words')
    .select('id, korean, english, romanization, topik_level')
    .eq('user_id', session.user.id)

  if (hasTopikLevel) {
    customQuery = customQuery.eq('topik_level', parsedTopikLevel!)
  }

  customQuery = customQuery
    .order('topik_level', { ascending: true })
    .order('korean', { ascending: true })
    .order('id', { ascending: true })

  const [topikResult, customResult] = await Promise.all([
    topikPromise ? topikPromise : Promise.resolve({ data: [], error: null }),
    customQuery,
  ])

  if (topikResult.error) {
    return NextResponse.json({ error: topikResult.error.message }, { status: 500 })
  }
  if (customResult.error) {
    return NextResponse.json({ error: customResult.error.message }, { status: 500 })
  }

  const topikItems: WordBankItem[] = ((topikResult.data ?? []) as TopikWordRow[]).map(row => ({
    id: `topik:${row.id}`,
    source: 'topik',
    korean: row.korean,
    english: row.english,
    romanization: row.romanization,
    topik_level: row.topik_level,
    mastery: 0,
    topikWordId: row.id,
  }))

  const customItems: WordBankItem[] = ((customResult.data ?? []) as CustomWordRow[]).map(row => ({
    id: `custom:${row.id}`,
    source: 'custom',
    korean: row.korean,
    english: row.english,
    romanization: row.romanization,
    topik_level: row.topik_level,
    mastery: 0,
    topikWordId: null,
  }))

  const topikIds = topikItems
    .map(item => item.topikWordId)
    .filter((value): value is number => typeof value === 'number')

  const masteryByWord = new Map<number, number>()
  if (topikIds.length > 0) {
    const { data: masteryRows, error: masteryError } = await supabaseAdmin
      .from('user_word_mastery')
      .select('word_id, mastery')
      .eq('user_id', session.user.id)
      .in('word_id', topikIds)

    if (masteryError) {
      return NextResponse.json({ error: masteryError.message }, { status: 500 })
    }

    for (const row of masteryRows ?? []) {
      masteryByWord.set(row.word_id as number, row.mastery as number)
    }
  }

  const merged = [...topikItems, ...customItems].map(item =>
    item.topikWordId === null
      ? item
      : { ...item, mastery: masteryByWord.get(item.topikWordId) ?? 0 }
  )
  merged.sort((a, b) => {
    const aSeen = a.mastery > 0 ? 1 : 0
    const bSeen = b.mastery > 0 ? 1 : 0
    if (aSeen !== bSeen) return bSeen - aSeen
    if (a.topik_level !== b.topik_level) return a.topik_level - b.topik_level
    const koreanCompare = a.korean.localeCompare(b.korean, 'ko')
    if (koreanCompare !== 0) return koreanCompare
    return a.id.localeCompare(b.id)
  })

  const decoded = cursor ? decodeCursor(cursor) : null
  const offset = decoded?.offset ?? 0
  const page = merged.slice(offset, offset + limit)
  const nextOffset = offset + page.length
  const nextCursor = nextOffset < merged.length
    ? encodeCursor({ offset: nextOffset })
    : null

  return NextResponse.json({ items: page, nextCursor })
}
