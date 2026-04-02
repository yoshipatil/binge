---
written_by: frontend
date: 2026-04-01
status: NEEDS_BACKEND
---

# Frontend → Backend: Parallel Work Items

Hey backend — frontend is about to build the following. I need these APIs ready so I can wire them up. Please confirm each one or flag blockers in `design-specs/backend-response.md`.

---

## 1. "You May Know" — People Suggestions

**New endpoint needed:**
```
GET /api/users/suggestions
Authorization: required (session)
```

**Response shape:**
```json
[
  {
    "id": "user_xyz",
    "name": "Alex Chen",
    "username": "alexchen",
    "image": "https://...",
    "mutualCount": 3,          // how many mutual followers
    "reason": "mutual"         // "mutual" | "taste" | "new"
  }
]
```

**Algorithm (suggested priority):**
1. Friends-of-friends: users followed by people I follow, who I don't follow yet — sorted by `mutualCount` desc
2. Taste similarity: users with ≥5 overlapping rated titles and similar ELO distribution (lower priority)
3. Limit to 10 results max

**Why mutualCount matters:** I'll render "3 mutual connections" as social proof on each card. If 0, show nothing.

---

## 2. Share Card — Confirm Current Endpoint Still Works

The share card at `GET /api/share/card?userId=<id>&type=preview|stories` — frontend is doing a full visual redesign of the satori JSX in `route.tsx`.

**Root cause of current error:** Emojis (`🎬` `📺`) in satori JSX crash the render since there's no emoji font loaded. Frontend will fix this.

**Please confirm:**
- [ ] The endpoint is still at `GET /api/share/card`
- [ ] `TMDB_READ_ACCESS_TOKEN` or equivalent is set in Vercel (needed for poster image fetching)
- [ ] No changes to the DB query for ratings

---

## 3. Toast/Dynamic Island — No backend work needed

Frontend fixing CSS safe-area offset for toasts. No API changes.

---

## 4. Mobile Scroll Physics — No backend work needed

Frontend CSS fix only.

---

## 5. Rate Bug (For You page) — No backend work needed

Frontend `stopPropagation` fix on touch events in recommendations page.

---

## 6. Font Change (Geist → Outfit) — No backend work needed

Frontend only, next/font/google swap.

---

## Summary of what I need from you

| Item | API | Priority | Blocking? |
|------|-----|----------|-----------|
| You May Know | `GET /api/users/suggestions` | High | Yes — blocks friend discovery UI |
| Share Card confirm | `GET /api/share/card` | High | Partial — frontend can fix crash, needs confirmation endpoint still works |

Please respond in `design-specs/backend-response.md` when ready.

---

## 7. Share Card — Profile Page Preview (NEW)

Frontend is adding a live inline preview of the share card PNG directly on the profile page (overview tab). The user sees their actual rendered card, taps "Share" or "Download Stories."

**What this means for the backend:**

### Performance is now critical
The card was previously only generated on explicit button tap — user expected to wait. Now it loads **automatically on profile page visit** as an `<img src="/api/share/card?userId=...&type=preview">`.

**Required:** The preview endpoint must complete in ≤2s, ideally with:
- Aggressive caching: `Cache-Control: public, max-age=600, stale-while-revalidate=300`
- Cache key: `userId + type` (already done)
- Consider: pre-warming the cache after a new rating is submitted (background job or on-demand)

### Error response still needed
If the user has no ratings, the API returns `400 "No ratings yet"` — the frontend handles this gracefully with a fallback message. This is fine as-is.

### No new endpoints needed for this feature
The profile page img tag hits the same `/api/share/card` endpoint. Just make sure:
- [ ] `Cache-Control` header is set (currently `max-age=300` — consider bumping to 600)
- [ ] CORS: same-origin only, no changes needed
- [ ] The `200 OK` response includes `Content-Type: image/png`

