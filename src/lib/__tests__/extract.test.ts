import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isRedditUrl, extractArticleContent, fetchAndExtract } from '@/lib/extract'

describe('isRedditUrl', () => {
  it('detects reddit.com URLs', () => {
    expect(isRedditUrl('https://www.reddit.com/r/news/comments/abc/title')).toBe(true)
  })
  it('returns false for non-reddit URLs', () => {
    expect(isRedditUrl('https://www.nytimes.com/article')).toBe(false)
  })
  it('handles invalid URLs gracefully', () => {
    expect(isRedditUrl('not-a-url')).toBe(false)
  })
})

describe('extractArticleContent', () => {
  it('extracts title and text from HTML', async () => {
    const html = `
      <html><head><title>Test Article</title></head>
      <body><article><h1>Test Article</h1>
      <p>This is the article content. It has enough text to pass readability thresholds and be extracted properly.</p>
      <p>A second paragraph ensures the content is substantial enough for the extractor to work with.</p>
      </article></body></html>
    `
    const result = await extractArticleContent(html, 'https://example.com/article')
    expect(result.title).toBeTruthy()
    expect(result.content).toContain('article content')
  })

  it('throws when content cannot be extracted', async () => {
    const html = '<html><body></body></html>'
    await expect(extractArticleContent(html, 'https://example.com')).rejects.toThrow()
  })
})

describe('fetchAndExtract', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes percent-encoded URLs before fetching', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <html><head><title>Encoded URL Article</title></head>
          <body><article>
            <p>This article text is long enough for readability to parse correctly.</p>
            <p>A second paragraph keeps extraction stable in tests.</p>
          </article></body></html>
        `),
      })

    vi.stubGlobal('fetch', fetchMock)

    const encodedUrl = 'https%3A%2F%2Fwww.cnn.com%2Fworld%2Flive-news%2Fisrael-iran-attack-02-28-26-hnk-intl'
    await fetchAndExtract(encodedUrl)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.cnn.com/world/live-news/israel-iran-attack-02-28-26-hnk-intl',
      expect.any(Object)
    )
  })

  it('returns needsRedditChoice signal for Reddit URL without type', async () => {
    const mockPost = {
      title: 'Test Post',
      selftext: '',
      url: 'https://external-article.com/story',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { data: { children: [{ data: mockPost }] } },
        { data: { children: [] } },
      ]),
    }))

    const result = await fetchAndExtract('https://www.reddit.com/r/test/comments/abc/title')
    expect(result.isReddit).toBe(true)
    expect(result.hasLinkedArticle).toBe(true)
    expect(result.content).toBe('')
  })
})
