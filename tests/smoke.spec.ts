import { test, expect } from "@playwright/test"

// ─── 1. Mobile: Homepage loads, search input exists, no console errors ────────
test.describe("Mobile homepage", () => {
  test.use({ baseURL: "http://localhost:3000" })

  test("homepage loads, search input exists, no console errors", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text())
    })

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Page should load with a <body>
    await expect(page.locator("body")).toBeVisible()

    // On mobile the BottomNav (md:hidden) shows the search link; the desktop NavBar link is
    // CSS-hidden at this viewport. Check that at least one a[href="/search"] is visible.
    const searchLinks = page.locator('a[href="/search"]')
    const count = await searchLinks.count()
    let anyVisible = false
    for (let i = 0; i < count; i++) {
      if (await searchLinks.nth(i).isVisible()) {
        anyVisible = true
        break
      }
    }
    expect(anyVisible).toBe(true)

    // No JS console errors
    expect(consoleErrors).toHaveLength(0)
  })
})

// ─── 2. Mobile: /sign-in — "Continue with Google" button visible ──────────────
test.describe("Mobile sign-in page", () => {
  test.use({ baseURL: "http://localhost:3000" })

  test('/sign-in shows "Continue with Google" button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto("/sign-in")
    await page.waitForLoadState("networkidle")

    await expect(page.locator("body")).toBeVisible()

    const googleBtn = page.getByRole("button", { name: /continue with google/i })
    await expect(googleBtn).toBeVisible()
  })
})

// ─── 3. Mobile: /people/search — redirects to sign-in when unauthenticated ───
test.describe("Mobile /people/search (protected)", () => {
  test.use({ baseURL: "http://localhost:3000" })

  test("redirects unauthenticated user to sign-in", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto("/people/search")
    await page.waitForLoadState("networkidle")

    // Middleware redirects /people/* → /sign-in?callbackUrl=...
    expect(page.url()).toContain("/sign-in")
  })
})

// ─── 4. Desktop: Homepage loads, nav links visible ────────────────────────────
test.describe("Desktop homepage", () => {
  test.use({ baseURL: "http://localhost:3000" })

  test("homepage loads and desktop nav links are visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await expect(page.locator("body")).toBeVisible()

    // Desktop nav is rendered with class "hidden md:flex" — all nav links should exist in DOM
    const homeLink = page.locator('nav a[href="/"]')
    await expect(homeLink.first()).toBeVisible()

    const leaderboardLink = page.locator('nav a[href="/leaderboard"]')
    await expect(leaderboardLink.first()).toBeVisible()

    const searchLink = page.locator('nav a[href="/search"]')
    await expect(searchLink.first()).toBeVisible()
  })
})

// ─── 5. Mobile: /profile/setup — redirects to sign-in when unauthenticated ───
test.describe("Mobile /profile/setup (protected)", () => {
  test.use({ baseURL: "http://localhost:3000" })

  test("redirects unauthenticated user to sign-in", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto("/profile/setup")
    await page.waitForLoadState("networkidle")

    // /profile/setup is in SETUP_EXEMPT — but /profile is in PROTECTED,
    // so unauthenticated users hitting /profile/setup get redirected by the
    // isProtected check (pathname starts with /profile)
    expect(page.url()).toContain("/sign-in")
  })
})
