# Share Card — API Route Spec

**Component:** `src/components/ShareCard.tsx`
**API route to build:** `src/app/api/share/card/route.ts`
**Triggered by:** `src/components/ShareCardButton.tsx` → `GET /api/share/card?userId=<id>&type=preview|stories`

---

## Route: GET /api/share/card

### Query params
| Param | Required | Values | Description |
|-------|----------|--------|-------------|
| `userId` | yes | string | Profile user ID |
| `type` | no | `preview` (default) \| `stories` | Card variant |

### Auth
- Public endpoint — anyone can generate a card for any user's public rankings.
- If userId is not found, return 404.

---

## Response
- `Content-Type: image/png`
- `Cache-Control: public, max-age=3600` (1hr — revalidate when user re-ranks)
- Dimensions:
  - `preview` (square): **1080×1080**
  - `stories`: **1080×1920**

---

## Data to fetch (server-side in route)

```ts
// 1. Load user
const user = await prisma.user.findUnique({ where: { id: userId }, select: { name, image } })

// 2. Load all ratings
const ratings = await prisma.rating.findMany({ where: { userId } })

// 3. Normalize per-type ELO scores
const normalizedMovies = normalizeEloScores(ratings.filter(r => r.mediaType !== 'tv'))
const normalizedTV    = normalizeEloScores(ratings.filter(r => r.mediaType === 'tv'))

// 4. Combine and sort by displayScore desc — take top 5
const allNormalized = [...normalizedMovies, ...normalizedTV]
  .sort((a, b) => b.displayScore - a.displayScore)
  .slice(0, 5)

// 5. Fetch TMDB posters in parallel
// Use w342 for posters (340px — good balance for 1080px card)
// Full URL: https://image.tmdb.org/t/p/w342{poster_path}
```

---

## ShareCardItem shape (passed to component)

```ts
interface ShareCardItem {
  rank: number          // 1–5
  title: string         // movie/TV title
  posterUrl: string | null   // full absolute URL (https://image.tmdb.org/t/p/w342/...)
  score: number         // normalized displayScore (e.g. 9.2)
  tierBg: string        // hex color for score badge bg (from getTierColors())
  tierText: string      // hex color for score badge text
}
```

Import `getTierColors` from `src/components/ShareCard.tsx` to resolve tier colors.

---

## Rendering with @vercel/og

```ts
import { ImageResponse } from 'next/og'
import ShareCard, { getTierColors } from '@/components/ShareCard'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const type = (searchParams.get('type') ?? 'preview') as 'preview' | 'stories'

  // ... data fetch ...

  const width = 1080
  const height = type === 'stories' ? 1920 : 1080

  return new ImageResponse(
    <ShareCard
      userName={user.name ?? 'Binge User'}
      userImage={user.image ?? null}
      items={top5Items}
      variant={type}
    />,
    {
      width,
      height,
      fonts: [
        // Load Inter for satori — fetch from Google Fonts or bundle locally
        {
          name: 'Inter',
          data: await fetch('https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2').then(r => r.arrayBuffer()),
          weight: 400,
        },
        {
          name: 'Inter',
          data: await fetch('https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2pL7.woff2').then(r => r.arrayBuffer()),
          weight: 700,
        },
        {
          name: 'Inter',
          data: await fetch('https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa0ZL7.woff2').then(r => r.arrayBuffer()),
          weight: 800,
        },
      ],
    }
  )
}
```

> **Note:** `@vercel/og` uses `next/og` under the hood. No need to install satori separately — it's bundled.
> Import: `import { ImageResponse } from 'next/og'`
> No need for `npm install satori` — the `next` package already includes it.

---

## Edge function config (required)

```ts
export const runtime = 'edge'
```

> The route MUST run on the Edge runtime for ImageResponse to work. Do NOT import Prisma directly — use fetch to call an internal API, OR use the Neon HTTP client directly (which is edge-compatible).

---

## Caching strategy

Wrap in `unstable_cache` or add a `revalidate` tag keyed to the user ID so that when they re-rank, the card regenerates on next request.

```ts
// Option A: Cache-Control header (simplest)
return new ImageResponse(..., { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } })
```
