# Avatar Upload API — Frontend Spec

## Endpoints

### POST /api/users/avatar
Upload a custom profile photo.

**Request:** `multipart/form-data` with field `file` (JPEG/PNG/WebP/AVIF, max 5MB)

**Response:**
```json
{ "url": "https://public.blob.vercel-storage.com/avatars/..." }
```

**Errors:**
- `400` — no file, wrong type, or too large (message included)
- `401` — not signed in
- `429` — rate limited (max 5 uploads/min)

### DELETE /api/users/avatar
Remove custom photo, revert to Google avatar.

**Response:**
```json
{ "url": "https://lh3.googleusercontent.com/..." }
```
(url may be null if no Google image exists)

## UX Notes
- Tap avatar on own profile → file picker opens
- Show upload progress (loading spinner on avatar)
- On success → update avatar in UI immediately (optimistic or refetch)
- On DELETE → show "Removed — reverted to Google photo" toast
- If user has no Google image either → show initial letter placeholder
- Touch target: entire avatar area (≥44×44px) should be tappable

## Where to wire it
- `src/app/profile/[id]/page.tsx` — own profile avatar
- `src/app/profile/setup/page.tsx` — profile setup flow (optional, nice to have)
