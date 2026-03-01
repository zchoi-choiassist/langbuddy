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

  it('falls back to regex extraction when readability modules fail to load', async () => {
    vi.resetModules()
    vi.doMock('@mozilla/readability', () => {
      throw new Error('readability load failed')
    })
    vi.doMock('jsdom', () => {
      throw new Error('jsdom load failed')
    })

    const { extractArticleContent: fallbackExtract } = await import('@/lib/extract')

    const html = `
      <html>
        <head>
          <meta property="og:title" content="Fallback Headline" />
          <title>Ignored Title</title>
        </head>
        <body>
          <p>First paragraph with enough content to be selected by fallback extraction logic safely.</p>
          <p>Second paragraph with additional article content so total extracted text is substantial.</p>
        </body>
      </html>
    `

    const result = await fallbackExtract(html, 'https://example.com/story')
    expect(result.title).toBe('Fallback Headline')
    expect(result.content).toContain('First paragraph')
    expect(result.content).toContain('Second paragraph')

    vi.doUnmock('@mozilla/readability')
    vi.doUnmock('jsdom')
    vi.resetModules()
  })

  it('strips ad and ui boilerplate from extracted english content', async () => {
    vi.resetModules()
    vi.doMock('@mozilla/readability', () => ({
      Readability: class {
        parse() {
          return {
            title: 'Live Coverage',
            textContent:
              "Live Updates Video Ad Feedback Watch CNN's live coverage as events unfold. • Source: CNN Ad Feedback • Supreme leader killed: Iran has confirmed the death after overnight strikes, and regional officials say emergency meetings are underway while air defense systems remain on high alert.",
          }
        }
      },
    }))
    vi.doMock('jsdom', () => ({
      JSDOM: class {
        window = { document: {} }
      },
    }))

    const { extractArticleContent: mockedExtract } = await import('@/lib/extract')
    const result = await mockedExtract('<html></html>', 'https://www.cnn.com/world/live-news/example')

    expect(result.content).not.toContain('Ad Feedback')
    expect(result.content).not.toContain('Live Updates')
    expect(result.content).toContain('Supreme leader killed')

    vi.doUnmock('@mozilla/readability')
    vi.doUnmock('jsdom')
    vi.resetModules()
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
