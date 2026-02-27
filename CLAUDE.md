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
    data/articles.js        ← 5 TOPIK 2 articles (hardcoded)
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

When adding `'wordbank'` segments, **always verify the `wordBankId` maps to the correct Korean word** in `wordBank.js`. The bug where `절약` (saving) was mistakenly mapped to id 43 (`소비`/consumption) instead of id 16 was caught only in code review.

### Scoring consistency

Article 3 has pre-set `userAnswer` values to simulate a completed article. The `comprehensionScore` must match the actual +1/-1 outcomes from those answers — don't set it by hand without calculating. For art-3: q1 correct (+1), q2 correct (+1), q3 wrong (-1) = net +1, so `comprehensionScore: 1`.

### Subagent bash permissions

Subagents launched via the Task tool do NOT automatically have Bash permissions. When agents are dispatched to create files and then commit, they will stall waiting for permission. The fix: after dispatching subagents that need to commit, handle the git commands yourself when they stall, or accept the output files and commit them from the main session.

### `npm create vite@latest` installs latest versions

Running `npm create vite@latest` installs React 19 (not 18) and React Router v7 (not v6) even if the plan specifies older versions. React Router v7 is backwards-compatible with v6's component API (`BrowserRouter`, `Routes`, `Route`, `useNavigate`, `useParams` all work identically), so this is not a problem — just note it.

### Vite boilerplate cleanup

After `npm create vite`, always delete: `src/App.css`, `src/assets/react.svg`, `public/vite.svg`. Update `<title>` in `index.html`. Remove the `<link rel="icon">` that points to `vite.svg`.

### Vocab items must be linked in `adaptedKorean`

If a word appears in `article.vocabulary[]`, it must also appear as a `type: 'vocab'` segment in `adaptedKorean`. Otherwise the word is dead data — never surfaced to the user and never tappable. Always audit this when writing article data.

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

**How to use:** When implementing or reviewing a feature, grep for the relevant section heading or keyword (e.g., `Grep "Word Bank" docs/plans/` or `Grep "Task 8" docs/plans/`) rather than reading the entire file.

## Coding Conventions

- Tailwind CSS for all styling (v3, not v4 — different config format)
- Mobile-first layout: `max-w-md mx-auto` wrapper on every screen
- Bottom-sheet modals: `fixed inset-0 bg-black/50 flex items-end justify-center z-50`
- Rounded cards: `rounded-2xl` for cards, `rounded-3xl` for modals
- Color system: blue-500 primary actions, green-400/600 correct, red-300/500 wrong, gray-50 page backgrounds, white cards

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
