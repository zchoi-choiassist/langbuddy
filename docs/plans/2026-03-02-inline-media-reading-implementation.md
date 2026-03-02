# Inline Media Reading Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add inline image media support to article reading view (both Korean and English modes), including lazy-loading, placeholder fallback, and manual backfill for existing articles.

**Architecture:** Extend the segment contract with a `media` variant and move reading rendering to segment-driven output in both modes. Extract image metadata during article fetch/adapt, inject media segments by best-effort paragraph position (capped at 5), persist idempotently, and provide an authenticated manual backfill endpoint to retrofit existing articles.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres, Vitest + React Testing Library

---

### Task 1: Extend shared types for media segments

**Files:**
- Modify: `src/lib/types.ts`
- Test: `src/lib/__tests__/types.test.ts`

**Step 1: Write the failing test**

Add type-level/runtime-shape assertions to cover `Segment` accepting:
- `type: 'media'`
- `kind: 'image'`
- `src`, `alt`, `caption`, optional `width`/`height`

```ts
const media: Segment = {
  type: 'media',
  kind: 'image',
  src: 'https://example.com/a.jpg',
  alt: 'alt',
  caption: 'cap',
}
expect(media.type).toBe('media')
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/__tests__/types.test.ts`
Expected: FAIL because `Segment` does not include `media`.

**Step 3: Write minimal implementation**

Update `Segment` union in `src/lib/types.ts`.

```ts
| {
    type: 'media'
    kind: 'image'
    src: string
    alt: string | null
    caption: string | null
    width?: number
    height?: number
  }
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/__tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/__tests__/types.test.ts
git commit -m "feat: add media segment type for inline images"
```

### Task 2: Implement image extraction + best-effort placement utilities

**Files:**
- Modify: `src/lib/extract.ts`
- Create: `src/lib/media-placement.ts`
- Test: `src/lib/__tests__/extract.test.ts`
- Test: `src/lib/__tests__/media-placement.test.ts`

**Step 1: Write failing tests**

Add extraction tests for:
- collects inline image URLs from HTML in DOM order
- keeps only HTTP/HTTPS
- dedupes by normalized URL
- caps at 5
- captures `alt` and best-effort caption candidates

Add placement tests for:
- inserts `media` segments near mapped paragraph positions
- idempotent merge (rerun does not duplicate identical media)

```ts
expect(extractInlineImages(html)).toHaveLength(5)
expect(segments.filter(s => s.type === 'media')).toHaveLength(2)
```

**Step 2: Run tests to verify they fail**

Run:
- `npm run test -- src/lib/__tests__/extract.test.ts`
- `npm run test -- src/lib/__tests__/media-placement.test.ts`

Expected: FAIL (new functions missing).

**Step 3: Write minimal implementation**

- Add extraction helpers in `extract.ts`.
- Add placement helpers in `media-placement.ts`.
- Export `ExtractedContent` extension to include image metadata.

```ts
export interface ExtractedImage {
  src: string
  alt: string | null
  caption: string | null
  paragraphIndex: number
}
```

**Step 4: Run tests to verify they pass**

Run:
- `npm run test -- src/lib/__tests__/extract.test.ts`
- `npm run test -- src/lib/__tests__/media-placement.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/extract.ts src/lib/media-placement.ts src/lib/__tests__/extract.test.ts src/lib/__tests__/media-placement.test.ts
git commit -m "feat: extract and place inline images with cap and dedupe"
```

### Task 3: Persist media for new adaptations

**Files:**
- Modify: `src/lib/adapt-article-background.ts`
- Modify: `src/lib/adapt-feed-article.ts` (if needed for consistency hooks)
- Modify: `src/app/api/articles/adapt/route.ts` (if request/response typing needs alignment)
- Test: `src/app/api/articles/adapt/__tests__/route.test.ts`

**Step 1: Write failing integration test**

Add API/background adaptation test that verifies persisted article payload contains `media` segments for extracted images.

```ts
expect(updatedArticle.adapted_korean.some((s: Segment) => s.type === 'media')).toBe(true)
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/api/articles/adapt/__tests__/route.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

In adaptation flow:
- read extracted image metadata
- apply best-effort placement into adapted Korean segments
- persist media-inclusive segments

```ts
const koreanWithMedia = injectMediaSegments(adaptation.adaptedKorean, extracted.images)
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/api/articles/adapt/__tests__/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/adapt-article-background.ts src/lib/adapt-feed-article.ts src/app/api/articles/adapt/route.ts src/app/api/articles/adapt/__tests__/route.test.ts
git commit -m "feat: persist inline image segments during article adaptation"
```

### Task 4: Render media segments in reading view for both modes

**Files:**
- Modify: `src/components/SegmentRenderer.tsx`
- Modify: `src/components/ReadingView.tsx`
- Modify: `src/components/__tests__/SegmentRenderer.test.tsx`
- Modify: `src/components/__tests__/ArticleCard.test.tsx` (only if snapshots/shape impacted)

**Step 1: Write failing component tests**

Test cases:
- renders image block when `media` segment exists
- image has lazy-loading attributes
- on load error shows fixed-height gray placeholder with “Image unavailable”
- media blocks render in both Korean and English toggles

```ts
expect(screen.getByText('Image unavailable')).toBeInTheDocument()
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- src/components/__tests__/SegmentRenderer.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Add `media` segment branch in renderer.
- Ensure English mode uses segment-driven render path (not plain text blob).
- Keep media non-interactive.

```tsx
<img src={seg.src} alt={seg.alt ?? ''} loading="lazy" decoding="async" />
```

**Step 4: Run tests to verify they pass**

Run: `npm run test -- src/components/__tests__/SegmentRenderer.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/SegmentRenderer.tsx src/components/ReadingView.tsx src/components/__tests__/SegmentRenderer.test.tsx src/components/__tests__/ArticleCard.test.tsx
git commit -m "feat: render inline media segments with lazy loading and fallback"
```

### Task 5: Add manual admin backfill endpoint

**Files:**
- Create: `src/app/api/admin/backfill-inline-media/route.ts`
- Create: `src/app/api/admin/backfill-inline-media/__tests__/route.test.ts`
- Modify: `src/lib/auth.ts` (only if admin guard helper is needed)

**Step 1: Write failing API tests**

Test cases:
- unauthorized requests rejected
- authenticated admin can process a batch
- endpoint updates only changed articles
- endpoint continues when one article fails extraction

```ts
expect(response.status).toBe(200)
expect(body.processed).toBeGreaterThan(0)
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- src/app/api/admin/backfill-inline-media/__tests__/route.test.ts`
Expected: FAIL (route missing)

**Step 3: Write minimal implementation**

Implement batch endpoint:
- query candidate articles by cursor/limit
- fetch source URL, extract images, inject media
- idempotent update-if-changed
- return counts (`processed`, `updated`, `skipped`, `failed`, `nextCursor`)

**Step 4: Run tests to verify they pass**

Run: `npm run test -- src/app/api/admin/backfill-inline-media/__tests__/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/admin/backfill-inline-media/route.ts src/app/api/admin/backfill-inline-media/__tests__/route.test.ts src/lib/auth.ts
git commit -m "feat: add manual admin endpoint to backfill inline media"
```

### Task 6: Add migration and verify end-to-end

**Files:**
- Create: `supabase/migrations/007_inline_media_columns.sql` (only if needed by final storage shape)
- Modify: `src/app/articles/[id]/page.tsx`
- Modify: `src/lib/types.ts` (final shape alignment)
- Test: targeted tests touched by tasks above

**Step 1: Write failing test or type assertion for final read path**

Validate article page can read and render media-inclusive payload safely.

**Step 2: Run targeted tests to verify failure**

Run relevant file-level tests before final fix.

**Step 3: Write minimal implementation**

- If required, add migration for explicit English segment storage column.
- Update page query/typing to pass both-mode segment data into `ReadingView`.

**Step 4: Run full verification suite**

Run:
- `npm run test -- src/lib/__tests__/extract.test.ts src/lib/__tests__/media-placement.test.ts`
- `npm run test -- src/components/__tests__/SegmentRenderer.test.tsx`
- `npm run test -- src/app/api/articles/adapt/__tests__/route.test.ts`
- `npm run test -- src/app/api/admin/backfill-inline-media/__tests__/route.test.ts`
- `npm run lint`
- `npm run build`

Expected: all pass.

**Step 5: Commit**

```bash
git add supabase/migrations/007_inline_media_columns.sql src/app/articles/[id]/page.tsx src/lib/types.ts
git commit -m "chore: finalize inline media storage and reading integration"
```

### Task 7: Documentation and runbook

**Files:**
- Modify: `README.md`
- Create: `docs/plans/2026-03-02-inline-media-backfill-runbook.md`

**Step 1: Write failing docs check (manual)**

Confirm current docs do not describe inline media behavior or backfill operation.

**Step 2: Update docs**

- Describe inline media behavior and limits.
- Add admin backfill invocation examples and safe batch guidance.

**Step 3: Verify docs for accuracy**

Run: manual pass against implemented endpoint + response schema.
Expected: commands and fields match implementation.

**Step 4: Commit**

```bash
git add README.md docs/plans/2026-03-02-inline-media-backfill-runbook.md
git commit -m "docs: document inline media behavior and backfill runbook"
```
