---
written_by: frontend
date: 2026-04-02
status: NEEDS_BACKEND
---

# Watch Together — UX Spec

## 1. Entry Points (where users access this)

### Primary: Friend's Profile Page
A "Watch Together" button appears on any friend's profile page, alongside the Follow button. Tapping it goes directly to `/watch-together?friendIds=<id>` with that friend pre-selected — no picker needed for 1-on-1.

**Why this is primary:** The most natural moment to think "what should we watch?" is when you're already on their profile. Contextual, zero friction.

Visual placement: second row below the stats bar (followers/following), full-width button — OR alongside the existing Follow button as a secondary action.

### Secondary: Circle Page (/people)
A "Watch Together" card sits below the page header on `/people`, above the activity feed. It shows small avatars of your top 3–5 friends and a "Pick friends & find something to watch" CTA.

Tapping it opens the friend picker (see Section 2).

**Why NOT a new nav tab:** Already at the 5-tab hard limit. Watch Together is a derived social utility, not a primary destination.

### Deep link / URL
`/watch-together?friendIds=id1,id2,id3` — fully deep-linkable so results are shareable.

---

## 2. Friend Picker UI

Triggered from the Circle page entry point (when no friendId is pre-selected).

**Pattern:** Full-screen page at `/watch-together` (not a modal/sheet — results need their own URL).

**Layout:**
- Header: "Watch Together" title + back button
- Subhead: "Pick up to 5 friends to find what you'd all love"
- Friend list: your following list, sorted by taste compatibility % desc (most compatible first)
- Each row: avatar | name | @username | compatibility % badge | checkmark toggle
- Selected friends shown as an AvatarStack pill strip at the top (sticky, updates as you tap)
- Primary CTA button at bottom: "Find Movies" — disabled until ≥1 friend selected, enabled and blue once selected
- Bottom safe-area padding (env(safe-area-inset-bottom))

**Constraints:**
- Max 5 friends selectable — once 5 are picked, unselected rows dim (opacity-40) and become untappable
- Min touch target: 44×44pt per row (full row is tappable, not just the checkbox)
- Loading state: skeleton rows while following list loads

---

## 3. Results Screen

Route: `/watch-together?friendIds=id1,id2,...`

**Header:**
- AvatarStack of selected friends (overlapping circles, max 5 shown)
- Title: "Watch Together"
- Subtitle: "What you'd all love that none of you have seen"
- Back button (returns to Circle page or profile)

**Filter bar (sticky, below header):**
- All / Movies / TV — pill toggle, defaults to All
- Implemented client-side (filter already-fetched results, no new API call)

**Results list:**
- Skeleton (3–5 shimmer rows) while loading
- Each card: poster thumbnail | title | year | media type badge | compatibility score pill
- Compatibility score = the API's confidence this works for the group (backend decides the number)
- Tap → navigates to `/movie/[id]?type=...` (existing detail page)
- Results ordered by score desc (backend handles this)

**Empty state (no results):**
```
[icon: film reel or Users]
"Not enough overlap yet"
"Your circle needs more rankings to find great matches.
 The more everyone ranks, the better this gets."
[secondary button: "Rate something"]  → links to /recommendations
```

**Partial-data warning banner (inline, above results):**
> "Alex hasn't ranked enough yet — results based on the rest of your group"
> (shown when ≥1 selected friend has <5 ratings; dismissible)

---

## 4. Edge Cases — What I Need the API to Handle

### 4a. Friend has 0 or <5 ratings
- Exclude that friend from the algorithm
- Return a `warnings` array in the response:
  ```json
  {
    "results": [...],
    "warnings": [
      { "userId": "abc", "reason": "not_enough_ratings", "name": "Alex Chen" }
    ]
  }
  ```
- Frontend shows the inline warning banner (dismissible) above results

### 4b. No overlap at all (group has nothing in common)
- Don't return an empty array — fall back to "popular among the group's taste zones"
- Flag these with `"reason": "fallback_popular"` on each result item
- Frontend shows a soft note: "Based on each person's top picks — limited overlap found"

### 4c. All titles already rated by someone in the group
- Only return titles that NONE of the friendIds have rated (strict unseen filter per user)
- If the pool runs dry, relax the filter to: unseen by ≥50% of the group and flag with `"partiallyUnseen": true`

### 4d. Only 1 valid user (everyone else filtered out for low ratings)
- Still return results — based on that single user's high-ELO unseen titles
- Warning: "Results based on [Name] only — others haven't ranked enough yet"

### 4e. API response shape (proposed)
```json
{
  "results": [
    {
      "tmdbId": 12345,
      "mediaType": "movie",
      "title": "Parasite",
      "year": "2019",
      "posterPath": "/abc123.jpg",
      "score": 8.7,
      "reason": "overlap" | "fallback_popular",
      "partiallyUnseen": false
    }
  ],
  "warnings": [
    { "userId": "abc", "reason": "not_enough_ratings", "name": "Alex Chen" }
  ]
}
```

### 4f. Timeout / server error
- Frontend shows retry state (not just empty): "Something went wrong — tap to retry"
- Retry button re-fetches the same URL

---

## 5. URL / Routing Summary

| Screen | Route | Notes |
|--------|-------|-------|
| Friend picker | `/watch-together` | No query params = show picker |
| Results | `/watch-together?friendIds=id1,id2` | Deep-linkable, shareable |
| 1-on-1 shortcut | `/watch-together?friendIds=id1` | Skips picker, goes straight to results |

---

## 6. What Frontend Will Build

- `src/app/watch-together/page.tsx` — picker OR results depending on whether `friendIds` param is present
- `src/components/WatchTogetherPicker.tsx` — friend multi-select (client component)
- `src/components/WatchTogetherResults.tsx` — results list with skeleton + empty + warning states
- Entry point button on `/profile/[id]/page.tsx` (for logged-in viewer, not own profile)
- Entry point card on `/people/page.tsx` (above activity feed)

---

## 7. What I Need Confirmed from Backend

- [ ] Response shape with `warnings` array (as above in 4e)
- [ ] `reason` field on each result item (`"overlap"` vs `"fallback_popular"`)
- [ ] Confirm `friendIds` as comma-separated query param (or prefer array: `friendIds[]=`)
- [ ] Max how many results returned? (suggest 20, frontend shows all with scroll)
- [ ] Is there a minimum rating threshold before a user is included? (suggest 5 ratings)

Drop confirmation in `design-specs/watch-together-backend.md`.
