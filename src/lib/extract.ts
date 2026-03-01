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

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeArticleUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/^["']+|["']+$/g, '')
  if (isHttpUrl(trimmed)) return trimmed

  try {
    const decoded = decodeURIComponent(trimmed)
    if (isHttpUrl(decoded)) return decoded
  } catch {
    // Invalid percent encoding: fall through to error.
  }

  throw new Error('Invalid URL')
}

export async function extractArticleContent(
  html: string,
  url: string
): Promise<{ title: string; content: string }> {
  try {
    const [{ Readability }, { JSDOM }] = await Promise.all([
      import('@mozilla/readability'),
      import('jsdom'),
    ])

    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()
    if (!article) throw new Error('Could not extract article content')
    return {
      title: article.title || 'Untitled',
      content: (article.textContent ?? '').trim(),
    }
  } catch {
    return extractArticleContentFallback(html)
  }
}

function extractArticleContentFallback(html: string): { title: string; content: string } {
  const sanitized = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')

  const title =
    extractMetaContent(sanitized, 'property', 'og:title') ||
    extractMetaContent(sanitized, 'name', 'twitter:title') ||
    extractTagText(sanitized, 'title') ||
    'Untitled'

  const paragraphs = Array.from(sanitized.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map(match => normalizeText(stripTags(match[1])))
    .filter(text => text.length >= 35)

  let content = paragraphs.join('\n\n').trim()
  if (!content) {
    content = normalizeText(stripTags(extractTagTextRaw(sanitized, 'body') || sanitized))
  }

  if (content.length < 80) {
    throw new Error('Could not extract article content')
  }

  return { title: normalizeText(title), content }
}

function extractMetaContent(html: string, attrName: string, attrValue: string): string | null {
  const escapedValue = escapeRegExp(attrValue)
  const metaPattern = new RegExp(
    `<meta[^>]*${attrName}=["']${escapedValue}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    'i'
  )
  const reversePattern = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*${attrName}=["']${escapedValue}["'][^>]*>`,
    'i'
  )
  return metaPattern.exec(html)?.[1] ?? reversePattern.exec(html)?.[1] ?? null
}

function extractTagText(html: string, tag: string): string | null {
  const raw = extractTagTextRaw(html, tag)
  return raw ? normalizeText(stripTags(raw)) : null
}

function extractTagTextRaw(html: string, tag: string): string | null {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  return pattern.exec(html)?.[1] ?? null
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ')
}

function normalizeText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function fetchAndExtract(
  url: string,
  redditType?: 'post' | 'article'
): Promise<ExtractedContent> {
  const normalizedUrl = normalizeArticleUrl(url)

  if (isRedditUrl(normalizedUrl)) {
    return fetchRedditContent(normalizedUrl, redditType)
  }

  const res = await fetch(normalizedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LangBuddy/1.0)' },
  })
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`)
  const html = await res.text()
  const { title, content } = await extractArticleContent(html, normalizedUrl)
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
    if (!articleRes.ok) throw new Error(`Failed to fetch article: ${articleRes.status}`)
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
