import { describe, it, expect } from 'vitest'
import { isRedditUrl, extractArticleContent } from '@/lib/extract'

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
