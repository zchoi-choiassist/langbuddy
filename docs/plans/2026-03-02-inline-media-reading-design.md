# Inline Media In Reading View — Design
*2026-03-02*

## Goal

Add inline article images to reading view with best-effort placement, visible in both Korean and English modes, with mobile-safe performance defaults.

## Final Product Decisions

- Media type: image only (v1)
- Display modes: both Korean and English
- Placement: inline (best-effort)
- Delivery: direct hotlink (no proxy/cache)
- Failure UI: fixed-height gray placeholder + "Image unavailable"
- Interaction: non-interactive (no fullscreen/tap actions)
- Performance: lazy-load + optimized display sizing
- Per-article cap: 5 images
- Backfill: supported via manual admin-triggered batches

## Context And Constraints

Current pipeline stores:
- `original_english` (text only)
- `adapted_korean` (`Segment[]` text/word/break)

No media metadata is persisted today, so implementation requires extraction, storage, and renderer changes.

## Architecture

### 1) Segment Model Extension

Extend rendering segments with media blocks:

```ts
type Segment =
  | { type: 'text'; text: string }
  | { type: 'word'; text: string; wordId: number; topikLevel: 1|2|3|4|5|6 }
  | { type: 'break' }
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

### 2) Extraction And Placement

- Parse article HTML and collect candidate inline `<img>` nodes in DOM order.
- Normalize URLs and keep only valid HTTP/HTTPS.
- Filter obvious tracker/noise URLs and duplicate sources.
- Cap extracted images at 5.
- Compute best-effort paragraph index mapping and inject `media` segments into:
  - Korean render segments (post-adaptation)
  - English render segments (new segmented form for rendering)

### 3) Persistence

- Persist media-inclusive segment arrays in article payload used by reading page rendering.
- Keep updates idempotent so reprocessing/backfill does not duplicate media blocks.

### 4) Reading UI

- Renderer supports `media` segments in both language modes.
- Image container behavior:
  - non-interactive
  - lazy-load
  - constrained responsive width
  - reserved height to reduce layout shift
- On `error`, show fixed-height gray placeholder with “Image unavailable”.
- If caption/alt available, display below image.

### 5) Backfill

Manual authenticated admin endpoint:
- Inputs: `limit`, `cursor` (or equivalent batching token)
- For each target article:
  - fetch source URL
  - re-extract image metadata
  - merge with existing content via same best-effort placement rules
  - update only when changed
- Continue-on-error with structured logging.

## Trade-offs

### Chosen: segment-native media

Pros:
- True inline ordering
- Shared rendering contract across modes
- Simple future extensibility (other media types)

Cons:
- Requires schema/type and pipeline updates

### Not chosen: separate media array

Pros:
- Smaller migration surface

Cons:
- Fragile runtime insertion and duplicated placement logic

## Error Handling

- Broken hotlink -> inline placeholder, no blocking behavior.
- Extraction fail for media -> article still renders text content.
- Backfill fetch/extract fail -> skip row, log, continue.

## Performance Guardrails

- Hard cap: 5 images/article.
- Lazy-load images by default.
- Provide fixed layout box to reduce CLS.
- Avoid client-side heavy transforms in render loop.

## Testing Strategy

- Unit tests:
  - extraction filtering/normalization
  - image cap enforcement
  - best-effort insertion mapping
  - idempotent merge behavior
- Component tests:
  - render `media` segment in both modes
  - placeholder on image error
  - caption/alt rendering
- Integration tests:
  - adaptation persistence includes media for new articles
  - admin backfill updates existing articles safely

## Rollout

1. Ship extraction + renderer support behind non-breaking defaults.
2. Enable for newly adapted articles.
3. Run manual backfill in small batches.
4. Monitor failure rates and rendering regressions.

## Success Criteria

- New articles with source images show up to 5 inline images in both modes.
- Broken image URLs consistently render placeholder, not layout collapse.
- Backfill can process existing articles in batches without duplicate media blocks.
- Reading view remains performant on mobile due to lazy loading and bounded media count.
