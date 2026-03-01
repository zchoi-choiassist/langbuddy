import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ArticleProcessor } from '@/components/ArticleProcessor'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

describe('ArticleProcessor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    push.mockReset()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ articleId: 'article-1' }),
    }))
  })

  it('redirects to home after 5 seconds instead of article detail', async () => {
    render(<ArticleProcessor url="https://example.com/story" />)

    await Promise.resolve()
    expect(fetch).toHaveBeenCalledWith('/api/articles/adapt', expect.objectContaining({ method: 'POST' }))

    await vi.advanceTimersByTimeAsync(5000)

    expect(push).toHaveBeenCalledWith('/')
    expect(push).not.toHaveBeenCalledWith('/articles/article-1')
  })
})
