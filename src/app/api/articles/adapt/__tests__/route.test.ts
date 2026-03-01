import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  afterMock,
  authMock,
  fetchAndExtractMock,
  isRedditUrlMock,
  normalizeArticleUrlMock,
  adaptArticleMock,
  settingsSingleMock,
  insertMock,
  insertSingleMock,
  updateMock,
  updateEqMock,
  fromMock,
} = vi.hoisted(() => {
  const afterMock = vi.fn((task: () => void | Promise<void>) => {
    void task()
  })
  const authMock = vi.fn()
  const fetchAndExtractMock = vi.fn()
  const isRedditUrlMock = vi.fn()
  const normalizeArticleUrlMock = vi.fn()
  const adaptArticleMock = vi.fn()
  const settingsSingleMock = vi.fn()
  const insertMock = vi.fn()
  const insertSingleMock = vi.fn()
  const updateMock = vi.fn()
  const updateEqMock = vi.fn()
  const fromMock = vi.fn((table: string) => {
    if (table === 'user_settings') {
      return {
        select: () => ({
          eq: () => ({
            single: settingsSingleMock,
          }),
        }),
      }
    }

    if (table === 'articles') {
      return {
        insert: insertMock,
        update: updateMock,
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    afterMock,
    authMock,
    fetchAndExtractMock,
    isRedditUrlMock,
    normalizeArticleUrlMock,
    adaptArticleMock,
    settingsSingleMock,
    insertMock,
    insertSingleMock,
    updateMock,
    updateEqMock,
    fromMock,
  }
})

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    after: afterMock,
  }
})

vi.mock('@/lib/auth', () => ({
  auth: authMock,
}))

vi.mock('@/lib/extract', () => ({
  fetchAndExtract: fetchAndExtractMock,
  isRedditUrl: isRedditUrlMock,
  normalizeArticleUrl: normalizeArticleUrlMock,
}))

vi.mock('@/lib/claude', () => ({
  adaptArticle: adaptArticleMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}))

import { POST } from '@/app/api/articles/adapt/route'

describe('POST /api/articles/adapt', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authMock.mockResolvedValue({ user: { id: 'user-1' } })
    settingsSingleMock.mockResolvedValue({ data: { topik_level: 3 } })

    insertSingleMock.mockResolvedValue({ data: { id: 'article-1' }, error: null })
    insertMock.mockReturnValue({
      select: () => ({
        single: insertSingleMock,
      }),
    })

    updateEqMock.mockResolvedValue({ error: null })
    updateMock.mockReturnValue({
      eq: updateEqMock,
    })

    fetchAndExtractMock.mockResolvedValue({
      title: 'Extracted Title',
      content: 'Extracted article content',
      isReddit: false,
    })
    isRedditUrlMock.mockReturnValue(false)
    normalizeArticleUrlMock.mockImplementation((value: string) => value)

    adaptArticleMock.mockResolvedValue({
      adaptedKorean: [{ type: 'text', text: '적응된 내용' }],
      comprehensionQuestions: [
        { id: 'q1', question: 'Q1', options: ['a', 'b', 'c', 'd'], correct: 0 },
        { id: 'q2', question: 'Q2', options: ['a', 'b', 'c', 'd'], correct: 0 },
        { id: 'q3', question: 'Q3', options: ['a', 'b', 'c', 'd'], correct: 0 },
      ],
    })
  })

  it('inserts a placeholder row immediately and schedules background adaptation', async () => {
    const req = new Request('http://localhost/api/articles/adapt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/story' }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.articleId).toBe('article-1')

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      source_url: 'https://example.com/story',
      status: 'unread',
    }))

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(afterMock).toHaveBeenCalledTimes(1)
    expect(fetchAndExtractMock).toHaveBeenCalledWith('https://example.com/story', undefined)
    expect(adaptArticleMock).toHaveBeenCalledWith('Extracted Title', 'Extracted article content', 3)
    expect(updateMock).toHaveBeenCalled()
    expect(updateEqMock).toHaveBeenCalledWith('id', 'article-1')
  })
})
