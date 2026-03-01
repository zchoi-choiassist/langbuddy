import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  authMock,
  masteryInMock,
  masteryEqMock,
  fromMock,
} = vi.hoisted(() => {
  const authMock = vi.fn()

  const topikData = [
    { id: 11, korean: '경제', english: 'economy', romanization: 'gyeongje', topik_level: 2 },
    { id: 12, korean: '경험', english: 'experience', romanization: 'gyeongheom', topik_level: 2 },
  ]
  const masteryData = [{ word_id: 12, mastery: 5 }]

  const topikRangeMock = vi.fn(async () => ({ data: topikData, error: null }))
  const topikOrMock = vi.fn(() => ({ range: topikRangeMock }))
  const topikEqMock = vi.fn(() => ({ order: () => ({ order: () => ({ order: () => ({ range: topikRangeMock, or: topikOrMock }) }) }), range: topikRangeMock, or: topikOrMock }))

  const masteryInMock = vi.fn(async () => ({ data: masteryData, error: null }))
  const masteryEqMock = vi.fn(() => ({ in: masteryInMock }))

  const fromMock = vi.fn((table: string) => {
    if (table === 'topik_words') {
      return {
        select: vi.fn(() => ({
          order: () => ({
            order: () => ({
              order: () => ({
                range: topikRangeMock,
                or: topikOrMock,
              }),
            }),
          }),
          eq: topikEqMock,
        })),
      }
    }

    if (table === 'user_word_mastery') {
      return {
        select: vi.fn(() => ({ eq: masteryEqMock })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    authMock,
    topikData,
    masteryData,
    topikRangeMock,
    masteryInMock,
    masteryEqMock,
    topikOrMock,
    topikEqMock,
    fromMock,
  }
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

  it('returns paginated topik words with user mastery and next cursor', async () => {
    const req = new Request('http://localhost/api/wordbank?limit=2&topikLevel=2')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.items).toEqual([
      {
        id: 11,
        korean: '경제',
        english: 'economy',
        romanization: 'gyeongje',
        topik_level: 2,
        mastery: 0,
      },
      {
        id: 12,
        korean: '경험',
        english: 'experience',
        romanization: 'gyeongheom',
        topik_level: 2,
        mastery: 5,
      },
    ])
    expect(data.nextCursor).toBeTruthy()
    expect(masteryEqMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(masteryInMock).toHaveBeenCalledWith('word_id', [11, 12])
  })

  it('returns unauthorized when no session', async () => {
    authMock.mockResolvedValue(null)

    const req = new Request('http://localhost/api/wordbank')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })
})
