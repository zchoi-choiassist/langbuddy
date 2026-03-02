import { describe, expect, it } from 'vitest'
import { buildCustomWordBackfillPlan } from '@/lib/custom-word-backfill'

describe('buildCustomWordBackfillPlan', () => {
  it('strips punctuation and canonicalizes known particle variations', () => {
    const plan = buildCustomWordBackfillPlan(
      [
        { id: 1, user_id: 'u1', korean: '...간격은,', created_at: '2026-03-02T01:00:00.000Z' },
      ],
      new Set(['간격'])
    )

    expect(plan).toEqual({
      updates: [{ id: 1, korean: '간격' }],
      merges: [],
      deletes: [],
    })
  })

  it('merges duplicate canonical rows and keeps the earliest row', () => {
    const plan = buildCustomWordBackfillPlan(
      [
        { id: 1, user_id: 'u1', korean: '간격', created_at: '2026-03-02T01:00:00.000Z' },
        { id: 2, user_id: 'u1', korean: '간격이', created_at: '2026-03-02T02:00:00.000Z' },
      ],
      new Set(['간격'])
    )

    expect(plan).toEqual({
      updates: [],
      merges: [{ fromId: 2, toId: 1 }],
      deletes: [],
    })
  })

  it('deletes rows with no Korean token after stripping', () => {
    const plan = buildCustomWordBackfillPlan(
      [
        { id: 99, user_id: 'u1', korean: '...!!!', created_at: '2026-03-02T01:00:00.000Z' },
      ],
      new Set()
    )

    expect(plan).toEqual({
      updates: [],
      merges: [],
      deletes: [99],
    })
  })
})
