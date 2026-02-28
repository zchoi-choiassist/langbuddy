import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export interface ExtractedContent {
  title: string
  content: string
  isReddit: boolean
  hasLinkedArticle?: boolean
}

export function isRedditUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes('reddit.com')
  } catch {
    return false
  }
}

export async function extractArticleContent(
  html: string,
  url: string
): Promise<{ title: string; content: string }> {
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()
  if (!article) throw new Error('Could not extract article content')
  return {
    title: article.title || 'Untitled',
    content: (article.textContent ?? '').trim(),
  }
}

export async function fetchAndExtract(
  url: string,
  redditType?: 'post' | 'article'
): Promise<ExtractedContent> {
  if (isRedditUrl(url)) {
    return fetchRedditContent(url, redditType)
  }

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LangBuddy/1.0)' },
  })
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`)
  const html = await res.text()
  const { title, content } = await extractArticleContent(html, url)
  return { title, content, isReddit: false }
}

async function fetchRedditContent(
  url: string,
  type?: 'post' | 'article'
): Promise<ExtractedContent> {
  const jsonUrl = url.split('?')[0].replace(/\/?$/, '.json?limit=10')
  const res = await fetch(jsonUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LangBuddy/1.0)' },
  })
  if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status}`)
  const data = await res.json()

  const post = data[0]?.data?.children?.[0]?.data
  if (!post) throw new Error('Could not parse Reddit response')

  const externalUrl = post.url && !isRedditUrl(post.url) ? post.url : null

  // Signal that a choice is needed before processing
  if (!type) {
    return {
      title: post.title || 'Reddit Post',
      content: '',
      isReddit: true,
      hasLinkedArticle: !!externalUrl,
    }
  }

  if (type === 'article' && externalUrl) {
    const articleRes = await fetch(externalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LangBuddy/1.0)' },
    })
    const html = await articleRes.text()
    const { title, content } = await extractArticleContent(html, externalUrl)
    return { title, content, isReddit: true }
  }

  // Adapt the Reddit post + top 5 comments
  const comments = (data[1]?.data?.children ?? [])
    .slice(0, 5)
    .map((c: { data?: { body?: string } }) => c.data?.body)
    .filter(Boolean)
    .join('\n\n')
  const content = [post.selftext, comments].filter(Boolean).join('\n\n---\n\n')
  return {
    title: post.title || 'Reddit Post',
    content: content || post.title,
    isReddit: true,
  }
}
