import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  authMock,
  fetchAndExtractMock,
  injectMediaSegmentsMock,
  rowsMock,
  maybeRowsMock,
  updateEqMock,
  updateMock,
  fromMock,
} = vi.hoisted(() => {
  const authMock = vi.fn()
  const fetchAndExtractMock = vi.fn()
  const injectMediaSegmentsMock = vi.fn()
  const rowsMock = vi.fn()
  const maybeRowsMock = vi.fn()
  const updateEqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))

  const fromMock = vi.fn((table: string) => {
    if (table !== 'articles') throw new Error(`Unexpected table: ${table}`)

    return {
      select: () => ({
        order: () => ({
          limit: rowsMock,
        }),
      }),
      update: updateMock,
    }
  })

  return {
    authMock,
    fetchAndExtractMock,
    injectMediaSegmentsMock,
    rowsMock,
    maybeRowsMock,
    updateEqMock,
    updateMock,
    fromMock,
  }
})

vi.mock('@/lib/auth', () => ({ auth: authMock }))
vi.mock('@/lib/extract', () => ({ fetchAndExtract: fetchAndExtractMock }))
vi.mock('@/lib/media-placement', () => ({ injectMediaSegments: injectMediaSegmentsMock }))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: fromMock },
}))

import { POST } from '@/app/api/admin/backfill-inline-media/route'

describe('POST /api/admin/backfill-inline-media', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rowsMock.mockResolvedValue({ data: [], error: null })
    updateEqMock.mockResolvedValue({ error: null })
    process.env.ADMIN_USER_IDS = 'admin-1'
  })

  it('rejects unauthorized users', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await POST(new Request('http://localhost/api/admin/backfill-inline-media', {
      method: 'POST',
      body: JSON.stringify({ limit: 10 }),
    }))

    expect(res.status).toBe(403)
  })

  it('processes a batch and continues when one article extraction fails', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1' } })
    rowsMock.mockResolvedValue({
      data: [
        {
          id: 'a1',
          source_url: 'https://example.com/1',
          adapted_korean: [{ type: 'text', text: 'one' }],
          created_at: '2026-03-01T00:00:00.000Z',
        },
        {
          id: 'a2',
          source_url: 'https://example.com/2',
          adapted_korean: [{ type: 'text', text: 'two' }],
          created_at: '2026-02-28T00:00:00.000Z',
        },
      ],
      error: null,
    })

    fetchAndExtractMock
      .mockResolvedValueOnce({ images: [{ src: 'https://img.example.com/1.jpg', alt: null, caption: null, paragraphIndex: 0 }] })
      .mockRejectedValueOnce(new Error('network fail'))

    injectMediaSegmentsMock
      .mockReturnValueOnce([
        { type: 'text', text: 'one' },
        { type: 'media', kind: 'image', src: 'https://img.example.com/1.jpg', alt: null, caption: null },
      ])

    const res = await POST(new Request('http://localhost/api/admin/backfill-inline-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 2 }),
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.processed).toBe(2)
    expect(body.updated).toBe(1)
    expect(body.failed).toBe(1)
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      adapted_korean: expect.arrayContaining([
        expect.objectContaining({ type: 'media', src: 'https://img.example.com/1.jpg' }),
      ]),
    }))
    expect(updateEqMock).toHaveBeenCalledWith('id', 'a1')
  })
})
