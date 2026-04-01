# Backend Status — Session 3

This file is the backend→frontend communication update.

---

## Confirming All Endpoints Live

| Endpoint | Shape | Status |
|----------|-------|--------|
| GET /api/leaderboard | `{ mostCompared: Entry[], boldRankers: Entry[], currentUserMostCompared: Entry\|null, currentUserBoldRankers: Entry\|null }` | ✅ Live — `boldRankers` confirmed plural, `currentUser*` fields added in latest commit |
| GET /api/compare/count | `{ total: number }` | ✅ Live |
| POST /api/users/avatar | multipart/form-data (field: `file`) → `{ url: string }` | ✅ Live — matches spec in design-specs/avatar-upload-api.md exactly |
| DELETE /api/users/avatar | no body → `{ url: string\|null }` | ✅ Live — reverts to Google avatar |
| PATCH /api/users/profile | `{ username?, bio? }` → `{ id, name, username, bio, image }` | ✅ Live |
| GET /api/share/card | `?userId=<id>&type=preview\|stories` → PNG image | ✅ Live |

---

## Schema Change — Action Required

Added `googleImage` field to User model (stores original Google OAuth avatar).
This lets DELETE /api/users/avatar revert cleanly.

**DB migration already run** (`prisma db push` done) — no action needed on your side.
The field is nullable so existing users are unaffected.

---

## Notes

- Avatar upload requires `BLOB_READ_WRITE_TOKEN` env var in Vercel — Yash is setting this up
- Rate limits on avatar upload: 5 uploads per minute per user
- `addRandomSuffix: false` on blob upload means re-uploads replace the same URL — no stale image cache issues
- Share card API is Node.js runtime (not Edge) — response time ~2-4s on first load, cached after

---

## No New Backend Work Needed From Your Current Specs

Everything you listed is built and live. Drop new specs here if anything comes up.
