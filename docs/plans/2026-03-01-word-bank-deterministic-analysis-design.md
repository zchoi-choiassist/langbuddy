# Word Bank Deterministic Analysis Design
*2026-03-01*

## Goal

Revise word highlighting and word bank behavior so the app uses the full `topik_words` dictionary with infinite scroll, mastery-based visual states, and deterministic post-adaptation lexical analysis against both `topik_words` and `user_custom_words`.

## Product Decisions

- Word bank source is all rows in `topik_words`.
- TOPIK filter pills match `design-preview.html` style.
- Visual state rule is strict:
  - neutral if `mastery == 0`
  - highlighted if `mastery > 0`
- `encountered` means `mastery > 0` only.
- No highlight-mode toggle in this iteration.
- No “new in this article” marker in this iteration.

## Architecture and Pipeline

1. Adaptation completes and persists `adapted_korean` and comprehension questions.
2. A deterministic lexical audit runs immediately after adaptation persistence.
3. The analyzer scans adapted content against:
   - global `topik_words`
   - user-specific `user_custom_words`
4. Canonical matches are saved and become source of truth for vocabulary analytics and future highlight reconciliation.
5. Word bank read path switches to `topik_words` base query with user mastery left join.

## Deterministic Matching Approach (Chosen)

Use rule-based normalization and suffix stripping (base-form + common inflections):

1. Tokenize adapted text into Korean candidate tokens.
2. Normalize token text.
3. Try exact dictionary match first.
4. On miss, apply curated stripping rules for particles/endings/suffixes.
5. Retry lookup with derived candidates.
6. Persist unique matches with match tier metadata (`exact`, `derived`).

Guardrails:
- longest-suffix-first stripping
- maximum strip passes (e.g., 2)
- minimum stem length
- Hangul-only stem validation
- stop on invalid candidate

## Data Model Changes

### New table: `article_word_matches`

- `id` serial primary key
- `article_id` uuid not null references `articles(id)`
- `user_id` text not null
- `source` text not null check in (`topik`, `custom`)
- `topik_word_id` int null references `topik_words(id)`
- `custom_word_id` int null references `user_custom_words(id)`
- `surface_form` text not null
- `normalized_form` text not null
- `base_form` text not null
- `match_confidence` text not null check in (`exact`, `derived`)
- `created_at` timestamptz not null default `now()`

Constraints and indexes:
- exactly one of `topik_word_id` / `custom_word_id` must be non-null
- unique on `(article_id, source, topik_word_id, custom_word_id)` with null-safe strategy
- index on `(article_id)`
- index on `(user_id, created_at desc)`

### `articles` extension

- add nullable `last_analyzed_at timestamptz`

Purpose:
- indicates lexical audit completion
- supports retry/backfill workflows

### `user_word_mastery` semantics

No semantic change. Deterministic matches do not auto-increment mastery.

## API and UI Behavior

### Word bank data access

Provide a paginated server read path with:
- filters: `all` or specific TOPIK level
- stable sort: `topik_level ASC, korean ASC, id ASC`
- cursor-based pagination (not offset)
- per-row `mastery` via left join on `user_word_mastery`

### Infinite scroll behavior

- use `IntersectionObserver` sentinel
- fetch next page on sentinel visibility
- dedupe client rows by `id` for race safety
- reset to first page on filter-pill change
- preserve smooth loading with skeleton rows

### Visual system

- mastery `0` -> neutral color
- mastery `> 0` -> highlighted color from existing design system

## Conflict Policy

When model-emitted word segments and deterministic matching disagree:
- treat deterministic result as canonical for persistence and analytics
- keep logging mismatches for tuning
- reading renderer can continue current segment display for now, but canonical IDs should be preferred where conflict handling exists

## Error Handling

- If adaptation succeeds and audit fails, article remains available.
- Record structured errors with `article_id`, `user_id`, and failed stage.
- Keep `last_analyzed_at` null on failure so retries are discoverable.
- Make writes idempotent with conflict-safe insert/upsert.
- Apply runtime timeout guard with graceful failure and retry eligibility.

## Rollout Plan

1. Ship word bank query/UI migration to full `topik_words` + infinite scroll + TOPIK pills.
2. Enable deterministic analyzer writes for newly adapted articles.
3. Backfill analyzer results for existing recent articles in small batches.
4. Monitor mismatch/error metrics and tune stripping rules.

## Success Criteria

- Word bank first-page load under 1s in normal conditions.
- Infinite-scroll fetch p95 under 400ms.
- Analyzer completion rate above 99% for new adaptations.
- Duplicate match inserts effectively zero.
- UI state correctness: all rows follow `mastery == 0` neutral, `mastery > 0` highlighted.
- No regression in adaptation completion reliability.

## Out of Scope

- Highlight-mode toggle
- “New in this article” word chips
- Automatic mastery increase from deterministic matches
