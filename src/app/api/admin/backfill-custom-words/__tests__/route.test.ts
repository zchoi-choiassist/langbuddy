import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  authMock,
  topikRowsRef,
  customRowsRef,
  fromMock,
} = vi.hoisted(() => {
  const authMock = vi.fn()
  const topikRowsRef: { current: Array<{ korean: string }> } = { current: [] }
  const customRowsRef: { current: Array<{ id: number; user_id: string; korean: string; created_at: string }> } = { current: [] }

  const fromMock = vi.fn((table: string) => {
    if (table === 'topik_words') {
      return {
        select: vi.fn(async () => ({ data: topikRowsRef.current, error: null })),
      }
    }

    if (table === 'user_custom_words') {
      return {
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(async () => ({ data: customRowsRef.current, error: null })),
            })),
          })),
        })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    authMock,
    topikRowsRef,
    customRowsRef,
    fromMock,
  }
})

vi.mock('@/lib/auth', () => ({ auth: authMock }))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: fromMock },
}))

import { POST } from '@/app/api/admin/backfill-custom-words/route'

describe('POST /api/admin/backfill-custom-words', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_USER_IDS = 'admin-1'
    topikRowsRef.current = [{ korean: '간격' }]
    customRowsRef.current = []
  })

  it('returns forbidden for non-admin users', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1' } })
    const res = await POST(new Request('http://localhost/api/admin/backfill-custom-words', { method: 'POST' }))
    expect(res.status).toBe(403)
  })

  it('returns dry-run summary counts without mutating', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1' } })
    customRowsRef.current = [
      { id: 1, user_id: 'u1', korean: '간격', created_at: '2026-03-01T00:00:00.000Z' },
      { id: 2, user_id: 'u1', korean: '...간격은,', created_at: '2026-03-01T01:00:00.000Z' },
      { id: 3, user_id: 'u2', korean: '...!!!', created_at: '2026-03-01T02:00:00.000Z' },
    ]

    const res = await POST(new Request('http://localhost/api/admin/backfill-custom-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: true }),
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      dryRun: true,
      usersProcessed: 2,
      customRowsUpdated: 0,
      customRowsMerged: 1,
      customRowsDeleted: 1,
    })
  })
})
