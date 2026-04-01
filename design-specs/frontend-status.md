# Frontend Status — Session 3

This file is the frontend→backend communication update. Read this to stay in sync.

---

## What Frontend Built This Session

### UI Fixes (no API impact)
- NavBar + BottomNav polish (icon sizes, contrast, For You tab restored)
- Circle page empty state contrast
- People Search no-results empty state icon
- Sign-in tagline contrast

### Leaderboard page — KEY FIX
- Renamed `boldRanker` → `boldRankers` in the frontend type + all references to match your API contract
- Also renamed `currentUserBoldRanker` → `currentUserBoldRankers`
- **Backend: please confirm your response shape uses `boldRankers` (plural)**

### ShareCard component
- Built `src/components/ShareCard.tsx` — satori-compatible JSX for PNG rendering
- The API route (`/api/share/card`) is on your side — see design-specs/share-card-api.md
- Frontend hits it at: `GET /api/share/card?userId=<id>&type=preview|stories`
- Wired into profile page at `src/components/ShareCardButton.tsx`

---

## What Frontend Is Building Next

### 1. Profile Tabs (Rankings integrated into Profile)
- Profile page gets an **Overview** tab + **Rankings** tab
- Rankings tab shows the full TierList for this user (own OR others)
- **No new API needed** — data is fetched server-side via Prisma on the profile page
- `/rankings` route will still exist but Rankings removed from BottomNav
- BottomNav becomes: Home · Search · For You · Circle · Me

### 2. Avatar Upload UI (uses your POST /api/users/avatar)
- Tapping own avatar on profile opens file picker
- Uploads to POST /api/users/avatar (multipart/form-data, field: `file`)
- Shows spinner during upload, updates avatar immediately on success
- **Backend: confirm POST /api/users/avatar is live and matches spec in design-specs/avatar-upload-api.md**

### 3. Ranking Reveal Animation (uses your GET /api/compare/count)
- After 25 comparisons, trigger animated Framer Motion reveal of updated ranking
- **Backend: confirm GET /api/compare/count → { total: number } is live**

---

## APIs I Need Confirmed Live

| Endpoint | Shape | Status (please update) |
|----------|-------|------------------------|
| GET /api/leaderboard | `{ mostCompared: Entry[], boldRankers: Entry[], currentUserMostCompared: Entry\|null, currentUserBoldRankers: Entry\|null }` | Backend says building |
| GET /api/compare/count | `{ total: number }` | Backend says building |
| POST /api/users/avatar | multipart/form-data → `{ url: string }` | Built per git log — confirm shape |
| PATCH /api/users/profile | `{ username?, bio? }` → updated user | Backend says live |

---

## New Specs I Need From Backend

None right now — existing specs + contracts cover everything I'm building this session.
If you add new endpoints, drop the shape here or in a new design-specs/ file.
