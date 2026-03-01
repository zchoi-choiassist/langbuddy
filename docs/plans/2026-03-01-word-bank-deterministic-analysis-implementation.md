# Word Bank Deterministic Analysis Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a full TOPIK-backed infinite-scroll word bank with mastery-based highlight states and a deterministic post-adaptation vocabulary analyzer.

**Architecture:** Add a deterministic analyzer module that tokenizes adapted Korean, performs exact and derived-base-form matching, and persists canonical matches in a dedicated table. Migrate word bank reads to cursor-based pagination over `topik_words` with user mastery left joins, then update the UI to consume paginated results and apply strict neutral/highlight styling based on `mastery > 0`.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres, React 19, Vitest, Testing Library.

---

### Task 1: Add persistence for deterministic matches

**Files:**
- Create: `supabase/migrations/003_article_word_matches.sql`
- Modify: `src/lib/types.ts`
- Test: `src/lib/__tests__/types.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import type { ArticleWordMatch } from '@/lib/types'

describe('ArticleWordMatch type shape', () => {
  it('accepts topik match rows', () => {
    const row: ArticleWordMatch = {
      id: 1,
      article_id: '00000000-0000-0000-0000-000000000001',
      user_id: 'user-1',
      source: 'topik',
      topik_word_id: 42,
      custom_word_id: null,
      surface_form: '경제를',
      normalized_form: '경제를',
      base_form: '경제',
      match_confidence: 'derived',
      created_at: '2026-03-01T00:00:00.000Z',
    }
    expect(row.source).toBe('topik')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/__tests__/types.test.ts`
Expected: FAIL with `ArticleWordMatch` missing from `src/lib/types.ts`.

**Step 3: Write minimal implementation**

```ts
export interface ArticleWordMatch {
  id: number
  article_id: string
  user_id: string
  source: 'topik' | 'custom'
  topik_word_id: number | null
  custom_word_id: number | null
  surface_form: string
  normalized_form: string
  base_form: string
  match_confidence: 'exact' | 'derived'
  created_at: string
}
```

```sql
alter table articles add column if not exists last_analyzed_at timestamptz;

create table if not exists article_word_matches (
  id serial primary key,
  article_id uuid not null references articles(id) on delete cascade,
  user_id text not null,
  source text not null check (source in ('topik', 'custom')),
  topik_word_id int references topik_words(id),
  custom_word_id int references user_custom_words(id),
  surface_form text not null,
  normalized_form text not null,
  base_form text not null,
  match_confidence text not null check (match_confidence in ('exact', 'derived')),
  created_at timestamptz not null default now(),
  check ((topik_word_id is not null) <> (custom_word_id is not null))
);

create unique index if not exists article_word_matches_unique_topik
  on article_word_matches (article_id, topik_word_id)
  where source = 'topik' and topik_word_id is not null;

create unique index if not exists article_word_matches_unique_custom
  on article_word_matches (article_id, custom_word_id)
  where source = 'custom' and custom_word_id is not null;

create index if not exists article_word_matches_article_idx on article_word_matches(article_id);
create index if not exists article_word_matches_user_created_idx on article_word_matches(user_id, created_at desc);
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/__tests__/types.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add supabase/migrations/003_article_word_matches.sql src/lib/types.ts src/lib/__tests__/types.test.ts
git commit -m "feat: add deterministic article word match schema"
```

### Task 2: Build deterministic analyzer with suffix stripping

**Files:**
- Create: `src/lib/vocabulary-analyzer.ts`
- Create: `src/lib/__tests__/vocabulary-analyzer.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { analyzeVocabulary } from '@/lib/vocabulary-analyzer'

describe('analyzeVocabulary', () => {
  it('matches exact and derived base forms deterministically', () => {
    const results = analyzeVocabulary({
      text: '경제를 배우고 가족과 이야기했다.',
      topikWords: [
        { id: 10, korean: '경제' },
        { id: 11, korean: '가족' },
      ],
      customWords: [],
    })

    expect(results.map(r => [r.wordId, r.baseForm, r.matchConfidence])).toEqual([
      [10, '경제', 'derived'],
      [11, '가족', 'derived'],
    ])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/__tests__/vocabulary-analyzer.test.ts`
Expected: FAIL because `analyzeVocabulary` does not exist.

**Step 3: Write minimal implementation**

```ts
const STRIP_SUFFIXES = [
  '으로', '에서', '에게', '까지', '부터', '처럼',
  '은', '는', '이', '가', '을', '를', '에', '와', '과', '도', '만', '로', '의',
]

function normalizeToken(value: string): string {
  return value.normalize('NFC').trim()
}

function deriveCandidates(token: string): string[] {
  const candidates = [token]
  for (const suffix of STRIP_SUFFIXES.sort((a, b) => b.length - a.length)) {
    if (token.endsWith(suffix)) {
      const stem = token.slice(0, -suffix.length)
      if (/^[가-힣]{2,}$/.test(stem)) candidates.push(stem)
    }
  }
  return [...new Set(candidates)]
}
```

Include deterministic output shape with dedupe by `(source, id)` and `matchConfidence` of `exact` or `derived`.

**Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/__tests__/vocabulary-analyzer.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/vocabulary-analyzer.ts src/lib/__tests__/vocabulary-analyzer.test.ts
git commit -m "feat: add deterministic vocabulary analyzer"
```

### Task 3: Integrate analyzer into adaptation background pipeline

**Files:**
- Modify: `src/app/api/articles/adapt/route.ts`
- Create: `src/lib/persist-article-word-matches.ts`
- Modify: `src/app/api/articles/adapt/__tests__/route.test.ts`

**Step 1: Write the failing test**

Add assertions to existing route test:

```ts
expect(analyzeAndPersistMock).toHaveBeenCalledWith({
  articleId: 'article-1',
  userId: 'user-1',
  adaptedKorean: [{ type: 'text', text: '적응된 내용' }],
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/api/articles/adapt/__tests__/route.test.ts`
Expected: FAIL because analyzer persistence is not called.

**Step 3: Write minimal implementation**

- In `runBackgroundAdaptation`, after article update succeeds, call `analyzeAndPersistArticleWords(...)`.
- `analyzeAndPersistArticleWords` should:
  - load `topik_words` and user `user_custom_words`
  - flatten `adaptedKorean` text
  - call analyzer
  - upsert `article_word_matches`
  - set `articles.last_analyzed_at = now()`
- On analyzer failure, log and continue without breaking adaptation completion.

**Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/app/api/articles/adapt/__tests__/route.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/articles/adapt/route.ts src/lib/persist-article-word-matches.ts src/app/api/articles/adapt/__tests__/route.test.ts
git commit -m "feat: run deterministic vocabulary audit after adaptation"
```

### Task 4: Add cursor-based word bank API

**Files:**
- Create: `src/app/api/wordbank/route.ts`
- Create: `src/app/api/wordbank/__tests__/route.test.ts`

**Step 1: Write the failing test**

```ts
it('returns paginated topik words with user mastery and next cursor', async () => {
  const res = await GET(new Request('http://localhost/api/wordbank?limit=2&topikLevel=2'))
  const data = await res.json()

  expect(res.status).toBe(200)
  expect(data.items).toHaveLength(2)
  expect(data.items[0]).toEqual(expect.objectContaining({
    mastery: expect.any(Number),
    topik_level: 2,
  }))
  expect(data.nextCursor).toBeTruthy()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/api/wordbank/__tests__/route.test.ts`
Expected: FAIL because route does not exist.

**Step 3: Write minimal implementation**

Implement `GET` with:
- auth check
- query params: `limit`, `cursor`, `topikLevel`
- stable sort by `topik_level`, `korean`, `id`
- cursor filter encoded as `base64("<level>|<korean>|<id>")`
- left join or second query for `user_word_mastery`
- response shape:

```json
{
  "items": [
    { "id": 1, "korean": "가족", "english": "family", "topik_level": 1, "mastery": 0 }
  ],
  "nextCursor": "..."
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/app/api/wordbank/__tests__/route.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/wordbank/route.ts src/app/api/wordbank/__tests__/route.test.ts
git commit -m "feat: add cursor-based word bank api"
```

### Task 5: Refactor word bank UI to infinite scroll + TOPIK pills

**Files:**
- Modify: `src/app/wordbank/page.tsx`
- Modify: `src/components/WordBankFilters.tsx`
- Modify: `src/components/__tests__/WordBankFilters.test.tsx`

**Step 1: Write the failing test**

Add tests for:

```ts
it('renders neutral style for mastery 0 and highlighted style for mastery > 0', () => {
  // assert class names/data attributes for both states
})

it('requests next page when sentinel intersects', async () => {
  // mock fetch + IntersectionObserver
  // assert appended rows
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/__tests__/WordBankFilters.test.tsx`
Expected: FAIL with missing infinite-scroll behavior and state classes.

**Step 3: Write minimal implementation**

- Make page shell lightweight; fetch first page server-side or hydrate client with initial payload.
- In `WordBankFilters`, replace in-memory filter/sort-only list with API-driven list.
- Add pills: `All`, `TOPIK 1`..`TOPIK 6` styled per current design tokens.
- Use `IntersectionObserver` sentinel and append `items` until `nextCursor` is null.
- Color rows based strictly on mastery value:
  - `0` => neutral row/text/accent classes
  - `>0` => highlighted classes

**Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/__tests__/WordBankFilters.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/wordbank/page.tsx src/components/WordBankFilters.tsx src/components/__tests__/WordBankFilters.test.tsx
git commit -m "feat: add infinite scroll topik word bank with mastery states"
```

### Task 6: End-to-end verification and cleanup

**Files:**
- Modify: `README.md`

**Step 1: Write or update verification checklist docs**

Add a short section documenting:
- deterministic analyzer run point
- `article_word_matches` purpose
- word bank API cursor contract

**Step 2: Run full targeted verification**

Run:
- `npm run test:run -- src/lib/__tests__/types.test.ts src/lib/__tests__/vocabulary-analyzer.test.ts`
- `npm run test:run -- src/app/api/articles/adapt/__tests__/route.test.ts src/app/api/wordbank/__tests__/route.test.ts`
- `npm run test:run -- src/components/__tests__/WordBankFilters.test.tsx`
- `npm run lint`

Expected: all PASS.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document deterministic vocabulary audit and word bank pagination"
```

