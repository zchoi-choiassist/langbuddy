import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  buildCustomWordBackfillPlan,
  type CustomWordBackfillRow,
  type CustomWordId,
} from '@/lib/custom-word-backfill'

interface ArticleCustomMatchRow {
  id: number
  article_id: string
  custom_word_id: CustomWordId
}

interface BackfillBody {
  dryRun?: boolean
}

function isAdminUser(userId: string): boolean {
  const raw = process.env.ADMIN_USER_IDS ?? ''
  const allowed = raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  return allowed.includes(userId)
}

function idKey(value: CustomWordId): string {
  return String(value)
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
  const dryRun = body.dryRun === true

  const [{ data: topikRows, error: topikError }, { data: customRows, error: customError }] = await Promise.all([
    supabaseAdmin
      .from('topik_words')
      .select('korean'),
    supabaseAdmin
      .from('user_custom_words')
      .select('id, user_id, korean, created_at')
      .order('user_id', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
  ])

  if (topikError) {
    return NextResponse.json({ error: topikError.message }, { status: 500 })
  }
  if (customError) {
    return NextResponse.json({ error: customError.message }, { status: 500 })
  }

  const topikBaseForms = new Set((topikRows ?? []).map(row => row.korean as string))
  const rowsByUser = new Map<string, CustomWordBackfillRow[]>()
  for (const row of (customRows ?? []) as CustomWordBackfillRow[]) {
    const bucket = rowsByUser.get(row.user_id) ?? []
    bucket.push(row)
    rowsByUser.set(row.user_id, bucket)
  }

  let usersProcessed = 0
  let customRowsUpdated = 0
  let customRowsMerged = 0
  let customRowsDeleted = 0
  let matchRowsUpdated = 0
  let matchRowsDeleted = 0

  for (const [currentUserId, userRows] of rowsByUser.entries()) {
    usersProcessed += 1
    const plan = buildCustomWordBackfillPlan(userRows, topikBaseForms)

    if (dryRun) {
      customRowsUpdated += plan.updates.length
      customRowsMerged += plan.merges.length
      customRowsDeleted += plan.deletes.length
      continue
    }

    for (const update of plan.updates) {
      const { error } = await supabaseAdmin
        .from('user_custom_words')
        .update({ korean: update.korean })
        .eq('id', update.id)
        .eq('user_id', currentUserId)

      if (!error) {
        customRowsUpdated += 1
      }
    }

    if (plan.merges.length > 0) {
      const mergeIds = [
        ...new Set(
          plan.merges.flatMap(merge => [idKey(merge.fromId), idKey(merge.toId)])
        ),
      ]

      const { data: matchRows } = await supabaseAdmin
        .from('article_word_matches')
        .select('id, article_id, custom_word_id')
        .eq('user_id', currentUserId)
        .eq('source', 'custom')
        .in('custom_word_id', mergeIds)

      const byWordId = new Map<string, ArticleCustomMatchRow[]>()
      for (const row of (matchRows ?? []) as ArticleCustomMatchRow[]) {
        const key = idKey(row.custom_word_id)
        const bucket = byWordId.get(key) ?? []
        bucket.push(row)
        byWordId.set(key, bucket)
      }

      const targetByArticle = new Set<string>()
      for (const merge of plan.merges) {
        const targetId = idKey(merge.toId)
        for (const row of byWordId.get(targetId) ?? []) {
          targetByArticle.add(`${row.article_id}:${targetId}`)
        }
      }

      for (const merge of plan.merges) {
        const fromId = idKey(merge.fromId)
        const toId = idKey(merge.toId)
        const dupRows = byWordId.get(fromId) ?? []

        for (const row of dupRows) {
          const targetKey = `${row.article_id}:${toId}`
          if (targetByArticle.has(targetKey)) {
            const { error } = await supabaseAdmin
              .from('article_word_matches')
              .delete()
              .eq('id', row.id)
            if (!error) matchRowsDeleted += 1
            continue
          }

          const { error } = await supabaseAdmin
            .from('article_word_matches')
            .update({ custom_word_id: merge.toId })
            .eq('id', row.id)

          if (!error) {
            matchRowsUpdated += 1
            targetByArticle.add(targetKey)
          }
        }

        const { error: deleteError } = await supabaseAdmin
          .from('user_custom_words')
          .delete()
          .eq('id', merge.fromId)
          .eq('user_id', currentUserId)

        if (!deleteError) {
          customRowsMerged += 1
        }
      }
    }

    if (plan.deletes.length > 0) {
      const deleteIds = plan.deletes.map(idKey)
      const { error: matchDeleteError, count: deletedMatches } = await supabaseAdmin
        .from('article_word_matches')
        .delete({ count: 'exact' })
        .eq('user_id', currentUserId)
        .eq('source', 'custom')
        .in('custom_word_id', deleteIds)

      if (!matchDeleteError) {
        matchRowsDeleted += deletedMatches ?? 0
      }

      const { error: wordDeleteError, count: deletedWords } = await supabaseAdmin
        .from('user_custom_words')
        .delete({ count: 'exact' })
        .eq('user_id', currentUserId)
        .in('id', deleteIds)

      if (!wordDeleteError) {
        customRowsDeleted += deletedWords ?? 0
      }
    }
  }

  return NextResponse.json({
    dryRun,
    usersProcessed,
    customRowsUpdated,
    customRowsMerged,
    customRowsDeleted,
    matchRowsUpdated,
    matchRowsDeleted,
  })
}
