# Wordbank Custom Filter And Ordering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add custom-word filtering to the word bank, ensure mastery>0 words are ordered first in all views, and propagate TOPIK level from lookup-added words so custom words can be filtered by TOPIK level.

**Architecture:** Extend the word bank API to return a merged dataset from `topik_words` and `user_custom_words`, with server-side filtering and mastery-priority sorting. Update word bank UI filters to include a custom pill and query flags. Extend lookup/custom word save flow to carry predicted TOPIK level from lookup into persisted custom words.

**Tech Stack:** Next.js App Router, React client components, Supabase queries, Vitest + Testing Library.

---

### Task 1: Extend lookup/custom save flow for TOPIK level

**Files:**
- Modify: `src/components/WordLookupCard.tsx`
- Modify: `src/app/api/words/custom/route.ts`

**Step 1: Write failing tests**
- Add/adjust tests for custom-word save payload and UI display of predicted TOPIK level.

**Step 2: Run test to verify it fails**
- Run: `npm run test -- WordLookupCard` (or nearest scoped test command)

**Step 3: Write minimal implementation**
- Add `topikLevel` to lookup result typing.
- Display TOPIK level in the card.
- Include `topik_level` in `/api/words/custom` insert payload with validation.

**Step 4: Run test to verify it passes**
- Run scoped tests again.

**Step 5: Commit**
- Commit task changes.

### Task 2: Extend word bank API with custom filter + mastery-priority ordering

**Files:**
- Modify: `src/app/api/wordbank/route.ts`
- Modify: `src/app/api/wordbank/__tests__/route.test.ts`

**Step 1: Write failing tests**
- Add tests for:
- `customOnly` filter behavior
- `all` behavior containing custom words
- ordering where mastery > 0 appears before mastery == 0

**Step 2: Run test to verify it fails**
- Run: `npm run test -- src/app/api/wordbank/__tests__/route.test.ts`

**Step 3: Write minimal implementation**
- Query `topik_words` and `user_custom_words`, normalize into one item shape with `source`.
- Apply TOPIK/custom filtering.
- Load mastery for topik IDs.
- Sort by `(mastery > 0 desc, topik_level asc, korean asc, id asc)`.
- Keep cursor behavior stable for current UX.

**Step 4: Run test to verify it passes**
- Run targeted API tests.

**Step 5: Commit**
- Commit task changes.

### Task 3: Update word bank filters UI and client query wiring

**Files:**
- Modify: `src/components/WordBankFilters.tsx`
- Modify: `src/components/__tests__/WordBankFilters.test.tsx`

**Step 1: Write failing tests**
- Add tests for custom pill rendering/query and ordering in rendered list.

**Step 2: Run test to verify it fails**
- Run: `npm run test -- src/components/__tests__/WordBankFilters.test.tsx`

**Step 3: Write minimal implementation**
- Add `Custom` pill.
- Add API query params for custom filter mode.
- Preserve loading/pagination behavior.

**Step 4: Run test to verify it passes**
- Run targeted component tests.

**Step 5: Commit**
- Commit task changes.

### Task 4: End-to-end verification

**Files:**
- Verify modified files above

**Step 1: Run combined tests**
- Run:
- `npm run test -- src/app/api/wordbank/__tests__/route.test.ts src/components/__tests__/WordBankFilters.test.tsx`

**Step 2: Run broader verification**
- Run: `npm run test`

**Step 3: Confirm branch state**
- Run: `git status --short`
