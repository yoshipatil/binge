/**
 * Episode Tracking UI Tests
 *
 * These tests verify the episode tracking UI components function correctly.
 * They run against the live dev server and require authentication, so most
 * tests that need a TV card use page mocking / API interception.
 *
 * NOTE: Tests that require a logged-in user with TV ratings are integration
 * tests. The tests below cover what can be verified without a live auth session:
 * - Unauthenticated redirects (same pattern as smoke tests)
 * - Component rendering via a dedicated test fixture page (if available)
 * - API shape validation
 *
 * For the full interactive episode tracking flow, tests use route interception
 * to mock the API responses so they can run in CI without real credentials.
 */

import { test, expect, type Page } from "@playwright/test"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mock the episode tracking API endpoints so tests run without a real backend.
 */
async function mockEpisodeAPIs(page: Page, showId: number) {
  // Mock watched episodes endpoint
  await page.route(`**/api/episodes/watched?showId=${showId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        watched: [
          { seasonNum: 1, episodeNum: 1, watchedAt: "2026-01-01T00:00:00.000Z" },
          { seasonNum: 1, episodeNum: 2, watchedAt: "2026-01-02T00:00:00.000Z" },
        ],
        perSeason: { "1": 2 },
      }),
    })
  })

  // Mock season episodes endpoint
  await page.route(`**/api/episodes/season?showId=${showId}&season=1`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        season_number: 1,
        name: "Season 1",
        episodes: [
          {
            id: 101,
            episode_number: 1,
            season_number: 1,
            name: "Pilot",
            overview: "The first episode.",
            still_path: null,
            air_date: "2008-01-20",
            runtime: 58,
          },
          {
            id: 102,
            episode_number: 2,
            season_number: 1,
            name: "The Bag",
            overview: "Second episode.",
            still_path: null,
            air_date: "2008-01-27",
            runtime: 47,
          },
          {
            id: 103,
            episode_number: 3,
            season_number: 1,
            name: "The One Who Knocks",
            overview: "Third episode.",
            still_path: null,
            air_date: "2008-02-03",
            runtime: 52,
          },
        ],
      }),
    })
  })

  // Mock POST watched
  await page.route("**/api/episodes/watched", async (route) => {
    if (route.request().method() === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "user-1",
          showTmdbId: body.showTmdbId,
          seasonNum: body.seasonNum,
          episodeNum: body.episodeNum,
          watchedAt: new Date().toISOString(),
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock DELETE watched
  await page.route(
    `**/api/episodes/watched?showId=${showId}&seasonNum=**&episodeNum=**`,
    async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        })
      } else {
        await route.continue()
      }
    }
  )
}

// ─── 1. Redirect tests (no auth needed) ──────────────────────────────────────

test.describe("Episode tracking — unauthenticated redirects", () => {
  test("GET /api/episodes/watched redirects or returns 401 when not authenticated (mobile 390px)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const res = await page.request.get("/api/episodes/watched?showId=1396")
    // Should be 401 or redirect to sign-in
    expect([401, 302, 307, 308]).toContain(res.status())
  })

  test("GET /api/episodes/watched redirects or returns 401 when not authenticated (desktop 1280px)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const res = await page.request.get("/api/episodes/watched?showId=1396")
    expect([401, 302, 307, 308]).toContain(res.status())
  })

  test("POST /api/episodes/watched returns 401 when not authenticated", async ({ page }) => {
    const res = await page.request.post("/api/episodes/watched", {
      data: { showTmdbId: 1396, seasonNum: 1, episodeNum: 1 },
    })
    expect([401, 302, 307, 308]).toContain(res.status())
  })

  test("DELETE /api/episodes/watched returns 401 when not authenticated", async ({ page }) => {
    const res = await page.request.delete(
      "/api/episodes/watched?showId=1396&seasonNum=1&episodeNum=1"
    )
    expect([401, 302, 307, 308]).toContain(res.status())
  })
})

// ─── 2. Rankings page — unauthenticated redirect ──────────────────────────────

test.describe("Rankings page — unauthenticated", () => {
  test("redirects to sign-in on mobile (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/rankings")
    await page.waitForLoadState("networkidle")
    expect(page.url()).toContain("/sign-in")
  })

  test("redirects to sign-in on desktop (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/rankings")
    await page.waitForLoadState("networkidle")
    expect(page.url()).toContain("/sign-in")
  })
})

// ─── 3. Watchlist page — unauthenticated redirect ────────────────────────────

test.describe("Watchlist page — unauthenticated", () => {
  test("redirects to sign-in on mobile (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/watchlist")
    await page.waitForLoadState("networkidle")
    expect(page.url()).toContain("/sign-in")
  })

  test("redirects to sign-in on desktop (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/watchlist")
    await page.waitForLoadState("networkidle")
    expect(page.url()).toContain("/sign-in")
  })
})

// ─── 4. Episode API — unauthenticated access ─────────────────────────────────

test.describe("Episode tracking API — season endpoint protection", () => {
  test("/api/episodes/season returns 401 when not authenticated", async ({ page }) => {
    // page.request bypasses page.route() interception — goes directly to server
    const res = await page.request.get("/api/episodes/season?showId=1396&season=1")
    expect([401, 302, 307, 308]).toContain(res.status())
  })
})

// ─── 5. Episode panel interactions (requires test fixture page) ───────────────
// These tests will be expanded when a /test-fixture/tv-card page is available
// that renders a TV MovieCard without authentication. Currently, they document
// the expected behavior and will pass once the fixture is created.

test.describe("EpisodePanel — component interactions via fixture", () => {
  // Skip these tests if the fixture page doesn't exist
  test.beforeEach(async ({ page }) => {
    const res = await page.request.get("/test-fixture/tv-card")
    if (res.status() === 404) {
      test.skip()
    }
  })

  test("Mobile 390px — TV card shows progress pill and Track Episodes button", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockEpisodeAPIs(page, 1396)

    await page.goto("/test-fixture/tv-card")
    await page.waitForLoadState("networkidle")

    // Progress pill should be visible
    const pill = page.locator('[data-testid="episode-progress-pill"]').first()
    await expect(pill).toBeVisible()

    // Track Episodes button should be visible
    const trackBtn = page.getByRole("button", { name: /track episodes/i }).first()
    await expect(trackBtn).toBeVisible()
  })

  test("Desktop 1280px — TV card shows progress pill and Track Episodes button", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockEpisodeAPIs(page, 1396)

    await page.goto("/test-fixture/tv-card")
    await page.waitForLoadState("networkidle")

    // Progress pill should be visible
    const pill = page.locator('[data-testid="episode-progress-pill"]').first()
    await expect(pill).toBeVisible()

    // Track Episodes button should be visible
    const trackBtn = page.getByRole("button", { name: /track episodes/i }).first()
    await expect(trackBtn).toBeVisible()
  })

  test("Clicking Track Episodes expands panel, season tabs visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockEpisodeAPIs(page, 1396)

    await page.goto("/test-fixture/tv-card")
    await page.waitForLoadState("networkidle")

    const trackBtn = page.getByRole("button", { name: /track episodes/i }).first()
    await trackBtn.click()

    // Episode panel should appear
    const panel = page.locator('[aria-label*="Episode tracker"]').first()
    await expect(panel).toBeVisible()

    // Season tab bar should be visible
    const tabList = page.getByRole("tablist", { name: "Seasons" }).first()
    await expect(tabList).toBeVisible()

    // At least one season tab should be visible
    const firstTab = page.getByRole("tab").first()
    await expect(firstTab).toBeVisible()

    // Button should now say "Hide Episodes"
    const hideBtn = page.getByRole("button", { name: /hide episodes/i }).first()
    await expect(hideBtn).toBeVisible()
  })

  test("Clicking episode row marks it watched (optimistic toggle)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockEpisodeAPIs(page, 1396)

    await page.goto("/test-fixture/tv-card")
    await page.waitForLoadState("networkidle")

    // Open the panel
    await page.getByRole("button", { name: /track episodes/i }).first().click()
    await page.waitForTimeout(400) // wait for animation

    // Wait for season content to load
    await page.getByRole("tab").first().click()
    await page.waitForTimeout(300)

    // Find an unwatched episode row (episode 3 should be unwatched in our mock)
    const ep3Row = page.getByRole("button", {
      name: /episode 3.*not watched/i,
    }).first()

    // Verify it shows as not watched
    await expect(ep3Row).toBeVisible()
    expect(await ep3Row.getAttribute("aria-label")).toMatch(/not watched/)

    // Click to mark as watched
    await ep3Row.click()

    // Optimistically should now show as watched
    const ep3RowWatched = page.getByRole("button", {
      name: /episode 3.*watched/i,
    }).first()
    await expect(ep3RowWatched).toBeVisible()
    expect(await ep3RowWatched.getAttribute("aria-label")).toMatch(/,\s*watched$/)
  })

  test("Clicking watched episode row unmarks it (optimistic toggle)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockEpisodeAPIs(page, 1396)

    await page.goto("/test-fixture/tv-card")
    await page.waitForLoadState("networkidle")

    // Open the panel
    await page.getByRole("button", { name: /track episodes/i }).first().click()
    await page.waitForTimeout(400)

    // Wait for season content
    await page.getByRole("tab").first().click()
    await page.waitForTimeout(300)

    // Episode 1 is watched in our mock data
    const ep1Row = page.getByRole("button", {
      name: /episode 1.*watched/i,
    }).first()
    await expect(ep1Row).toBeVisible()

    // Click to unmark
    await ep1Row.click()

    // Should now show as not watched
    const ep1RowUnwatched = page.getByRole("button", {
      name: /episode 1.*not watched/i,
    }).first()
    await expect(ep1RowUnwatched).toBeVisible()
  })

  test("Season tab keyboard navigation works (ArrowRight/ArrowLeft)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockEpisodeAPIs(page, 1396)

    // Also mock season 2
    await page.route("**/api/episodes/season?showId=1396&season=2", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          season_number: 2,
          name: "Season 2",
          episodes: [
            {
              id: 201,
              episode_number: 1,
              season_number: 2,
              name: "S2E1",
              overview: "",
              still_path: null,
              air_date: "2009-03-08",
              runtime: 47,
            },
          ],
        }),
      })
    })

    await page.goto("/test-fixture/tv-card")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /track episodes/i }).first().click()
    await page.waitForTimeout(400)

    const firstTab = page.getByRole("tab").first()
    await firstTab.focus()

    // ArrowRight should move to next tab
    await page.keyboard.press("ArrowRight")
    const secondTab = page.getByRole("tab").nth(1)
    await expect(secondTab).toBeFocused()
  })
})
