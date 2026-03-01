# LangBuddy

## Project Overview

LangBuddy is a personal Korean language learning web app. Core loop: share any article → receive an AI-adapted Korean version at TOPIK level → quiz yourself on vocabulary inline → answer comprehension questions → track score. There is also a word bank that tracks mastery (0–100) across sessions.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), Vercel |
| Database | Supabase (Postgres) |
| Auth | NextAuth.js with Google OAuth |
| AI | Claude API (`claude-sonnet-4-6`) via server-side routes |
| Article extraction | `@mozilla/readability` (server-side) |

**Prototype only** (throwaway, not production): Vite + React 19, React Router v7, Tailwind CSS v3 — lives in `langbuddy-prototype/`.

## Project Structure

```
langbuddy-prototype/        ← throwaway interactive prototype
  src/
    data/articles.js        ← 6 TOPIK 2 articles (hardcoded)
    data/wordBank.js        ← 100 words at varied mastery (hardcoded)
    context/AppContext.jsx  ← global state: articles, wordBank, mutations
    screens/                ← ReadingList, ArticleProcessing, ReadingView,
                               Comprehension, SummaryScore, WordBank
    components/             ← ArticleCard, WordQuizPopup
docs/plans/                 ← design doc + implementation plans
```

## Development Setup

```bash
# Prototype
cd langbuddy-prototype
npm install
npm run dev     # http://localhost:5173
npm run build   # verify no errors
```

## Common Commands

```bash
# Prototype
cd langbuddy-prototype
npm run dev       # dev server
npm run build     # production build (use to verify, not to run)
```

## Architecture Notes

### Prototype data model

Articles have an `adaptedKorean` field: an array of segments `{ text, type }` where `type` is:
- `'text'` — plain, not tappable
- `'vocab'` — new vocab word for this article (blue underline), has `vocabId` matching `article.vocabulary[].id`
- `'wordbank'` — word from user's active word bank (orange underline), has `wordBankId` matching `wordBank[].id`
- `'break'` — paragraph separator, no `text` field; renders as a `<div className="mt-4" />` block spacer in ReadingView

When adding `'wordbank'` segments, **always verify the `wordBankId` maps to the correct Korean word** in `wordBank.js`. The bug where `절약` (saving) was mistakenly mapped to id 43 (`소비`/consumption) instead of id 16 was caught only in code review.

Each word in `wordBank.js` also has a `topikLevel: 1 | 2` field used by the TOPIK 1 / TOPIK 2 filters in the Word Bank screen. TOPIK 1 = everyday basics (가족, 음식, 날씨, basic verbs); TOPIK 2 = advanced/abstract vocabulary (경제, 산업, 세계화, etc.).

### Scoring consistency

Article 3 has pre-set `userAnswer` values to simulate a completed article. The `comprehensionScore` must match the actual +1/-1 outcomes from those answers — don't set it by hand without calculating. For art-3: q1 correct (+1), q2 correct (+1), q3 wrong (-1) = net +1, so `comprehensionScore: 1`.

### Subagent bash permissions

Subagents launched via the Task tool do NOT automatically have Bash permissions. When agents are dispatched to create files and then commit, they will stall waiting for permission. The fix: after dispatching subagents that need to commit, handle the git commands yourself when they stall, or accept the output files and commit them from the main session.

### `npm create vite@latest` installs latest versions

Running `npm create vite@latest` installs React 19 (not 18) and React Router v7 (not v6) even if the plan specifies older versions. React Router v7 is backwards-compatible with v6's component API (`BrowserRouter`, `Routes`, `Route`, `useNavigate`, `useParams` all work identically), so this is not a problem — just note it.

### Vite boilerplate cleanup

After `npm create vite`, always delete: `src/App.css`, `src/assets/react.svg`, `public/vite.svg`. Update `<title>` in `index.html`. Remove the `<link rel="icon">` that points to `vite.svg`.

### ReadingView renders `adaptedKorean` inside a `<div>`, not `<p>`

The Korean article text container is a `<div>`, not a `<p>`. This matters because `{ type: 'break' }` segments render as `<div className="mt-4" />` block elements — nesting a `<div>` inside a `<p>` is invalid HTML and breaks layout. Never change the container back to `<p>`. Also: `<br className="...">` does not apply Tailwind spacing since `<br>` is an inline element — always use a `<div>` for block spacing.

### Vocab items must be linked in `adaptedKorean`

If a word appears in `article.vocabulary[]`, it must also appear as a `type: 'vocab'` segment in `adaptedKorean`. Otherwise the word is dead data — never surfaced to the user and never tappable. Always audit this when writing article data.

### Validating article data without the dev server

Use Node's dynamic import to validate article data integrity after edits:

```bash
cd langbuddy-prototype
node -e "
import('./src/data/articles.js').then(m => {
  const art = m.initialArticles.find(a => a.id === 'art-6');
  const vocabSegs = art.adaptedKorean.filter(s => s.type === 'vocab').map(s => s.vocabId);
  art.vocabulary.forEach(v => console.log(v.id, vocabSegs.includes(v.id) ? '✓' : '✗ MISSING'));
});
"
```

Checks that every vocabulary[] entry has a matching vocab segment, all wordBankIds are present, question count is correct, and no pre-set userAnswers exist.

### Word Bank screen filter options

The Word Bank screen uses a `filter` state (not `sortBy`) with five options rendered as pill buttons:
- `'mastery'` — sort by masteryLevel ascending (weakest first, default)
- `'alpha'` — sort alphabetically by Korean (`localeCompare` with `'ko'` locale)
- `'added'` — sort by addedAt descending (most recently added first)
- `'topik1'` — filter to `topikLevel === 1`, sorted by mastery
- `'topik2'` — filter to `topikLevel === 2`, sorted by mastery

"By Date" was removed — "Added" is the clearer label for the same concept. Filters apply to both the Active and Mastered sections via a shared `applyFilter()` helper.

**Production TOPIK levels:** TOPIK has 6 levels total — TOPIK I (levels 1–2) and TOPIK II (levels 3–6). In production, `topikLevel` is an integer 1–6, and the Word Bank filter pills should cover all six levels. The prototype collapses this to 1 and 2 for simplicity only — do not carry that assumption into the production build.

### Production word bank model

The production word bank is the full TOPIK I+II dictionary (~2,300 words) pre-seeded in Supabase (`topik_words` table), with per-user mastery in `user_word_mastery`. Segments use `type: 'word'` with `wordId` + `topikLevel` fields instead of the prototype's `vocab`/`wordbank` split. Full schema and Claude prompt spec in the design and implementation docs.

### Next.js App Router setting sync for TOPIK selector

`TopikSelector` is a client component with local state, but its initial value comes from server-rendered Home data (`user_settings.topik_level`). In App Router, updating settings via `PATCH /api/settings` does not automatically invalidate the current route payload.

If you change TOPIK level and then navigate away/back, Home can remount with stale server data (often default-looking `2`) unless you refresh the route after a successful write.

Rules:
- After successful settings writes from client components, call `router.refresh()` so server props rehydrate with fresh DB values.
- If the write fails, rollback optimistic local UI state to the previous value.
- Keep a regression test for this behavior (`src/components/__tests__/TopikSelector.test.tsx`) that asserts `router.refresh()` is triggered after level change.

### ReadingView popup hierarchy

ReadingView has three mutually exclusive popup modes, managed by `activeWordId` (number | null), `answeredWords` (Set<number>), and `lookupWord` (string | null):

1. **WordQuizPopup** — first tap on a highlighted word. Shows 4-choice quiz, calls `POST /api/words/quiz`, updates score.
2. **WordDefinitionCard** — re-tap on an already-answered highlighted word. Shows definition only, no quiz, no API call.
3. **WordLookupCard** — tap on an unhighlighted (plain text) word. Calls `POST /api/words/lookup` (Claude Haiku) for definition, offers "Add to Word Bank" CTA via `POST /api/words/custom`.

Only one popup is open at a time.

### SegmentRenderer text word tapping

`SegmentRenderer` accepts an optional `onTextWordTap?: (korean: string) => void` prop. When provided, `type: 'text'` segments are split into tappable Korean word buttons (no underlines, subtle active state). Uses Unicode Hangul ranges for detection.

### Home page ArticleList component

`ArticleList` (`src/components/ArticleList.tsx`) is a client component combining:
1. **Polling** — polls `GET /api/articles` every 5s when placeholder articles exist.
2. **Swipe-to-delete** — left-swipe reveals vermillion delete zone, confirmation modal, `DELETE /api/articles/[id]`.

Server component passes `initialArticles` prop. `ArticleListPoller.tsx` is dead code (merged into ArticleList).

### PullToRefresh

`PullToRefresh` wraps all pages via `src/app/layout.tsx`. Touch-based, 60px threshold, celadon spinner, calls `router.refresh()`.

### Claude adaptation robustness

`adaptArticle` uses: (1) assistant prefill `{` to force JSON, (2) robust parsing (BOM, fences, whitespace), (3) 1 retry on parse failure. `max_tokens` is 8192.

### Custom words table

`user_custom_words` (Supabase) stores user-added words. Migration: `supabase/migrations/004_user_custom_words.sql`. NOT yet displayed in Word Bank page.

### Reference documents

The plans in `docs/plans/` contain full implementation code. Always check them before implementing any feature — the code is already written there.

## Reference Documents

These documents define the product design and implementation plan. **Do not read them in full** — use Grep to search for the specific section or keyword you need.

| Document | Path | Contents |
|---|---|---|
| Design Document | `docs/plans/2026-02-26-langbuddy-design.md` | Screens, data model, word bank mechanics, scoring, AI prompt design, PWA/share target |
| Implementation Plan | `docs/plans/2026-02-26-langbuddy-implementation.md` | Task-by-task build steps, file paths, code for each module, test cases, deployment |
| Prototype Design | `docs/plans/2026-02-26-prototype-design.md` | Throwaway Vite+React prototype scope, data shape, screen interactions |
| Prototype Implementation | `docs/plans/2026-02-26-langbuddy-prototype-implementation.md` | Full prototype implementation with complete component code |
| Design Preview | `design-preview.html` | Standalone HTML preview of the Korean-Modern Editorial design system (open in browser) |
| Design Refactor Tickets | `work/design-refactor/tickets.json` | 38 tickets broken into 3 phases for the design refactor |

**How to use:** When implementing or reviewing a feature, grep for the relevant section heading or keyword (e.g., `Grep "Word Bank" docs/plans/` or `Grep "Task 8" docs/plans/`) rather than reading the entire file.

## Design System — Korean-Modern Editorial

Both the prototype and production app use a "Korean-Modern Editorial" aesthetic: clean geometry, bold hangul typography, warm neutral palette inspired by Korean cultural elements. A standalone preview lives at `design-preview.html` (open in browser to reference).

**Production design system files:**
- CSS tokens & keyframes: `src/app/globals.css` (`:root` block + `@keyframes`)
- Tailwind config: `tailwind.config.ts` (extends fontFamily, colors, borderRadius, boxShadow, animation)
- Font loading: `src/app/layout.tsx` (Google Fonts `<link>`)

The production app uses Tailwind semantic classes mapped to CSS variables (e.g., `bg-bg-base`, `text-accent-celadon`, `rounded-card`, `shadow-card`) rather than raw values.

### Typography

| Role | Font | Usage |
|---|---|---|
| English display/headings | Instrument Serif | Screen titles (ReadingList, WordBank, Summary) |
| Korean headings/titles | Noto Serif KR (300,400,600,700) | Article titles, quiz words, word cards |
| Body/UI text | Pretendard Variable | Korean body text, buttons, labels, metadata |
| Monospace accents | JetBrains Mono (400,600) | TOPIK tags, scores, mastery percentages |

### Color Palette (CSS custom properties in index.css / globals.css)

| Token | Value | Inspiration |
|---|---|---|
| `--bg-base` | `#F8F5F0` | Warm hanji (한지) paper |
| `--bg-surface` | `#FFFFFF` | Card surfaces |
| `--bg-subtle` | `#F0EDE8` | Muted backgrounds |
| `--accent-celadon` | `#4A9E8E` | 청자 celadon — primary action, correct |
| `--accent-vermillion` | `#D94F3B` | 주홍 traditional red — errors, wrong |
| `--border-light` | `#E7E5E0` | Card borders, dividers |

### Component Patterns

- Bottom-sheet modals: `bg-black/40`, `slideUp` animation, 36px handle bar
- Cards: warm `shadow-card`, `rounded-[20px]`, hover lift
- Vocab underlines: 2px solid celadon (new), 2px solid `#E2A563` (word bank)
- Decorative hangul: Large Noto Serif KR behind screen headers
- Staggered card reveals: `cardIn` with `animation-delay: index * 60ms`

### Design Refactor Tickets

Full ticket breakdown: `work/design-refactor/tickets.json` (38 tickets, 3 phases).

## Coding Conventions

- Tailwind CSS for all styling (v3, not v4 — different config format)
- CSS custom properties for design tokens — defined in `:root` in `index.css` (prototype) / `globals.css` (production)
- Mobile-first layout: `max-w-md mx-auto` wrapper on every screen
- Bottom-sheet modals: `fixed inset-0 bg-black/40 flex items-end justify-center z-50`
- Rounded cards: `rounded-[20px]` for cards, `rounded-[28px]` for modals, `rounded-[16px]` for buttons
- Color system: celadon primary/correct, vermillion errors/wrong, warm bg-base backgrounds, white surfaces
- Typography: Instrument Serif display, Noto Serif KR Korean headings, Pretendard body, JetBrains Mono data

## Development Process

All coding work MUST follow this process in order:

1. **Create a work folder** — Create a new folder (e.g., `work/<feature-name>/`) to encapsulate all working documents for the task.

2. **Write test cases** — Define test cases that must pass for the work to be considered complete. Save as `work/<feature-name>/tests.md`.

3. **Wait for user approval** — Present the test cases to the user and wait for explicit approval before proceeding. Do NOT begin implementation if the test cases are not approved.

4. **Break down tasks** — Decompose the work into the smallest possible tasks with minimal dependencies. Write them in JSON format as `work/<feature-name>/tasks.md`.

5. **Subagent-driven implementation** — Use a subagent-driven approach to delegate and execute tasks in parallel where possible.

6. **Code review subagent** — After each subagent produces code, spawn a code review subagent to verify the code follows existing patterns, the design system, and the implementation plan.

7. **Deploy** — Deploy code to Vercel and Supabase using the CLI tools.

8. **Commit and push** — Commit the changes and push to the `main` branch.

9. **Update claude.md** — Update Claude.md with your learnings and update any outdated knowledge
