import { canonicalizeKoreanToken, extractPrimaryKoreanToken } from '@/lib/vocabulary-analyzer'

export type CustomWordId = string | number

export interface CustomWordBackfillRow {
  id: CustomWordId
  user_id: string
  korean: string
  created_at?: string | null
}

export interface CustomWordUpdate {
  id: CustomWordId
  korean: string
}

export interface CustomWordMerge {
  fromId: CustomWordId
  toId: CustomWordId
}

export interface CustomWordBackfillPlan {
  updates: CustomWordUpdate[]
  merges: CustomWordMerge[]
  deletes: CustomWordId[]
}

function stableSortRows(rows: CustomWordBackfillRow[]): CustomWordBackfillRow[] {
  return [...rows].sort((a, b) => {
    const aCreated = a.created_at ?? ''
    const bCreated = b.created_at ?? ''
    if (aCreated !== bCreated) {
      return aCreated.localeCompare(bCreated)
    }
    return String(a.id).localeCompare(String(b.id))
  })
}

/**
 * Builds a canonicalization plan for one user's custom words.
 * - strips non-word punctuation from stored Korean values
 * - maps known variations (e.g. 간격이/간격은) to canonical base form
 * - merges duplicate canonical rows
 */
export function buildCustomWordBackfillPlan(
  userRows: CustomWordBackfillRow[],
  topikBaseForms: ReadonlySet<string>
): CustomWordBackfillPlan {
  const updates: CustomWordUpdate[] = []
  const merges: CustomWordMerge[] = []
  const deletes: CustomWordId[] = []

  const knownBaseForms = new Set(topikBaseForms)
  const canonicalOwner = new Map<string, CustomWordId>()

  for (const row of stableSortRows(userRows)) {
    const stripped = extractPrimaryKoreanToken(row.korean)
    if (!stripped) {
      deletes.push(row.id)
      continue
    }

    const canonical = canonicalizeKoreanToken(stripped, knownBaseForms)
    knownBaseForms.add(canonical)

    const owner = canonicalOwner.get(canonical)
    if (owner !== undefined && String(owner) !== String(row.id)) {
      merges.push({ fromId: row.id, toId: owner })
      continue
    }

    canonicalOwner.set(canonical, row.id)
    if (row.korean !== canonical) {
      updates.push({ id: row.id, korean: canonical })
    }
  }

  return { updates, merges, deletes }
}
