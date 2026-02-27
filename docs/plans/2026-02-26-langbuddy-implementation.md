# LangBuddy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a PWA that adapts shared article URLs into TOPIK-leveled Korean, with inline vocabulary quizzes, a persistent word bank, and comprehension scoring.

**Architecture:** Next.js 15 App Router with server-side API routes calling Claude. NextAuth.js v5 (Google OAuth) for auth; all Supabase DB access uses the service role key server-side, filtering by NextAuth `userId`. PWA Web Share Target manifest enables iOS share sheet integration.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase (Postgres), NextAuth.js v5 (beta), `@anthropic-ai/sdk` (claude-sonnet-4-6), `@mozilla/readability`, `jsdom`, Vitest, React Testing Library

---

## Task 1: Project Scaffold

**Files:**
- Create: project root (bootstrapped via CLI)
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `.env.local.example`

**Step 1: Bootstrap Next.js**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
```

**Step 2: Install runtime deps**

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js @supabase/ssr next-auth@beta @mozilla/readability jsdom
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8 msw @types/jsdom @types/readability
```

**Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

**Step 4: Create `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

**Step 5: Add to `package.json` scripts**

```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 6: Create `.env.local.example`**

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

**Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: server running at http://localhost:3000

**Step 8: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js 15 project with Vitest"
```

---

## Task 2: Constants, Types & Mastery Logic

**Files:**
- Create: `src/lib/constants.ts`
- Create: `src/lib/types.ts`
- Create: `src/lib/mastery.ts`
- Create: `src/lib/scoring.ts`
- Create: `src/lib/__tests__/mastery.test.ts`
- Create: `src/lib/__tests__/scoring.test.ts`
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Write failing mastery tests**

Create `src/lib/__tests__/mastery.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { updateMastery, isGraduated } from '@/lib/mastery'

describe('updateMastery', () => {
  it('increments mastery on correct answer', () => {
    expect(updateMastery(50, true)).toBe(51)
  })
  it('decrements mastery on wrong answer', () => {
    expect(updateMastery(50, false)).toBe(49)
  })
  it('floors at 0', () => {
    expect(updateMastery(0, false)).toBe(0)
  })
  it('caps at 100', () => {
    expect(updateMastery(100, true)).toBe(100)
  })
  it('graduated word wrong answer drops to 99', () => {
    expect(updateMastery(100, false)).toBe(99)
  })
})

describe('isGraduated', () => {
  it('returns true at mastery 100', () => {
    expect(isGraduated(100)).toBe(true)
  })
  it('returns false below 100', () => {
    expect(isGraduated(99)).toBe(false)
  })
})
```

**Step 2: Run test - verify it fails**

```bash
npm run test:run src/lib/__tests__/mastery.test.ts
```

Expected: FAIL — "cannot find module '@/lib/mastery'"

**Step 3: Create `src/lib/constants.ts`**

```typescript
export const MASTERY_MIN = 0
export const MASTERY_MAX = 100
export const TOPIK_LEVELS = [1, 2, 3, 4, 5, 6] as const
export type TopikLevel = 1 | 2 | 3 | 4 | 5 | 6
```

**Step 4: Create `src/lib/mastery.ts`**

```typescript
import { MASTERY_MIN, MASTERY_MAX } from './constants'

export function updateMastery(current: number, correct: boolean): number {
  const next = correct ? current + 1 : current - 1
  return Math.max(MASTERY_MIN, Math.min(MASTERY_MAX, next))
}

export function isGraduated(mastery: number): boolean {
  return mastery >= MASTERY_MAX
}
```

**Step 5: Run mastery tests - verify they pass**

```bash
npm run test:run src/lib/__tests__/mastery.test.ts
```

Expected: 7 tests PASS

**Step 6: Write failing scoring tests**

Create `src/lib/__tests__/scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateQuizScore, calculateTotalScore } from '@/lib/scoring'

describe('calculateQuizScore', () => {
  it('returns positive for all correct', () => {
    expect(calculateQuizScore(3, 0)).toBe(3)
  })
  it('returns negative net for mostly wrong', () => {
    expect(calculateQuizScore(1, 4)).toBe(-3)
  })
  it('returns 0 for no answers', () => {
    expect(calculateQuizScore(0, 0)).toBe(0)
  })
})

describe('calculateTotalScore', () => {
  it('sums word and comprehension scores', () => {
    expect(calculateTotalScore(5, 2)).toBe(7)
  })
  it('handles negative scores', () => {
    expect(calculateTotalScore(-2, 1)).toBe(-1)
  })
})
```

**Step 7: Run - verify fail**

```bash
npm run test:run src/lib/__tests__/scoring.test.ts
```

**Step 8: Create `src/lib/scoring.ts`**

```typescript
export function calculateQuizScore(correct: number, wrong: number): number {
  return correct - wrong
}

export function calculateTotalScore(wordQuizScore: number, comprehensionScore: number): number {
  return wordQuizScore + comprehensionScore
}
```

**Step 9: Run scoring tests - verify they pass**

```bash
npm run test:run src/lib/__tests__/scoring.test.ts
```

Expected: 5 tests PASS

**Step 10: Create `src/lib/types.ts`**

```typescript
import { TopikLevel } from './constants'

export type ArticleStatus = 'unread' | 'reading' | 'completed'

export interface Word {
  id: string
  user_id: string
  korean: string
  english: string
  romanization: string
  example_sentence: string
  mastery_level: number
  times_seen: number
  times_correct: number
  created_at: string
  last_seen_at: string
}

export interface ComprehensionQuestion {
  question: string
  options: [string, string, string, string]
  correct: 'A' | 'B' | 'C' | 'D'
  user_answer?: 'A' | 'B' | 'C' | 'D'
}

export interface VocabularyWord {
  korean: string
  english: string
  romanization: string
  example: string
  distractors: [string, string, string]
}

export interface Article {
  id: string
  user_id: string
  source_url: string
  title: string
  adapted_korean: string
  original_english: string
  topik_level_at_time: TopikLevel
  status: ArticleStatus
  word_quiz_score: number
  comprehension_score: number
  total_score: number
  comprehension_questions: ComprehensionQuestion[]
  new_vocabulary: VocabularyWord[]
  word_bank_appearances: string[]
  created_at: string
  completed_at: string | null
}

export interface UserSettings {
  user_id: string
  topik_level: TopikLevel
}
```

**Step 11: Create `supabase/migrations/001_initial_schema.sql`**

```sql
create extension if not exists "uuid-ossp";

create table user_settings (
  user_id text primary key,
  topik_level int not null default 2 check (topik_level between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table words (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  korean text not null,
  english text not null,
  romanization text not null default '',
  example_sentence text not null default '',
  mastery_level int not null default 0 check (mastery_level between 0 and 100),
  times_seen int not null default 0,
  times_correct int not null default 0,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, korean)
);

create table articles (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  source_url text not null,
  title text not null,
  adapted_korean text not null default '',
  original_english text not null,
  topik_level_at_time int not null,
  status text not null default 'unread' check (status in ('unread', 'reading', 'completed')),
  word_quiz_score int not null default 0,
  comprehension_score int not null default 0,
  total_score int not null default 0,
  comprehension_questions jsonb not null default '[]',
  new_vocabulary jsonb not null default '[]',
  word_bank_appearances jsonb not null default '[]',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table article_words (
  article_id uuid not null references articles(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  primary key (article_id, word_id)
);

create index on words (user_id);
create index on articles (user_id, status);
create index on articles (user_id, created_at desc);
```

**Step 12: Commit**

```bash
git add .
git commit -m "feat: add constants, types, mastery/scoring logic, and DB schema"
```

---

## Task 3: Supabase Admin Client & Authentication

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`
- Create: `src/types/next-auth.d.ts`

**Step 1: Create `src/lib/supabase/admin.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. Server-side only. Never import in client components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

**Step 2: Create `src/lib/auth.ts`**

```typescript
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { supabaseAdmin } from './supabase/admin'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Ensure user_settings row exists on first login
      await supabaseAdmin
        .from('user_settings')
        .upsert(
          { user_id: user.id!, topik_level: 2 },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )
      return true
    },
    async session({ session, token }) {
      session.user.id = token.sub!
      return session
    },
  },
})
```

**Step 3: Create `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

**Step 4: Create `src/middleware.ts`**

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const isShareRoute = req.nextUrl.pathname === '/share'
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')

  if (!isAuthenticated && !isShareRoute && !isAuthRoute) {
    return NextResponse.redirect(new URL('/api/auth/signin', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
}
```

**Step 5: Create `src/types/next-auth.d.ts`**

```typescript
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
```

**Step 6: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors (or only warnings about missing env vars at runtime)

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add NextAuth.js v5 Google OAuth and Supabase admin client"
```

---

## Task 4: Article Extraction

**Files:**
- Create: `src/lib/__tests__/extract.test.ts`
- Create: `src/lib/extract.ts`

**Step 1: Write failing tests**

Create `src/lib/__tests__/extract.test.ts`:

```typescript
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
```

**Step 2: Run - verify fail**

```bash
npm run test:run src/lib/__tests__/extract.test.ts
```

Expected: FAIL — "cannot find module '@/lib/extract'"

**Step 3: Create `src/lib/extract.ts`**

```typescript
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
    content: article.textContent.trim(),
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

export async function fetchRedditContent(
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

  // If no type chosen yet, signal that a choice is needed
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

  // Adapt the Reddit post + top comments
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
```

**Step 4: Run tests - verify they pass**

```bash
npm run test:run src/lib/__tests__/extract.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add article and Reddit content extraction"
```

---

## Task 5: Claude Article Adaptation

**Files:**
- Create: `src/lib/__tests__/claude.test.ts`
- Create: `src/lib/claude.ts`
- Create: `src/app/api/articles/adapt/route.ts`

**Step 1: Write failing tests for Claude response parsing**

Create `src/lib/__tests__/claude.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseAdaptationResponse, buildAdaptationPrompt } from '@/lib/claude'

const MOCK_RESPONSE = {
  adapted_korean: '이것은 한국어 기사입니다.',
  original_english: 'This is an English article.',
  new_vocabulary: [
    {
      korean: '기사',
      english: 'article',
      romanization: 'gisa',
      example: '이 기사는 흥미롭습니다.',
      distractors: ['newspaper', 'car', 'knight'],
    },
  ],
  word_bank_appearances: ['한국어'],
  comprehension_questions: [
    {
      question: 'What is this?',
      options: ['A. Korean', 'B. English', 'C. Japanese', 'D. Chinese'],
      correct: 'A',
    },
    {
      question: 'Is it an article?',
      options: ['A. Yes', 'B. No', 'C. Maybe', 'D. Unknown'],
      correct: 'A',
    },
    {
      question: 'What language?',
      options: ['A. Korean', 'B. French', 'C. Spanish', 'D. German'],
      correct: 'A',
    },
  ],
}

describe('parseAdaptationResponse', () => {
  it('parses valid JSON response', () => {
    const result = parseAdaptationResponse(JSON.stringify(MOCK_RESPONSE))
    expect(result.adapted_korean).toBe('이것은 한국어 기사입니다.')
    expect(result.new_vocabulary).toHaveLength(1)
    expect(result.comprehension_questions).toHaveLength(3)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseAdaptationResponse('not json')).toThrow()
  })

  it('throws if comprehension questions count is not 3', () => {
    const bad = { ...MOCK_RESPONSE, comprehension_questions: [] }
    expect(() => parseAdaptationResponse(JSON.stringify(bad))).toThrow('exactly 3')
  })
})

describe('buildAdaptationPrompt', () => {
  it('includes TOPIK level', () => {
    const prompt = buildAdaptationPrompt('Article content', 3, [])
    expect(prompt).toContain('TOPIK 3')
  })

  it('includes word bank words when provided', () => {
    const words = [{ korean: '사랑', english: 'love' }]
    const prompt = buildAdaptationPrompt('Article content', 2, words)
    expect(prompt).toContain('사랑')
  })

  it('omits word bank section when empty', () => {
    const prompt = buildAdaptationPrompt('Article content', 2, [])
    expect(prompt).not.toContain('word bank')
  })
})
```

**Step 2: Run - verify fail**

```bash
npm run test:run src/lib/__tests__/claude.test.ts
```

**Step 3: Create `src/lib/claude.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { TopikLevel } from './constants'
import { VocabularyWord, ComprehensionQuestion } from './types'

const client = new Anthropic()

export interface AdaptationResponse {
  adapted_korean: string
  original_english: string
  new_vocabulary: VocabularyWord[]
  word_bank_appearances: string[]
  comprehension_questions: ComprehensionQuestion[]
}

const TOPIK_DESCRIPTIONS: Record<number, string> = {
  1: 'absolute beginner — simple words, present tense, ~150 word vocabulary',
  2: 'elementary — basic daily vocabulary, simple sentences, ~300 words',
  3: 'intermediate-low — everyday topics, simple paragraphs, ~600 words',
  4: 'intermediate-high — news topics, compound sentences, ~1000 words',
  5: 'advanced-low — abstract topics, complex sentences, ~2000 words',
  6: 'advanced — near-native, nuanced vocabulary, complex grammar',
}

export function buildAdaptationPrompt(
  content: string,
  topikLevel: TopikLevel,
  wordBank: Array<{ korean: string; english: string }>
): string {
  const wordBankSection =
    wordBank.length > 0
      ? `\nActive vocabulary to incorporate naturally where possible:\n${wordBank.map(w => `- ${w.korean} (${w.english})`).join('\n')}\n`
      : ''

  return `You are a Korean language tutor. Adapt the following article for a TOPIK ${topikLevel} learner (${TOPIK_DESCRIPTIONS[topikLevel]}).
${wordBankSection}
Article:
${content}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "adapted_korean": "full article rewritten in Korean at TOPIK ${topikLevel} level",
  "original_english": "cleaned English version of the article",
  "new_vocabulary": [
    {
      "korean": "word as it appears in adapted text",
      "english": "English definition",
      "romanization": "romanization",
      "example": "example sentence in Korean",
      "distractors": ["wrong definition 1", "wrong definition 2", "wrong definition 3"]
    }
  ],
  "word_bank_appearances": ["Korean words from the active vocabulary list you used in adapted_korean"],
  "comprehension_questions": [
    {
      "question": "question requiring the reader to have read the article",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "correct": "A"
    }
  ]
}

Requirements:
- Include 5-10 new vocabulary words appropriate for TOPIK ${topikLevel}
- Include EXACTLY 3 comprehension questions
- Distractors should be plausible but wrong definitions
- word_bank_appearances: only list words you actually used`
}

export function parseAdaptationResponse(text: string): AdaptationResponse {
  let parsed: AdaptationResponse
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Claude returned invalid JSON')
  }

  if (!parsed.comprehension_questions || parsed.comprehension_questions.length !== 3) {
    throw new Error('Response must include exactly 3 comprehension questions')
  }

  return parsed
}

export async function adaptArticle(
  title: string,
  content: string,
  topikLevel: TopikLevel,
  wordBank: Array<{ korean: string; english: string }>
): Promise<AdaptationResponse> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Title: ${title}\n\n${buildAdaptationPrompt(content, topikLevel, wordBank)}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseAdaptationResponse(text)
}
```

**Step 4: Run tests - verify they pass**

```bash
npm run test:run src/lib/__tests__/claude.test.ts
```

Expected: PASS

**Step 5: Create `src/app/api/articles/adapt/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchAndExtract } from '@/lib/extract'
import { adaptArticle } from '@/lib/claude'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { url, redditType } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // Get user settings
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('topik_level')
    .eq('user_id', userId)
    .single()
  const topikLevel = settings?.topik_level ?? 2

  // Get active word bank words
  const { data: wordBankWords } = await supabaseAdmin
    .from('words')
    .select('korean, english')
    .eq('user_id', userId)
    .lt('mastery_level', 100)

  // Extract content
  const extracted = await fetchAndExtract(url, redditType)

  // Reddit URL without type choice yet
  if (extracted.isReddit && !redditType) {
    return NextResponse.json({
      needsRedditChoice: true,
      hasLinkedArticle: extracted.hasLinkedArticle ?? false,
    })
  }

  // Adapt with Claude
  const adaptation = await adaptArticle(
    extracted.title,
    extracted.content,
    topikLevel,
    wordBankWords ?? []
  )

  // Save article
  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .insert({
      user_id: userId,
      source_url: url,
      title: extracted.title,
      adapted_korean: adaptation.adapted_korean,
      original_english: adaptation.original_english,
      topik_level_at_time: topikLevel,
      new_vocabulary: adaptation.new_vocabulary,
      word_bank_appearances: adaptation.word_bank_appearances,
      comprehension_questions: adaptation.comprehension_questions,
      status: 'unread',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articleId: article.id })
}
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add Claude article adaptation and adapt API route"
```

---

## Task 6: Word Quiz API

**Files:**
- Create: `src/app/api/words/quiz/route.ts`

**Step 1: Create `src/app/api/words/quiz/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { updateMastery } from '@/lib/mastery'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { articleId, word, correct } = await req.json()
  // word: { korean, english, romanization, example_sentence }

  // Fetch existing word if any
  const { data: existing } = await supabaseAdmin
    .from('words')
    .select('id, mastery_level, times_correct, times_seen')
    .eq('user_id', userId)
    .eq('korean', word.korean)
    .single()

  const currentMastery = existing?.mastery_level ?? 0
  const newMastery = updateMastery(currentMastery, correct)

  // Upsert word with updated mastery
  const { data: upsertedWord } = await supabaseAdmin
    .from('words')
    .upsert(
      {
        user_id: userId,
        korean: word.korean,
        english: word.english,
        romanization: word.romanization ?? '',
        example_sentence: word.example_sentence ?? '',
        mastery_level: newMastery,
        times_seen: (existing?.times_seen ?? 0) + 1,
        times_correct: (existing?.times_correct ?? 0) + (correct ? 1 : 0),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,korean' }
    )
    .select()
    .single()

  // Update article word_quiz_score
  if (articleId) {
    const { data: article } = await supabaseAdmin
      .from('articles')
      .select('word_quiz_score')
      .eq('id', articleId)
      .single()

    const delta = correct ? 1 : -1
    await supabaseAdmin
      .from('articles')
      .update({ word_quiz_score: (article?.word_quiz_score ?? 0) + delta })
      .eq('id', articleId)

    // Link word to article
    if (upsertedWord) {
      await supabaseAdmin
        .from('article_words')
        .upsert(
          { article_id: articleId, word_id: upsertedWord.id },
          { onConflict: 'article_id,word_id', ignoreDuplicates: true }
        )
    }
  }

  return NextResponse.json({ mastery: newMastery, correct })
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add word quiz API route"
```

---

## Task 7: PWA Manifest & Share Target

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Create: `src/app/share/route.ts`
- Modify: `src/app/layout.tsx`

**Step 1: Create `public/manifest.json`**

```json
{
  "name": "LangBuddy",
  "short_name": "LangBuddy",
  "description": "Improve your Korean through articles you love",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "share_target": {
    "action": "/share",
    "method": "GET",
    "params": {
      "url": "url",
      "title": "title"
    }
  }
}
```

**Step 2: Create `public/sw.js`**

```javascript
// Minimal service worker — required for PWA installability
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())
self.addEventListener('fetch', () => {
  // Pass-through for now
})
```

**Step 3: Create `src/app/share/route.ts`**

```typescript
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) redirect('/')
  redirect(`/articles/new?url=${encodeURIComponent(url)}`)
}
```

**Step 4: Add manifest link and SW registration to `src/app/layout.tsx`**

In the `<head>` of the root layout, add:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#000000" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<script
  dangerouslySetInnerHTML={{
    __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js') }`,
  }}
/>
```

**Step 5: Add placeholder icons**

```bash
mkdir -p public/icons
# Add 192x192 and 512x512 PNG images to public/icons/
# Use any placeholder image for now — can be replaced with real icons later
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add PWA manifest and Web Share Target"
```

---

## Task 8: Text Highlighting Utility

**Files:**
- Create: `src/lib/__tests__/highlight.test.ts`
- Create: `src/lib/highlight.ts`

**Step 1: Write failing tests**

Create `src/lib/__tests__/highlight.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildHighlightedSegments } from '@/lib/highlight'

describe('buildHighlightedSegments', () => {
  it('returns single plain segment when no highlights', () => {
    const result = buildHighlightedSegments('Hello world', [], [])
    expect(result).toEqual([{ type: 'plain', text: 'Hello world' }])
  })

  it('highlights a new vocabulary word', () => {
    const result = buildHighlightedSegments('나는 사랑해', ['사랑'], [])
    expect(result).toContainEqual({ type: 'new-vocab', text: '사랑', word: '사랑' })
  })

  it('highlights a word bank word differently', () => {
    const result = buildHighlightedSegments('나는 행복해', [], ['행복'])
    expect(result).toContainEqual({ type: 'word-bank', text: '행복', word: '행복' })
  })

  it('new-vocab takes priority over word-bank for same word', () => {
    const result = buildHighlightedSegments('사랑', ['사랑'], ['사랑'])
    const match = result.find(s => s.text === '사랑')
    expect(match?.type).toBe('new-vocab')
  })

  it('preserves surrounding plain text', () => {
    const result = buildHighlightedSegments('나는 사랑 해요', ['사랑'], [])
    expect(result[0]).toEqual({ type: 'plain', text: '나는 ' })
    expect(result[1]).toEqual({ type: 'new-vocab', text: '사랑', word: '사랑' })
    expect(result[2]).toEqual({ type: 'plain', text: ' 해요' })
  })
})
```

**Step 2: Run - verify fail**

```bash
npm run test:run src/lib/__tests__/highlight.test.ts
```

**Step 3: Create `src/lib/highlight.ts`**

```typescript
export type SegmentType = 'plain' | 'new-vocab' | 'word-bank'

export interface Segment {
  type: SegmentType
  text: string
  word?: string
}

interface Range {
  start: number
  end: number
  type: 'new-vocab' | 'word-bank'
  word: string
}

export function buildHighlightedSegments(
  text: string,
  newVocabWords: string[],
  wordBankWords: string[]
): Segment[] {
  const ranges: Range[] = []

  // Process new-vocab first so it takes priority over word-bank
  const allWords = [
    ...newVocabWords.map(w => ({ word: w, type: 'new-vocab' as const })),
    ...wordBankWords.map(w => ({ word: w, type: 'word-bank' as const })),
  ]

  for (const { word, type } of allWords) {
    if (!word) continue
    let idx = text.indexOf(word)
    while (idx !== -1) {
      const overlaps = ranges.some(r => r.start < idx + word.length && r.end > idx)
      if (!overlaps) {
        ranges.push({ start: idx, end: idx + word.length, type, word })
      }
      idx = text.indexOf(word, idx + 1)
    }
  }

  ranges.sort((a, b) => a.start - b.start)

  const segments: Segment[] = []
  let cursor = 0

  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({ type: 'plain', text: text.slice(cursor, range.start) })
    }
    segments.push({ type: range.type, text: text.slice(range.start, range.end), word: range.word })
    cursor = range.end
  }

  if (cursor < text.length) {
    segments.push({ type: 'plain', text: text.slice(cursor) })
  }

  return segments.length > 0 ? segments : [{ type: 'plain', text }]
}
```

**Step 4: Run - verify pass**

```bash
npm run test:run src/lib/__tests__/highlight.test.ts
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add text highlighting segmentation utility"
```

---

## Task 9: Reading List Screen

**Files:**
- Create: `src/components/ArticleCard.tsx`
- Create: `src/components/__tests__/ArticleCard.test.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write failing test**

Create `src/components/__tests__/ArticleCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { ArticleCard } from '@/components/ArticleCard'
import { describe, it, expect } from 'vitest'

const article = {
  id: '1',
  title: 'Test Article',
  source_url: 'https://reddit.com/r/test/comments/abc/test',
  original_english: 'This is the article preview text.',
  status: 'unread' as const,
  created_at: new Date().toISOString(),
  total_score: 0,
}

describe('ArticleCard', () => {
  it('renders article title', () => {
    render(<ArticleCard article={article} />)
    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  it('shows subreddit for Reddit URLs', () => {
    render(<ArticleCard article={article} />)
    expect(screen.getByText('r/test')).toBeInTheDocument()
  })

  it('shows score for completed articles', () => {
    render(<ArticleCard article={{ ...article, status: 'completed', total_score: 42 }} />)
    expect(screen.getByText(/42/)).toBeInTheDocument()
  })
})
```

**Step 2: Run - verify fail**

```bash
npm run test:run src/components/__tests__/ArticleCard.test.tsx
```

**Step 3: Create `src/components/ArticleCard.tsx`**

```tsx
import Link from 'next/link'

interface ArticleCardProps {
  article: {
    id: string
    title: string
    source_url: string
    original_english: string
    status: 'unread' | 'reading' | 'completed'
    created_at: string
    total_score: number
  }
}

function getSourceLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    if (hostname.includes('reddit.com')) {
      const subreddit = pathname.match(/\/r\/([^/]+)/)?.[1]
      return subreddit ? `r/${subreddit}` : 'reddit.com'
    }
    return hostname.replace('www.', '')
  } catch {
    return url
  }
}

const STATUS_STYLES: Record<string, string> = {
  unread: 'bg-blue-100 text-blue-700',
  reading: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
}

export function ArticleCard({ article }: ArticleCardProps) {
  const excerpt = article.original_english.slice(0, 120).trim() + '…'
  const date = new Date(article.created_at).toLocaleDateString()

  return (
    <Link
      href={`/articles/${article.id}`}
      className="block px-4 py-4 border-b border-gray-200 hover:bg-gray-50 active:bg-gray-100"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
            {article.title}
          </h2>
          <p className="text-gray-500 text-xs mb-2 line-clamp-2">{excerpt}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{getSourceLabel(article.source_url)}</span>
            <span>·</span>
            <span>{date}</span>
            {article.status === 'completed' && (
              <>
                <span>·</span>
                <span className="font-medium text-gray-600">{article.total_score} pts</span>
              </>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[article.status]}`}
        >
          {article.status}
        </span>
      </div>
    </Link>
  )
}
```

**Step 4: Run - verify pass**

```bash
npm run test:run src/components/__tests__/ArticleCard.test.tsx
```

**Step 5: Replace `src/app/page.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ArticleCard } from '@/components/ArticleCard'
import { TopikSelector } from '@/components/TopikSelector'
import Link from 'next/link'

export default async function HomePage() {
  const session = await auth()
  const userId = session!.user.id

  const [{ data: articles }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from('articles')
      .select('id, title, source_url, original_english, status, created_at, total_score')
      .eq('user_id', userId)
      .in('status', ['unread', 'reading'])
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('user_settings')
      .select('topik_level')
      .eq('user_id', userId)
      .single(),
  ])

  return (
    <main className="max-w-2xl mx-auto">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
        <h1 className="font-bold text-lg">LangBuddy</h1>
        <div className="flex items-center gap-3">
          <TopikSelector initial={settings?.topik_level ?? 2} />
          <Link href="/archive" className="text-gray-500 text-sm">Archive</Link>
          <Link href="/wordbank" className="text-gray-500 text-sm">Words</Link>
        </div>
      </header>

      {articles && articles.length > 0 ? (
        <div>
          {articles.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <p className="text-gray-500 mb-2">Your reading queue is empty.</p>
          <p className="text-sm text-gray-400">
            Share any article or Reddit link to LangBuddy from your browser to get started.
          </p>
        </div>
      )}
    </main>
  )
}
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add reading list home screen"
```

---

## Task 10: TOPIK Selector & Settings API

**Files:**
- Create: `src/components/TopikSelector.tsx`
- Create: `src/app/api/settings/route.ts`

**Step 1: Create `src/app/api/settings/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { topikLevel } = await req.json()
  await supabaseAdmin
    .from('user_settings')
    .update({ topik_level: topikLevel, updated_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
  return NextResponse.json({ ok: true })
}
```

**Step 2: Create `src/components/TopikSelector.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { TOPIK_LEVELS } from '@/lib/constants'

export function TopikSelector({ initial }: { initial: number }) {
  const [level, setLevel] = useState(initial)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newLevel = Number(e.target.value)
    setLevel(newLevel)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topikLevel: newLevel }),
    })
  }

  return (
    <select
      value={level}
      onChange={handleChange}
      className="text-sm border border-gray-200 rounded px-2 py-1"
    >
      {TOPIK_LEVELS.map(l => (
        <option key={l} value={l}>
          TOPIK {l}
        </option>
      ))}
    </select>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add TOPIK level selector and settings API"
```

---

## Task 11: Article Processing Screen

**Files:**
- Create: `src/components/ArticleProcessor.tsx`
- Create: `src/app/articles/new/page.tsx`

**Step 1: Create `src/components/ArticleProcessor.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'processing' | 'reddit-choice' | 'error'

export function ArticleProcessor({ url }: { url: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('processing')
  const [hasLinkedArticle, setHasLinkedArticle] = useState(false)
  const [error, setError] = useState('')

  async function process(redditType?: 'post' | 'article') {
    setStep('processing')
    try {
      const res = await fetch('/api/articles/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, redditType }),
      })
      const data = await res.json()

      if (data.needsRedditChoice) {
        setHasLinkedArticle(data.hasLinkedArticle)
        setStep('reddit-choice')
        return
      }

      if (!res.ok) throw new Error(data.error || 'Failed to adapt article')
      router.push(`/articles/${data.articleId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('error')
    }
  }

  useEffect(() => {
    process()
  }, [])

  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
        <p className="text-gray-500 text-sm">Adapting article to Korean…</p>
      </div>
    )
  }

  if (step === 'reddit-choice') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8">
        <h2 className="font-semibold text-lg text-center">What would you like to adapt?</h2>
        {hasLinkedArticle && (
          <button
            onClick={() => process('article')}
            className="w-full max-w-sm py-3 px-4 bg-black text-white rounded-lg font-medium"
          >
            The linked article
          </button>
        )}
        <button
          onClick={() => process('post')}
          className="w-full max-w-sm py-3 px-4 border border-gray-300 rounded-lg font-medium"
        >
          This Reddit discussion
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center">
      <p className="text-red-500 font-medium">Failed to process article</p>
      <p className="text-gray-500 text-sm">{error}</p>
      <button onClick={() => router.push('/')} className="text-blue-500 underline text-sm">
        Go back home
      </button>
    </div>
  )
}
```

**Step 2: Create `src/app/articles/new/page.tsx`**

```tsx
import { ArticleProcessor } from '@/components/ArticleProcessor'

interface Props {
  searchParams: Promise<{ url?: string }>
}

export default async function NewArticlePage({ searchParams }: Props) {
  const { url } = await searchParams
  if (!url) return <p className="p-4 text-red-500">No URL provided.</p>
  return <ArticleProcessor url={url} />
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add article processing screen with Reddit choice"
```

---

## Task 12: Word Quiz Popup

**Files:**
- Create: `src/components/WordQuizPopup.tsx`
- Create: `src/components/__tests__/WordQuizPopup.test.tsx`

**Step 1: Write failing test**

Create `src/components/__tests__/WordQuizPopup.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { WordQuizPopup } from '@/components/WordQuizPopup'
import { describe, it, expect, vi } from 'vitest'

const word = {
  korean: '기사',
  english: 'article',
  romanization: 'gisa',
  example: '이 기사를 읽어보세요.',
  distractors: ['newspaper', 'car', 'knight'] as [string, string, string],
}

describe('WordQuizPopup', () => {
  it('shows the Korean word', () => {
    render(<WordQuizPopup word={word} onAnswer={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('기사')).toBeInTheDocument()
  })

  it('shows 4 answer choices', () => {
    render(<WordQuizPopup word={word} onAnswer={vi.fn()} onClose={vi.fn()} />)
    const choices = screen.getAllByRole('button').filter(b => !b.textContent?.includes('×'))
    expect(choices).toHaveLength(4)
  })

  it('calls onAnswer(true) when correct choice selected', () => {
    const onAnswer = vi.fn()
    render(<WordQuizPopup word={word} onAnswer={onAnswer} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('article'))
    expect(onAnswer).toHaveBeenCalledWith(true)
  })

  it('calls onAnswer(false) when wrong choice selected', () => {
    const onAnswer = vi.fn()
    render(<WordQuizPopup word={word} onAnswer={onAnswer} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('newspaper'))
    expect(onAnswer).toHaveBeenCalledWith(false)
  })
})
```

**Step 2: Run - verify fail**

```bash
npm run test:run src/components/__tests__/WordQuizPopup.test.tsx
```

**Step 3: Create `src/components/WordQuizPopup.tsx`**

```tsx
'use client'

import { useMemo } from 'react'
import { VocabularyWord } from '@/lib/types'

interface WordQuizPopupProps {
  word: VocabularyWord
  onAnswer: (correct: boolean) => void
  onClose: () => void
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function WordQuizPopup({ word, onAnswer, onClose }: WordQuizPopupProps) {
  const choices = useMemo(
    () => shuffle([word.english, ...word.distractors]),
    [word]
  )

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-t-2xl p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <p className="text-3xl font-bold mb-1">{word.korean}</p>
          <p className="text-gray-400 text-sm">{word.romanization}</p>
          <p className="text-gray-500 text-sm mt-2 italic">{word.example}</p>
        </div>
        <p className="text-center text-gray-600 font-medium mb-4 text-sm">
          What does this mean?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {choices.map(choice => (
            <button
              key={choice}
              onClick={() => onAnswer(choice === word.english)}
              className="py-3 px-4 border-2 border-gray-200 rounded-xl text-sm font-medium hover:border-gray-400 active:bg-gray-50"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Run - verify pass**

```bash
npm run test:run src/components/__tests__/WordQuizPopup.test.tsx
```

Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add word quiz popup with shuffled choices"
```

---

## Task 13: Reading View

**Files:**
- Create: `src/components/HighlightedText.tsx`
- Create: `src/components/ReadingView.tsx`
- Create: `src/app/articles/[id]/page.tsx`

**Step 1: Create `src/components/HighlightedText.tsx`**

```tsx
'use client'

import { buildHighlightedSegments } from '@/lib/highlight'
import { VocabularyWord } from '@/lib/types'

interface HighlightedTextProps {
  text: string
  newVocab: VocabularyWord[]
  wordBankWords: string[]
  onWordTap: (word: VocabularyWord) => void
  vocabMap: Map<string, VocabularyWord>
}

export function HighlightedText({
  text,
  newVocab,
  wordBankWords,
  onWordTap,
  vocabMap,
}: HighlightedTextProps) {
  const segments = buildHighlightedSegments(
    text,
    newVocab.map(v => v.korean),
    wordBankWords
  )

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === 'plain') {
          return <span key={i}>{seg.text}</span>
        }
        const vocab = vocabMap.get(seg.word!)
        return (
          <button
            key={i}
            onClick={() => vocab && onWordTap(vocab)}
            className={`underline decoration-2 underline-offset-2 ${
              seg.type === 'new-vocab' ? 'decoration-blue-500' : 'decoration-orange-400'
            }`}
          >
            {seg.text}
          </button>
        )
      })}
    </span>
  )
}
```

**Step 2: Create `src/components/ReadingView.tsx`**

```tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HighlightedText } from './HighlightedText'
import { WordQuizPopup } from './WordQuizPopup'
import { Article, VocabularyWord } from '@/lib/types'

export function ReadingView({ article }: { article: Article }) {
  const router = useRouter()
  const [showKorean, setShowKorean] = useState(true)
  const [showToggleLabel, setShowToggleLabel] = useState(false)
  const [activeWord, setActiveWord] = useState<VocabularyWord | null>(null)
  const [wordQuizScore, setWordQuizScore] = useState(article.word_quiz_score)
  const lastTapRef = useRef(0)
  const labelTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const vocabMap = new Map(article.new_vocabulary.map(v => [v.korean, v]))

  const handleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      setShowKorean(prev => !prev)
      setShowToggleLabel(true)
      clearTimeout(labelTimerRef.current)
      labelTimerRef.current = setTimeout(() => setShowToggleLabel(false), 1000)
    }
    lastTapRef.current = now
  }, [])

  async function handleQuizAnswer(word: VocabularyWord, correct: boolean) {
    setActiveWord(null)
    const res = await fetch('/api/words/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: article.id,
        word: {
          korean: word.korean,
          english: word.english,
          romanization: word.romanization,
          example_sentence: word.example,
        },
        correct,
      }),
    })
    if (res.ok) {
      setWordQuizScore(s => s + (correct ? 1 : -1))
    }
  }

  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
        <button onClick={() => router.back()} className="text-gray-500 text-sm">
          ← Back
        </button>
        <span className="text-sm text-gray-500 font-medium">Score: {wordQuizScore}</span>
      </header>

      <div
        className="flex-1 px-4 py-6 text-base leading-loose relative select-none"
        onClick={handleTap}
      >
        {showToggleLabel && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
            <span className="bg-black/70 text-white text-lg px-5 py-2 rounded-full">
              {showKorean ? '한국어' : 'English'}
            </span>
          </div>
        )}

        <h1 className="font-bold text-xl mb-6">{article.title}</h1>

        {showKorean ? (
          <HighlightedText
            text={article.adapted_korean}
            newVocab={article.new_vocabulary}
            wordBankWords={article.word_bank_appearances}
            onWordTap={setActiveWord}
            vocabMap={vocabMap}
          />
        ) : (
          <p className="whitespace-pre-wrap text-gray-700">{article.original_english}</p>
        )}
      </div>

      <div className="px-4 py-6 border-t border-gray-200">
        <button
          onClick={() => router.push(`/articles/${article.id}/comprehension`)}
          className="w-full py-3 bg-black text-white rounded-lg font-semibold text-base"
        >
          I&apos;m done reading
        </button>
      </div>

      {activeWord && (
        <WordQuizPopup
          word={activeWord}
          onAnswer={correct => handleQuizAnswer(activeWord, correct)}
          onClose={() => setActiveWord(null)}
        />
      )}
    </div>
  )
}
```

**Step 3: Create `src/app/articles/[id]/page.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ReadingView } from '@/components/ReadingView'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('*')
    .eq('id', id)
    .eq('user_id', session!.user.id)
    .single()

  if (!article) notFound()

  if (article.status === 'unread') {
    await supabaseAdmin.from('articles').update({ status: 'reading' }).eq('id', id)
  }

  return <ReadingView article={article} />
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add reading view with double-tap toggle and word quiz"
```

---

## Task 14: Comprehension Screen & Complete API

**Files:**
- Create: `src/app/api/articles/[id]/complete/route.ts`
- Create: `src/components/ComprehensionQuiz.tsx`
- Create: `src/app/articles/[id]/comprehension/page.tsx`

**Step 1: Create `src/app/api/articles/[id]/complete/route.ts`**

```typescript
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { calculateTotalScore } from '@/lib/scoring'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { comprehensionScore, answeredQuestions } = await req.json()

  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('word_quiz_score, user_id')
    .eq('id', id)
    .single()

  if (!article || article.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const totalScore = calculateTotalScore(article.word_quiz_score, comprehensionScore)

  await supabaseAdmin
    .from('articles')
    .update({
      status: 'completed',
      comprehension_score: comprehensionScore,
      total_score: totalScore,
      comprehension_questions: answeredQuestions,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({
    totalScore,
    wordQuizScore: article.word_quiz_score,
    comprehensionScore,
  })
}
```

**Step 2: Create `src/components/ComprehensionQuiz.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ComprehensionQuestion } from '@/lib/types'

interface ComprehensionQuizProps {
  articleId: string
  questions: ComprehensionQuestion[]
}

export function ComprehensionQuiz({ articleId, questions }: ComprehensionQuizProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Array<'A' | 'B' | 'C' | 'D'>>([])
  const [submitting, setSubmitting] = useState(false)

  const q = questions[current]

  async function handleAnswer(choice: 'A' | 'B' | 'C' | 'D') {
    const newAnswers = [...answers, choice]
    setAnswers(newAnswers)

    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      return
    }

    // All answered — submit
    setSubmitting(true)
    const answeredQuestions = questions.map((q, i) => ({ ...q, user_answer: newAnswers[i] }))
    const comprehensionScore = answeredQuestions.reduce(
      (sum, q) => sum + (q.user_answer === q.correct ? 1 : -1),
      0
    )

    const res = await fetch(`/api/articles/${articleId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comprehensionScore, answeredQuestions }),
    })
    const data = await res.json()
    router.push(
      `/articles/${articleId}/summary?total=${data.totalScore}&word=${data.wordQuizScore}&comp=${data.comprehensionScore}`
    )
  }

  if (submitting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col px-4 py-8">
      <p className="text-sm text-gray-400 mb-2">
        Question {current + 1} of {questions.length}
      </p>
      <div className="w-full bg-gray-100 rounded-full h-1 mb-8">
        <div
          className="bg-black h-1 rounded-full transition-all"
          style={{ width: `${(current / questions.length) * 100}%` }}
        />
      </div>

      <h2 className="text-xl font-semibold mb-8 leading-snug">{q.question}</h2>

      <div className="flex flex-col gap-3">
        {q.options.map((option, i) => {
          const letter = (['A', 'B', 'C', 'D'] as const)[i]
          return (
            <button
              key={letter}
              onClick={() => handleAnswer(letter)}
              className="text-left py-4 px-5 border-2 border-gray-200 rounded-xl font-medium hover:border-gray-400 active:bg-gray-50"
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 3: Create `src/app/articles/[id]/comprehension/page.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ComprehensionQuiz } from '@/components/ComprehensionQuiz'
import { notFound, redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ComprehensionPage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('id, status, comprehension_questions')
    .eq('id', id)
    .eq('user_id', session!.user.id)
    .single()

  if (!article) notFound()
  if (article.status === 'completed') redirect(`/articles/${id}/summary`)

  return <ComprehensionQuiz articleId={id} questions={article.comprehension_questions} />
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add comprehension quiz and complete API route"
```

---

## Task 15: Summary Screen & Archive

**Files:**
- Create: `src/app/articles/[id]/summary/page.tsx`
- Create: `src/app/archive/page.tsx`

**Step 1: Create `src/app/articles/[id]/summary/page.tsx`**

```tsx
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ total?: string; word?: string; comp?: string }>
}

export default async function SummaryPage({ searchParams }: Props) {
  const { total, word, comp } = await searchParams

  return (
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <h1 className="text-3xl font-bold mb-2">Article Complete!</h1>
      <p className="text-gray-500 mb-10">Here&apos;s how you did</p>

      <div className="w-full bg-gray-50 rounded-2xl p-6 mb-8 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Vocabulary quizzes</span>
          <span className="font-semibold text-lg">{word ?? 0} pts</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Comprehension</span>
          <span className="font-semibold text-lg">{comp ?? 0} pts</span>
        </div>
        <div className="h-px bg-gray-200" />
        <div className="flex justify-between items-center">
          <span className="font-bold">Total score</span>
          <span className="font-bold text-2xl">{total ?? 0} pts</span>
        </div>
      </div>

      <Link
        href="/"
        className="w-full py-3 bg-black text-white rounded-lg font-semibold text-center block"
      >
        Back to reading list
      </Link>
    </div>
  )
}
```

**Step 2: Create `src/app/archive/page.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ArticleCard } from '@/components/ArticleCard'
import Link from 'next/link'

export default async function ArchivePage() {
  const session = await auth()

  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('id, title, source_url, original_english, status, created_at, total_score')
    .eq('user_id', session!.user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  return (
    <main className="max-w-2xl mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
        <Link href="/" className="text-gray-500 text-sm">
          ← Back
        </Link>
        <h1 className="font-bold text-lg">Archive</h1>
        <span className="ml-auto text-sm text-gray-400">{articles?.length ?? 0} articles</span>
      </header>

      {articles && articles.length > 0 ? (
        articles.map(article => <ArticleCard key={article.id} article={article} />)
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <p className="text-gray-500">No completed articles yet.</p>
        </div>
      )}
    </main>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add summary score screen and archive page"
```

---

## Task 16: Word Bank Screen

**Files:**
- Create: `src/components/WordCard.tsx`
- Create: `src/app/wordbank/page.tsx`

**Step 1: Create `src/components/WordCard.tsx`**

```tsx
interface WordCardProps {
  word: {
    korean: string
    english: string
    romanization: string
    mastery_level: number
  }
}

export function WordCard({ word }: WordCardProps) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
      <div>
        <span className="font-semibold text-gray-900">{word.korean}</span>
        <span className="text-gray-400 mx-2 text-sm">·</span>
        <span className="text-gray-400 text-sm">{word.romanization}</span>
        <p className="text-gray-600 text-sm">{word.english}</p>
      </div>
      <div className="text-right shrink-0 ml-4">
        {word.mastery_level >= 100 ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            Mastered
          </span>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-gray-400">{word.mastery_level}/100</span>
            <div className="w-16 bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${word.mastery_level}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Create `src/app/wordbank/page.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { WordCard } from '@/components/WordCard'
import Link from 'next/link'

export default async function WordBankPage() {
  const session = await auth()

  const { data: words } = await supabaseAdmin
    .from('words')
    .select('korean, english, romanization, mastery_level')
    .eq('user_id', session!.user.id)
    .order('mastery_level', { ascending: false })

  const active = words?.filter(w => w.mastery_level < 100) ?? []
  const mastered = words?.filter(w => w.mastery_level >= 100) ?? []

  return (
    <main className="max-w-2xl mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
        <Link href="/" className="text-gray-500 text-sm">
          ← Back
        </Link>
        <h1 className="font-bold text-lg">Word Bank</h1>
        <span className="ml-auto text-sm text-gray-400">{words?.length ?? 0} words</span>
      </header>

      {active.length > 0 && (
        <section>
          <h2 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
            Active ({active.length})
          </h2>
          {active.map(w => (
            <WordCard key={w.korean} word={w} />
          ))}
        </section>
      )}

      {mastered.length > 0 && (
        <section>
          <h2 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
            Mastered ({mastered.length})
          </h2>
          {mastered.map(w => (
            <WordCard key={w.korean} word={w} />
          ))}
        </section>
      )}

      {!words?.length && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <p className="text-gray-500">No words yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Tap highlighted words while reading to build your word bank.
          </p>
        </div>
      )}
    </main>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add word bank screen with active and mastered sections"
```

---

## Task 17: Integration Check & Deployment

**Step 1: Apply DB migration**

In the Supabase dashboard → SQL Editor, paste and run `supabase/migrations/001_initial_schema.sql`.

**Step 2: Set environment variables**

Copy `.env.local.example` to `.env.local` and fill in:

- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings → API
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — from Google Cloud Console; add `http://localhost:3000/api/auth/callback/google` as an OAuth redirect URI
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32`

**Step 3: Run the full test suite**

```bash
npm run test:run
```

Expected: All tests PASS

**Step 4: Manual smoke test**

```bash
npm run dev
```

Walk through:
1. Sign in with Google
2. Set TOPIK level in header
3. Navigate to `/articles/new?url=https://www.bbc.com/news` (or any article URL)
4. Verify article adapts and redirects to reading view
5. Double-tap to toggle Korean / English
6. Tap a blue-highlighted word → answer quiz → verify score updates
7. Tap "I'm done reading" → answer 3 comprehension questions
8. Verify summary score screen
9. Verify article moves to archive (not on home feed)
10. Verify word appears in word bank with mastery > 0

**Step 5: Deploy to Vercel**

```bash
git push origin main
# Connect repo in Vercel dashboard
# Add all env vars in Vercel project settings
# Add production URL to Google OAuth redirect URIs
```

**Step 6: Test iOS share sheet**

1. Open LangBuddy in Safari on iPhone
2. Tap Share → Add to Home Screen
3. Open Reddit, find any post, tap Share
4. Verify LangBuddy appears as a share destination
5. Tap it — verify it opens and starts processing

**Step 7: Update CLAUDE.md**

Fill in the project overview, tech stack, and commands.

**Step 8: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with project details"
```

---

## Task Summary

| # | Task | Key Tests |
|---|---|---|
| 1 | Project scaffold | — |
| 2 | Constants, types, mastery & scoring logic | `mastery.test.ts`, `scoring.test.ts` |
| 3 | Supabase admin client + NextAuth.js v5 | — |
| 4 | Article extraction (Readability + Reddit) | `extract.test.ts` |
| 5 | Claude adaptation API | `claude.test.ts` |
| 6 | Word quiz API | — |
| 7 | PWA manifest + Web Share Target | — |
| 8 | Text highlighting utility | `highlight.test.ts` |
| 9 | Reading list screen | `ArticleCard.test.tsx` |
| 10 | TOPIK selector + settings API | — |
| 11 | Article processing screen | — |
| 12 | Word quiz popup | `WordQuizPopup.test.tsx` |
| 13 | Reading view (double-tap, highlights) | — |
| 14 | Comprehension screen + complete API | — |
| 15 | Summary screen + archive | — |
| 16 | Word bank screen | — |
| 17 | Integration check + deployment | manual |
