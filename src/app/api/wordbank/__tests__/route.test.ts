import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, fromMock } = vi.hoisted(() => {
  const authMock = vi.fn()

  const topikRows = [
    { id: 11, korean: '경제', english: 'economy', romanization: 'gyeongje', topik_level: 2 },
    { id: 12, korean: '가족', english: 'family', romanization: 'gajok', topik_level: 1 },
  ]
  const customRows = [
    { id: 'c-1', user_id: 'user-1', korean: '어플', english: 'app', romanization: 'eopeul', topik_level: 2 },
    { id: 'c-2', user_id: 'user-1', korean: '주식', english: 'stock', romanization: 'jusik', topik_level: 2 },
    { id: 'c-3', user_id: 'other-user', korean: '학교', english: 'school', romanization: 'hakgyo', topik_level: 1 },
  ]
  const masteryRows = [{ word_id: 11, mastery: 5 }]

  function topikBuilder() {
    let level: number | null = null
    const builder = {
      eq: vi.fn((column: string, value: number) => {
        if (column === 'topik_level') level = value
        return builder
      }),
      order: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => queryResult()),
        })),
      })),
    }
    return builder

    function queryResult() {
      const filtered = level === null ? topikRows : topikRows.filter(row => row.topik_level === level)
      return Promise.resolve({ data: filtered, error: null })
    }
  }

  function customBuilder() {
    let userId: string | null = null
    let level: number | null = null

    function queryResult() {
      const filtered = customRows
        .filter(row => (userId === null ? true : row.user_id === userId))
        .filter(row => (level === null ? true : row.topik_level === level))
        .map(({ user_id: _userId, ...rest }) => rest)
      return Promise.resolve({ data: filtered, error: null })
    }

    const builder = {
      eq: vi.fn((column: string, value: string | number) => {
        if (column === 'user_id') userId = String(value)
        if (column === 'topik_level') level = Number(value)
        return builder
      }),
      order: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => queryResult()),
        })),
      })),
    }
    return builder
  }

  function masteryBuilder() {
    return {
      eq: vi.fn(() => ({
        in: vi.fn(async (_column: string, ids: number[]) => ({
          data: masteryRows.filter(row => ids.includes(row.word_id)),
          error: null,
        })),
      })),
    }
  }

  const fromMock = vi.fn((table: string) => {
    if (table === 'topik_words') {
      return { select: vi.fn(() => topikBuilder()) }
    }
    if (table === 'user_custom_words') {
      return { select: vi.fn(() => customBuilder()) }
    }
    if (table === 'user_word_mastery') {
      return { select: vi.fn(() => masteryBuilder()) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return { authMock, fromMock }
})

vi.mock('@/lib/auth', () => ({ auth: authMock }))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: fromMock },
}))

import { GET } from '@/app/api/wordbank/route'

describe('GET /api/wordbank', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('returns all words sorted with mastery > 0 first', async () => {
    const req = new Request('http://localhost/api/wordbank?limit=10')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.items.map((item: { korean: string }) => item.korean)).toEqual(['경제', '가족', '어플', '주식'])
    expect(data.items[0].source).toBe('topik')
    expect(data.items[0].mastery).toBe(5)
    expect(data.items[2].source).toBe('custom')
  })

  it('returns only custom words when customOnly=true', async () => {
    const req = new Request('http://localhost/api/wordbank?limit=10&customOnly=true')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.items).toHaveLength(2)
    expect(data.items.every((item: { source: string }) => item.source === 'custom')).toBe(true)
  })

  it('applies topikLevel to both topik and custom words', async () => {
    const req = new Request('http://localhost/api/wordbank?limit=10&topikLevel=2')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.items.map((item: { korean: string }) => item.korean)).toEqual(['경제', '어플', '주식'])
  })

  it('returns unauthorized when no session', async () => {
    authMock.mockResolvedValue(null)
    const req = new Request('http://localhost/api/wordbank')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
