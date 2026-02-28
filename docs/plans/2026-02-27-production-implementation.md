# LangBuddy Production Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the production LangBuddy PWA — share any article URL → AI-adapted Korean at your TOPIK level → inline vocabulary quizzes → comprehension questions → score tracking, backed by a real TOPIK dictionary and persisted per-user word mastery.

**Architecture:** Next.js 15 App Router with server-side API routes calling Claude. NextAuth.js v5 (Google OAuth) for auth. All Supabase DB access uses the service role key server-side, filtered by NextAuth `userId`. Production word bank is the full TOPIK I+II dictionary (~2,300 words) pre-seeded in Supabase (`topik_words`), with per-user mastery in `user_word_mastery`. Adapted articles store their Korean text as a JSONB segment array (not a plain string), enabling word-level color coding without re-parsing. PWA Web Share Target manifest enables the iOS share sheet.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v3, Supabase (Postgres), NextAuth.js v5 (beta), `@anthropic-ai/sdk` (`claude-sonnet-4-6`), `@mozilla/readability`, `jsdom`, Vitest, React Testing Library

**Supersedes:** `docs/plans/2026-02-26-langbuddy-implementation.md` — that plan has correct structure but uses an incorrect flat `words` table and stores `adapted_korean` as a plain string. This plan is authoritative.

---

## Key Design Decisions

### Segment array (not plain string)
`adapted_korean` in the `articles` table is a JSONB column storing `Segment[]`. Claude returns this array directly. The frontend renders it without re-parsing. This is different from the prototype's `adaptedKorean` array but follows the same pattern.

```ts
type Segment =
  | { type: 'text'; text: string }
  | { type: 'word'; text: string; wordId: number; topikLevel: 1|2|3|4|5|6 }
  | { type: 'break' }  // paragraph separator — renders as <div className="mt-4" />
```

`userMastery` is NOT stored in the segment — it is joined at render time from `user_word_mastery`.

### Word highlight color coding
Based on the word's `topikLevel` vs the user's current `topik_level` setting:
- `topikLevel <= userLevel` AND mastery >= 70 → subtle gray underline (known/reinforcement)
- `topikLevel <= userLevel` AND mastery < 70 → blue underline (needs practice)
- `topikLevel > userLevel` → orange underline (challenge word)

### Word bank model
Production has no flat `words` table. Instead:
- `topik_words` — global TOPIK dictionary, ~2,300 rows, pre-seeded once
- `user_word_mastery` — per-user per-word mastery (0–100), created on first encounter

### TOPIK levels
Levels 1–6 everywhere. `user_settings.topik_level` defaults to 2. Word bank filter pills support levels 1–6.

---

## Task 1: Project Scaffold

**Files:**
- Create: project root
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `.env.local.example`

**Step 1: Bootstrap Next.js 15**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
```

When prompted: Yes to ESLint, No to `src/` (we use `--src-dir`), choose App Router.

**Step 2: Install runtime dependencies**

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js @supabase/ssr next-auth@beta @mozilla/readability jsdom
```

**Step 3: Install dev dependencies**

```bash
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8 msw @types/jsdom
```

**Step 4: Create `vitest.config.ts`**

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

**Step 5: Create `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

**Step 6: Add test scripts to `package.json`**

```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 7: Create `.env.local.example`**

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

**Step 8: Verify**

```bash
npm run dev
```

Expected: dev server running at http://localhost:3000

**Step 9: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js 15 project with Vitest"
```

---

## Task 2: Constants, Types & Core Logic

**Files:**
- Create: `src/lib/constants.ts`
- Create: `src/lib/types.ts`
- Create: `src/lib/mastery.ts`
- Create: `src/lib/scoring.ts`
- Create: `src/lib/__tests__/mastery.test.ts`
- Create: `src/lib/__tests__/scoring.test.ts`

**Step 1: Write failing mastery tests**

Create `src/lib/__tests__/mastery.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { updateMastery, segmentColor } from '@/lib/mastery'

describe('updateMastery', () => {
  it('increments on correct answer', () => {
    expect(updateMastery(50, true)).toBe(51)
  })
  it('decrements on wrong answer', () => {
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

describe('segmentColor', () => {
  it('returns orange for words above user level', () => {
    expect(segmentColor(3, 2, 50)).toBe('orange')
  })
  it('returns blue for same-level low mastery', () => {
    expect(segmentColor(2, 2, 60)).toBe('blue')
  })
  it('returns gray for same-level high mastery', () => {
    expect(segmentColor(2, 2, 70)).toBe('gray')
  })
  it('returns blue for lower-level low mastery', () => {
    expect(segmentColor(1, 2, 30)).toBe('blue')
  })
})
```

**Step 2: Run test — verify it fails**

```bash
npm run test:run src/lib/__tests__/mastery.test.ts
```

Expected: FAIL — "cannot find module '@/lib/mastery'"

**Step 3: Create `src/lib/constants.ts`**

```typescript
export const MASTERY_MIN = 0
export const MASTERY_MAX = 100
export const MASTERY_KNOWN_THRESHOLD = 70  // mastery >= 70 → gray underline
export const TOPIK_LEVELS = [1, 2, 3, 4, 5, 6] as const
export type TopikLevel = 1 | 2 | 3 | 4 | 5 | 6
```

**Step 4: Create `src/lib/mastery.ts`**

```typescript
import { MASTERY_MIN, MASTERY_MAX, MASTERY_KNOWN_THRESHOLD } from './constants'

export function updateMastery(current: number, correct: boolean): number {
  const next = correct ? current + 1 : current - 1
  return Math.max(MASTERY_MIN, Math.min(MASTERY_MAX, next))
}

export type SegmentColor = 'blue' | 'orange' | 'gray'

// Determines highlight color for a word segment:
// - orange: word is above the user's current TOPIK level (challenge)
// - blue:   word is at or below user's level AND mastery is low (needs practice)
// - gray:   word is at or below user's level AND mastery is high (known)
export function segmentColor(
  wordTopikLevel: number,
  userTopikLevel: number,
  mastery: number
): SegmentColor {
  if (wordTopikLevel > userTopikLevel) return 'orange'
  return mastery >= MASTERY_KNOWN_THRESHOLD ? 'gray' : 'blue'
}
```

**Step 5: Run mastery tests — verify they pass**

```bash
npm run test:run src/lib/__tests__/mastery.test.ts
```

Expected: 9 tests PASS

**Step 6: Write failing scoring tests**

Create `src/lib/__tests__/scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateQuizScore, calculateTotalScore } from '@/lib/scoring'

describe('calculateQuizScore', () => {
  it('returns positive for all correct', () => {
    expect(calculateQuizScore(3, 0)).toBe(3)
  })
  it('returns net negative for mostly wrong', () => {
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

**Step 7: Run — verify fail**

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

**Step 9: Run scoring tests — verify they pass**

```bash
npm run test:run src/lib/__tests__/scoring.test.ts
```

Expected: 5 tests PASS

**Step 10: Create `src/lib/types.ts`**

```typescript
import { TopikLevel } from './constants'

export type ArticleStatus = 'unread' | 'reading' | 'completed'

// Segment types stored in adapted_korean JSONB column
export type Segment =
  | { type: 'text'; text: string }
  | { type: 'word'; text: string; wordId: number; topikLevel: TopikLevel }
  | { type: 'break' }

export interface ComprehensionQuestion {
  id: string
  question: string
  options: [string, string, string, string]
  correct: number  // 0-3 index
  userAnswer?: number
}

export interface Article {
  id: string
  user_id: string
  source_url: string
  title: string
  adapted_korean: Segment[]
  original_english: string
  topik_level_at_time: TopikLevel
  status: ArticleStatus
  word_quiz_score: number
  comprehension_score: number
  total_score: number
  comprehension_questions: ComprehensionQuestion[]
  created_at: string
  completed_at: string | null
}

export interface TopikWord {
  id: number
  korean: string
  english: string
  romanization: string
  topik_level: TopikLevel
}

export interface UserWordMastery {
  word_id: number
  mastery: number
  times_correct: number
  times_seen: number
}

export interface UserSettings {
  user_id: string
  topik_level: TopikLevel
}
```

**Step 11: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 12: Commit**

```bash
git add .
git commit -m "feat: add constants, types, mastery/scoring logic"
```

---

## Task 3: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Create `supabase/migrations/001_initial_schema.sql`**

```sql
create extension if not exists "uuid-ossp";

-- User preferences
create table user_settings (
  user_id    text primary key,
  topik_level int not null default 2 check (topik_level between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Global TOPIK dictionary (~2,300 words, pre-seeded once)
create table topik_words (
  id           serial primary key,
  korean       text not null,
  english      text,
  romanization text,
  topik_level  smallint not null check (topik_level between 1 and 6)
);

-- Per-user mastery: row created on first encounter (mastery starts at 0)
create table user_word_mastery (
  id            serial primary key,
  user_id       text not null,
  word_id       int not null references topik_words(id),
  mastery       smallint not null default 0 check (mastery between 0 and 100),
  times_correct int not null default 0,
  times_seen    int not null default 0,
  unique (user_id, word_id)
);

-- User-added custom words (non-TOPIK vocabulary)
create table user_custom_words (
  id           serial primary key,
  user_id      text not null,
  korean       text not null,
  english      text,
  romanization text,
  mastery      smallint not null default 0 check (mastery between 0 and 100),
  added_at     timestamptz not null default now()
);

-- Articles — adapted_korean is a JSONB Segment[] array
create table articles (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 text not null,
  source_url              text not null,
  title                   text not null,
  adapted_korean          jsonb not null default '[]',
  original_english        text not null,
  topik_level_at_time     int not null,
  status                  text not null default 'unread'
                            check (status in ('unread', 'reading', 'completed')),
  word_quiz_score         int not null default 0,
  comprehension_score     int not null default 0,
  total_score             int not null default 0,
  comprehension_questions jsonb not null default '[]',
  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);

create index on topik_words (korean);
create index on topik_words (topik_level);
create index on user_word_mastery (user_id);
create index on user_word_mastery (user_id, word_id);
create index on user_custom_words (user_id);
create index on articles (user_id, status);
create index on articles (user_id, created_at desc);
```

**Step 2: Apply the migration**

In Supabase Dashboard → SQL Editor, paste and run the file contents.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add initial database schema"
```

---

## Task 4: TOPIK Dictionary Seed

**Files:**
- Create: `scripts/seed-topik.ts`

The full TOPIK I+II vocabulary list must be sourced and imported. Find a community-compiled JSON file on GitHub — search `topik vocabulary json site:github.com`. The file should have entries like `{ "korean": "경제", "english": "economy", "topik_level": 2 }`.

**Step 1: Create `scripts/seed-topik.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Replace with actual sourced TOPIK vocabulary JSON
// Format: { korean: string, english: string, romanization?: string, topik_level: 1|2|3|4|5|6 }[]
import vocabulary from './topik-vocabulary.json'

async function seed() {
  const BATCH = 500
  for (let i = 0; i < vocabulary.length; i += BATCH) {
    const batch = vocabulary.slice(i, i + BATCH)
    const { error } = await supabase.from('topik_words').insert(batch)
    if (error) throw error
    console.log(`Inserted ${i + batch.length} / ${vocabulary.length}`)
  }
  console.log('Done.')
}

seed().catch(console.error)
```

**Step 2: Run the seed**

```bash
npx tsx scripts/seed-topik.ts
```

Expected: ~2,300 rows in `topik_words`.

**Step 3: Spot-check the data**

In Supabase SQL Editor:
```sql
select topik_level, count(*) from topik_words group by topik_level order by topik_level;
```

Verify all 6 levels have rows, and totals look reasonable (~800 level 1, ~700 level 2, etc.).

**Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: add TOPIK dictionary seed script"
```

---

## Task 5: Auth + Supabase Admin Client

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

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add NextAuth.js v5 Google OAuth and Supabase admin client"
```

---

## Task 6: Article Extraction

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

**Step 2: Run — verify fail**

```bash
npm run test:run src/lib/__tests__/extract.test.ts
```

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
```

**Step 4: Run tests — verify pass**

```bash
npm run test:run src/lib/__tests__/extract.test.ts
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add article and Reddit content extraction"
```

---

## Task 7: Claude Article Adaptation

**Files:**
- Create: `src/lib/__tests__/claude.test.ts`
- Create: `src/lib/claude.ts`

**Step 1: Write failing tests**

Create `src/lib/__tests__/claude.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseAdaptationResponse, buildUserMessage } from '@/lib/claude'
import type { TopikLevel } from '@/lib/constants'

const MOCK_RESPONSE = JSON.stringify({
  adaptedKorean: [
    { type: 'text', text: '한국에서 ' },
    { type: 'word', text: '경제', wordId: 42, topikLevel: 2 },
    { type: 'text', text: '가 성장하고 있습니다.' },
  ],
  comprehensionQuestions: [
    { id: 'q1', question: '무엇이 성장합니까?', options: ['경제', '인구', '기술', '교육'], correct: 0 },
    { id: 'q2', question: '어느 나라입니까?', options: ['한국', '일본', '중국', '미국'], correct: 0 },
    { id: 'q3', question: '어떻게 되고 있습니까?', options: ['성장', '감소', '정체', '하락'], correct: 0 },
  ],
})

describe('parseAdaptationResponse', () => {
  it('parses valid JSON response', () => {
    const result = parseAdaptationResponse(MOCK_RESPONSE)
    expect(result.adaptedKorean).toHaveLength(3)
    expect(result.comprehensionQuestions).toHaveLength(3)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseAdaptationResponse('not json')).toThrow()
  })

  it('throws if fewer than 3 comprehension questions', () => {
    const bad = JSON.stringify({
      adaptedKorean: [],
      comprehensionQuestions: [{ id: 'q1', question: '?', options: ['a','b','c','d'], correct: 0 }],
    })
    expect(() => parseAdaptationResponse(bad)).toThrow('3 comprehension questions')
  })
})

describe('buildUserMessage', () => {
  it('includes TOPIK level', () => {
    const msg = buildUserMessage('article content', 3 as TopikLevel)
    expect(msg).toContain('TOPIK 3')
  })

  it('includes article content', () => {
    const msg = buildUserMessage('some article text here', 2 as TopikLevel)
    expect(msg).toContain('some article text here')
  })
})
```

**Step 2: Run — verify fail**

```bash
npm run test:run src/lib/__tests__/claude.test.ts
```

**Step 3: Create `src/lib/claude.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { TopikLevel } from './constants'
import { Segment, ComprehensionQuestion } from './types'

const client = new Anthropic()

export interface AdaptationResponse {
  adaptedKorean: Segment[]
  comprehensionQuestions: ComprehensionQuestion[]
}

// System prompt is ~12K tokens — cached with ephemeral cache_control.
// Cache read cost: ~$0.004 vs cache write: ~$0.045. Breaks even at 2 calls per 5-min TTL.
// Contains the full TOPIK vocabulary reference (levels 1–6).
// Claude handles Korean morphology: 경제적 → tagged as 경제 (level 2). Accuracy ~90–95%.
const SYSTEM_PROMPT = `You are a Korean language learning assistant. Adapt articles for Korean learners at a specified TOPIK level.

## TOPIK Vocabulary Reference
### Level 1 (~800 words — absolute beginner, daily basics)
가다, 가족, 감사합니다, 공부, 나라, 날씨, 내일, 먹다, 물, 사람, 사랑, 시간, 안녕하세요, 어디, 언제, 오늘, 음식, 이름, 있다, 좋다, 친구, 학교, 하다
[... insert full level 1 word list from topik-vocabulary.json ...]

### Level 2 (~700 words — elementary, everyday topics)
경험, 경제, 관계, 교육, 문화, 사회, 성공, 여행, 인기, 직업, 환경
[... insert full level 2 word list ...]

### Level 3 (~600 words — intermediate-low, general topics)
[... level 3 list ...]

### Level 4 (~500 words — intermediate-high, news topics)
[... level 4 list ...]

### Level 5 (~400 words — advanced-low, abstract topics)
[... level 5 list ...]

### Level 6 (~300 words — advanced, near-native)
[... level 6 list ...]

## Output Format
Return ONLY valid JSON, no markdown fences, no explanation:

{
  "adaptedKorean": [
    { "type": "text", "text": "plain text here" },
    { "type": "word", "text": "경제적", "wordId": <topik_words.id>, "topikLevel": 2 },
    { "type": "break" }
  ],
  "comprehensionQuestions": [
    { "id": "q1", "question": "...", "options": ["option A", "option B", "option C", "option D"], "correct": 0 }
  ]
}

## Rules
- Emit a "break" segment between paragraphs (not inside sentences)
- Tag inflected forms with the base word's ID: 경제적 → wordId for 경제, topikLevel 2
- "correct" in comprehensionQuestions is a 0-based index into options[]
- Only tag words that appear in the TOPIK reference above`

export function buildUserMessage(content: string, topikLevel: TopikLevel): string {
  return `User's TOPIK level: ${topikLevel}

Adapt this article into Korean at TOPIK level ${topikLevel}:

${content}

Adaptation rules:
1. Rewrite in natural Korean — do not translate sentence-by-sentence
2. Use ~90% vocabulary at or below TOPIK level ${topikLevel}
3. Include ~10% vocabulary at TOPIK level ${topikLevel + 1} for challenge
4. For every TOPIK word that appears, emit a "word" segment with its wordId and topikLevel
5. Use "break" segments between paragraphs
6. Generate exactly 3 comprehension questions`
}

export function parseAdaptationResponse(text: string): AdaptationResponse {
  let parsed: AdaptationResponse
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Claude returned invalid JSON')
  }

  if (!Array.isArray(parsed.comprehensionQuestions) || parsed.comprehensionQuestions.length < 3) {
    throw new Error('Response must include at least 3 comprehension questions')
  }

  return parsed
}

export async function adaptArticle(
  title: string,
  content: string,
  topikLevel: TopikLevel
): Promise<AdaptationResponse> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Title: ${title}\n\n${buildUserMessage(content, topikLevel)}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseAdaptationResponse(text)
}
```

> **Note on system prompt:** Replace the abbreviated word lists with the actual full lists from `topik-vocabulary.json`. This is what enables wordId tagging — Claude can only emit correct wordIds if it sees the vocabulary with IDs in the prompt. Consider fetching the actual topik_words rows from Supabase at startup and formatting them as `id: korean (level N)` in the system prompt.

**Step 4: Run tests — verify pass**

```bash
npm run test:run src/lib/__tests__/claude.test.ts
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Claude article adaptation with segment array output"
```

---

## Task 8: Adapt API Route

**Files:**
- Create: `src/app/api/articles/adapt/route.ts`

**Step 1: Create `src/app/api/articles/adapt/route.ts`**

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

  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('topik_level')
    .eq('user_id', userId)
    .single()
  const topikLevel = settings?.topik_level ?? 2

  const extracted = await fetchAndExtract(url, redditType)

  // Reddit URL without type choice yet — ask the client to choose
  if (extracted.isReddit && !redditType) {
    return NextResponse.json({
      needsRedditChoice: true,
      hasLinkedArticle: extracted.hasLinkedArticle ?? false,
    })
  }

  const adaptation = await adaptArticle(extracted.title, extracted.content, topikLevel)

  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .insert({
      user_id: userId,
      source_url: url,
      title: extracted.title,
      adapted_korean: adaptation.adaptedKorean,
      original_english: extracted.content,
      topik_level_at_time: topikLevel,
      comprehension_questions: adaptation.comprehensionQuestions,
      status: 'unread',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articleId: article.id })
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add adapt API route"
```

---

## Task 9: Word Quiz API

**Files:**
- Create: `src/app/api/words/quiz/route.ts`

Updates `user_word_mastery` (not a flat `words` table) and increments the article's `word_quiz_score`.

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

  const { articleId, wordId, correct } = await req.json()
  // wordId: topik_words.id (number)

  // Fetch or create user_word_mastery row
  const { data: existing } = await supabaseAdmin
    .from('user_word_mastery')
    .select('mastery, times_correct, times_seen')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .single()

  const currentMastery = existing?.mastery ?? 0
  const newMastery = updateMastery(currentMastery, correct)

  await supabaseAdmin
    .from('user_word_mastery')
    .upsert(
      {
        user_id: userId,
        word_id: wordId,
        mastery: newMastery,
        times_seen: (existing?.times_seen ?? 0) + 1,
        times_correct: (existing?.times_correct ?? 0) + (correct ? 1 : 0),
      },
      { onConflict: 'user_id,word_id' }
    )

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
  }

  return NextResponse.json({ mastery: newMastery, correct })
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add word quiz API route with user_word_mastery update"
```

---

## Task 10: Settings API & TOPIK Selector

**Files:**
- Create: `src/app/api/settings/route.ts`
- Create: `src/components/TopikSelector.tsx`

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
        <option key={l} value={l}>TOPIK {l}</option>
      ))}
    </select>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add settings API and TOPIK level selector"
```

---

## Task 11: PWA Manifest & Share Target

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
    "params": { "url": "url", "title": "title" }
  }
}
```

**Step 2: Create `public/sw.js`**

```javascript
// Minimal service worker — required for PWA installability
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())
self.addEventListener('fetch', () => {})
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

**Step 4: Add to `src/app/layout.tsx` `<head>`**

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#000000" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<script
  dangerouslySetInnerHTML={{
    __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js') }`,
  }}
/>
```

**Step 5: Add placeholder icons**

```bash
mkdir -p public/icons
# Place 192×192 and 512×512 PNG files at public/icons/icon-192.png and icon-512.png
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add PWA manifest and Web Share Target"
```

---

## Task 12: Segment Renderer Component

**Files:**
- Create: `src/components/__tests__/SegmentRenderer.test.tsx`
- Create: `src/components/SegmentRenderer.tsx`

This component replaces the prototype's inline segment mapping. It renders the `Segment[]` array from the DB, joining per-user mastery from a passed map.

**Step 1: Write failing tests**

Create `src/components/__tests__/SegmentRenderer.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { SegmentRenderer } from '@/components/SegmentRenderer'
import { describe, it, expect, vi } from 'vitest'
import type { Segment } from '@/lib/types'

const segments: Segment[] = [
  { type: 'text', text: '한국의 ' },
  { type: 'word', text: '경제', wordId: 42, topikLevel: 2 },
  { type: 'text', text: '가 성장합니다.' },
]

describe('SegmentRenderer', () => {
  it('renders plain text segments', () => {
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map()}
        userTopikLevel={2}
        onWordTap={vi.fn()}
      />
    )
    expect(screen.getByText('한국의 ')).toBeInTheDocument()
  })

  it('renders word segment as a button', () => {
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map()}
        userTopikLevel={2}
        onWordTap={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: '경제' })).toBeInTheDocument()
  })

  it('calls onWordTap with wordId when word is tapped', () => {
    const onWordTap = vi.fn()
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map()}
        userTopikLevel={2}
        onWordTap={onWordTap}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '경제' }))
    expect(onWordTap).toHaveBeenCalledWith(42)
  })

  it('applies orange color for words above user level', () => {
    render(
      <SegmentRenderer
        segments={segments}
        masteryMap={new Map([[42, 50]])}
        userTopikLevel={1}  // word is level 2, user is level 1 → orange
        onWordTap={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', { name: '경제' })
    expect(btn.className).toContain('orange')
  })

  it('renders break segment as a div spacer', () => {
    const withBreak: Segment[] = [
      { type: 'text', text: 'para 1' },
      { type: 'break' },
      { type: 'text', text: 'para 2' },
    ]
    const { container } = render(
      <SegmentRenderer
        segments={withBreak}
        masteryMap={new Map()}
        userTopikLevel={2}
        onWordTap={vi.fn()}
      />
    )
    expect(container.querySelectorAll('div.mt-4').length).toBe(1)
  })
})
```

**Step 2: Run — verify fail**

```bash
npm run test:run src/components/__tests__/SegmentRenderer.test.tsx
```

**Step 3: Create `src/components/SegmentRenderer.tsx`**

```tsx
import { segmentColor } from '@/lib/mastery'
import type { Segment } from '@/lib/types'

const COLOR_CLASSES: Record<string, string> = {
  orange: 'decoration-orange-400',
  blue:   'decoration-blue-500',
  gray:   'decoration-gray-300',
}

interface SegmentRendererProps {
  segments: Segment[]
  masteryMap: Map<number, number>   // wordId → mastery (0–100), from user_word_mastery
  userTopikLevel: number
  onWordTap: (wordId: number) => void
}

export function SegmentRenderer({
  segments,
  masteryMap,
  userTopikLevel,
  onWordTap,
}: SegmentRendererProps) {
  return (
    <div className="text-gray-900 leading-loose text-lg">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.text}</span>
        }
        if (seg.type === 'break') {
          return <div key={i} className="mt-4" />
        }
        // type === 'word'
        const mastery = masteryMap.get(seg.wordId) ?? 0
        const color = segmentColor(seg.topikLevel, userTopikLevel, mastery)
        return (
          <button
            key={i}
            onClick={() => onWordTap(seg.wordId)}
            className={`underline decoration-2 underline-offset-2 ${COLOR_CLASSES[color]}`}
          >
            {seg.text}
          </button>
        )
      })}
    </div>
  )
}
```

**Step 4: Run — verify pass**

```bash
npm run test:run src/components/__tests__/SegmentRenderer.test.tsx
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add SegmentRenderer with topikLevel-based color coding"
```

---

## Task 13: Word Quiz Popup

**Files:**
- Create: `src/components/__tests__/WordQuizPopup.test.tsx`
- Create: `src/components/WordQuizPopup.tsx`

**Step 1: Write failing tests**

Create `src/components/__tests__/WordQuizPopup.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { WordQuizPopup } from '@/components/WordQuizPopup'
import { describe, it, expect, vi } from 'vitest'

const word = {
  wordId: 42,
  korean: '경제',
  english: 'economy',
  romanization: 'gyeongje',
  distractors: ['society', 'culture', 'education'] as [string, string, string],
}

describe('WordQuizPopup', () => {
  it('shows the Korean word', () => {
    render(<WordQuizPopup word={word} onAnswer={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('경제')).toBeInTheDocument()
  })

  it('shows 4 answer choices', () => {
    render(<WordQuizPopup word={word} onAnswer={vi.fn()} onClose={vi.fn()} />)
    const choices = screen.getAllByRole('button').filter(b => !b.textContent?.includes('×'))
    expect(choices).toHaveLength(4)
  })

  it('calls onAnswer(true) when correct choice selected', () => {
    const onAnswer = vi.fn()
    render(<WordQuizPopup word={word} onAnswer={onAnswer} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('economy'))
    expect(onAnswer).toHaveBeenCalledWith(true)
  })

  it('calls onAnswer(false) when wrong choice selected', () => {
    const onAnswer = vi.fn()
    render(<WordQuizPopup word={word} onAnswer={onAnswer} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('society'))
    expect(onAnswer).toHaveBeenCalledWith(false)
  })
})
```

**Step 2: Run — verify fail**

```bash
npm run test:run src/components/__tests__/WordQuizPopup.test.tsx
```

**Step 3: Create `src/components/WordQuizPopup.tsx`**

```tsx
'use client'

import { useMemo } from 'react'

interface WordQuizPopupProps {
  word: {
    wordId: number
    korean: string
    english: string
    romanization: string
    distractors: [string, string, string]
  }
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
        className="bg-white w-full max-w-2xl rounded-t-3xl p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <p className="text-4xl font-bold mb-1">{word.korean}</p>
          <p className="text-gray-400 text-sm">{word.romanization}</p>
        </div>
        <p className="text-center text-gray-600 font-medium mb-4 text-sm">
          What does this mean?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {choices.map(choice => (
            <button
              key={choice}
              onClick={() => onAnswer(choice === word.english)}
              className="py-3 px-4 border-2 border-gray-200 rounded-2xl text-sm font-medium hover:border-gray-400 active:bg-gray-50"
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

**Step 4: Run — verify pass**

```bash
npm run test:run src/components/__tests__/WordQuizPopup.test.tsx
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add word quiz popup"
```

---

## Task 14: Article Card & Reading List Screen

**Files:**
- Create: `src/components/__tests__/ArticleCard.test.tsx`
- Create: `src/components/ArticleCard.tsx`
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
  source_url: 'https://reddit.com/r/korea/comments/abc/test',
  original_english: 'Preview text for the article.',
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
    expect(screen.getByText('r/korea')).toBeInTheDocument()
  })

  it('shows score for completed articles', () => {
    render(<ArticleCard article={{ ...article, status: 'completed', total_score: 42 }} />)
    expect(screen.getByText(/42/)).toBeInTheDocument()
  })
})
```

**Step 2: Run — verify fail**

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
  unread:  'bg-blue-100 text-blue-700',
  reading: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
}

export function ArticleCard({ article }: ArticleCardProps) {
  const excerpt = article.original_english.slice(0, 120).trim() + '…'
  const date = new Date(article.created_at).toLocaleDateString()

  return (
    <Link
      href={`/articles/${article.id}`}
      className="block px-4 py-4 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
            {article.title}
          </h2>
          <p className="text-gray-400 text-xs mb-2 line-clamp-2">{excerpt}</p>
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
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[article.status]}`}>
          {article.status}
        </span>
      </div>
    </Link>
  )
}
```

**Step 4: Run — verify pass**

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
    <main className="max-w-md mx-auto">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h1 className="font-bold text-lg">LangBuddy</h1>
        <div className="flex items-center gap-3">
          <TopikSelector initial={settings?.topik_level ?? 2} />
          <Link href="/archive" className="text-gray-500 text-sm">Archive</Link>
          <Link href="/wordbank" className="text-gray-500 text-sm">Words</Link>
        </div>
      </header>

      {articles && articles.length > 0 ? (
        articles.map(article => <ArticleCard key={article.id} article={article} />)
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
git commit -m "feat: add article card and reading list home screen"
```

---

## Task 15: Article Processing Screen

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

  useEffect(() => { process() }, [])

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
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 max-w-md mx-auto">
        <h2 className="font-semibold text-lg text-center">What would you like to adapt?</h2>
        {hasLinkedArticle && (
          <button
            onClick={() => process('article')}
            className="w-full py-3 px-4 bg-black text-white rounded-2xl font-medium"
          >
            The linked article
          </button>
        )}
        <button
          onClick={() => process('post')}
          className="w-full py-3 px-4 border border-gray-300 rounded-2xl font-medium"
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
        Go home
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

## Task 16: Reading View

**Files:**
- Create: `src/components/ReadingView.tsx`
- Create: `src/app/articles/[id]/page.tsx`

The reading view fetches the article segments and the user's mastery for every `wordId` that appears in those segments (a targeted join, not a full word bank query). It passes a `masteryMap` to `SegmentRenderer`.

**Step 1: Create `src/components/ReadingView.tsx`**

```tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SegmentRenderer } from './SegmentRenderer'
import { WordQuizPopup } from './WordQuizPopup'
import type { Article, TopikWord } from '@/lib/types'

interface ReadingViewProps {
  article: Article
  masteryMap: Map<number, number>       // wordId → mastery
  wordDetails: Map<number, TopikWord>   // wordId → full TopikWord row (for quiz)
  userTopikLevel: number
}

export function ReadingView({ article, masteryMap, wordDetails, userTopikLevel }: ReadingViewProps) {
  const router = useRouter()
  const [showKorean, setShowKorean] = useState(true)
  const [showToggleLabel, setShowToggleLabel] = useState(false)
  const [activeWordId, setActiveWordId] = useState<number | null>(null)
  const [wordQuizScore, setWordQuizScore] = useState(article.word_quiz_score)
  const lastTapRef = useRef(0)
  const labelTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const activeWord = activeWordId !== null ? wordDetails.get(activeWordId) : null

  // Double-tap to toggle Korean/English
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

  async function handleQuizAnswer(correct: boolean) {
    if (activeWordId === null) return
    setActiveWordId(null)
    const res = await fetch('/api/words/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: article.id, wordId: activeWordId, correct }),
    })
    if (res.ok) {
      setWordQuizScore(s => s + (correct ? 1 : -1))
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="text-blue-600 text-sm font-medium">
          ← Back
        </button>
        <span className="text-sm text-gray-500">Score: {wordQuizScore}</span>
      </header>

      <div
        className="flex-1 px-5 py-6 overflow-y-auto relative select-none"
        onClick={handleTap}
      >
        {showToggleLabel && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
            <span className="bg-black/70 text-white text-lg px-5 py-2 rounded-full">
              {showKorean ? '한국어' : 'English'}
            </span>
          </div>
        )}

        <h1 className="text-lg font-bold text-gray-900 mb-4 leading-snug">{article.title}</h1>

        {showKorean ? (
          <SegmentRenderer
            segments={article.adapted_korean}
            masteryMap={masteryMap}
            userTopikLevel={userTopikLevel}
            onWordTap={setActiveWordId}
          />
        ) : (
          <p className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
            {article.original_english}
          </p>
        )}
      </div>

      <div className="px-5 py-6 border-t border-gray-100">
        <button
          onClick={() => router.push(`/articles/${article.id}/comprehension`)}
          className="w-full py-3 bg-blue-500 text-white rounded-2xl font-semibold text-base"
        >
          I&apos;m done reading
        </button>
      </div>

      {activeWord && (
        <WordQuizPopup
          word={{
            wordId: activeWord.id,
            korean: activeWord.korean,
            english: activeWord.english,
            romanization: activeWord.romanization,
            distractors: ['option 2', 'option 3', 'option 4'],  // TODO: generate distractors from topik_words
          }}
          onAnswer={handleQuizAnswer}
          onClose={() => setActiveWordId(null)}
        />
      )}
    </div>
  )
}
```

> **Distractor generation note:** The `distractors` are hardcoded as placeholders above. In the full implementation, fetch 3 random English definitions from other `topik_words` rows at the same level. This can be done in the server component that renders the page, passed in via `wordDetails`. Add this as a follow-up improvement once the basic reading flow works.

**Step 2: Create `src/app/articles/[id]/page.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ReadingView } from '@/components/ReadingView'
import { notFound } from 'next/navigation'
import type { Segment } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user.id

  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!article) notFound()

  // Mark as reading on first open
  if (article.status === 'unread') {
    await supabaseAdmin.from('articles').update({ status: 'reading' }).eq('id', id)
  }

  // Collect all wordIds referenced in this article's segments
  const segments: Segment[] = article.adapted_korean
  const wordIds = [...new Set(
    segments
      .filter((s): s is Extract<Segment, { type: 'word' }> => s.type === 'word')
      .map(s => s.wordId)
  )]

  // Fetch user mastery for just the words in this article
  const [{ data: masteryRows }, { data: wordRows }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from('user_word_mastery')
      .select('word_id, mastery')
      .eq('user_id', userId)
      .in('word_id', wordIds),
    supabaseAdmin
      .from('topik_words')
      .select('id, korean, english, romanization, topik_level')
      .in('id', wordIds),
    supabaseAdmin
      .from('user_settings')
      .select('topik_level')
      .eq('user_id', userId)
      .single(),
  ])

  const masteryMap = new Map((masteryRows ?? []).map(r => [r.word_id, r.mastery]))
  const wordDetails = new Map((wordRows ?? []).map(r => [r.id, r]))
  const userTopikLevel = settings?.topik_level ?? 2

  return (
    <ReadingView
      article={article}
      masteryMap={masteryMap}
      wordDetails={wordDetails}
      userTopikLevel={userTopikLevel}
    />
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add reading view with segment renderer and word quiz"
```

---

## Task 17: Comprehension Screen & Complete API

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
import type { ComprehensionQuestion } from '@/lib/types'

export function ComprehensionQuiz({
  articleId,
  questions,
}: {
  articleId: string
  questions: ComprehensionQuestion[]
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  const q = questions[current]

  async function handleAnswer(choiceIndex: number) {
    const newAnswers = [...answers, choiceIndex]
    setAnswers(newAnswers)

    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      return
    }

    setSubmitting(true)
    const answeredQuestions = questions.map((q, i) => ({ ...q, userAnswer: newAnswers[i] }))
    const comprehensionScore = answeredQuestions.reduce(
      (sum, q) => sum + (q.userAnswer === q.correct ? 1 : -1),
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
    <div className="max-w-md mx-auto min-h-screen flex flex-col px-5 py-8">
      <p className="text-sm text-gray-400 mb-2">
        Question {current + 1} of {questions.length}
      </p>
      <div className="w-full bg-gray-100 rounded-full h-1 mb-8">
        <div
          className="bg-blue-500 h-1 rounded-full transition-all"
          style={{ width: `${(current / questions.length) * 100}%` }}
        />
      </div>

      <h2 className="text-xl font-semibold mb-8 leading-snug">{q.question}</h2>

      <div className="flex flex-col gap-3">
        {q.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className="text-left py-4 px-5 border-2 border-gray-200 rounded-2xl font-medium hover:border-gray-400 active:bg-gray-50"
          >
            {option}
          </button>
        ))}
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

## Task 18: Summary Screen & Archive

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
    <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center px-5 text-center">
      <h1 className="text-3xl font-bold mb-2">Article Complete!</h1>
      <p className="text-gray-400 mb-10">Here&apos;s how you did</p>

      <div className="w-full bg-white rounded-2xl border border-gray-100 p-6 mb-8 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Vocabulary quizzes</span>
          <span className="font-semibold text-lg">{word ?? 0} pts</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Comprehension</span>
          <span className="font-semibold text-lg">{comp ?? 0} pts</span>
        </div>
        <div className="h-px bg-gray-100" />
        <div className="flex justify-between items-center">
          <span className="font-bold">Total score</span>
          <span className="font-bold text-2xl">{total ?? 0} pts</span>
        </div>
      </div>

      <Link
        href="/"
        className="w-full py-3 bg-blue-500 text-white rounded-2xl font-semibold text-center block"
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
    <main className="max-w-md mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <Link href="/" className="text-blue-600 font-medium text-sm">← Back</Link>
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
git commit -m "feat: add summary screen and archive"
```

---

## Task 19: Word Bank Screen

**Files:**
- Create: `src/app/wordbank/page.tsx`
- Create: `src/components/WordBankFilters.tsx`

Queries `user_word_mastery` joined with `topik_words`. Supports filter pills for mastery, alphabetical, added, and TOPIK levels 1–6.

**Step 1: Create `src/components/WordBankFilters.tsx`**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { TOPIK_LEVELS } from '@/lib/constants'

interface Word {
  word_id: number
  korean: string
  english: string
  romanization: string
  mastery: number
  topik_level: number
  times_seen: number
}

const FILTERS = [
  { key: 'mastery', label: 'By Mastery' },
  { key: 'alpha',   label: 'Dictionary' },
  { key: 'added',   label: 'Added' },
  ...TOPIK_LEVELS.map(l => ({ key: `topik${l}`, label: `TOPIK ${l}` })),
] as const

type FilterKey = typeof FILTERS[number]['key']

export function WordBankFilters({ words }: { words: Word[] }) {
  const [filter, setFilter] = useState<FilterKey>('mastery')

  const filtered = useMemo(() => {
    let result = [...words]
    const topikMatch = filter.match(/^topik(\d)$/)
    if (topikMatch) {
      const level = Number(topikMatch[1])
      result = result.filter(w => w.topik_level === level)
    }
    if (filter === 'alpha') return result.sort((a, b) => a.korean.localeCompare(b.korean, 'ko'))
    if (filter === 'added') return result.sort((a, b) => b.times_seen - a.times_seen)  // proxy for recency
    return result.sort((a, b) => a.mastery - b.mastery)
  }, [words, filter])

  const active = filtered.filter(w => w.mastery < 100)
  const mastered = filtered.filter(w => w.mastery >= 100)

  return (
    <>
      <div className="flex flex-wrap gap-2 px-4 py-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === key
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <h2 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
        Active — {active.length} words
      </h2>
      <div className="space-y-1 px-4 mb-6">
        {active.map(word => <WordRow key={word.word_id} word={word} />)}
      </div>

      {mastered.length > 0 && (
        <>
          <h2 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Mastered — {mastered.length} words
          </h2>
          <div className="space-y-1 px-4">
            {mastered.map(word => <WordRow key={word.word_id} word={word} mastered />)}
          </div>
        </>
      )}
    </>
  )
}

function WordRow({ word, mastered }: { word: Word; mastered?: boolean }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border border-gray-100">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-gray-900">{word.korean}</span>
          <span className="text-xs text-gray-400">{word.romanization}</span>
        </div>
        <p className="text-sm text-gray-500 truncate">{word.english}</p>
      </div>
      <div className="w-16 shrink-0 text-right">
        {mastered ? (
          <span className="text-xs text-green-600 font-semibold">✓ Done</span>
        ) : (
          <>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${word.mastery}%` }} />
            </div>
            <p className="text-xs text-gray-400">{word.mastery}/100</p>
          </>
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
import { WordBankFilters } from '@/components/WordBankFilters'
import Link from 'next/link'

export default async function WordBankPage() {
  const session = await auth()
  const userId = session!.user.id

  // Join user mastery with TOPIK word details
  const { data: rows } = await supabaseAdmin
    .from('user_word_mastery')
    .select('word_id, mastery, times_correct, times_seen, topik_words(korean, english, romanization, topik_level)')
    .eq('user_id', userId)

  const words = (rows ?? []).map(r => ({
    word_id: r.word_id,
    mastery: r.mastery,
    times_seen: r.times_seen,
    korean: (r.topik_words as any).korean,
    english: (r.topik_words as any).english,
    romanization: (r.topik_words as any).romanization,
    topik_level: (r.topik_words as any).topik_level,
  }))

  return (
    <main className="max-w-md mx-auto bg-gray-50 min-h-screen">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-blue-600 font-medium text-sm">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Word Bank</h1>
        <span className="text-sm text-gray-400">{words.length} words</span>
      </header>

      {words.length > 0 ? (
        <WordBankFilters words={words} />
      ) : (
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
git commit -m "feat: add word bank screen with TOPIK 1–6 filters"
```

---

## Task 20: Integration Check & Deployment

**Step 1: Set up environment variables**

Copy `.env.local.example` to `.env.local` and fill in:
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project → Settings → API
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google Cloud Console → APIs & Services → Credentials. Add `http://localhost:3000/api/auth/callback/google` as authorized redirect URI
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32`

**Step 2: Run full test suite**

```bash
npm run test:run
```

Expected: All tests PASS

**Step 3: Manual smoke test**

```bash
npm run dev
```

Walk through the complete flow:
1. Sign in with Google
2. Set TOPIK level in header dropdown
3. Navigate to `/articles/new?url=https://www.bbc.com/news` (or any news article)
4. Verify processing spinner appears, then redirects to reading view
5. Verify Korean article text renders with colored underlines on vocabulary words
6. Double-tap article area — verify Korean/English toggle label appears
7. Tap a highlighted word — verify quiz popup opens with 4 choices
8. Answer correctly and incorrectly — verify score updates in header
9. Tap "I'm done reading" → verify comprehension questions appear one at a time
10. Answer all 3 — verify summary score screen
11. Verify article moved to archive (home feed empty)
12. Navigate to Word Bank — verify encountered words appear with mastery bars
13. Test filter pills (By Mastery, Dictionary, Added, TOPIK 1–6)

**Step 4: Build check**

```bash
npm run build
```

Expected: No TypeScript or build errors

**Step 5: Deploy to Vercel**

```bash
git push origin main
# In Vercel dashboard: Import repo → Configure project
# Add all env vars in Vercel project Settings → Environment Variables
# Add production URL to Google OAuth authorized redirect URIs
```

**Step 6: Test iOS share sheet**

1. Open deployed LangBuddy URL in Safari on iPhone
2. Tap Share → Add to Home Screen
3. Open Reddit, find a post, tap Share
4. Verify LangBuddy appears as a share destination
5. Tap it — verify it opens, processes, and completes the reading flow

**Step 7: Update CLAUDE.md**

Update CLAUDE.md with any new production-specific learnings (auth flow, Supabase client usage, Vercel env vars).

**Step 8: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with production build notes"
```

---

## Task Summary

| # | Task | Key Tests |
|---|---|---|
| 1 | Project scaffold | — |
| 2 | Constants, types, mastery/scoring logic | `mastery.test.ts`, `scoring.test.ts` |
| 3 | Database schema | — |
| 4 | TOPIK dictionary seed | spot-check SQL |
| 5 | Auth + Supabase admin client | — |
| 6 | Article extraction (Readability + Reddit) | `extract.test.ts` |
| 7 | Claude adaptation (segment array output) | `claude.test.ts` |
| 8 | Adapt API route | — |
| 9 | Word quiz API (user_word_mastery) | — |
| 10 | Settings API + TOPIK selector | — |
| 11 | PWA manifest + Web Share Target | — |
| 12 | SegmentRenderer (color-coded highlights) | `SegmentRenderer.test.tsx` |
| 13 | Word quiz popup | `WordQuizPopup.test.tsx` |
| 14 | Article card + reading list home | `ArticleCard.test.tsx` |
| 15 | Article processing screen | — |
| 16 | Reading view | — |
| 17 | Comprehension quiz + complete API | — |
| 18 | Summary screen + archive | — |
| 19 | Word bank screen (TOPIK 1–6 filters) | — |
| 20 | Integration check + deployment | manual |

## Key Differences from Prototype

| Concern | Prototype | Production |
|---|---|---|
| Article text storage | Inline segment array in JS | JSONB `adapted_korean` column |
| Segment types | `text`, `vocab`, `wordbank`, `break` | `text`, `word`, `break` |
| Word highlight color | Blue vs orange (hardcoded) | Computed from `topikLevel` vs `userTopikLevel` + mastery |
| Word bank data | 100 hardcoded words | `topik_words` (~2,300) + `user_word_mastery` per-user |
| TOPIK level filter | 1 and 2 only | 1–6 (all levels) |
| Auth | None | NextAuth.js v5 Google OAuth |
| Persistence | React state only | Supabase Postgres |
