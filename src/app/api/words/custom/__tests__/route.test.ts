import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  authMock,
  fromMock,
  duplicateRowsRef,
  insertedRowsRef,
  topikRowsRef,
  customRowsRef,
} = vi.hoisted(() => {
  const authMock = vi.fn()
  const duplicateRowsRef: { current: Array<{ id: number; korean: string }> } = { current: [] }
  const insertedRowsRef: { current: Array<Record<string, unknown>> } = { current: [] }
  const topikRowsRef: { current: Array<{ korean: string }> } = { current: [] }
  const customRowsRef: { current: Array<{ korean: string }> } = { current: [] }

  const fromMock = vi.fn((table: string) => {
    if (table === 'user_custom_words') {
      return {
        select: vi.fn(() => {
          const state = {
            userId: null as string | null,
            words: null as string[] | null,
            limitCount: null as number | null,
          }
          const builder = {
            eq: vi.fn((column: string, value: string) => {
              if (column === 'user_id') state.userId = value
              return builder
            }),
            in: vi.fn((column: string, values: string[]) => {
              if (column === 'korean') state.words = values
              return builder
            }),
            limit: vi.fn(async (count: number) => {
              state.limitCount = count
              if (state.limitCount === 1) {
                return { data: duplicateRowsRef.current, error: null }
              }
              return { data: customRowsRef.current, error: null }
            }),
          }
          return builder
        }),
        insert: vi.fn((payload: Record<string, unknown>) => {
          insertedRowsRef.current.push(payload)
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: {
                  id: 501,
                  ...payload,
                },
                error: null,
              })),
            })),
          }
        }),
      }
    }

    if (table === 'topik_words') {
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            limit: vi.fn(async () => ({
              data: topikRowsRef.current,
              error: null,
            })),
          })),
        })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    authMock,
    fromMock,
    duplicateRowsRef,
    insertedRowsRef,
    topikRowsRef,
    customRowsRef,
  }
})

vi.mock('@/lib/auth', () => ({ auth: authMock }))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: fromMock },
}))

import { POST } from '@/app/api/words/custom/route'

describe('POST /api/words/custom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({ user: { id: 'user-1' } })
    duplicateRowsRef.current = []
    insertedRowsRef.current = []
    topikRowsRef.current = []
    customRowsRef.current = []
  })

  it('strips punctuation from korean input before saving', async () => {
    const req = new Request('http://localhost/api/words/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        korean: '...간격이,',
        english: 'spacing',
        romanization: 'gangyeogi',
        topikLevel: 2,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(insertedRowsRef.current[0]?.korean).toBe('간격이')
  })

  it('saves canonical base when variation matches known base word', async () => {
    topikRowsRef.current = [{ korean: '간격' }]

    const req = new Request('http://localhost/api/words/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        korean: '간격은',
        english: 'spacing',
        romanization: 'gangyeogeun',
        topikLevel: 2,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(insertedRowsRef.current[0]?.korean).toBe('간격')
  })

  it('returns conflict when any canonical variation already exists', async () => {
    duplicateRowsRef.current = [{ id: 42, korean: '간격' }]

    const req = new Request('http://localhost/api/words/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        korean: '간격이',
        english: 'spacing',
        romanization: 'gangyeogi',
        topikLevel: 2,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
    expect(insertedRowsRef.current).toHaveLength(0)
  })
})
