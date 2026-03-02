# RSS Feed Integration — Test Cases

## 1. Database Migration (`005_rss_feeds.sql`)

- [ ] `user_feeds` table exists with columns: id, user_id, feed_url, title, last_polled_at, error_count, last_error, created_at
- [ ] `feed_items` table exists with columns: id, feed_id, guid, link, title, published_at, article_id, created_at
- [ ] Unique constraint on `(user_id, feed_url)` in `user_feeds`
- [ ] Unique constraint on `(feed_id, guid)` in `feed_items`
- [ ] Cascade delete: deleting a `user_feeds` row deletes its `feed_items`
- [ ] `feed_items.article_id` ON DELETE SET NULL (articles survive feed deletion)
- [ ] Indexes on `user_feeds(user_id)`, `feed_items(feed_id)`, `feed_items(link)`

## 2. RSS Parser (`src/lib/rss.ts`)

- [ ] `parseFeed` returns `{ title, items }` with correct shape from valid RSS XML
- [ ] Items without links are filtered out
- [ ] Uses `guid` from RSS; falls back to `link` when guid is missing
- [ ] 10s timeout — rejects on slow feeds
- [ ] Returns meaningful error on invalid XML / non-RSS URLs

## 3. Shared Adaptation Logic (`src/lib/adapt-article-background.ts`)

- [ ] `runBackgroundAdaptation` is importable from the new module
- [ ] `coerceTopikLevel` is importable from the new module
- [ ] Existing adapt route (`/api/articles/adapt`) still works identically after refactor (no behavior change)
- [ ] `npm run build` passes with no type errors after the refactor

## 4. Feed Article Adapter (`src/lib/adapt-feed-article.ts`)

- [ ] Skips articles whose `source_url` already exists for this user (cross-feed dedup)
- [ ] Creates placeholder article + runs adaptation for new URLs
- [ ] Inserts `feed_items` row linked to the created article
- [ ] Returns early gracefully if article creation fails

## 5. Cron Endpoint (`/api/cron/poll-feeds`)

- [ ] Returns 401 without valid `Authorization: Bearer CRON_SECRET` header
- [ ] Skips feeds with `error_count >= 5`
- [ ] Processes at most 3 new items per feed per poll cycle
- [ ] Updates `last_polled_at` and resets `error_count` on success
- [ ] Increments `error_count` and stores `last_error` on failure
- [ ] Returns 200 with summary of processed feeds/items

## 6. Cron Schedule (`vercel.json`)

- [ ] File exists with cron schedule `0 8 * * *` pointing to `/api/cron/poll-feeds`

## 7. Feed Management API (`/api/feeds`)

### GET /api/feeds
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns list of user's feeds with id, feed_url, title, last_polled_at, error_count, created_at

### POST /api/feeds
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 400 for missing/invalid URL
- [ ] Auto-appends `/feed` for bare `*.substack.com` URLs
- [ ] Validates feed by parsing it before saving
- [ ] Returns 409 on duplicate `(user_id, feed_url)`
- [ ] Returns created feed on success

### DELETE /api/feeds/[id]
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 404 for non-existent or other-user's feed
- [ ] Deletes feed and cascade-deletes feed_items
- [ ] Adapted articles remain after feed deletion

### PATCH /api/feeds/[id]
- [ ] Resets `error_count` to 0 when `{ resetErrors: true }` is sent

## 8. Feeds Page (`/feeds`)

- [ ] Page renders with decorative hangul `구독`, Instrument Serif heading "Feeds"
- [ ] Shows `FeedList` client component
- [ ] Follows same layout pattern as home page (`max-w-md mx-auto`)

## 9. FeedList Component

- [ ] Displays each feed as a card with title (or URL fallback), last polled time
- [ ] Shows vermillion error badge on paused feeds (error_count >= 5)
- [ ] Delete button per feed triggers `DELETE /api/feeds/[id]` + `router.refresh()`
- [ ] Retry button on paused feeds triggers `PATCH /api/feeds/[id]` + `router.refresh()`
- [ ] "Add Feed" button opens `AddFeedModal`

## 10. AddFeedModal Component

- [ ] Bottom-sheet pattern: backdrop + slide-up + handle bar
- [ ] URL input with placeholder "e.g. example.substack.com"
- [ ] "Subscribe" button calls `POST /api/feeds`, closes on success, shows error on failure
- [ ] Auto-reads clipboard on open (same as AddArticleFab)
- [ ] Calls `router.refresh()` after successful subscription

## 11. Home Page Nav Link

- [ ] "Feeds" link appears alongside "Archive" and "Words" in nav row
- [ ] Uses same styling: `text-sm font-medium text-text-secondary hover:text-accent-celadon transition-colors`
- [ ] Links to `/feeds`

## 12. Build Verification

- [ ] `npm run build` completes with no errors
- [ ] No TypeScript errors
- [ ] No unused imports or dead code introduced
