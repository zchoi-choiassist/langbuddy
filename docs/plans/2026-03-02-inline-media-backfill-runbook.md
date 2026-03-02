# Inline Media Backfill Runbook
*2026-03-02*

## Purpose

Backfill inline image media for existing articles by calling the admin endpoint in controlled batches.

## Endpoint

- Method: `POST`
- Path: `/api/admin/backfill-inline-media`
- Auth: logged-in user ID must be listed in `ADMIN_USER_IDS`

## Request Body

```json
{
  "limit": 20,
  "cursor": "2026-03-01T10:12:30.000Z"
}
```

- `limit`: optional, default `20`, max `100`
- `cursor`: optional `created_at` cursor from previous response

## Response Shape

```json
{
  "processed": 20,
  "updated": 8,
  "skipped": 11,
  "failed": 1,
  "nextCursor": "2026-02-27T18:22:41.000Z"
}
```

## Safe Operation Steps

1. Set admin allowlist in env:
   - `ADMIN_USER_IDS="<your-user-id>"`
2. Start small with `limit=10`.
3. Inspect response counts:
   - high `updated` is expected initially
   - high `skipped` is expected on reruns
   - `failed` should remain low
4. Continue with `nextCursor` until it returns `null`.
5. If failure rate rises, pause and investigate source fetch/extraction errors.

## Example curl

```bash
curl -X POST "http://localhost:3000/api/admin/backfill-inline-media" \
  -H "Content-Type: application/json" \
  -b "<session-cookie>" \
  -d '{"limit": 20}'
```

```bash
curl -X POST "http://localhost:3000/api/admin/backfill-inline-media" \
  -H "Content-Type: application/json" \
  -b "<session-cookie>" \
  -d '{"limit": 20, "cursor": "2026-03-01T10:12:30.000Z"}'
```

## Notes

- Backfill is idempotent: reruns do not duplicate media segments.
- Backfill updates only `adapted_korean` when media insertion changes content.
- Articles remain readable even when media extraction fails.
