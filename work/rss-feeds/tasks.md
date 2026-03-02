# RSS Feed Integration — Tasks

## Phase 1: Foundation (parallel)
1. Database migration `005_rss_feeds.sql`
2. Install `rss-parser` dependency

## Phase 2: Core libraries (parallel after Phase 1)
3. RSS parser wrapper `src/lib/rss.ts`
4. Extract shared adaptation logic `src/lib/adapt-article-background.ts` + update adapt route

## Phase 3: Feed processing (after Phase 2)
5. Feed article adapter `src/lib/adapt-feed-article.ts`

## Phase 4: API + Cron (parallel after Phase 3)
6. Cron endpoint `src/app/api/cron/poll-feeds/route.ts` + `vercel.json`
7. Feed management API routes `src/app/api/feeds/route.ts` + `src/app/api/feeds/[id]/route.ts`

## Phase 5: UI (sequential after Phase 4)
8. AddFeedModal component `src/components/AddFeedModal.tsx`
9. FeedList component `src/components/FeedList.tsx`
10. Feeds page `src/app/feeds/page.tsx`
11. Home page nav link update `src/app/page.tsx`

## Phase 6: Verification
12. Build verification + final review
