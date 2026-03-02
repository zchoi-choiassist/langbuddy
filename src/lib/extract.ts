export interface ExtractedContent {
  title: string
  content: string
  images: ExtractedImage[]
  isReddit: boolean
  hasLinkedArticle?: boolean
}

export interface ExtractedImage {
  src: string
  alt: string | null
  caption: string | null
  paragraphIndex: number
  width?: number
  height?: number
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
): Promise<{ title: string; content: string; images: ExtractedImage[] }> {
  try {
    const [{ Readability }, { JSDOM }] = await Promise.all([
      import('@mozilla/readability'),
      import('jsdom'),
    ])

    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()
    if (!article) throw new Error('Could not extract article content')
    const cleanedContent = cleanExtractedEnglish(article.textContent ?? '')
    if (cleanedContent.length < 80) {
      throw new Error('Could not extract article content')
    }
    return {
      title: normalizeText(article.title || 'Untitled'),
      content: cleanedContent,
      images: extractInlineImages(html, url),
    }
  } catch {
    return extractArticleContentFallback(html, url)
  }
}

function extractArticleContentFallback(html: string, url: string): { title: string; content: string; images: ExtractedImage[] } {
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
  content = cleanExtractedEnglish(content)

  if (content.length < 80) {
    throw new Error('Could not extract article content')
  }

  return {
    title: normalizeText(title),
    content,
    images: extractInlineImages(sanitized, url),
  }
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

const NOISE_LINE_PATTERNS = [
  /^live updates\b/i,
  /^video\b/i,
  /^ad feedback\b/i,
  /^watch [\w\s']*live coverage\b/i,
  /^source:\s*cnn\b/i,
  /^(advertisement|sponsored content|cookie settings|privacy policy|terms of use|sign up|subscribe)\b/i,
]

const INLINE_NOISE_PATTERNS = [
  /\bAd Feedback\b/gi,
]

function isNoiseLine(line: string): boolean {
  const normalized = line.trim()
  if (!normalized) return true
  return NOISE_LINE_PATTERNS.some(pattern => pattern.test(normalized))
}

function cleanExtractedEnglish(value: string): string {
  const candidateLines = decodeHtmlEntities(value)
    .replace(/\u2022/g, '\n')
    .replace(/\s*\|\s*/g, '\n')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line =>
      INLINE_NOISE_PATTERNS.reduce(
        (cleaned, pattern) => cleaned.replace(pattern, '').replace(/\s+/g, ' ').trim(),
        line
      )
    )
    .filter(line => line.length > 0)
    .filter(line => !isNoiseLine(line))

  return candidateLines.join('\n\n').trim()
}

function decodeHtmlEntities(value: string): string {
  let decoded = value
  // Decode repeatedly to handle double-encoded values like &amp;#x27;.
  for (let i = 0; i < 3; i += 1) {
    const next = decoded
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&#39;/gi, "'")
      .replace(/&lsquo;|&rsquo;/gi, "'")
      .replace(/&ldquo;|&rdquo;/gi, '"')
      .replace(/&hellip;/gi, '...')
      .replace(/&mdash;|&ndash;/gi, '-')
    if (next === decoded) break
    decoded = next
  }
  return decoded
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractInlineImages(html: string, baseUrl: string): ExtractedImage[] {
  const seen = new Set<string>()
  const images: ExtractedImage[] = []
  const imgMatches = Array.from(html.matchAll(/<img\b[^>]*>/gi))

  for (const match of imgMatches) {
    const tag = match[0]
    const srcRaw = extractTagAttr(tag, 'src')
    if (!srcRaw) continue

    let normalizedSrc: string
    try {
      normalizedSrc = new URL(srcRaw, baseUrl).toString()
    } catch {
      continue
    }

    if (!isHttpUrl(normalizedSrc) || seen.has(normalizedSrc)) continue
    seen.add(normalizedSrc)

    const matchIndex = match.index ?? 0
    const paragraphIndex = Math.max(0, countOpenPTags(html.slice(0, matchIndex)) - 1)
    const width = parseDimension(extractTagAttr(tag, 'width'))
    const height = parseDimension(extractTagAttr(tag, 'height'))
    const caption = extractFigureCaption(html, matchIndex)

    images.push({
      src: normalizedSrc,
      alt: normalizeOptionalText(extractTagAttr(tag, 'alt')),
      caption: normalizeOptionalText(caption),
      paragraphIndex,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    })

    if (images.length >= 5) break
  }

  return images
}

function extractTagAttr(tag: string, attr: string): string | null {
  const pattern = new RegExp(`${attr}=["']([^"']+)["']`, 'i')
  return pattern.exec(tag)?.[1] ?? null
}

function parseDimension(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function countOpenPTags(value: string): number {
  return (value.match(/<p\b/gi) ?? []).length
}

function extractFigureCaption(html: string, imageIndex: number): string | null {
  const figureStart = html.lastIndexOf('<figure', imageIndex)
  if (figureStart === -1) return null
  const figureEnd = html.indexOf('</figure>', imageIndex)
  if (figureEnd === -1) return null
  const figureHtml = html.slice(figureStart, figureEnd)
  const captionMatch = figureHtml.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)
  if (!captionMatch) return null
  return stripTags(captionMatch[1])
}

function normalizeOptionalText(value: string | null): string | null {
  if (!value) return null
  const normalized = normalizeText(value)
  return normalized.length > 0 ? normalized : null
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
  const { title, content, images } = await extractArticleContent(html, normalizedUrl)
  return { title, content, images, isReddit: false }
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
      images: [],
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
    const { title, content, images } = await extractArticleContent(html, externalUrl)
    return { title, content, images, isReddit: true }
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
    images: [],
    isReddit: true,
  }
}
