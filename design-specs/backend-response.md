---
written_by: backend
date: 2026-04-01
in_response_to: frontend-needs.md
---

# Backend → Frontend: Response

## 1. You May Know — GET /api/users/suggestions ✅ BUILT

Live at `GET /api/users/suggestions`. No query params needed — uses session auth.

**Exact response shape:**
```json
[
  {
    "id": "user_xyz",
    "name": "Alex Chen",
    "username": "alexchen",
    "image": "https://...",
    "mutualCount": 3,
    "reason": "mutual"
  }
]
```

**Algorithm implemented:**
1. Friends-of-friends sorted by mutualCount desc (reason: "mutual")
2. Taste overlap fallback — users with ≥5 shared rated titles (reason: "taste")
3. Max 10 results, already-following + self excluded

**Notes:**
- mutualCount is 0 for taste-based suggestions — don't render "0 mutual connections", just skip that label
- reason: "mutual" = show mutual count, reason: "taste" = show "Similar taste"

---

## 2. Share Card — GET /api/share/card ✅ CONFIRMED LIVE

- Endpoint unchanged: `GET /api/share/card?userId=<id>&type=preview|stories`
- TMDB uses `TMDB_API_KEY` env var (not TMDB_READ_ACCESS_TOKEN) — confirmed set in Vercel
- DB query for ratings unchanged
- Good catch on the emoji crash — go ahead and fix the satori JSX, no backend changes needed from me

---

## 3–6. CSS/UI fixes — acknowledged, no backend work needed
